import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import {contractServerPlugin} from './contract-server.mjs';
const base=import.meta.dirname;
const root=path.resolve(base,'../..');
export default defineConfig({
 root:base,plugins:[react(),contractServerPlugin()],
 optimizeDeps:{exclude:['y-prosemirror','yjs','prosemirror-model','prosemirror-state','prosemirror-view','prosemirror-transform','prosemirror-keymap','prosemirror-history','prosemirror-tables','prosemirror-commands','prosemirror-dropcursor','prosemirror-gapcursor','prosemirror-schema-list']},
 resolve:{dedupe:['react','react-dom','y-prosemirror','yjs','prosemirror-model','prosemirror-state','prosemirror-view','prosemirror-transform','prosemirror-keymap','prosemirror-history','prosemirror-tables','prosemirror-commands','prosemirror-dropcursor','prosemirror-gapcursor','prosemirror-schema-list'],alias:[
  {find:'@schnsrw/design-system',replacement:path.join(root,'vendor/design-system/src/index.ts')},
  {find:'@casualoffice/docs',replacement:path.join(root,'packages/react/src/index.ts')},
  {find:'@casualoffice/docops',replacement:path.join(root,'packages/docops/src/index.ts')},
  {find:'@eigenpal/docx-core/headless',replacement:path.join(root,'packages/core/src/headless.ts')},
  {find:'@eigenpal/docx-core/core-plugins',replacement:path.join(root,'packages/core/src/core-plugins/index.ts')},
  {find:'@eigenpal/docx-core/mcp',replacement:path.join(root,'packages/core/src/mcp/index.ts')},
  {find:/^@eigenpal\/docx-core\/(.+)/,replacement:path.join(root,'packages/core/src/$1')},
  {find:/^@eigenpal\/docx-core$/,replacement:path.join(root,'packages/core/src/core.ts')},
  {find:'@',replacement:path.join(root,'packages/react/src')}
 ]},
 css:{transformer:'postcss',postcss:{plugins:[tailwindcss({config:path.join(root,'tailwind.config.js'),content:[path.join(root,'packages/react/src/**/*.{ts,tsx}'),path.join(root,'vendor/design-system/src/**/*.{ts,tsx}'),path.join(base,'src/**/*.{ts,tsx}')]}),autoprefixer()]}},
 define:{__ENABLE_FRAMEWORK_SWITCHER__:'false',__GITHUB_STARS__:'null'},
 server:{host:'0.0.0.0',port:Number(process.env.CONTRACTOPS_PORT)||5173,strictPort:true,allowedHosts:true},
 build:{outDir:'dist-contract',rollupOptions:{input:{demo:path.join(base,'contract-demo.html'),editor:path.join(base,'contract-editor.html'),original:path.join(base,'index.html')}}}
});
