// ContractOps v1.2: one Yjs document per working generation; snapshots stay isolated.
import React,{useEffect,useRef,useState,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {DocxEditor,type DocxEditorRef} from '../../../packages/react/src/components/DocxEditor';
import {parseDocx} from '../../../packages/core/src/docx/parser';
import {acceptAllChanges} from '../../../packages/core/src/prosemirror/commands';
import {useCollab,makeFootnoteSync,makePropsSync} from '../../../packages/react/src/collab/useCollab';
import {commentsFromMap,observeComments,writeCommentsToMap} from '../../../packages/react/src/collab/commentSync';
import {createContractTemplate} from './contract-template';
import vi from './contract-vi.json';
import './contract-editor.css';
try{localStorage.setItem('casual-editor:color-theme','light');}catch{}
document.documentElement.setAttribute('data-theme','light');
document.documentElement.classList.add('contract-external-review');
const origin=location.origin;
const send=(type:string,data:object={})=>parent.postMessage({channel:'contractops-v1',type,...data},origin);
type Session={id:number;key:number;bytes?:number[];base:any;mode:'editing'|'viewing'|'suggesting';author:string;directAllowed:boolean;live:boolean;room:string;token:string;user:any};
function LiveSession(props:{session:Session;editorRef:React.RefObject<DocxEditorRef|null>}){
 const {session}=props;
 const collab=useCollab({room:session.room,backend:location.origin.replace(/^http/,'ws')+'/contract-collab',token:session.token,user:{name:session.user.name,color:session.user.color}});
 const [comments,setComments]=useState(()=>commentsFromMap(collab.commentsMap));
 useEffect(()=>observeComments(collab.commentsMap,setComments),[collab.commentsMap]);
 useEffect(()=>{send('collab',{status:collab.status,synced:collab.synced,peers:collab.peers});},[collab.status,collab.synced,collab.peers]);
 const extras=useMemo(()=>({externalContent:true,externalPlugins:collab.plugins,footnoteSync:makeFootnoteSync(collab.footnotesMap),endnoteSync:makeFootnoteSync(collab.endnotesMap),propsSync:makePropsSync(collab.propsMap)}),[collab.plugins]);
 return <Surface {...props} synced={collab.synced} extras={{...extras,comments,onCommentsChange:(next:any)=>{if(session.mode!=='viewing')writeCommentsToMap(collab.commentsMap,next);}}}/>;
}
function Surface({session,editorRef:ref,synced=true,extras={}}:{session:Session;editorRef:React.RefObject<DocxEditorRef|null>;synced?:boolean;extras?:any}){
 const editRevision=useRef(0);const [ready,setReady]=useState(false);const loaded=useRef(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const mode=session.mode==='viewing'?'viewing':session.directAllowed?session.mode:'suggesting';
 useEffect(()=>{document.documentElement.classList.toggle('suggestions-only',!session.directAllowed);},[session.directAllowed]);
 useEffect(()=>{if(!ready||!synced||loaded.current)return;let count=0;const t=setInterval(()=>{const view=ref.current?.getEditorRef()?.getView();if(view&&view.state.doc.content.size>2){loaded.current=true;send('loaded',{id:session.id});clearInterval(t);}else if(++count>100){send('failure',{id:session.id,message:'Chưa đồng bộ được nội dung tài liệu.'});clearInterval(t);}},50);return()=>clearInterval(t);},[ready,synced,session.id]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <DocxEditor ref={ref} document={session.base} chrome="embedded" i18n={vi} author={session.author} documentMode={mode} externalReview showPanelRail={false} initialZoom={.85} showRuler={false} features={{titleBar:false,menuBar:true}} {...extras}
 onReady={()=>setReady(true)} onError={e=>send('failure',{id:loaded.current?undefined:session.id,message:e.message})}
 onModeChange={next=>{if(mode==='viewing'||next==='viewing'||!session.directAllowed&&next!=='suggesting')return;send('mode',{mode:next});}}
 onChange={()=>{if(!loaded.current||!synced||mode==='viewing')return;const revision=++editRevision.current;send('dirty',{editRevision:revision});if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(async()=>{send('saving');try{const bytes=await ref.current?.save({selective:false});if(bytes)send('autosave',{bytes,editRevision:revision});}catch(e){send('failure',{message:String(e)});}},1600);}}/>;
}
function App(){
 const ref=useRef<DocxEditorRef>(null);const [session,setSession]=useState<Session|null>(null);const generation=useRef(0);const revisionKey=useRef('');
 const [toolsExpanded,setToolsExpanded]=useState(false);
 useEffect(()=>{document.documentElement.classList.toggle('contract-tools-expanded',toolsExpanded);},[toolsExpanded]);
 React.useEffect(()=>{let last=0;const interval=setInterval(()=>{const changes=ref.current?.getTrackedChanges?.()??null;if(changes){const items=changes.map(({type,text,deletedText,author,date,from,to,revisionId})=>({type,text,deletedText:deletedText??'',author,date:date??'',from,to,revisionId}));const key=JSON.stringify(items);if(key!==revisionKey.current){revisionKey.current=key;send('revisions',{items});}}if(!ref.current)return;const pages=document.querySelector('.paged-editor__pages');let canvas=pages?.parentElement;while(canvas&&getComputedStyle(canvas).overflowY!=='auto')canvas=canvas.parentElement;if(canvas){canvas.classList.add('contract-canvas-scroll');canvas.scrollTop=0;}const rect=pages?.getBoundingClientRect();const height=Math.max(1120,Math.ceil(rect?rect.top+rect.height+70:(ref.current.getTotalPages()||1)*1123*(ref.current.getZoom()||.85)+220));if(height!==last){last=height;send('layout',{height});}},700);return()=>clearInterval(interval);},[]);
 React.useEffect(()=>{
  const wheel=(event:WheelEvent)=>{if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;const target=event.target as HTMLElement;if(target.closest('[role=dialog],[role=listbox],[role=menu],textarea,[data-radix-popper-content-wrapper],.docx-unified-sidebar'))return;event.preventDefault();send('scroll',{deltaY:event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?innerHeight:1)});};
  document.addEventListener('wheel',wheel,{passive:false,capture:true});return()=>document.removeEventListener('wheel',wheel,true);
 },[]);

 useEffect(()=>{
 const handler=async(e:MessageEvent)=>{if(e.origin!==origin||e.source!==parent||e.data?.channel!=='contractops-v1')return;const m=e.data;
 try{
 if(m.type==='tools'){setToolsExpanded(!!m.expanded);send('result',{id:m.id});return;}
 if(m.type==='disconnect'){revisionKey.current='';setSession(null);send('revisions',{items:[]});send('collab',{status:'disconnected',peers:[]});return;}
 if(m.type==='review'){const editor=ref.current;if(!editor)throw new Error('Trình soạn thảo chưa sẵn sàng');if(m.action==='accept-all'){const view=editor.getEditorRef()?.getView();if(!view)throw new Error('Trình soạn thảo chưa sẵn sàng');acceptAllChanges()(view.state,view.dispatch);}else if(m.action==='accept')editor.acceptTrackedChange(m.from,m.to);else if(m.action==='reject')editor.rejectTrackedChange(m.from,m.to);else editor.focusTrackedChange(m.from,m.to);send('result',{id:m.id});return;}
 if(m.type==='configure'){setSession(s=>s?{...s,mode:m.mode,author:m.author,directAllowed:!!m.directAllowed}:s);return;}
 if(m.type==='load'){const key=++generation.current;const base=m.bytes?await parseDocx(new Uint8Array(m.bytes)):createContractTemplate(m.template||'dichvu');if(key!==generation.current)return;setSession({...m,base,key});return;}
 if(m.type==='export'){const bytes=await ref.current?.save({selective:false});if(!bytes)throw new Error('Không thể xuất DOCX');send('result',{id:m.id,bytes});}
 }catch(e){send('failure',{id:m.id,message:String(e)});}};
 window.addEventListener('message',handler);send('ready');return()=>window.removeEventListener('message',handler);
 },[]);
 return session?(session.live?<LiveSession key={session.key} session={session} editorRef={ref}/>:<Surface key={session.key} session={session} editorRef={ref}/>):<div style={{padding:20,color:'#667085'}}>Chọn nhân vật để mở hợp đồng.</div>;
}
createRoot(document.getElementById('editor')!).render(<App/>);
