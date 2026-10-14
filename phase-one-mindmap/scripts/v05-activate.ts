import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {cli,submit,root} from './v05-cli-helpers.ts';
import {validateBaseline,baselineSchema} from '../src/domain.ts';
import {hash} from '../backend/store.ts';

const expected=['closure-state','acceptance-pack','iteration-history','progress-explanation','readable-evidence','continuous-use'];
const proposal=baselineSchema.parse({version:2,...JSON.parse(await readFile(join(root,'v05-baseline-proposal.json'),'utf8'))});validateBaseline(proposal);
if(proposal.acceptance.length!==6||proposal.acceptance.some((a,i)=>a.nodeId!==expected[i]||a.id!=='v05-accept-'+expected[i]||a.weight!==1||a.method!=='user')||proposal.autoRules.length)throw new Error('计划六项范围不匹配');
const before=(await cli(['read'])).state;
if(before.projectId!=='progress-mindmap-self'||before.baseline.version!==1||before.baseline.acceptance.length!==16||before.baseline.acceptance.some((a:any)=>before.decisions.acceptance.filter((d:any)=>d.acceptanceId===a.id&&d.baselineVersion===1).at(-1)?.state!=='accepted'))throw new Error('原项目身份或B1真实验收边界不满足');
if(process.argv[2]!=='--apply'){console.log(JSON.stringify({preview:true,fromBaseline:1,toBaseline:2,currentScope:expected,oldAccepted:16}));process.exit(0);}
await readFile(join(root,'evidence/v05-stage2-review.md')); // 已完成独立审核，实际执行仍由本聊天明确授权。
const dir=await mkdtemp(join(tmpdir(),'v05-activate-'));const log:any[]=[];
try{
 log.push({backup:await cli(['backup'])});
 log.push(await submit(dir,{type:'propose',id:'v05-approved-six-scope',nodeId:'goal',reason:'用户明确批准补充后的v0.5六项实施范围；提案只启动本轮工作，不构成成果验收。',baseline:proposal}));
 const config=JSON.parse(await readFile(join(root,'project.config.json'),'utf8'));const url=`http://127.0.0.1:${config.port}`;
 const html=await (await fetch(url)).text();const token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)throw new Error('缺少受控本地会话');
 const headers={'x-mindmap-session':token};
 const context=await (await fetch(url+'/api/context',{headers})).json();
 if(context.rootFingerprint!==hash(root.replace(/\/$/,''))||context.project?.projectId!==before.projectId||context.project?.kind!=='real')throw new Error('本地服务身份不匹配');
 const s=(await (await fetch(url+'/api/state',{headers})).json()).state;
 if(s.baseline.version!==1||s.recoveryEpoch!==before.recoveryEpoch||s.revision!==before.revision+1)throw new Error('启用期间状态已变化，保留最新状态并停止核对');
 const action={type:'approve-proposal',proposalId:'v05-approved-six-scope',approve:true,reason:'用户已授权补充后的v0.5六项连续实施；Codex经受控网页入口代录范围批准，非成果验收，不增加CLI用户权限。',iteration:{id:'v05',title:'v0.5 持续使用'}};
 const res=await fetch(url+'/api/action',{method:'POST',headers:{...headers,'content-type':'application/json',origin:url},body:JSON.stringify({schemaVersion:2,projectId:s.projectId,expectedRevision:s.revision,baselineVersion:s.baseline.version,recoveryEpoch:s.recoveryEpoch,operationId:randomUUID(),action})});const receipt=await res.json();if(!res.ok)throw new Error(JSON.stringify(receipt));log.push({action,receipt});
 const after=(await cli(['read'])).state;
 if(after.baseline.version!==2||after.baseline.acceptance.length!==6||after.decisions.acceptance.length!==before.decisions.acceptance.length||after.closures?.at(-1)?.entries.filter((e:any)=>e.state==='accepted').length!==16)throw new Error('启用后边界异常');
 await writeFile(join(root,'evidence/v05-real-activation.json'),JSON.stringify({method:'真实CLI提案；受控本地网页入口依据明确六项计划授权批准，未写新验收',recordedAt:new Date().toISOString(),beforeRevision:before.revision,afterRevision:after.revision,baselineVersion:2,acceptance:0,total:6,historyAccepted:16,log},null,2),{mode:0o600});
 console.log(JSON.stringify({activated:true,baselineVersion:2,acceptance:'0/6',historical:'16/16',revision:after.revision}));
}finally{await rm(dir,{recursive:true,force:true});}
