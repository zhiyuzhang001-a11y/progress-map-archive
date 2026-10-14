import {projectMap} from '../src/project-map.ts';
import {iterationSummary} from './iterations.ts';
import {acceptancePack} from './acceptance-pack.ts';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,extname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {z} from 'zod';
import {DomainError,fail,id} from '../src/domain.ts';
import {loadConfig,initialForNewData,type ProjectConfig} from './config.ts';
import {Store,LIMITS,hash} from './store.ts';
const MIME:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export async function createBridge(options:{root:string;port?:number;init?:boolean;config?:ProjectConfig}){
 const config=options.config;const store=new Store(options.root,config??'synthetic-field-guide-01');if(options.init){const initial=config?await initialForNewData(options.root,config):undefined;await store.init(initial);}else await store.status();
 const assets=new Map<string,Buffer>();const dist=join(options.root,'dist');async function collect(dir:string){for(const f of await readdir(dir,{withFileTypes:true})){if(f.isSymbolicLink())fail('SYMLINK_DENIED','构建目录存在符号链接');const p=join(dir,f.name);if(f.isDirectory())await collect(p);else if(f.isFile())assets.set('/'+relative(dist,p).split('\\').join('/'),await readFile(p));}}await collect(dist);
 let address='';let stopping=false;const sessions=new Map<string,{epoch:string;expires:number}>();const requests=new Map<string,{at:number;count:number}>();
 const securityHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
 function reply(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...securityHeaders});res.end(JSON.stringify(value));}
 async function body(req:IncomingMessage){if(req.headers['content-type']?.split(';')[0]!=='application/json')fail('CONTENT_TYPE','写入仅支持 application/json');let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>LIMITS.bodyBytes)fail('BODY_LIMIT','请求超过 128KB');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{fail('BAD_JSON','请求 JSON 不合法');}}
 async function session(req:IncomingMessage){const token=req.headers['x-mindmap-session'];if(typeof token!=='string')fail('SESSION_REQUIRED','缺少会话凭据');const entry=sessions.get(token);if(!entry||entry.expires<Date.now()){sessions.delete(token);requests.delete(token);fail('SESSION_EXPIRED','会话已过期，请重新读取页面');}const r=await store.status();if(entry.epoch!==r.state.recoveryEpoch){sessions.clear();requests.clear();fail('RECOVERY_EPOCH_MISMATCH','状态已恢复，旧会话与请求失效；请重新读取并确认');}const current=requests.get(token);if(!current||Date.now()-current.at>1000)requests.set(token,{at:Date.now(),count:1});else if(++current.count>40)fail('RATE_LIMIT','请求过于频繁');return r;}
 const server=createServer(async(req,res)=>{try{
  if(req.headers.host!==address)fail('HOST_DENIED','Host 必须匹配本机绑定地址');
  if(req.headers.origin&&req.headers.origin!==`http://${address}`)fail('ORIGIN_DENIED','来源不允许');
  if(req.headers['sec-fetch-site']&&['cross-site','same-site'].includes(String(req.headers['sec-fetch-site'])))fail('ORIGIN_DENIED','跨站请求不允许');
  const raw=req.url??'/';if(/\.\.|%2e|%2f|%5c|\\/i.test(raw))fail('PATH_DENIED','非法路径');const path=new URL(raw,`http://${address}`).pathname;
  if(stopping&&req.method!=='GET')fail('STOPPING','服务正在关闭');
  if(path.startsWith('/api/')){
   if(req.method==='POST'&&req.headers.origin!==`http://${address}`)fail('ORIGIN_DENIED','写入必须有精确同源 Origin');
   const current=await session(req);
   if(req.method==='GET'&&path==='/api/state')return reply(res,200,{...current,readOnly:current.readOnly||!!config?.readOnly,metadata:{mode:config?.kind==='real'?'real':'demo',title:config?.name??'城市自然观察手册',goal:current.state.baseline.nodes.find(n=>!n.parent)?.goal??'',readOnly:!!config?.readOnly}});
   if(req.method==='GET'&&path==='/api/context')return reply(res,200,{rootFingerprint:hash(store.root),project:config??null,capacity:await store.capacity()});
   if(req.method==='GET'&&path==='/api/evidence-records')return reply(res,200,current.state.evidenceRecords??[]);
   if(req.method==='GET'&&path==='/api/evidence-record'){const query=new URL(raw,`http://${address}`).searchParams;const recordId=id.parse(query.get('id'));const version=id.parse(query.get('version'));return reply(res,200,await store.evidenceRecord(recordId,version));}
   if(req.method==='GET'&&path==='/api/iteration-summary')return reply(res,200,iterationSummary(current.state));
   if(req.method==='GET'&&path==='/api/acceptance-pack')return reply(res,200,acceptancePack(current.state,new URL(raw,`http://${address}`).searchParams.has('baselineVersion')?z.coerce.number().int().positive().parse(new URL(raw,`http://${address}`).searchParams.get('baselineVersion')):undefined));
   if(req.method==='GET'&&path==='/api/map')return reply(res,200,projectMap(current.state));
   if(req.method==='GET'&&path==='/api/map-view')return reply(res,200,await store.readMapView());
   if(req.method==='POST'&&path==='/api/map-view'){const v=z.object({schemaVersion:z.union([z.literal(1),z.literal(2)]).optional(),projectId:id,recoveryEpoch:id,view:z.object({positions:z.record(id,z.object({x:z.number().finite(),y:z.number().finite()}).strict()).refine(v=>Object.keys(v).length<=1000),expanded:z.array(id).max(1000),viewport:z.object({x:z.number().finite(),y:z.number().finite(),zoom:z.number().min(.05).max(2)}).strict(),windowSize:z.object({width:z.number().min(1).max(20000),height:z.number().min(1).max(20000)}).strict(),compact:z.boolean()}).strict()}).strict().parse(await body(req));if(config?.kind==='real'&&v.schemaVersion!==2)fail('OLD_CLIENT','真实视图需要schema2请求');return reply(res,200,await store.writeMapView(v.projectId,v.recoveryEpoch,v.view));}
   if(req.method==='GET'&&path==='/api/version')return reply(res,200,{revision:current.state.revision,recoveryEpoch:current.state.recoveryEpoch,readOnly:current.readOnly||!!config?.readOnly});
   if(req.method==='GET'&&path==='/api/recovery-preview'){const key=new URL(raw,`http://${address}`).searchParams.get('backupId');if(!key)fail('INVALID_REQUEST','需要备份标识');return reply(res,200,await store.recoveryContext(key));}
   if(req.method==='GET'&&path==='/api/backups')return reply(res,200,await store.backups());
   if(req.method==='GET'&&path==='/api/view')return reply(res,200,await store.readView());
   if(req.method==='POST'&&path==='/api/view'){const schema=z.object({schemaVersion:z.union([z.literal(1),z.literal(2)]).optional(),projectId:id,recoveryEpoch:id,view:z.object({positions:z.record(id,z.object({x:z.number().finite(),y:z.number().finite()}).strict()),collapsed:z.array(id).max(1000),viewport:z.object({x:z.number().finite(),y:z.number().finite(),zoom:z.number().positive().max(2)}).strict().optional()}).strict()}).strict();const v=schema.parse(await body(req));if(config?.kind==='real'&&v.schemaVersion!==2)fail('OLD_CLIENT','真实视图需要schema2请求');return reply(res,200,await store.writeView(v.projectId,v.recoveryEpoch,v.view));}
   if(req.method==='POST'&&path==='/api/action')return reply(res,200,await store.submit(await body(req),config?.kind==='real'?'web-local-user':'web-synthetic-user'));
   if(req.method==='POST'&&path==='/api/report')return reply(res,200,await store.submit(await body(req),'ai-cli'));
   if(req.method==='POST'&&path==='/api/backup'){const v=z.object({confirm:z.literal(true),schemaVersion:z.union([z.literal(1),z.literal(2)]).optional()}).strict().parse(await body(req));if(config?.kind==='real'&&v.schemaVersion!==2)fail('OLD_CLIENT','真实备份需要schema2请求');return reply(res,200,await store.backup());}
   if(req.method==='POST'&&path==='/api/restore'){const result=await store.restore(await body(req));sessions.clear();requests.clear();return reply(res,200,result);}
   if(req.method==='POST'&&path==='/api/shutdown'){const v=z.object({confirm:z.literal(true),schemaVersion:z.union([z.literal(1),z.literal(2)]).optional()}).strict().parse(await body(req));if(config?.kind==='real'&&v.schemaVersion!==2)fail('OLD_CLIENT','真实关闭需要schema2请求');reply(res,200,{stopping:true});void stop();return;}
   return reply(res,405,{error:'METHOD_DENIED',message:'未知接口或禁止 GET 写入'});
  }
  if(!['GET','HEAD'].includes(req.method??''))return reply(res,405,{error:'METHOD_DENIED'});
  const file=assets.get(path==='/'||path==='/internal'?'/index.html':path);if(!file)return reply(res,404,{error:'NOT_FOUND'});
  let data=file;if(path==='/'||path==='/index.html'||path==='/internal'){const {state}=await store.status();const token=randomBytes(32).toString('hex');if(sessions.size>=64){const oldest=sessions.keys().next().value!;sessions.delete(oldest);requests.delete(oldest);}sessions.set(token,{epoch:state.recoveryEpoch,expires:Date.now()+2*60*60*1000});data=Buffer.from(file.toString().replace('</head>',`<meta name="mindmap-session" content="${token}"/></head>`));}
  res.writeHead(200,{'Content-Type':MIME[extname(path==='/'||path==='/internal'?'/index.html':path)]??'application/octet-stream',...securityHeaders});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){const code=e instanceof DomainError?e.code:e instanceof z.ZodError?'INVALID_REQUEST':(e as NodeJS.ErrnoException).code??'INTERNAL_ERROR';const statusCode=code==='BODY_LIMIT'?413:['SESSION_REQUIRED','SESSION_EXPIRED'].includes(code)?401:['HOST_DENIED','ORIGIN_DENIED','FORBIDDEN_ACTION','PATH_DENIED'].includes(code)?403:['VERSION_CONFLICT','RECOVERY_EPOCH_MISMATCH','OPERATION_ID_CONFLICT','READ_ONLY_BACKUP'].includes(code)?409:400;reply(res,statusCode,{error:code,message:e instanceof Error?e.message:String(e),details:e instanceof DomainError?e.details:null});}});
 server.requestTimeout=10000;server.headersTimeout=10000;
 let stoppingPromise:Promise<void>|undefined;
 function stop(){if(stoppingPromise)return stoppingPromise;stopping=true;sessions.clear();requests.clear();stoppingPromise=new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));return stoppingPromise;}
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(options.port??config?.port??4173,'127.0.0.1',()=>{const a=server.address();if(a&&typeof a!=='string')address=`127.0.0.1:${a.port}`;resolve();});});
 return {server,store,url:`http://${address}`,stop,rss:()=>process.memoryUsage().rss};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));try{const config=await loadConfig(root,process.env.MINDMAP_CONFIG??'project.config.json');const app=await createBridge({root,init:true,config});console.log(`枝序 · ${config.name}：${app.url}\n按 Ctrl+C 关闭；退出完成已受理的写入。`);if(process.env.MINDMAP_OPEN_BROWSER==='1'&&process.platform==='darwin')spawn('open',[app.url],{stdio:'ignore'});process.on('SIGINT',()=>void app.stop());process.on('SIGTERM',()=>void app.stop());}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}
}
