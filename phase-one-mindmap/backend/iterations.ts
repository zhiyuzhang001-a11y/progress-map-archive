import {randomUUID} from 'node:crypto';
import {effectiveDecision,canCarry,fail,type State,type Baseline} from '../src/domain.ts';
export function activateIteration(s:State,next:Baseline,iteration:{id:string;title:string}|undefined,at:string){
 const old=s.baseline;if(s.iteration&&s.closures?.some(c=>c.iterationId===s.iteration!.id))fail('INVALID_TRANSITION','当前轮次已结项');
 const entries=old.acceptance.map(a=>{const d=effectiveDecision(s,a.id);const c=d?(d.candidateId?s.report.candidates.find(c=>c.id===d.candidateId):undefined):s.report.candidates.filter(c=>c.nodeId===a.nodeId&&c.baselineVersion===old.version).at(-1);return {acceptanceId:a.id,state:d?.state??'pending' as 'pending',...(d?{decisionId:d.id,version:d.version}:{}),...(c?{candidateId:c.id,version:c.version}:{}),evidenceIds:c?s.report.evidence.filter(e=>e.candidateId===c.id&&e.version===c.version&&e.acceptanceIds.includes(a.id)).map(e=>e.id):[]};});
 const close={id:randomUUID(),projectId:s.projectId,iterationId:s.iteration?.id??`baseline-${old.version}`,title:s.iteration?.title??`B${old.version} 已结束轮次`,baselineVersion:old.version,cutoffRevision:s.revision,recoveryEpoch:s.recoveryEpoch,at,entries};
 if(s.closures?.some(c=>c.baselineVersion===old.version))fail('INVALID_TRANSITION','此基线结项已固定');
 if(iteration&&(s.closures?.some(c=>c.iterationId===iteration.id)||s.iteration?.id===iteration.id))fail('DUPLICATE_ID','轮次标识已使用');
 (s.closures??=[]).push(close);s.decisions.baselineHistory.push(structuredClone(old));
 for(const a of next.acceptance){const d=effectiveDecision(s,a.id,old.version);if(!d||d.state!=='accepted'||!canCarry(old,next,a.id))continue;
  const c=s.report.candidates.find(c=>c.id===d.candidateId);const latest=s.report.candidates.filter(c=>c.nodeId===a.nodeId).at(-1);const evidence=s.report.evidence.filter(e=>e.candidateId===c?.id&&e.version===d.version&&e.acceptanceIds.includes(a.id)).at(-1);
  if(!c||latest?.id!==c.id||evidence?.result!=='pass')continue;
  (s.carriedAcceptance??=[]).push({acceptanceId:a.id,baselineVersion:next.version,sourceDecisionId:d.id,sourceBaselineVersion:d.baselineVersion,state:'accepted',reason:'目标、条件、归属、权重、规则与原成果适用性未改变，合法引用原验收链',at});
 }
 // Legacy reports retain their original scope before this atomic activation.
 for(const run of s.report.runs)if(run.baselineVersion===undefined){const matches=[...s.decisions.baselineHistory,old].filter(b=>run.nodeIds.every(id=>b.nodes.some(n=>n.id===id)));const historical=(s.closures??[]).filter(c=>matches.some(b=>b.version===c.baselineVersion)&&Date.parse(run.at)<=Date.parse(c.at)).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))[0];run.baselineVersion=historical?.baselineVersion??matches.at(-1)?.version??old.version;}
 for(const report of s.report.nodes)if(report.baselineVersion===undefined)report.baselineVersion=old.version;
 s.baseline=structuredClone(next);s.iteration={id:iteration?.id??`baseline-${next.version}`,title:iteration?.title??`B${next.version} 当前轮次`,baselineVersion:next.version,startedRevision:s.revision+1,startedEpoch:s.recoveryEpoch};
}
export function iterationSummary(s:State){
 const accepted=s.baseline.acceptance.filter(a=>effectiveDecision(s,a.id)?.state==='accepted');
 const previous=s.decisions.baselineHistory.at(-1);const added=s.baseline.acceptance.filter(a=>!previous?.acceptance.some(p=>p.id===a.id));const changed=s.baseline.acceptance.filter(a=>previous?.acceptance.some(p=>p.id===a.id)&&!canCarry(previous!,s.baseline,a.id));
 const changes:{kind:'scope-added'|'condition-changed'|'evidence-review'|'user-return';acceptanceIds:string[];reason:string}[]=[];
 if(previous&&added.length)changes.push({kind:'scope-added',acceptanceIds:added.map(a=>a.id),reason:'新增工作扩大当前范围，历史通过成果保持原结项结论'});
 if(changed.length)changes.push({kind:'condition-changed',acceptanceIds:changed.map(a=>a.id),reason:'目标或验收条件变化，需要针对新范围重新提交成果'});
 for(const [state,kind] of [['review','evidence-review'],['withdrawn','user-return']] as const){const ids=s.baseline.acceptance.filter(a=>effectiveDecision(s,a.id)?.state===state);if(ids.length)changes.push({kind,acceptanceIds:ids.map(a=>a.id),reason:ids.map(a=>effectiveDecision(s,a.id)!.reason).join('；')});}
 return {current:{...(s.iteration??{id:`baseline-${s.baseline.version}`,title:`B${s.baseline.version} 当前轮次`,baselineVersion:s.baseline.version,startedRevision:0,startedEpoch:s.recoveryEpoch}),accepted:accepted.length,total:s.baseline.acceptance.length,weightAccepted:accepted.reduce((n,a)=>n+a.weight,0),weightTotal:s.baseline.acceptance.reduce((n,a)=>n+a.weight,0)},history:(s.closures??[]).map(c=>({...c,accepted:c.entries.filter(e=>e.state==='accepted').length,total:c.entries.length})),changes};
}

export type IterationSummary=ReturnType<typeof iterationSummary>;
