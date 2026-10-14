import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {loadConfig} from '../backend/config.ts';
import {Store,hash} from '../backend/store.ts';
import {fail} from '../src/domain.ts';
export async function manageService(command:string,options:{root:string;configFile?:string;open?:boolean;browserOpener?:(url:string)=>Promise<boolean>}){
 const root=resolve(options.root);const configFile=options.configFile??'project.config.json';const config=await loadConfig(root,configFile);const url=`http://127.0.0.1:${config.port}`;
 async function probe(){
  let response:Response;try{response=await fetch(url,{signal:AbortSignal.timeout(1200)});}catch(e){if((e as {cause?:{code?:string}}).cause?.code==='ECONNREFUSED')return {state:'offline' as const};return {state:'occupied' as const};}
  try{if(!response.ok)return {state:'occupied' as const};const html=await response.text();const token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)return {state:'occupied' as const};
   const headers={'x-mindmap-session':token};const ctx=await (await fetch(url+'/api/context',{headers,signal:AbortSignal.timeout(1200)})).json();const s=await (await fetch(url+'/api/state',{headers,signal:AbortSignal.timeout(1200)})).json();const local=await new Store(root,config).status();
   if(ctx.rootFingerprint!==hash(root)||ctx.project?.projectId!==config.projectId||ctx.project?.kind!==config.kind||ctx.project?.dataDirectory!==config.dataDirectory||s.state?.projectId!==config.projectId||s.state?.recoveryEpoch!==local.state.recoveryEpoch)return {state:'occupied' as const};
   return {state:'ready' as const,token,revision:s.state.revision,recoveryEpoch:s.state.recoveryEpoch};
  }catch{return {state:'occupied' as const};}
 }
 let current=await probe();
 if(command==='status')return {status:current.state,url,projectId:config.projectId,...(current.state==='ready'?{revision:current.revision,recoveryEpoch:current.recoveryEpoch}:{})};
 if(command==='stop'){
  if(current.state==='offline')return {stopped:true,alreadyStopped:true,url};if(current.state!=='ready')fail('FOREIGN_PORT','端口被其他服务占用，不关闭该服务。');
  const r=await fetch(url+'/api/shutdown',{method:'POST',headers:{'x-mindmap-session':current.token,'content-type':'application/json',origin:url},body:JSON.stringify({schemaVersion:config.kind==='real'?2:1,confirm:true}),signal:AbortSignal.timeout(4000)});if(!r.ok)fail('STOP_FAILED','服务未确认关闭，请读取诊断。');
  for(let i=0;i<30;i++){await delay(100);if((await probe()).state==='offline')return {stopped:true,url};}fail('STOP_UNCONFIRMED','关闭结果未确认。');
 }
 if(command!=='start')fail('CLI_ARGUMENT','仅支持start/status/stop');if(current.state==='occupied')fail('FOREIGN_PORT','端口被其他服务占用，请由Codex检查；未启动或关闭外来进程。');
 let started=false;
 if(current.state==='offline'){
  const logs=join(root,'service-data');await fs.mkdir(logs,{recursive:true,mode:0o700});const st=await fs.lstat(logs);if(st.isSymbolicLink()||!st.isDirectory())fail('SYMLINK_DENIED','运行日志目录不合法');
  const log=join(logs,configFile.replace(/\.json$/,'')+'.log');const f=await fs.open(log,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o600);
  try{const child=spawn(process.execPath,[join(root,'backend/server.ts')],{cwd:root,detached:true,stdio:['ignore',f.fd,f.fd],env:{...process.env,MINDMAP_CONFIG:configFile,MINDMAP_OPEN_BROWSER:'0'}});child.unref();child.on('error',()=>{});started=true;}finally{await f.close();}
  for(let i=0;i<50;i++){await delay(100);current=await probe();if(current.state==='ready')break;}
  if(current.state!=='ready')fail('START_FAILED','服务未就绪，Codex需检查service-data运行日志和端口。');
 }
 let browserOpened=false;if(options.open){if(options.browserOpener){browserOpened=await options.browserOpener(url).catch(()=>false);}else if(process.platform==='darwin'){browserOpened=await new Promise<boolean>(r=>{const child=spawn('/usr/bin/open',[url],{stdio:'ignore'});child.once('error',()=>r(false));child.once('exit',code=>r(code===0));});}}
 return {status:'ready',started,url,projectId:config.projectId,revision:current.state==='ready'?current.revision:undefined,browserOpened,serviceLifecycle:'按需启动的独立进程；启动终端退出不停止服务。没有登录启动项。'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);const command=args.shift()??'start';const i=args.indexOf('--config');let configFile:string|undefined;if(i>=0){configFile=args[i+1];if(!configFile)fail('CLI_ARGUMENT','--config需要值');args.splice(i,2);}const open=args.includes('--open');if(open)args.splice(args.indexOf('--open'),1);if(args.length)fail('CLI_ARGUMENT','未知参数');console.log(JSON.stringify(await manageService(command,{root:fileURLToPath(new URL('../',import.meta.url)),configFile,open}),null,2));}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}
}
