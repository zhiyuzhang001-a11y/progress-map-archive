import {readFile,writeFile,mkdtemp,rm,cp,symlink,realpath,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cli,root} from './v05-cli-helpers.ts';
import {createBridge} from '../backend/server.ts';
import {loadConfig} from '../backend/config.ts';

const digest=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const preliminary=process.argv.includes('--pre-report');
const outputPrefix=process.argv.find(arg=>arg.startsWith('--output-prefix='))?.slice('--output-prefix='.length)??'v07-final';
if(!/^v07-[a-z0-9-]+$/.test(outputPrefix))throw new Error('Invalid output prefix');
const before=await readFile(join(root,'project-data/state.json'));
const main=JSON.parse(before.toString());
if(main.baseline.version!==3||main.baseline.acceptance.length!==6||main.decisions.acceptance.some((d:any)=>d.baselineVersion===2||d.baselineVersion===3)||(!preliminary&&!main.evidenceRecords?.some((r:any)=>r.baselineVersion===3)))throw new Error('本轮真实待验收记录未准备好');
const backup=await cli(['backup']);const destination=join(root,'archives',outputPrefix+'-delivery-'+Date.now());
const exported=await cli(['export','--destination',destination]);const verified=await cli(['verify-export','--destination',destination]);
const q=await realpath(await mkdtemp(join(tmpdir(),'v07-delivery-restore-')));
let app:Awaited<ReturnType<typeof createBridge>>|undefined;const log:any[]=[];
async function isolated(args:string[]):Promise<any>{
 return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[join(q,'backend/cli.ts'),...args],{cwd:q});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.once('error',reject);p.once('exit',code=>{if(code!==0)return reject(new Error(err));try{resolve(JSON.parse(out));}catch(e){reject(e);}});});
}
try{
 log.push({clone:await cli(['clone','--destination',q])});
 for(const name of ['backend','src','dist'])await cp(join(root,name),join(q,name),{recursive:true});
 await cp(join(root,'package.json'),join(q,'package.json'));await symlink(join(root,'node_modules'),join(q,'node_modules'),'dir');
 const copied=(await isolated(['read'])).state;const snap=await isolated(['backup']);
 const actionPath=join(q,'restore-probe-action.json'),requestPath=join(q,'restore-probe-request.json');
 await writeFile(actionPath,JSON.stringify({type:'report',nodeId:'goal',status:'进行中',result:'仅隔离恢复探针，不是用户验收或主项目报告',remaining:['隔离恢复原快照'],flags:[],reason:'明确标注的隔离技术验证'}));
 await isolated(['make-request','--action',actionPath,'--out',requestPath]);log.push({probe:await isolated(['submit','--request',requestPath])});
 const config=await loadConfig(q);app=await createBridge({root:q,config,port:0});
 const html=await (await fetch(app.url)).text(),token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)throw new Error('隔离网页会话缺失');
 const record=copied.evidenceRecords.find((r:any)=>r.baselineVersion===3)??copied.evidenceRecords.find((r:any)=>r.baselineVersion===2);
 await unlink(join(q,config.dataDirectory,'evidence-files',record.sha256+'.txt'));
 const preview=await isolated(['recovery-preview','--backup-id',snap.id]);const restoreAction=join(q,'restore-action.json'),restoreRequest=join(q,'restore-request.json');
 await writeFile(restoreAction,JSON.stringify({type:'restore',backupId:snap.id,expectedFileHash:preview.fileHash,confirmLoss:true,reason:'仅隔离副本：恢复最终交付快照与缺失证据文件，主项目不回退'}));
 await isolated(['make-request','--action',restoreAction,'--out',restoreRequest]);log.push({restored:await isolated(['recover','--request',restoreRequest,'--confirm-loss'])});
 let rejected=false;try{await isolated(['submit','--request',requestPath]);}catch(e){rejected=String(e).includes('RECOVERY_EPOCH_MISMATCH');}if(!rejected)throw new Error('旧CLI请求未按恢复代次拒绝');
 const oldWeb=await (await fetch(app.url+'/api/state',{headers:{'x-mindmap-session':token}})).json();if(oldWeb.error!=='RECOVERY_EPOCH_MISMATCH')throw new Error('旧网页会话未拒绝');
 const restored=(await isolated(['read'])).state;
 const restoredMap=await isolated(['map']);
 if(restored.mapCheckpoints?.length&&(restoredMap.comparison?.status!=='needs-verification'||restoredMap.nodes.some((n:any)=>n.change)))throw new Error('恢复后误用旧比较点或制造变化');
 log.push({restoredComparison:restoredMap.comparison,oldChangesNotReplayed:true});
 if(restored.recoveryEpoch===copied.recoveryEpoch||restored.evidenceRecords.length!==main.evidenceRecords.length||restored.closures.find((c:any)=>c.baselineVersion===1)?.entries.filter((e:any)=>e.state==='accepted').length!==16||restored.decisions.acceptance.some((d:any)=>d.baselineVersion===2||d.baselineVersion===3)||JSON.stringify(restored.decisions.acceptance)!==JSON.stringify(main.decisions.acceptance)||JSON.stringify(restored.mapCheckpoints)!==JSON.stringify(copied.mapCheckpoints)||!restored.closures.some((c:any)=>c.baselineVersion===2&&c.entries.every((e:any)=>e.state==='pending')))throw new Error('恢复后范围或历史不符');
 for(const r of restored.evidenceRecords){const b=await readFile(join(q,config.dataDirectory,'evidence-files',r.sha256+'.txt'));if(b.length!==r.bytes||digest(b)!==r.sha256)throw new Error('恢复记录摘要错误');}
 const representatives=[restored.evidenceRecords.find((r:any)=>r.baselineVersion===1),restored.evidenceRecords.find((r:any)=>r.baselineVersion===2),restored.evidenceRecords.at(-1)];
 for(const r of representatives){const result=await isolated(['evidence-record','--record',r.id,'--version',r.artifactVersion]);if(result.record.id!==r.id||digest(result.content)!==r.sha256)throw new Error('恢复后实际CLI读取错误');log.push({recordId:r.id,version:r.artifactVersion,contentVerified:true});}
 if(digest(await readFile(join(root,'project-data/state.json')))!==digest(before))throw new Error('隔离验证期间主状态改变');
 const result={recordedAt:new Date().toISOString(),method:'真实CLI主备份/导出/verify/clone；仅临时隔离副本probe/recover/read，主项目没有恢复',mainStateUnchanged:true,mainStateSha256:digest(before),backup,exported,verified,recordsVerified:restored.evidenceRecords.length,historyAccepted:16,currentUserAccepted:0,oldPending:6,comparisonRecordsPreserved:true,missingBlobRestored:true,oldCliRejected:true,oldWebRejected:true,log};
 await writeFile(join(root,'evidence',outputPrefix+(preliminary?'-recovery-check.json':'-recovery.json')),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({verified:true,recordsVerified:result.recordsVerified,mainStateUnchanged:true,oldRequestsRejected:true}));
}finally{await app?.stop();await rm(q,{recursive:true,force:true});}
