import dagre from '@dagrejs/dagre';

export type Item = { id: string; parent?: string; side: 'left'|'right'|'center'; color: string; title: string; status: string; goal: string; result: string; remaining: string[]; acceptance?: {id: string; condition: string; weight: number; accepted: boolean; source?: string; review?: boolean}[]; flags?: {kind: '受阻'|'偏差'|'待决定'|'证据待复核'; text: string}[]; evidence?: string; opinion?: string };
const green='#438b72', blue='#567ca7', coral='#bb7762', purple='#8a77a4';
const a = (prefix: string, count: number, done: number, weight=1) => Array.from({length:count},(_,i)=>({id:`${prefix}-${i+1}`,condition:['内容完整且可读','与已确认范围一致','检查结果可复现'][i%3],weight,accepted:i<done,source:i===0?'预先批准的自动验收':'用户确认'}));
export const projectId='synthetic-field-guide-01';
export const items: Item[] = [
 {id:'goal',side:'center',color:green,title:'让城市自然观察触手可及',status:'进行中',goal:'制作一份适合初次观察者的城市自然手册，帮助读者辨认身边的物种，并记录自己的发现。',result:'需求与观察范围已确认；内容仍在验证，试读的验收口径尚未完整定义。',remaining:['完成内容核对','验证阅读体验','确认试读验收条件'],opinion:'先让内容易懂，再考虑扩展功能。'},
 {id:'research',parent:'goal',side:'left',color:green,title:'01 · 观察与范围',status:'已完成',goal:'界定读者、观察场景与手册边界。',result:'两个子目标共 4 项验收已通过。',remaining:[]},
 {id:'audience',parent:'research',side:'left',color:green,title:'读者与使用场景',status:'已完成',goal:'确认初学者的阅读路径。',result:'读者画像和三个典型场景已确认。',remaining:[],acceptance:a('audience',2,2),evidence:'合成证据 E-01：场景清单 v1 / 检查通过（模拟）'},
 {id:'scope',parent:'research',side:'left',color:green,title:'观察范围与内容边界',status:'已完成',goal:'覆盖城市公园的常见植物与鸟类。',result:'范围清单已验收，不包含物种自动识别。',remaining:[],acceptance:a('scope',2,2)},
 {id:'content',parent:'goal',side:'left',color:blue,title:'02 · 内容与表达',status:'进行中',goal:'把专业观察信息写成初学者能读懂的文字。',result:'已验收 3/5；一项事实核对受阻，一项扩展提案待决定。',remaining:['核对辨识特征','决定是否加入夜间观察'],opinion:'不要先扩大范围，先把现有内容写清楚。'},
 {id:'cards',parent:'content',side:'left',color:blue,title:'物种卡片',status:'已完成',goal:'用统一结构展示观察特征。',result:'两项内容验收通过。',remaining:[],acceptance:a('cards',2,2)},
 {id:'facts',parent:'content',side:'left',color:blue,title:'辨识特征与相似物种的交叉核对（长标题示例）',status:'受阻',goal:'区分三组容易混淆的常见物种，并记录可检查的辨识依据。',result:'仅完成初稿；参考图的使用范围待确认，未计入验收。',remaining:['补齐可用参考图','复核辨识依据'],acceptance:a('facts',2,0),flags:[{kind:'受阻',text:'参考图使用范围未确认；初稿不能作为验收证据。'}],evidence:'合成证据 E-02：初稿核对清单 / 待验证（模拟）'},
 {id:'tone',parent:'content',side:'left',color:blue,title:'叙述风格',status:'待验收',goal:'用浅显语言说明日间观察方法。',result:'既有风格项已验收；新增夜间观察章节仅是提案。',remaining:['等待范围决定'],acceptance:a('tone',1,1),flags:[{kind:'偏差',text:'原目标是日间观察，实际草稿加入夜间观察；尚未批准进入范围。'},{kind:'待决定',text:'是否新增夜间观察章节？本原型不会批准或修改基线。'}]},
 {id:'experience',parent:'goal',side:'right',color:coral,title:'03 · 阅读体验',status:'待验证',goal:'提供清楚、轻量的阅读路径。',result:'AI 自报样例已完成，检查结果尚未获得验收。',remaining:['验证目录定位','验证窄屏阅读'],opinion:'演示通过也不等于已经验收。'},
 {id:'navigation',parent:'experience',side:'right',color:coral,title:'目录与定位',status:'待验收',goal:'目录能准确定位内容。',result:'AI 自报完成；没有用户确认，不计入进度。',remaining:['核验定位结果'],acceptance:a('navigation',2,0),evidence:'合成证据 E-03：演示点击记录 / 候选结果（模拟）'},
 {id:'readability',parent:'experience',side:'right',color:coral,title:'阅读排版',status:'未开始',goal:'保持可读字号与清晰层级。',result:'尚未产生候选结果。',remaining:['制作排版样例'],acceptance:a('readability',1,0)},
 {id:'release',parent:'goal',side:'right',color:purple,title:'04 · 试读与交付',status:'未开始',goal:'以试读反馈确认手册最终成果。',result:'已定义部分 0/1；另有 1 个待评估叶子。',remaining:['明确试读标准','整理使用说明']},
 {id:'trial',parent:'release',side:'right',color:purple,title:'初学者试读',status:'未开始',goal:'确认初学者能独立完成一次观察。',result:'验收条件尚未定义，不能展示确定进度。',remaining:['确认可检查的试读条件'],flags:[{kind:'待决定',text:'请先确定试读通过的条件，避免遗漏核心范围。'}]},
 {id:'guide',parent:'release',side:'right',color:purple,title:'使用说明',status:'未开始',goal:'说明如何使用与记录。',result:'尚未开始。',remaining:['编写使用说明'],acceptance:a('guide',1,0)},
];
export const byId = Object.fromEntries(items.map(i=>[i.id,i]));
export const children = (id: string, list=items) => list.filter(n=>n.parent===id);
export function descendants(id: string,list=items): Item[] {return children(id,list).flatMap(n=>[n,...descendants(n.id,list)]);}
export function aggregate(id: string,list=items) {
 const node=list.find(n=>n.id===id)!;
 const all=[node,...descendants(id,list)];
 const leaves=all.filter(n=>children(n.id,list).length===0);
 const definitions=leaves.flatMap(n=>n.acceptance??[]);
 const unique=new Map(definitions.map(a=>[a.id,a]));
 const entries=[...unique.values()];
 const total=entries.reduce((sum,a)=>sum+a.weight,0);
 const valid=entries.filter(a=>a.accepted&&!a.review);
 const acceptedWeight=valid.reduce((sum,a)=>sum+a.weight,0);
 const unknown=leaves.filter(n=>!n.acceptance?.length).length;
 const percent=unknown||!total?null:Math.min(valid.length===entries.length?100:99.9,Math.floor(acceptedWeight/total*1000)/10);
 return {total:entries.length,accepted:valid.length,unknown,percent,acceptedWeight,totalWeight:total,flags:all.flatMap(n=>(n.flags??[]).map(f=>({...f,nodeId:n.id,title:n.title})))};
}
export type Point={x:number;y:number};
export function layout(list=items):Record<string,Point> {
 const rootId=list.find(n=>!n.parent)!.id;
 const positions:Record<string,Point>={[rootId]:{x:0,y:0}};
 for(const side of ['left','right'] as const){
  const g=new dagre.graphlib.Graph().setGraph({rankdir:side==='left'?'RL':'LR',ranksep:125,nodesep:44}).setDefaultEdgeLabel(()=>({}));
  g.setNode(rootId,{width:260,height:150});
  list.filter(n=>n.side===side).forEach(n=>{g.setNode(n.id,{width:244,height:150});g.setEdge(n.parent!,n.id);});
  dagre.layout(g);
  const root=g.node(rootId);
  list.filter(n=>n.side===side).forEach(n=>{const p=g.node(n.id);positions[n.id]={x:p.x-root.x+130-122,y:p.y-root.y};});
 }
 // Larger project trees retain full leaf coordinates while keeping the four
 // stage anchors readable in the default collapsed view. Expansion never moves
 // an anchor and manual coordinates still take precedence in the saved view.
 if(list.length>14)for(const side of ['left','right'] as const){const stages=list.filter(n=>n.parent===rootId&&n.side===side);stages.forEach((n,i)=>{positions[n.id].y=(i-(stages.length-1)/2)*210;});}
 return positions;
}
export function visibleIds(collapsed: Set<string>,focus: string|null=null,list=items) {
 const byId=Object.fromEntries(list.map(n=>[n.id,n]));const rootId=list.find(n=>!n.parent)!.id;
 const allowed=focus?new Set([rootId,focus,...descendants(focus,list).map(n=>n.id)]):null;
 return list.filter(n=>{
  if(allowed&&!allowed.has(n.id))return false;
  let p=n.parent;
  while(p){if(collapsed.has(p))return false;p=byId[p].parent;}
  return true;
 }).map(n=>n.id);
}

/** Presentation derives closure from effective acceptance, never from a completion report alone. */
export function closureStatus(id:string,list:Item[],returned=false){
 const stats=aggregate(id,list),scope=[list.find(n=>n.id===id)!,...descendants(id,list)];
 if(stats.percent===100)return '已验收';
 if(returned)return '退回';
 if(scope.some(n=>n.acceptance?.some(a=>a.review)))return '证据待复核';
 if(stats.accepted>0)return '部分通过';
 if(scope.some(n=>n.status==='待验收'||n.status==='已完成'))return '待验收';
 if(scope.every(n=>n.status==='未开始'))return '未开始';
 return '进行中';
}

export function isResolvedAcceptanceNotice(flag:{kind:string;text:string}){
 return flag.kind==='证据待复核'||flag.kind==='待决定'&&/^(等待(?:真实)?用户(?:最终)?验收|等待最终验收|待最终验收|等待验收|请完成最终验收)[。！!\.\s]*$/.test(flag.text.trim());
}
