import {projectMap,type ProjectMapNode} from './project-map';
import type {State} from './domain';

export const routeSource={version:'v1.3.1',sha256:'cfb3a227c2ff951f391e5f0c0877bc5cf7bf67d8dc6dc48d89df5090749c835a',releaseSha256:'c90fcdea7b7bb27d87518678c150aac4f0e4d264b9c5373008d74f477f2eeb72'};
// This checkpoint is a versioned execution observation plus the designated review, not a user decision.
export const p2Checkpoint={kind:'CP3 accepted and delivered',reviewRecord:'P2_CP3_ACCEPTANCE.md',reviewScope:'P2阶段展示目标与指定版本本地交付',reviewSha256:'a88ee0da36f5317b5e9de42a6a9f39919d329d91b0d6bbfb2f5e06a9cca84a96',reviewAt:'2026-10-13',reviewer:'01a13546-b721-740a-a227-562e01e79004'};
export const p3Checkpoint={reviewRecord:'P3_CP3_ACCEPTANCE.md',reviewSha256:'423f0681a1797e6492764ef4c760be1f0ff19d60937094047ff911a2cacc2692',reviewer:'01a13546-b721-740a-a227-562e01e79004',reviewAt:'2026-10-13',scope:'P3限定阶段目标及指定版本本地交付，非用户最终验收'};
export const p4CloseoutSource={plan:'P4_TASK_BRIEF_v0.1.md',planSha256:'f82994f77df1edd1a4cb4ae7b7699444914ce4a1cea31a635ab533af6159c96d',review:'P4_PLAN_REVIEW_v0.1.md',reviewSha256:'576377d03e9442ede2c1a0b970d7532ed8c3c261fae10efab8b22d6b46d8c4ee',executionRelease:'P4_AUTOMATIC_CLOSEOUT_START.json',meaning:'获准自动资料收尾，独立现场核验和真人最终接收尚未完成'};
export type StageDefinition={id:string;title:string;goal:string;status:string;remaining:string;taskKeys:string[]};
export const stageDefinitions:StageDefinition[]=[
 {id:'P1',title:'建好可靠的基础',goal:'记录可靠，成果与决定有据可查。',status:'已有基础 · 待核对阶段条件',remaining:'核对新阶段所需保护，保留原成果与决定。',taskKeys:['b1-atomic-state','b1-epoch-safety','b1-project-isolation','b1-capacity-export','b1-evidence-version','b1-decision-boundary','b1-launch-service','b1-handoff','b1-delivery-role']},
 {id:'P2',title:'看清计划和当前位置',goal:'打开就知道整体走到哪里、还差什么。',status:'本阶段已审查并交付',remaining:'P2阶段目标与本地交付通过；下一步P3短计划待审核，尚未开工。',taskKeys:['b1-goal-map','b1-edge-progress','b1-readability','b1-project-content','b2-progress-explanation','b2-closure-state','b3-v07-plan','b3-v07-clean','b3-v07-truth']},
 {id:'P3',title:'随真实工作持续更新',goal:'推进、难题和变化及时反映，不需要你维护。',status:'下一步 · 尚未细化（短计划待审核）',remaining:'任务尚未细化；经审核放行后才验证并行、返工和持续更新。',taskKeys:['b1-opinion-loop','b1-priority-next','b2-iteration-history','b2-continuous-use','b3-v07-problems','b3-v07-changes','b3-v07-maintain']},
 {id:'P4',title:'实际使用与最终确认',goal:'使用顺手，成果、限制和完成情况能核对。',status:'后续任务尚未细化',remaining:'新界面落地后，核对实际使用效果并最终确认。',taskKeys:['b1-node-details','b2-acceptance-pack','b2-readable-evidence']}
];
export type ProgressTone='accepted'|'pending'|'active'|'idle'|'review';
export function taskTone(task:ProjectMapNode,uncertain=false):ProgressTone{
 if(uncertain||task.issues.some(i=>['return','review','unknown'].includes(i.kind))||task.status==='返工'||task.status==='待核对')return 'review';
 if(task.status==='已验收')return 'accepted';
 if(task.status==='待验收')return 'pending';
 if(task.status==='进行中'||task.status==='受阻')return 'active';
 return 'idle';
}
export type CurrentTask=ProjectMapNode&{planPath:string[]};
export type StageView=StageDefinition&{tasks:ProjectMapNode[];accepted:number;pending:number;missing:string[];issues:{text:string;sourceId:string;kind:string}[];recentResolved?:{text:string;sourceId:string};changes:{text:string;sourceId:string}[];currentTasks:CurrentTask[]};
export function stageProgress(state:State){
 // Keep each scope's frozen comparison: the new P3 point cannot erase old changes.
 const currentMap=projectMap(state);
 const historicalPoints=state.mapCheckpoints?.filter(p=>!p.entries.some(e=>e.sourceRefs.some(r=>r.baselineVersion>=4)));
 // After recovery, an explicit fresh checkpoint may reverify all scopes. Opening alone cannot.
 const oldBasis=historicalPoints?.at(-1),latest=state.mapCheckpoints?.at(-1);
 const recoveredBasis=oldBasis&&oldBasis.recoveryEpoch!==state.recoveryEpoch&&latest?.recoveryEpoch===state.recoveryEpoch?latest:undefined;
 const historicalMap=projectMap({...state,mapCheckpoints:recoveredBasis?[recoveredBasis]:historicalPoints});
 const map={...currentMap,nodes:currentMap.nodes.map(n=>n.sourceRefs.some(r=>r.baselineVersion>=4)?n:historicalMap.nodes.find(old=>old.id===n.id)??n)};
 const byId=new Map(map.nodes.map(n=>[n.id,n]));
 const p3Scope=state.baseline.nodes.find(n=>n.id==='p3-goal')?state.baseline:state.decisions.baselineHistory.find(b=>b.nodes.some(n=>n.id==='p3-goal'));
 const currentTasks=p3Scope?[...new Set(p3Scope.nodes.filter(n=>n.parent&&!p3Scope.nodes.some(child=>child.parent===n.id)).map(n=>n.id))].map(id=>byId.get(`b${p3Scope.version}-${id}`)).filter((n):n is ProjectMapNode=>!!n).map(n=>({...n,planPath:planPath(p3Scope,n.sourceRefs[0].nodeId),originLabel:'本阶段工作',next:n.status==='待验收'?'成果已提交，等待阶段审查与交付核对。':n.next,issues:n.issues.map(i=>i.kind==='pending'?{...i,text:'技术成果待阶段审查'}:i)})):[];
 const p3Reviewed=state.baseline.version===4&&state.recoveryEpoch==='8ef7d834-ba09-49ca-92c4-d38468cf70c7'&&!!state.evidenceRecords?.some(r=>r.id==='p3-stage-review-registered-v01'&&r.sha256===p3Checkpoint.reviewSha256)&&[['p3-record','p3-record-c01','p3-record-v01'],['p3-update','p3-update-c01','p3-update-v01'],['p3-verify','p3-verify-c02','p3-verify-v02']].every(([nodeId,id,version])=>{const candidate=state.report.candidates.filter(c=>c.nodeId===nodeId&&c.baselineVersion===4).at(-1);return candidate?.id===id&&candidate.version===version&&currentTasks.find(t=>t.sourceRefs.some(r=>r.nodeId===nodeId))?.status==='待验收';});
 const currentStage=p3Reviewed?'P4':p3Scope?'P3':'P2';
 const stages:StageView[]=stageDefinitions.map(stage=>{
  const tasks=stage.taskKeys.map(key=>byId.get(key)).filter((n):n is ProjectMapNode=>!!n);
  const stageTasks=stage.id==='P3'?currentTasks:[];
  const issues=[...tasks,...stageTasks].flatMap(n=>n.issues.filter(i=>i.kind!=='pending').map(i=>({text:i.text,sourceId:n.id,kind:i.kind})));
  const changes=[...tasks,...stageTasks].filter(n=>n.change).map(n=>({text:n.change!.text,sourceId:n.id}));
  const problem=byId.get('b3-v07-problems');
  const solved=stageTasks.find(n=>n.change?.kind==='resolved'&&n.status==='待验收'&&n.result&&!n.issues.some(i=>i.kind!=='pending'));
  const recentResolved=solved?{text:`${solved.title}：${solved.result}`,sourceId:solved.id}:stage.id==='P2'&&problem?.result.startsWith('已解决大分支连线难辨和关闭详情后焦点丢失')&&!problem.issues.some(i=>['return','review','unknown','blocked'].includes(i.kind))&&['待验收','已验收'].includes(problem.status)?{text:'旧版连线辨认与关闭回焦已修复',sourceId:problem.id}:undefined;
  if(stage.id==='P4'&&p3Reviewed)stage={...stage,status:'资料已准备 · 待现场核验与最终接收',remaining:'资料收尾已完成；仍待独立现场核验和你的最终接收。'};
  const definition=stage.id==='P3'&&p3Scope?{...stage,status:p3Reviewed?'本阶段已审查并交付':stageTasks.some(t=>['受阻','返工','待核对'].includes(t.status))?'正在推进 · 有问题待处理':stageTasks.length&&stageTasks.every(t=>t.status==='待验收'||t.status==='已验收')?'技术成果已提交 · 待阶段审查':stageTasks.some(t=>t.status!=='未开始')?'当前阶段 · 正在推进':'当前阶段 · 已细化，待开始',remaining:p3Reviewed?'P3已审查并交付；P4资料已准备，待独立现场核验与最终接收。':stageTasks.filter(t=>t.status!=='已验收').map(t=>`${t.title}：${t.status==='待验收'?'待阶段审查':t.status}`).join('；')}:stage.id==='P2'&&p3Scope?{...stage,remaining:p3Reviewed?'P2与P3已审查并交付；P4等待独立现场核验与最终接收。':'P2已审查并交付；当前推进P3，最终使用确认留P4。'}:stage;
  return {...definition,tasks,currentTasks:stageTasks,accepted:tasks.filter(n=>taskTone(n)==='accepted').length,pending:tasks.filter(n=>taskTone(n)==='pending').length,missing:stage.taskKeys.filter(key=>!byId.has(key)),issues,recentResolved,changes};
 });
 return {map,stages,currentStage,p3Reviewed,comparisonUncertain:currentMap.comparison?.status==='needs-verification'||historicalMap.comparison?.status==='needs-verification'};
}

function planPath(b:State['baseline'],id:string){const path:string[]=[];const seen=new Set<string>();let node=b.nodes.find(n=>n.id===id);while(node?.parent&&!seen.has(node.parent)){seen.add(node.parent);node=b.nodes.find(n=>n.id===node!.parent);if(node?.parent)path.unshift(node.title);}return path;}
