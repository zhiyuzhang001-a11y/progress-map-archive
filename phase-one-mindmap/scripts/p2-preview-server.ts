import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createBridge} from '../backend/server.ts';
import {loadConfig} from '../backend/config.ts';

const source=resolve('.'),output=resolve('../outputs/P2-global-progress'),dist=join(output,'cp2-dist');
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const state=await readFile(join(source,'project-data/state.json'));
const parsed=JSON.parse(state.toString());if(parsed.projectId!=='progress-mindmap-self')throw Error('Wrong project');
const config=await loadConfig(source),bridge=await createBridge({root:source,config,port:0});
const bridgeHtml=await (await fetch(bridge.url)).text();
const sessionTag=bridgeHtml.match(/<meta name="mindmap-session" content="[a-f0-9]+"\/?>/)?.[0];
if(!sessionTag)throw Error('Preview session missing');
// Reads retain the exact real project identity. The proxy serves new static UI assets and denies writes.
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url??'/',bridge.url).pathname;
  if(req.method!=='GET'||['/api/action','/api/restore','/api/shutdown'].includes(pathname)){res.writeHead(405,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'PREVIEW_READ_ONLY',message:'CP2预览只读，不接受写入'}));return;}
  if(!pathname.startsWith('/api/')){
   if(pathname==='/'){const freshHtml=await (await fetch(bridge.url)).text();const freshTag=freshHtml.match(/<meta name="mindmap-session" content="[a-f0-9]+"\/?\>/)?.[0];if(!freshTag)throw Error('Preview session unavailable');const html=(await readFile(join(dist,'index.html'),'utf8')).replace('</head>',freshTag+'</head>');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
   const file=resolve(dist,'.'+pathname);if(!file.startsWith(dist+'/')||!pathname.startsWith('/assets/')){res.writeHead(404);res.end();return;}
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);return;
  }
  const headers:Record<string,string>={};if(req.headers['x-mindmap-session'])headers['x-mindmap-session']=String(req.headers['x-mindmap-session']);
  const result=await fetch(bridge.url+(req.url??'/'),{headers});res.writeHead(result.status,{'Content-Type':result.headers.get('content-type')??'application/octet-stream','Cache-Control':'no-store'});res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'PREVIEW_ERROR'}));}
});
await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(4175,'127.0.0.1',()=>resolve());});
const data={url:'http://127.0.0.1:4175/?view=stages',projectId:parsed.projectId,sourceRevision:parsed.revision,sourceStateSha256:hash(state),readOnlyProxy:true,mode:'real main project GET with isolated preview assets; default 4173 entry unchanged',pid:process.pid,root:source,createdAt:new Date().toISOString()};
await writeFile(join(output,'CP2_PREVIEW_RUNTIME.json'),JSON.stringify(data,null,2));console.log(JSON.stringify(data));
const stop=()=>server.close(()=>void bridge.stop());process.on('SIGTERM',stop);process.on('SIGINT',stop);
