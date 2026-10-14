import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {stageProgress,taskTone,p2Checkpoint,p3Checkpoint,p4CloseoutSource} from './stage-progress';
import type {ProjectMapNode} from './project-map';
import type {ProjectHook} from './useProject';
import './stage-progress.css';

type Selected={kind:'stage';id:string}|{kind:'task';id:string;stageId:string};
export function StageProgressScreen({project}:{project:ProjectHook}){
 const {map,stages,currentStage,comparisonUncertain,p3Reviewed}=useMemo(()=>stageProgress(project.read!.state),[project.read]);
 const [expanded,setExpanded]=useState<string>(currentStage),[selected,setSelected]=useState<Selected|null>(null);
 const opener=useRef<HTMLButtonElement|null>(null),returnTo=useRef<HTMLButtonElement|null>(null),dialog=useRef<HTMLDivElement>(null);
 const uncertain=!!project.error||project.expired||project.read!.readOnly||comparisonUncertain;
 const warning=project.expired?'项目已恢复或会话失效，请重新打开核对。':project.error?'最新进展暂时无法读取，保留上次内容，完成情况待核对。':project.read!.readOnly?'当前记录不可用，保留上次内容，完成情况待核对。':comparisonUncertain?'资料恢复后，变化依据需要重新核对。':'';
 const active=selected?.kind==='stage'?stages.find(s=>s.id===selected.id):undefined;
 const currentTask=selected?.kind==='task'?stages.flatMap(s=>s.currentTasks).find(n=>n.id===selected.id):undefined;
 const task=selected?.kind==='task'?stages.flatMap(s=>s.currentTasks).find(n=>n.id===selected.id)??map.nodes.find(n=>n.id===selected.id):undefined;
 const parent=selected?.kind==='task'?stages.find(s=>s.id===selected.stageId):undefined;
 function open(value:Selected,button:HTMLButtonElement){opener.current=button;setSelected(value);}
 function close(){returnTo.current=opener.current;setSelected(null);}
 useLayoutEffect(()=>{if(!selected&&returnTo.current){returnTo.current.focus({preventScroll:true});returnTo.current=null;}},[selected]);
 useEffect(()=>{if(!selected)return;dialog.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'&&dialog.current){const controls=[...dialog.current.querySelectorAll<HTMLElement>('button,a[href]')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){e.preventDefault();first?.focus();}}};window.addEventListener('keydown',key);const prior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',key);document.body.style.overflow=prior;};},[selected]);
 function originName(n:ProjectMapNode){if(n.originLabel==='本阶段工作')return uncertain?'待核对':p3Reviewed?'技术完成 · 阶段已审查':n.status==='待验收'?'成果已提交 · 待阶段审查':n.status;return n.originLabel==='此前已验收'?'原成果 · 已由你验收':`${n.originLabel??'原成果'} · ${uncertain?'待核对':n.status}`;}
 return <main className="stage-app" data-testid="stage-app">
  <div className="stage-overview" data-testid="persistent-route">
  <header className="stage-goal"><span>Progress Map</span><h1>看清整个项目的目标、进展与难题</h1><p>记录可靠，计划清楚，推进有据，最后由你确认。</p></header>
  <div className="stage-route" aria-label="完整总路线">
   {stages.map((s,index)=><section key={s.id} className={`stage-stop ${s.id===currentStage?'is-current':''}`} data-testid={`stage-${s.id}`}>
    <button className="stage-stop-open" onClick={e=>open({kind:'stage',id:s.id},e.currentTarget)} aria-label={`${s.title}，${uncertain?'待核对':s.status}，查看详情`}>
     <span className="stage-number">{String(index+1).padStart(2,'0')}</span><h2>{s.title}</h2><span className="stage-main-state">{uncertain?'完成情况待核对':s.status}</span><p className="stage-purpose">{s.goal}</p>
     <div className="stage-range" aria-label={s.id==='P2'?'P2阶段审查及交付已通过，不换算项目总比例':'阶段完成范围尚未核对，不计算比例'}><span>{uncertain?'原成果需重新核对':`已有支持 ${s.tasks.length}项原成果`}</span><span>{uncertain?'完成情况待核对':s.id==='P3'&&p3Reviewed?'本阶段已审查并交付':s.id==='P2'?'本阶段已审查并交付':'阶段未确认完成'}</span></div>
    </button>
    {(s.id==='P2'||s.issues.length>0||s.missing.length>0)&&<span className="stage-attention">{s.issues.some(i=>i.text.includes('隔离情景'))?'隔离情景 · ':''}{s.issues.some(i=>i.kind==='return')?'有成果需修改':s.issues.some(i=>i.kind==='blocked')?'有任务受阻':s.issues.length>0?'完成依据待核对':s.missing.length>0?'原成果待核对':p3Reviewed?'当前进入交付与接收':currentStage==='P3'?'当前推进P3':'下一步P3短计划待审核'}</span>}
    <p className="stage-left"><b>尚余</b>{s.remaining}</p>
    {s.missing.length>0&&<p className="stage-issue">原成果对应不完整，需要核对。</p>}
    {s.id==='P2'&&<p className="stage-issue"><b>卡点</b>阶段表达及正式入口交付已通过，下一步等待短计划审核。</p>}
    {s.issues.slice(0,2).map(i=><button key={i.sourceId+i.text} className="stage-issue-link" onClick={e=>open({kind:'task',id:i.sourceId,stageId:s.id},e.currentTarget)}>{i.text}</button>)}
    {s.issues.length>2&&<p className="stage-issue">另有{s.issues.length-2}项问题，展开核对。</p>}
    {s.recentResolved&&!uncertain&&<button className="stage-resolved" onClick={e=>open({kind:'task',id:s.recentResolved!.sourceId,stageId:s.id},e.currentTarget)}><b>最近解决</b>{s.recentResolved.text}</button>}
    <button className="stage-expand" aria-expanded={expanded===s.id} onClick={()=>setExpanded(expanded===s.id?'':s.id)}>{expanded===s.id?'收起':'展开'}分计划<span aria-hidden="true">{expanded===s.id?'−':'＋'}</span></button>
   </section>)}
  </div>
  </div>
  {warning&&<p className="stage-warning" role="alert">{warning}</p>}
  {expanded&&<section className="stage-branch" aria-labelledby="branch-title" data-testid="stage-branch">
   <div className="stage-branch-heading"><h2 id="branch-title">{stages.find(s=>s.id===expanded)!.title}<span>{expanded==='P4'&&currentStage==='P4'?'交付与接收':expanded===currentStage?'当前小目标':'已有成果支持'}</span></h2></div>
   {expanded==='P2'&&<div className="stage-current-summary"><p><b>尚余</b>{stages[1].remaining}</p><p className="stage-issue" data-testid="current-gap"><b>下一步</b>{currentStage==='P3'?'正在推进P3；最终用户接收留P4。':'P3短计划待审核；最终用户接收留P4。'}</p>{!uncertain&&<button className="stage-resolved" data-testid="recent-resolved" onClick={e=>open({kind:'stage',id:'P2'},e.currentTarget)}><b>最近解决</b>长分支总路线保持可见，手机概览已压紧。</button>}</div>}
   {expanded==='P2'&&<div className="stage-current-work" aria-label="本轮三个小目标">
    <button onClick={e=>open({kind:'stage',id:'P2'},e.currentTarget)}><span>{uncertain?'待核对':'已实施 · 阶段审查通过'}</span><h3>核对总路线与原成果</h3><p>四阶段骨架已明确，原28项保留原范围。</p><i className={uncertain?'review':'accepted'}/></button>
    <button onClick={e=>open({kind:'stage',id:'P2'},e.currentTarget)}><span>{uncertain?'待核对':'已实施 · 阶段审查通过'}</span><h3>显示当前位置和难题</h3><p>阶段、分支和详情已完成桌面与手机审查。</p><i className={uncertain?'review':'accepted'}/></button>
    <button onClick={e=>open({kind:'stage',id:'P2'},e.currentTarget)}><span>{uncertain?'待核对':'本地入口已交付 · 审核通过'}</span><h3>实际使用与结果确认</h3><p>同版本本地入口和关键操作已核对；最终用户接收留P4。</p><i className={uncertain?'review':'accepted'}/></button>
   </div>}
   {expanded==='P3'&&stages[2].currentTasks.length>0&&<><div className="stage-current-summary"><p data-testid="p3-current-summary">{uncertain?'当前完成情况待核对':stages[2].status} · {stages[2].remaining}</p></div><div className="stage-tasks" aria-label="本阶段小目标">{stages[2].currentTasks.map(n=><button key={n.id} className={`stage-task tone-${taskTone(n,uncertain)}`} data-testid={`task-${n.id}`} onClick={e=>open({kind:'task',id:n.id,stageId:'P3'},e.currentTarget)}><span className="stage-task-state">{originName(n)}</span><h3>{n.title}</h3>{n.planPath.length>0&&<span className="stage-task-state">{n.planPath.join(' / ')}</span>}<p>{n.cardSummary}</p><span className="task-fill" aria-label={uncertain?'待核对':n.status}/>{n.issues.some(i=>i.kind!=='pending')&&<span className="task-problem">有问题需处理</span>}</button>)}</div></>}
   {expanded==='P4'&&p3Reviewed&&<div className="stage-current-summary"><p>{stages[3].status}</p><p>{stages[3].remaining}</p></div>}
   <details className="stage-supports" open={expanded!=='P2'&&expanded!=='P3'&&expanded!=='P4'}><summary>原成果 · {stages.find(s=>s.id===expanded)!.tasks.length}项<span>保留原完成情况，不等于阶段完成</span></summary><div className="stage-tasks">{stages.find(s=>s.id===expanded)!.tasks.map(n=><button key={n.id} className={`stage-task tone-${taskTone(n,uncertain)}`} data-testid={`task-${n.id}`} onClick={e=>open({kind:'task',id:n.id,stageId:expanded},e.currentTarget)}><span className="stage-task-state">{originName(n)}</span><h3>{n.title}</h3><p>{n.cardSummary}</p><span className="task-fill" aria-label={uncertain?'完成情况待核对':n.status}/>{n.issues.some(i=>i.kind==='blocked'||i.kind==='return'||i.kind==='review')&&<span className="task-problem">有问题需处理</span>}</button>)}</div></details>
  </section>}
  {selected&&(active||task)&&<div className="stage-backdrop" onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="stage-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="stage-detail-title" tabIndex={-1}>
   <button className="stage-close" aria-label="关闭详情" onClick={close}>×</button>
   <span className="stage-dialog-state">{uncertain?'待核对':active?active.status:originName(task!)}</span>
   <h1 id="stage-detail-title">{active?.title??task!.title}</h1>
   <p className="stage-dialog-goal">{active?.goal??task!.goal}</p>
   {uncertain&&<p role="alert" className="stage-warning">{warning}</p>}
   {active&&<>
    <section><h2>现在走到哪里</h2><p>{uncertain?'保留原记录；当前完成与变化依据需要重新核对。':active.id==='P2'?'阶段主线与当前位置已实现；指定审核窗口已核对正式首页、关键交互及同版本本地交付，P2阶段目标通过。':active.id==='P4'&&p3Reviewed?active.status:active.id==='P3'&&active.currentTasks.length?active.status:active.id==='P1'?'已有可靠基础，原验收保留；本阶段整体完成条件仍待核对。':'已有部分支持；后续阶段任务尚未细化，新表达与实际使用仍待验证。'}</p></section>
    {active.currentTasks.length>0&&<section><h2>本阶段小目标</h2>{active.currentTasks.map(n=><button className="stage-parent" key={n.id} onClick={()=>setSelected({kind:'task',id:n.id,stageId:active.id})}>{n.title} · {p3Reviewed?'阶段已审查':n.status==='待验收'?'待阶段审查':n.status}</button>)}</section>}
    <section><h2>还差什么</h2><p>{active.remaining}</p></section>
    {active.issues.length>0&&<section><h2>需要处理</h2>{active.issues.map((i,index)=><button className="stage-parent" key={index} onClick={()=>setSelected({kind:'task',id:i.sourceId,stageId:active.id})}>{i.text} ↗</button>)}</section>}
    {active.id==='P4'&&p3Reviewed&&!uncertain&&<section><h2>待完成</h2><p>使用与恢复资料已准备。锁屏造成的独立现场核验尚未完成，最终接收仍由你决定。</p><small>{p4CloseoutSource.plan} · {p4CloseoutSource.meaning}</small></section>}
    {active.id==='P3'&&p3Reviewed&&!uncertain&&<section><h2>阶段结论</h2><p>P3限定目标及本地交付已审查通过，最终用户接收留P4。</p><small>{p3Checkpoint.reviewAt} · {p3Checkpoint.reviewRecord} · {p3Checkpoint.scope}</small></section>}
    {active.id==='P2'&&<section><h2>这次已解决</h2><p>长分支阅读时总路线保持可见，手机概览已压紧；原成果和新阶段完成情况分别呈现。</p><small>{p2Checkpoint.reviewAt} P2阶段展示及本地交付审核通过；不是原12项用户验收，也不是产品最终用户接收。</small></section>}
    <section><h2>已有成果 · {active.tasks.length}项</h2><p>原范围{active.accepted}项已由你验收，{active.pending}项仍待确认。不是本阶段的完成比例。</p><div className="stage-detail-tasks">{active.tasks.map(n=><button key={n.id} onClick={()=>setSelected({kind:'task',id:n.id,stageId:active.id})}><span>{n.title}</span><small>{uncertain?'待核对':n.status}</small></button>)}</div></section>
    {active.changes.length>0&&!uncertain&&<section><h2>重要变化</h2>{active.changes.map(c=><p key={c.sourceId}>{c.text}</p>)}<small>相对原固定核对点；重新分组不是新进展。</small></section>}
   </>}
   {task&&<>
    {parent&&<button className="stage-parent" onClick={()=>setSelected({kind:'stage',id:parent.id})}>← {parent.title}</button>}
    {currentTask?.planPath.length? <section><h2>所属小目标</h2><p>{currentTask.planPath.join(' / ')}</p></section>:null}
    {task.result&&<section><h2>现在怎么样</h2><p>{task.result}</p></section>}
    {task.issues.filter(i=>i.kind!=='pending').length>0&&<section><h2>需要处理</h2>{task.issues.filter(i=>i.kind!=='pending').map((i,index)=><p key={index}>{i.text}</p>)}</section>}
    {(task.remaining.length>0||task.next)&&<section><h2>接下来</h2>{(!currentTask||!p3Reviewed)&&task.remaining.map((r,i)=><p key={i}>{r}</p>)}{task.next&&<p>{currentTask&&p3Reviewed?'保留已审查成果，等待P4独立现场核验和你的最终接收。':task.next}</p>}</section>}
    {task.change&&!uncertain&&<section><h2>重要变化</h2><p>{task.change.text}</p><small>相对原固定核对点，阶段改名不制造变化。</small></section>}
   </>}
  </div></div>}
 </main>;
}
