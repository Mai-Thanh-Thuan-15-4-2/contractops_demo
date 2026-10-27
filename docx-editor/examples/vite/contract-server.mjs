import {Hocuspocus} from '@hocuspocus/server';
import {WebSocketServer} from 'ws';
import * as Y from 'yjs';
import {randomUUID} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync,copyFileSync,readdirSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {parseDocx} from '../../packages/core/src/docx/parser';
import {toProseDoc} from '../../packages/core/src/prosemirror/conversion';
import {prosemirrorToYXmlFragment} from 'y-prosemirror';
import {createContractTemplate} from './src/contract-template';

const permission=(...rights)=>Object.fromEntries(['create','edit','comment','submit','review','versions'].map(k=>[k,rights.includes(k)]));
export const USERS=[
 ['ga','Gà ẩn danh','Nhân viên tạo phiếu','Kinh doanh',permission('create','edit','comment','submit','versions')],
 ['vit','Vịt ẩn danh','Trưởng phòng Kinh doanh','Kinh doanh',permission('edit','comment','submit','review','versions')],
 ['meo','Mèo ẩn danh','Người chỉnh sửa','Pháp chế',permission('edit','comment','submit','versions')],
 ['cho','Chó ẩn danh','Người nhận xét','Tài chính',permission('comment','versions')],
 ['gau','Gấu ẩn danh','Trưởng phòng Pháp chế','Pháp chế',permission('edit','comment','submit','review','versions')],
 ['cao','Cáo ẩn danh','Giám đốc','Ban giám đốc',permission('comment','review','versions')],
 ['tho','Thỏ ẩn danh','Người phê duyệt','Ban kiểm soát',permission('comment','review','versions')],
 ['huou','Hươu ẩn danh','Người chỉnh sửa','Kinh doanh',permission('edit','comment','submit','versions')],
 ['cu','Cú ẩn danh','Người nhận xét','Pháp chế',permission('comment','versions')],
 ['rai-ca','Rái Cá ẩn danh','Nhân viên tạo phiếu','Mua hàng',permission('create','edit','comment','submit','versions')]
].map(([id,name,title,department,permissions],i)=>({id,name,title,department,permissions,color:['#2f56ff','#12855f','#9259d7','#c86f2a','#0b8994'][i%5]}));

export function contractServerPlugin(){
 return {name:'contractops-demo-server',configureServer(vite){
  const dataDir=path.resolve(process.env.CONTRACTOPS_DATA_DIR||path.join(vite.config.root,'.contract-data'));mkdirSync(dataDir,{recursive:true});
  const stateFile=path.join(dataDir,'state.json');
  const emptyBucket=()=>({revision:0,state:null});
  const blankRecords=()=>({dichvu:emptyBucket(),muaban:emptyBucket(),thue:emptyBucket()});
  const loadRecords=()=>{if(!existsSync(stateFile))return blankRecords();const saved=JSON.parse(readFileSync(stateFile,'utf8'));if(saved.contracts)return {...blankRecords(),...saved.contracts};if('revision' in saved)return {...blankRecords(),dichvu:saved};return blankRecords();};
  const records=loadRecords();
  for(const epoch of [1,2,3,4,5]){const from=path.join(dataDir,`contract-${epoch}.bin`),to=path.join(dataDir,`contract-dichvu-${epoch}.bin`);if(existsSync(from)&&!existsSync(to))copyFileSync(from,to);}
  const sessions=new Map(),seedClaims=new Set();const ttl=75000;
  const roster=()=>USERS.map(u=>({...u,busy:[...sessions.values()].some(s=>s.user.id===u.id&&s.expires>Date.now())}));
  const roomFor=id=>`contract-${id}-${records[id]?.state?.draftEpoch||1}`;
  const contractOf=name=>/^contract-(dichvu|muaban|thue)-\d+$/.exec(name)?.[1]||null;
  const announce=(onlyId)=>{const users=roster();for(const s of sessions.values()){if(!s.contractId||!s.stream||s.stream.destroyed||s.stream.writableEnded)continue;if(onlyId&&s.contractId!==onlyId)continue;s.stream.write('data: '+JSON.stringify({type:'update',record:records[s.contractId],users})+'\n\n');}};
  const save=()=>{writeFileSync(stateFile+'.tmp',JSON.stringify({contracts:records}),'utf8');renameSync(stateFile+'.tmp',stateFile);};
  const auth=(token)=>{const s=sessions.get(token);if(!s||s.expires<Date.now()){const e=new Error('Phiên đã hết hạn. Vui lòng chọn lại nhân vật.');e.status=401;throw e;}return s;};
  const live=new Hocuspocus({quiet:true,debounce:300,maxDebounce:1000,
   async onAuthenticate({token,documentName,connection}){const s=auth(token);const state=records[s.contractId]?.state;if(!s.contractId||documentName!==roomFor(s.contractId))throw new Error('Phiên bản phòng đã thay đổi');connection.readOnly=!s.user.permissions.edit||!['draft','revision'].includes(state?.status);return {token};},
   async beforeHandleMessage({context,connection,documentName}){const s=auth(context.token);const state=records[s.contractId]?.state;if(!s.contractId||documentName!==roomFor(s.contractId))throw new Error('Phòng đã đóng');connection.readOnly=!s.user.permissions.edit||!['draft','revision'].includes(state?.status);},
   async onLoadDocument({documentName,document}){const id=contractOf(documentName),state=id?records[id]?.state:null;const f=path.join(dataDir,documentName+'.bin');if(existsSync(f)){Y.applyUpdate(document,readFileSync(f));}else{const bytes=['review','accepted'].includes(state?.status)?state.versions.at(-1)?.bytes:state?.draft;const model=bytes?await parseDocx(new Uint8Array(bytes)):createContractTemplate(id||'dichvu');prosemirrorToYXmlFragment(toProseDoc(model,{styles:model.package.styles}),document.getXmlFragment('prosemirror'));}return document;},
   async onChange({documentName,document}){const f=path.join(dataDir,documentName+'.bin');writeFileSync(f+'.tmp',Y.encodeStateAsUpdate(document));renameSync(f+'.tmp',f);}
  });
  const sockets=new WebSocketServer({noServer:true});sockets.on('connection',(ws,req)=>live.handleConnection(ws,req));
  const upgrade=(req,socket,head)=>{if(new URL(req.url,'http://localhost').pathname!=='/contract-collab')return;sockets.handleUpgrade(req,socket,head,ws=>sockets.emit('connection',ws,req));};
  vite.httpServer.on('upgrade',upgrade);
  const sweep=setInterval(()=>{let changed=false;for(const[token,s]of sessions){if(s.expires<Date.now()){s.stream?.end();sessions.delete(token);changed=true;}}if(changed)announce();for(const s of sessions.values()){if(s.stream&&!s.stream.destroyed&&!s.stream.writableEnded)s.stream.write(': keepalive\n\n');}},10000);sweep.unref();
  const pages={'/':'/contract-demo.html','/contract-editor':'/contract-editor.html'};
  vite.middlewares.use((req,res,next)=>{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/contract-demo.html'){res.writeHead(302,{Location:'/'+url.search});res.end();return;}
   if(url.pathname==='/contract-editor.html'){res.writeHead(302,{Location:'/contract-editor'+url.search});res.end();return;}
   const page=pages[url.pathname];
   if(page)req.url=page+url.search;
   next();
  });
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const body=async req=>{let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>30*1024*1024){const e=new Error('Dữ liệu quá lớn');e.status=413;throw e;}chunks.push(c);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};};
  const fail=(message,status=400)=>Object.assign(new Error(message),{status});
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  vite.middlewares.use(async(req,res,next)=>{
   const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/contract/'))return next();
   try{
    const route=url.pathname.slice('/api/contract/'.length);
    if(route==='users'&&req.method==='GET')return json(res,200,{users:roster()});
    if(route==='login'&&req.method==='POST'){
     const b=await body(req),user=USERS.find(u=>u.id===b.userId);if(!user)throw fail('Không tìm thấy nhân vật');
     if([...sessions.values()].some(s=>s.user.id===user.id&&s.expires>Date.now()))throw fail('Nhân vật này vừa được người khác chọn. Vui lòng chọn nhân vật khác.',409);
     const token=randomUUID();sessions.set(token,{user,tabId:b.tabId,expires:Date.now()+ttl,stream:null});announce();return json(res,201,{token,user});
    }
    const token=req.headers.authorization?.replace(/^Bearer /,'')||url.searchParams.get('token'),session=auth(token);
    if(route==='resume'&&req.method==='POST'){
     const b=await body(req);if(session.stream&&session.tabId!==b.tabId)throw fail('Nhân vật đang được sử dụng ở cửa sổ khác.',409);
     session.tabId=b.tabId;session.expires=Date.now()+ttl;return json(res,200,{token,user:session.user});
    }
    if(route==='events'&&req.method==='GET'){
     if(url.searchParams.get('tabId')!==session.tabId)throw fail('Phiên đang ở cửa sổ khác',409);
     if(session.stream&&!session.stream.destroyed)session.stream.end();
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');session.stream=res;announce(session.contractId);
     res.on('close',()=>{if(session.stream===res)session.stream=null;});return;
    }
    if(route==='heartbeat'&&req.method==='POST'){const b=await body(req);if(b.tabId!==session.tabId)throw fail('Phiên đang ở cửa sổ khác',409);session.expires=Date.now()+ttl;return json(res,200,{ok:true});}
    if(route==='logout'&&req.method==='POST'){if(session.stream){session.stream.end();}sessions.delete(token);announce();return json(res,200,{ok:true});}
    if(route==='select'&&req.method==='POST'){const b=await body(req);if(!records[b.contractId])throw fail('Không có mẫu hợp đồng này');session.contractId=b.contractId;return json(res,200,{ok:true,contractId:b.contractId});}
    if(route==='restore'&&req.method==='POST'){
     const roomName=/^contract-(?:dichvu|muaban|thue)-\d+$/;
     const open=[...live.documents.keys()].filter(name=>roomName.test(name));
     for(const name of open)live.closeConnections(name);
     for(let attempt=0;attempt<12;attempt++){
      await new Promise(resolve=>setTimeout(resolve,40));
      let left=false;
      for(const name of [...live.documents.keys()]){
       if(!roomName.test(name))continue;
       const doc=live.documents.get(name);
       if(doc&&doc.getConnectionsCount()===0)await live.unloadDocument(doc);
       else{live.closeConnections(name);left=true;}
      }
      if(!left)break;
     }
     for(const name of [...seedClaims])if(name.startsWith('contract-'))seedClaims.delete(name);
     for(const file of readdirSync(dataDir)){if(/^contract-(?:dichvu|muaban|thue)-\d+\.bin(?:\.tmp)?$/.test(file)||/^contract-\d+\.bin(?:\.tmp)?$/.test(file)){try{unlinkSync(path.join(dataDir,file));}catch{}}}
     const meta={dichvu:['Hop-dong-dich-vu.docx','Hợp đồng cung cấp dịch vụ'],muaban:['Hop-dong-mua-ban.docx','Hợp đồng mua bán hàng hóa'],thue:['Hop-dong-thue-van-phong.docx','Hợp đồng thuê văn phòng']};
     for(const id of Object.keys(records)){
      const prev=records[id].state;
      records[id]={revision:(records[id].revision||0)+1,state:{schema:1,draftEpoch:(prev?.draftEpoch||0)+1,status:'draft',fileName:meta[id][0],title:meta[id][1],draft:null,versions:[],comments:[],activity:[{id:randomUUID(),text:'Khôi phục mẫu ban đầu',by:session.user.name,at:new Date().toISOString()}],creatorId:prev?.creatorId||'ga',creatorName:prev?.creatorName||'Gà ẩn danh'}};
      announce(id);
     }
     save();
     return json(res,200,{ok:true,record:records[session.contractId]});
    }
    const bind=()=>{if(!session.contractId||!records[session.contractId])throw fail('Chưa chọn hợp đồng',400);return records[session.contractId];};
    const commit=(next)=>{records[session.contractId]=next;save();announce(session.contractId);return next;};
    if(route==='state'&&req.method==='GET')return json(res,200,bind());
    if(route==='draft'&&req.method==='POST'){const record=bind();const b=await body(req);if(!session.user.permissions.edit||!['draft','revision'].includes(record.state?.status))throw fail('Không có quyền lưu bản làm việc',403);if(b.room!==roomFor(session.contractId))throw fail('Bản làm việc đã thay đổi',409);if(!Array.isArray(b.bytes))throw fail('DOCX không hợp lệ');return json(res,200,commit({revision:record.revision+1,state:{...record.state,draft:b.bytes}}));}
    if(route==='seed'&&req.method==='POST'){bind();const b=await body(req);if(!session.user.permissions.edit)throw fail('Bạn không có quyền sửa',403);if(b.room!==roomFor(session.contractId))throw fail('Phòng đã thay đổi',409);const doc=live.documents.get(b.room);const seeded=doc?.getXmlFragment('prosemirror').length>0||seedClaims.has(b.room);if(!seeded)seedClaims.add(b.room);return json(res,200,{seed:!seeded});}
    if(route==='state'&&req.method==='PUT'){
     const record=bind();
     const b=await body(req),nextState=b.state,prev=record.state,p=session.user.permissions;
     if(b.revision!==record.revision)throw fail('Hồ sơ vừa được cập nhật bởi người khác. Vui lòng thử lại.',409);
     if(!nextState||!Array.isArray(nextState.versions)||!Array.isArray(nextState.comments))throw fail('Dữ liệu hồ sơ không hợp lệ');
     if(prev){
      const reset=nextState.versions.length===0&&prev.versions.length>0;
      if(reset&&!p.create)throw fail('Bạn không có quyền tạo lại phiếu',403);
      if(!reset){
       if(nextState.versions.length<prev.versions.length||nextState.versions.length>prev.versions.length+1)throw fail('Chuỗi phiên bản không hợp lệ');
       for(let i=0;i<prev.versions.length;i++){if(!same(prev.versions[i].bytes,nextState.versions[i]?.bytes)||prev.versions[i].id!==nextState.versions[i]?.id)throw fail('Không được sửa nội dung phiên bản đã gửi duyệt',403);}
       const added=nextState.versions.length===prev.versions.length+1;
       const submitted=added&&nextState.status==='review'&&['draft','revision'].includes(prev.status);
       const checkpoint=added&&nextState.status===prev.status&&['draft','revision'].includes(prev.status);
       if(added&&!submitted&&!checkpoint)throw fail('Chuỗi phiên bản không hợp lệ');
       if(submitted&&(!p.submit||!p.edit))throw fail('Bạn không có quyền gửi duyệt',403);
       if(checkpoint&&!p.edit)throw fail('Bạn không có quyền lưu bản xác nhận',403);
       if(nextState.status!==prev.status&&!submitted){
        const reopened=prev.status==='accepted'&&nextState.status==='revision'&&session.user.id===(prev.creatorId||'ga');
        if(!reopened&&(prev.status!=='review'||!['revision','accepted'].includes(nextState.status)||!p.review))throw fail('Bạn không có quyền quyết định duyệt',403);
        const v=nextState.versions.at(-1);if(!reopened&&nextState.status==='revision'&&!v.note?.trim())throw fail('Cần ghi rõ yêu cầu chỉnh sửa');
        if(nextState.status==='accepted'&&prev.comments.some(c=>c.versionId===v.id&&c.blocking&&!c.resolved))throw fail('Còn nhận xét bắt buộc chưa xử lý');
        if(!reopened){v.reviewedBy=session.user.name;v.reviewedAt=new Date().toISOString();}
       }
       if(nextState.status===prev.status&&!same(prev.draft,nextState.draft)&&(!p.edit||!['draft','revision'].includes(prev.status)))throw fail('Bạn không có quyền sửa nội dung',403);
       if(!same(prev.comments,nextState.comments)&&!p.comment&&!p.review)throw fail('Bạn không có quyền nhận xét',403);
       nextState.draftEpoch=prev.draftEpoch||1;
       if(['review','accepted'].includes(prev.status)&&nextState.status==='revision'||prev.fileName!==nextState.fileName||!same(prev.draft,nextState.draft)&&nextState.replaceDraft)nextState.draftEpoch++;
      }else nextState.draftEpoch=(prev.draftEpoch||1)+1;
     }else{nextState.draftEpoch=1;}
     nextState.creatorId=prev?.creatorId||'ga';nextState.creatorName=prev?.creatorName||USERS.find(u=>u.id===nextState.creatorId).name;
     if(!prev&&p.create||prev&&nextState.versions.length===0&&prev.versions.length>0){nextState.creatorId=session.user.id;nextState.creatorName=session.user.name;}
     if(prev&&prev.fileName!==nextState.fileName&&session.user.id!==nextState.creatorId)throw fail('Chỉ người tạo phiếu được thay tài liệu gốc',403);
     delete nextState.replaceDraft;
     const priorIds=new Set(prev?.comments.map(c=>c.id)||[]);for(const c of nextState.comments)if(!priorIds.has(c.id))c.by=session.user.name;
     const priorEvents=new Set(prev?.activity.map(c=>c.id)||[]);for(const e of nextState.activity)if(!priorEvents.has(e.id))e.by=session.user.name;
     return json(res,200,commit({revision:record.revision+1,state:nextState}));
    }
    throw fail('Không tìm thấy API',404);
   }catch(e){json(res,e.status||500,{error:e.message});}
  });
  vite.httpServer.once('close',()=>{clearInterval(sweep);for(const s of sessions.values())s.stream?.end();sockets.close();live.destroy();});
 }};
}
