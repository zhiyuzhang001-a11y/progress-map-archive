import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {cli,submit,root} from './v05-cli-helpers.ts';
const command=process.argv[2];if(!['start','deliver','refresh'].includes(command??''))throw new Error('支持start/deliver/refresh');
const s=(await cli(['read'])).state;
if(s.projectId!=='progress-mindmap-self'||s.baseline.version!==3||s.iteration?.id!=='v07'||s.baseline.acceptance.length!==6||s.decisions.acceptance.some((d:any)=>d.baselineVersion===2||d.baselineVersion===3))throw new Error('本项目新旧待验收范围不匹配');
const nodeIds=s.baseline.acceptance.map((a:any)=>a.nodeId),dir=await mkdtemp(join(tmpdir(),'v07-report-'));
const opinionId='v07-conversation-clean-map';
const results:Record<string,string>={
 'v07-plan':'已分清此前已验收、上一轮成果和这次改版，中心与四个分计划可以展开查看具体工作。',
 'v07-clean':'首页只保留导图，点击看详情；卡片正文写具体成果，关闭后回到原卡。',
 'v07-truth':'旧成果保留原验收结论，上一轮和这次交付仍待确认，技术检查没有算成用户通过。',
 'v07-problems':'已解决大分支连线难辨和关闭详情后焦点丢失：现在可追踪所属计划，关闭后回到原卡。已报告的开发事项当前无受阻记录；下一步是检查实际阅读与操作体验。',
 'v07-changes':'已把笼统的变化提示改为具体事项与前后状态，点选可以追到对应工作；刷新或改写说明不会产生新的进度事件。',
 'v07-maintain':'窄屏分计划详情列出全部事项，点选可定位并返回；记录和相关资料继续由Codex更新及核对保留。',
};
try{
 const log:any[]=[];
 if(command==='start'){
  const url='http://127.0.0.1:'+JSON.parse(await readFile(join(root,'project.config.json'),'utf8')).port;
  const html=await (await fetch(url)).text(),token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)throw new Error('主会话缺失');
  const headers={'x-mindmap-session':token};const latest=(await (await fetch(url+'/api/state',{headers})).json()).state;
  if(latest.revision!==s.revision||latest.projectId!==s.projectId||latest.recoveryEpoch!==s.recoveryEpoch)throw new Error('录入意见前状态发生变化');
  const quote='这个思维导图是给我看的，我就关注总计划，分计划，进展，难题，以及完成情况。你可以保留一些隐藏的东西给gpt看，一些技术细节，他需要的东西。但是这些东西不要放到主页面，我不想看那些细节。整个页面最好还需要整洁，清理一下，东西太多了，就放思维导图，点击卡片出现详情等就可以。我要让他看起来有效率，简洁，不要其他什么提示文字，按钮，统统不需要。';
  const action={type:'opinion',id:opinionId,nodeId:'v07-clean',text:quote};
  const response=await fetch(url+'/api/action',{method:'POST',headers:{...headers,'content-type':'application/json',origin:url},body:JSON.stringify({schemaVersion:2,projectId:s.projectId,expectedRevision:s.revision,baselineVersion:3,recoveryEpoch:s.recoveryEpoch,operationId:randomUUID(),action})});
  const receipt=await response.json();if(!response.ok)throw new Error(JSON.stringify(receipt));log.push({action,receipt,provenance:'本聊天2026-10-12原话，Codex经本地受控入口代录；时间是录入时间，不补造原消息时间。存储来源web-local-user表示入口，不表示网页人工点击。'});
  log.push(await submit(dir,{type:'run-start',runId:'v07-continuous-use',nodeIds,opinionIds:[opinionId],reason:'用户授权完整v0.7实施；真实CLI读取六项目标、确认原意见，接续实际验证，不代表成果验收。'}));
  for(const nodeId of nodeIds)log.push(await submit(dir,{type:'report',nodeId,status:'进行中',result:'计划内容与导图骨架已完成核对，正在完善连续更新和最终实际使用检查。',reason:'实际技术准备进展；阶段一二审核已通过，尚待最终验证。',remaining:['完成实际使用与恢复验证','提交你最终验收'],flags:[]}));
  log.push(await submit(dir,{type:'report',nodeId:'goal',status:'进行中',result:'正在把整个项目的计划、进展与难题整理成简洁导图，已有成果和待确认内容继续保留。',reason:'本次真实范围已经开始，阶段一二通过，接续阶段三验证。',remaining:['完成实际使用与恢复验证','提交你最终验收'],flags:[]}));
  log.push(await submit(dir,{type:'map-checkpoint',reason:'固定本次真实六项开始后的比较点。后续报告、刷新、重开不重设；用户决定不变。'}));
  await writeFile(join(root,'evidence/v07-real-run-start.json'),JSON.stringify({recordedAt:new Date().toISOString(),readRevision:s.revision,targets:s.baseline.acceptance,log},null,2),{mode:0o600});
 }else{
  const m=JSON.parse(await readFile(join(root,'evidence/v07-artifact-manifest.json'),'utf8')),digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  for(const f of [...m.files,...m.checks]){const b=await readFile(join(root,f.path));if(b.length!==f.bytes||digest(b)!==f.sha256)throw new Error('冻结成果或检查已变化：'+f.path);}
  const suffix=m.artifactVersion.slice(-10),runId=command==='refresh'?'v07-refresh-'+suffix:'v07-continuous-use';
  if(command==='refresh')log.push(await submit(dir,{type:'run-start',runId,nodeIds,opinionIds:[opinionId],reason:'实际复验后更新本轮成果版本；不删除旧候选或代填验收。'}));
  else if(s.report.runs.find((r:any)=>r.id===runId)?.state!=='open')throw new Error('实际报告轮次不是open');
  const records:any[]=[];
  for(const a of s.baseline.acceptance){
   const candidateId='v07-c-'+a.nodeId+'-'+suffix,evidenceId='v07-e-'+a.nodeId+'-'+suffix;
   log.push(await submit(dir,{type:'report',nodeId:a.nodeId,status:'待验收',result:results[a.nodeId],reason:'本轮实施、实际检查与独立审核完成；最终阅读和视觉是否合适仍由用户确认。',remaining:['等待你最后验收'],flags:[],runId,candidate:{id:candidateId,version:m.artifactVersion,result:results[a.nodeId]},evidence:[{id:evidenceId,candidateId,acceptanceIds:[a.id],version:m.artifactVersion,check:'本版本实际定向检查见冻结清单；历史全量检查只作历史依据，后续主页面与隔离恢复另登记；用户验收未代填。',result:'pass',reference:m.checks.map((c:any)=>c.path).join('；'),at:m.recordedAt,provenance:{command:'本版本实际Node24构建、定向模型与Playwright交互核对；详见冻结检查记录。未复跑的历史全量及规模检查不计为本版本实测。',scenario:a.condition,artifactVersion:m.artifactVersion,record:m.checks.map((c:any)=>c.path).join('；')}}]}));
   for(const f of [...m.checks,{path:'evidence/artifact-manifests/'+m.artifactVersion+'.json'}]){const b=await readFile(join(root,f.path));records.push({id:'v07-'+a.nodeId+'-'+suffix+'-'+digest(Buffer.from(f.path)).slice(0,12),projectId:s.projectId,baselineVersion:3,candidateId,evidenceId,artifactVersion:m.artifactVersion,relativePath:f.path,sha256:digest(b),bytes:b.length,mediaType:f.path.endsWith('.json')?'application/json':'text/plain',title:s.baseline.nodes.find((n:any)=>n.id===a.nodeId).title+' · '+f.path.split('/').at(-1)});}
   if(a.nodeId==='v07-clean')log.push(await submit(dir,{type:'respond',id:'v07-opinion-result-'+suffix,opinionId,text:'已按你的意见清理为纯导图，点击才看简洁详情；具体效果等待你的最终意见。',implemented:true,candidateId,evidenceId}));
  }
  for(let i=0;i<records.length;i+=50)log.push(await submit(dir,{type:'register-evidence',records:records.slice(i,i+50),reason:'登记本次实际检查与成果清单，不产生用户验收。'}));
  log.push(await submit(dir,{type:'report',nodeId:'goal',status:'待验收',result:'总计划分清旧成果与这次改版，具体变化和已解决问题可以追到事项；窄屏全部子项可以查看和定位。阅读与操作体验仍等你最后确认。',reason:'本轮技术准备完成，不代填用户验收。',remaining:['体验复验与用户最后确认'],flags:[]}));
  const after=(await cli(['read'])).state;
  if(after.decisions.acceptance.some((d:any)=>d.baselineVersion===2||d.baselineVersion===3)||after.report.runs.find((r:any)=>r.id===runId)?.state!=='finished')throw new Error('待验收边界或实际轮次异常');
  await writeFile(join(root,command==='refresh'?'evidence/v07-real-delivery-refresh.json':'evidence/v07-real-delivery-report.json'),JSON.stringify({recordedAt:new Date().toISOString(),artifactVersion:m.artifactVersion,revision:after.revision,registered:records.length,log},null,2),{mode:0o600});
 }
 console.log(JSON.stringify({command,revision:(await cli(['read'])).state.revision,newUserAccepted:0,oldPending:6}));
}finally{await rm(dir,{recursive:true,force:true});}
