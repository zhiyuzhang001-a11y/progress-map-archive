import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cli,submit,root} from './v05-cli-helpers.ts';
import {createHash} from 'node:crypto';

const command=process.argv[2];
if(!['start','deliver','refresh'].includes(command??''))throw new Error('仅支持start、deliver或refresh');
const read=await cli(['read']),s=read.state;
if(s.projectId!=='progress-mindmap-self'||s.baseline.version!==2||s.iteration?.id!=='v05'||s.baseline.acceptance.length!==6||s.decisions.acceptance.some((d:any)=>d.baselineVersion===2))throw new Error('真实v0.5未验收边界不匹配');
const nodeIds=s.baseline.acceptance.map((a:any)=>a.nodeId);
const dir=await mkdtemp(join(tmpdir(),'v05-report-'));
try{
 if(command==='start'){
  const log=[await submit(dir,{type:'run-start',runId:'v05-continuous-use',nodeIds,opinionIds:[],reason:'用户已批准补充后的v0.5，真实CLI读取当前六项目标并开始实际持续使用轮次。阶段一二已隔离验证，接续阶段三，不代表用户成果验收。'})];
  await writeFile(join(root,'evidence/v05-real-run-start.json'),JSON.stringify({recordedAt:new Date().toISOString(),method:'真实Node CLI子进程read/make-request/submit；记录实际读取，不补造之前页面已读',readRevision:s.revision,baselineVersion:2,targets:s.baseline.acceptance,log},null,2),{mode:0o600});
  console.log(JSON.stringify({started:true,runId:'v05-continuous-use',readRevision:s.revision,currentAcceptance:'0/6'}));
 }else{
  if(command==='deliver'&&s.report.runs.find((r:any)=>r.id==='v05-continuous-use')?.state!=='open')throw new Error('真实轮次不是open，禁止重复报告');
  const m=JSON.parse(await readFile(join(root,'evidence/v05-artifact-manifest.json'),'utf8'));
  const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  for(const f of [...m.files,...m.checks]){const b=await readFile(join(root,f.path));if(digest(b)!==f.sha256||b.length!==f.bytes)throw new Error('实际产物或记录已变化：'+f.path);}
  const suffix=m.artifactVersion.slice(-10),log:any[]=[],records:any[]=[];
  const runId=command==='refresh'?'v05-final-verification-'+suffix:'v05-continuous-use';
  if(command==='refresh')log.push(await submit(dir,{type:'run-start',runId,nodeIds,opinionIds:[],reason:'最终交付验证脚本修正并实际复验，更新整个成果版本绑定；原候选及记录保留，不创建用户验收。'}));
  const results:Record<string,string>={
   'closure-state':'页面结项、下一步和待决定按有效状态一致显示，保留工作完成与用户验收的区别。',
   'acceptance-pack':'权威验收包支持整体或选定部分原子通过、明确回执和原请求重试；冲突和旧代次拒绝。',
   'iteration-history':'本工具已进入六项当前工作，B1固定16/16及原验收链可查；不变事项合法引用原链，新范围不自动验收。',
   'progress-explanation':'新增范围、条件变更、证据复核与用户退回分别说明，不把范围增加显示为旧成果失败。',
   'readable-evidence':'成果先显示简明说明，登记记录可安全只读展开；内容、路径、大小和版本校验，命令及脚本不执行、外部资源不自动加载。',
   'continuous-use':'真实CLI读取六项目标、记录成果与证据、网页同步和最终验收包已串联；必要证据随备份导出及隔离恢复核对。'};
  for(const a of s.baseline.acceptance){
   const candidateId=`v05-candidate-${a.nodeId}-${suffix}`,evidenceId=`v05-evidence-${a.nodeId}-${suffix}`;
   log.push(await submit(dir,{type:'report',nodeId:a.nodeId,status:'待验收',result:results[a.nodeId],reason:'补充后的v0.5实际实施、自测及独立审核完成；技术结论不代填用户决定。',remaining:['等待你最终验收；可核对本轮验收包后整体通过、部分通过或退回。'],flags:[],runId,candidate:{id:candidateId,version:m.artifactVersion,result:results[a.nodeId]},evidence:[{id:evidenceId,candidateId,acceptanceIds:[a.id],version:m.artifactVersion,check:'本轮实际技术检查和分阶段独立复核；历史76项没有当成本轮检查，用户体验留待真实最终验收。',result:'pass',reference:m.checks.map((c:any)=>c.path).join('；'),at:m.recordedAt,provenance:{command:'实际本轮Node24构建、模型/后端隔离测试、Playwright浏览器与200节点基准；详见各原始日志',scenario:a.condition+'；所有测试验收仅在隔离项目，真实主项目不破坏性恢复。',artifactVersion:m.artifactVersion,record:m.checks.map((c:any)=>c.path).join('；')}}]}));
   for(const f of [...m.checks,{path:'evidence/artifact-manifests/'+m.artifactVersion+'.json'}]){
    const b=await readFile(join(root,f.path));records.push({id:`v05-${a.nodeId}-${suffix}-${digest(Buffer.from(f.path)).slice(0,12)}`,projectId:s.projectId,baselineVersion:2,candidateId,evidenceId,artifactVersion:m.artifactVersion,relativePath:f.path,sha256:digest(b),bytes:b.length,mediaType:f.path.endsWith('.json')?'application/json':'text/plain',title:`${s.baseline.nodes.find((n:any)=>n.id===a.nodeId).title} · ${f.path.split('/').at(-1)}`});
   }
  }
  for(let i=0;i<records.length;i+=50)log.push(await submit(dir,{type:'register-evidence',records:records.slice(i,i+50),reason:'登记本轮实际检查与成果清单，内容可核对且不产生用户验收。'}));
  for(const nodeId of ['goal','stage-one','stage-two','stage-three'])log.push(await submit(dir,{type:'report',nodeId,status:'待验收',result:nodeId==='goal'?'v0.5六项技术成果已完成，B1历史仍16/16；请查看验收包决定本轮成果。':'本阶段实施、自测和独立复核完成，叶子成果与证据可查。',reason:'用户只负责最终验收，技术准备不构成通过。',remaining:['等待用户最终验收'],flags:[]}));
  const after=(await cli(['read'])).state;
  if(after.decisions.acceptance.some((d:any)=>d.baselineVersion===2)||after.report.runs.find((r:any)=>r.id===runId)?.state!=='finished')throw new Error('最终待验收边界异常');
  await writeFile(join(root,command==='refresh'?'evidence/v05-real-delivery-refresh.json':'evidence/v05-real-delivery-report.json'),JSON.stringify({recordedAt:new Date().toISOString(),method:'真实Node CLI子进程read/make-request/submit，未创建本轮验收',artifactVersion:m.artifactVersion,baselineVersion:2,revision:after.revision,registered:records.length,log},null,2),{mode:0o600});
  console.log(JSON.stringify({reported:6,registered:records.length,artifactVersion:m.artifactVersion,revision:after.revision,acceptance:'0/6',historical:'16/16'}));
 }
}finally{await rm(dir,{recursive:true,force:true});}
