import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {cli,submit,root} from './v05-cli-helpers.ts';
import {validateBaseline,baselineSchema} from '../src/domain.ts';
import {hash} from '../backend/store.ts';

const expected=['plan','clean','truth','problems','changes','maintain'];
const proposal=baselineSchema.parse(JSON.parse(await readFile(join(root,'v07-baseline-proposal.json'),'utf8')));
validateBaseline(proposal);
if(proposal.version!==3||proposal.acceptance.length!==6||proposal.acceptance.some((a,i)=>a.nodeId!=='v07-'+expected[i]||a.id!=='v07-accept-'+expected[i]||a.weight!==1||a.method!=='user')||proposal.autoRules.length)throw new Error('本次授权六项范围不匹配');
const before=(await cli(['read'])).state;
if(before.projectId!=='progress-mindmap-self'||before.baseline.version!==2||before.baseline.acceptance.length!==6||before.decisions.acceptance.some((d:any)=>d.baselineVersion===2)||before.decisions.acceptance.filter((d:any)=>d.baselineVersion===1).length!==16)throw new Error('原项目范围或真实验收边界不满足');
if(process.argv[2]!=='--apply'){console.log(JSON.stringify({preview:true,fromBaseline:2,toBaseline:3,newScope:expected,preservedPending:6,preservedAccepted:16}));process.exit(0);}
await readFile(join(root,'evidence/v07-stage2-review.md'));
const dir=await mkdtemp(join(tmpdir(),'v07-activate-'));const log:any[]=[];
try{
 log.push({backup:await cli(['backup'])});
 log.push(await submit(dir,{type:'propose',id:'v07-approved-six-scope',nodeId:'goal',reason:'本聊天用户明确授权完整实施经独立审查修订的v0.7；只批准六项工作范围，不验收成果。',baseline:proposal}));
 const config=JSON.parse(await readFile(join(root,'project.config.json'),'utf8'));const url=`http://127.0.0.1:${config.port}`;
 const html=await (await fetch(url)).text();const token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)throw new Error('受控本地会话缺失');
 const headers={'x-mindmap-session':token};const context=await (await fetch(url+'/api/context',{headers})).json();
 if(context.rootFingerprint!==hash(root.replace(/\/$/,''))||context.project?.projectId!==before.projectId||context.project?.kind!=='real')throw new Error('本地服务身份不匹配');
 const s=(await (await fetch(url+'/api/state',{headers})).json()).state;
 if(s.baseline.version!==2||s.recoveryEpoch!==before.recoveryEpoch||s.revision!==before.revision+1)throw new Error('范围批准前事实已变化，需重新核对，不覆盖新决定');
 const action={type:'approve-proposal',proposalId:'v07-approved-six-scope',approve:true,reason:'依据本聊天用户授权由Codex经受控入口代录本次六项范围批准，非用户成果验收。',iteration:{id:'v07',title:'让项目地图清楚、简洁、真实'}};
 const response=await fetch(url+'/api/action',{method:'POST',headers:{...headers,'content-type':'application/json',origin:url},body:JSON.stringify({schemaVersion:2,projectId:s.projectId,expectedRevision:s.revision,baselineVersion:2,recoveryEpoch:s.recoveryEpoch,operationId:randomUUID(),action})});
 const receipt=await response.json();if(!response.ok)throw new Error(JSON.stringify(receipt));log.push({action,receipt});
 const after=(await cli(['read'])).state;
 if(after.baseline.version!==3||after.baseline.acceptance.length!==6||JSON.stringify(after.decisions.acceptance)!==JSON.stringify(before.decisions.acceptance)||JSON.stringify(after.report.candidates)!==JSON.stringify(before.report.candidates)||JSON.stringify(after.report.evidence)!==JSON.stringify(before.report.evidence)||JSON.stringify(after.evidenceRecords)!==JSON.stringify(before.evidenceRecords)||!after.closures?.some((c:any)=>c.baselineVersion===2&&c.entries.every((e:any)=>e.state==='pending')))throw new Error('启用后原事实或新范围异常');
 await writeFile(join(root,'evidence/v07-real-activation.json'),JSON.stringify({recordedAt:new Date().toISOString(),method:'真实CLI提案及受控本地范围批准；原B2候选/证据/登记和B1决定逐项未变，不产生本次用户验收',beforeRevision:before.revision,afterRevision:after.revision,baselineVersion:3,accepted:0,total:6,preservedPendingBaseline:2,log},null,2),{mode:0o600});
 console.log(JSON.stringify({activated:true,revision:after.revision,accepted:0,total:6,oldPending:6,originalAccepted:16}));
}finally{await rm(dir,{recursive:true,force:true});}
