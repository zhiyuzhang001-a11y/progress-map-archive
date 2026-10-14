import {readFile,writeFile,mkdtemp,rm,lstat,realpath} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {cli,submit,root} from './v05-cli-helpers.ts';

const digest=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const s=(await cli(['read'])).state;
if(s.projectId!=='progress-mindmap-self'||s.baseline.version!==2||s.closures?.find((c:any)=>c.baselineVersion===1)?.entries.filter((e:any)=>e.state==='accepted').length!==16)throw new Error('原B1结项链不满足');
const closure=s.closures.find((c:any)=>c.baselineVersion===1);const records:any[]=[];
for(const entry of closure.entries){
 for(const evidenceId of entry.evidenceIds){
  const e=s.report.evidence.find((e:any)=>e.id===evidenceId),c=s.report.candidates.find((c:any)=>c.id===entry.candidateId);
  if(!e||!c||e.candidateId!==c.id||c.baselineVersion!==1||e.version!==c.version)throw new Error('历史证据链不匹配');
  const paths=[...new Set((e.reference.match(/evidence\/[a-zA-Z0-9_./-]+/g)??[]) as string[])];
  if(!paths.length)throw new Error('历史证据无可登记记录');
  for(const path of paths){
   const p=resolve(root,path),st=await lstat(p);const actual=await realpath(p);
   if(!path.startsWith('evidence/')||path.includes('..')||relative(resolve(root,'evidence'),actual).startsWith('..')||st.isSymbolicLink()||!st.isFile()||st.size>1_000_000)throw new Error('历史记录路径或大小不合法');
   const b=await readFile(p);const id='history-'+digest(e.id+'\n'+path).slice(0,24);
   records.push({id,projectId:s.projectId,baselineVersion:1,candidateId:c.id,evidenceId:e.id,artifactVersion:c.version,relativePath:path,sha256:digest(b),bytes:b.length,mediaType:path.endsWith('.json')?'application/json':'text/plain',title:`B1 · ${closure.entries.find((x:any)=>x.evidenceIds.includes(e.id))?.acceptanceId??entry.acceptanceId} · ${path.split('/').at(-1)}`});
  }
 }
}
const pending=records.filter(r=>!s.evidenceRecords?.some((x:any)=>x.id===r.id));
if(process.argv[2]!=='--apply'){console.log(JSON.stringify({preview:true,historicalRecords:records.length,toRegister:pending.length,sourceBaseline:1}));process.exit(0);}
const dir=await mkdtemp(join(tmpdir(),'v05-history-evidence-'));const log:any[]=[];
try{
 for(let i=0;i<pending.length;i+=50)log.push(await submit(dir,{type:'register-evidence',records:pending.slice(i,i+50),reason:'登记固定B1实际证据内容与原版本，不复制原验收、不把旧检查充当本轮成果。'}));
 await writeFile(join(root,'evidence/v05-history-registration.json'),JSON.stringify({recordedAt:new Date().toISOString(),method:'真实CLI登记B1实际原记录并安全保存内容副本',records,log},null,2),{mode:0o600});
 console.log(JSON.stringify({registered:pending.length,historicalRecords:records.length,newUserDecisions:0}));
}finally{await rm(dir,{recursive:true,force:true});}
