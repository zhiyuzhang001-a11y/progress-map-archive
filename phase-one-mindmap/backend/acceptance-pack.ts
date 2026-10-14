import {scopedEvidence} from '../src/scope-evidence.ts';
import {createHash} from 'node:crypto';
import {fail,effectiveDecision,type State,type AcceptancePack} from '../src/domain.ts';
/** Snapshot of every condition, not only selected items. No client provenance confers a capability. */
export function acceptancePack(s:State,baselineVersion=s.baseline.version):AcceptancePack{
 const baseline=[...s.decisions.baselineHistory,s.baseline].find(b=>b.version===baselineVersion);if(!baseline)fail('INVALID_REFERENCE','验收范围不存在');const closure=baselineVersion!==s.baseline.version?s.closures?.find(c=>c.baselineVersion===baselineVersion):undefined;if(baselineVersion!==s.baseline.version&&!closure)fail('INVALID_REFERENCE','历史验收范围没有固定来源');
 if(baseline.acceptance.length>100)fail('PACK_LIMIT','验收包最多100项，请使用单项验收');
 const items:AcceptancePack['items']=baseline.acceptance.map(a=>{
  const d=effectiveDecision(s,a.id,baselineVersion);
  const fixed=closure?.entries.find(e=>e.acceptanceId===a.id);
  const c=fixed?.candidateId?s.report.candidates.find(c=>c.id===fixed.candidateId&&c.version===fixed.version):d?.state==='accepted'&&d.candidateId?s.report.candidates.find(c=>c.id===d.candidateId):s.report.candidates.filter(c=>c.nodeId===a.nodeId&&c.baselineVersion===baselineVersion).at(-1);
  const e=c?scopedEvidence(s,c.id,c.version,a.id,baselineVersion):undefined;
  return {acceptanceId:a.id,nodeId:a.nodeId,condition:a.condition,weight:a.weight,state:d?.state==='accepted'?'accepted':d?.state??'pending',...(c?{candidateId:c.id,version:c.version}:{}),...(e?{evidenceId:e.id,check:e.check}:{}),result:c?.result??s.report.nodes.find(r=>r.nodeId===a.nodeId&&(r.baselineVersion===baselineVersion||r.baselineVersion===undefined&&!s.iteration))?.result??'',ready:!!c&&!!e&&d?.state!=='accepted'};
 });
 const snapshot={projectId:s.projectId,baselineVersion,revision:s.revision,recoveryEpoch:s.recoveryEpoch,items,acceptedIds:items.filter(i=>i.state==='accepted').map(i=>i.acceptanceId),pendingIds:items.filter(i=>i.state!=='accepted').map(i=>i.acceptanceId)};
 return {...snapshot,packId:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')};
}
