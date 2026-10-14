import type {State} from './domain.ts';
/** Original historical evidence is immutable; later failures still invalidate its applicability. */
export function scopedEvidence(s:State,candidateId:string,version:string,acceptanceId:string,baselineVersion:number){
 const all=s.report.evidence.filter(e=>e.candidateId===candidateId&&e.version===version&&e.acceptanceIds.includes(acceptanceId));
 const closure=baselineVersion!==s.baseline.version?s.closures?.find(c=>c.baselineVersion===baselineVersion):undefined;
 const fixed=closure?.entries.find(e=>e.acceptanceId===acceptanceId);const original=closure?all.filter(e=>fixed?.evidenceIds.includes(e.id)):all;
 const last=original.at(-1);if(last?.result!=='pass')return undefined;
 if(closure&&all.slice(all.indexOf(last)+1).some(e=>e.result==='fail'))return undefined;
 return last;
}
