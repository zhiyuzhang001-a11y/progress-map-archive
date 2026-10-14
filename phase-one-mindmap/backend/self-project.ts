import {randomUUID} from 'node:crypto';
import type {State} from '../src/domain.ts';
export const SELF_PROJECT_ID='progress-mindmap-self';
const rows=[
 ['visual','left','视觉与导图交互','原四阶段成果：中心目标、左右分支与交互。'],
 ['reliability','left','可靠状态与恢复','原四阶段成果与v0.4阶段二、四：可靠写入、隔离和恢复。'],
 ['feedback','right','反馈与验收','原四阶段与v0.4阶段二、三：意见、证据和用户决定分别记录。'],
 ['delivery','right','实际使用与交付','v0.4阶段一、三、四：内容属于本项目，入口可用，交付等待最终验收。'],
] as const;
export const leaves=[
 ['goal-map','visual','中心目标与左右分支','能看到本项目中心目标、左右分支及对应验收项。','原阶段一'],
 ['edge-progress','visual','连线进度与折叠','进度按唯一叶子验收项计量，折叠后汇总仍一致。','原阶段一'],
 ['node-details','visual','节点详情与偏差','点击节点可查看目标、剩余事项和偏差提示。','原阶段一'],
 ['readability','visual','阅读与定位','搜索、分支聚焦和窄屏阅读可用，长标题可读。','原阶段四'],
 ['atomic-state','reliability','可靠写入与诊断','原子写入、并发冲突、故障与摘要校验会保护权威状态。','原阶段二、四'],
 ['epoch-safety','reliability','恢复代次与旧请求','恢复、离线恢复和重启后，网页与CLI旧请求均被拒绝。','原阶段二；v0.4阶段四'],
 ['project-isolation','reliability','配置与演示隔离','真实项目与合成演示身份、目录、端口、来源和视图隔离。','v0.4阶段一、二'],
 ['capacity-export','reliability','备份导出与容量','受控副本可恢复；导出可核对；容量提示覆盖有界集合且不误称释放容量。','v0.4阶段四'],
 ['opinion-loop','feedback','意见到落实','真实意见保留原文及出处，CLI轮次、回应和落实证据可追溯。','原阶段三；v0.4阶段二、三'],
 ['evidence-version','feedback','成果与证据绑定','新检查记录保留场景、命令、执行记录及可复查产物摘要。','v0.4阶段二、三'],
 ['decision-boundary','feedback','用户决定边界','CLI不能代为验收；真实用户决定为空时进度保持0%，旧来源保持原值。','原阶段三；v0.4阶段二'],
 ['priority-next','feedback','优先级、退回与下一步','节点详情显示有效优先级、退回原因和下一步，草稿提示清楚。','v0.4阶段二、三'],
 ['project-content','delivery','页面对应我们的项目','默认页面反映工具自身，显示原成果、本轮工作及待验收事项。','v0.4阶段一、三'],
 ['launch-service','delivery','可直接打开的入口','服务已启动；重复启动、端口占用和停止可诊断，关闭启动窗口不终止服务。','v0.4阶段三、四'],
 ['delivery-role','delivery','只需最终验收','Codex负责实施、启动、CLI报告、备份恢复与核对，用户只负责最终验收。','v0.4阶段三、四'],
 ['handoff','delivery','交付说明与复核','四阶段检查与独立审核可查，限制和维护边界清楚，最终验收由用户决定。','v0.4阶段四'],
] as const;
export function selfProjectInitial():State{
 const at=new Date().toISOString();const epoch=randomUUID();const old=new Set(['goal-map','edge-progress','node-details','readability','atomic-state','epoch-safety','opinion-loop','decision-boundary']);
 const nodes:State['baseline']['nodes']=[{id:'goal',side:'center',color:'#163f3b',title:'项目进度思维导图工具',goal:'让项目目标、实际成果和验收依据可追踪，便于用户及时纠偏。'},...rows.map(([id,side,title,goal])=>({id,parent:'goal',side,color:side==='left'?'#518574':'#8b755e',title,goal})),...leaves.map(([id,parent,title,condition,plan])=>({id,parent,side:rows.find(r=>r[0]===parent)![1],color:rows.find(r=>r[0]===parent)![1]==='left'?'#518574':'#8b755e',title,goal:`${condition} 依据：${plan}。`}))];
 return {schemaVersion:2,projectId:SELF_PROJECT_ID,revision:0,recoveryEpoch:epoch,updatedAt:at,projectStatus:'active',staleHours:168,baseline:{version:1,nodes,acceptance:leaves.map(([id,, ,condition])=>({id:`accept-${id}`,nodeId:id,condition,weight:1,method:'user'})),autoRules:[]},report:{nodes:nodes.map(({id:nodeId})=>({nodeId,status:old.has(nodeId)?'待验收':'进行中',result:old.has(nodeId)?'原四阶段已有实现；历史52项检查记录保留，尚未确认历史成果版本绑定。':'按v0.4进行本轮技术准备；最终技术检查完成后提交成果与证据。',reason:'Codex依据已审阅计划整理初始基线，不构成用户批准或验收。',remaining:old.has(nodeId)?['针对本轮版本重新验证','等待用户最终验收']:['完成本轮实现、自测与独立复核','等待用户最终验收'],flags:old.has(nodeId)?[{kind:'证据待复核',text:'历史检查通过，版本关联待核实；不倒填历史版本摘要。'}]:[],updatedAt:at})),candidates:[],evidence:[],runs:[]},decisions:{opinions:[
 {id:'conversation-open',nodeId:'launch-service',text:'打不开啊，是不是没有运行',at,source:'conversation-user',reference:'本Codex聊天用户原文；此时间为录入时间，原消息具体时间未补造。'},
 {id:'conversation-content',nodeId:'project-content',text:'这个内容怎么还不是跟我们项目相关的',at,source:'conversation-user',reference:'本Codex聊天用户原文；此时间为录入时间，原消息具体时间未补造。'},
 {id:'conversation-role',nodeId:'delivery-role',text:'不是我负责这么多事，我最后只负责验收',at,source:'conversation-user',reference:'本Codex聊天用户原文；分工以v0.4及本次连续执行授权为准。此时间为录入时间。'},
 ],acknowledgements:[],responses:[],acceptance:[],priorities:[],proposals:[],baselineHistory:[]},history:[{revision:0,epoch,source:'system',action:'baseline-initialization',reason:'Codex按v0.4已审阅范围整理16个等权叶子验收项；不构成用户批准。',at,operationId:randomUUID()}],operations:[],integrity:'0'.repeat(64)};
}
