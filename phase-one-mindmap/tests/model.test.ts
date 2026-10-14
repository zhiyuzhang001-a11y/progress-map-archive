import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,closureStatus,isResolvedAcceptanceNotice,items,layout,visibleIds,type Item} from '../src/model.ts';
test('four progress states and unknown propagation',()=>{assert.equal(aggregate('research').percent,100);assert.equal(aggregate('content').percent,60);assert.equal(aggregate('experience').percent,0);assert.equal(aggregate('release').percent,null);assert.equal(aggregate('goal').percent,null);assert.equal(aggregate('goal').unknown,1);});
test('collapse hides descendants but preserves all anomaly and acceptance summaries',()=>{const ids=visibleIds(new Set(['content']));assert.ok(!ids.includes('facts'));assert.equal(aggregate('content').flags.length,3);assert.equal(aggregate('content').accepted,3);});
test('weighted acceptance, invalidated evidence and near 100%',()=>{const list:Item[]=[{...items[2],id:'x',parent:undefined,acceptance:[{id:'a',condition:'a',weight:9999,accepted:true},{id:'b',condition:'b',weight:1,accepted:false}]}];assert.equal(aggregate('x',list).percent,99.9);list[0].acceptance![0].review=true;assert.equal(aggregate('x',list).percent,0);});
test('layout is deterministic, full tree leaves do not overlap, sides remain stable',()=>{const p=layout();assert.deepEqual(p,layout());for(const n of items){if(n.side==='left')assert.ok(p[n.id].x<0);if(n.side==='right')assert.ok(p[n.id].x>260);}for(const a of items)for(const b of items){if(a.id===b.id)continue;assert.ok(Math.abs(p[a.id].x-p[b.id].x)>=244||Math.abs(p[a.id].y-p[b.id].y)>=150,`${a.id} overlaps ${b.id}`);}});
test('unique acceptance IDs are counted once',()=>{const item={...items[2],id:'unique',parent:undefined};item.acceptance=[{id:'a',condition:'a',weight:1,accepted:true},{id:'a',condition:'a',weight:1,accepted:true}];assert.equal(aggregate('unique',[item]).total,1);});
test('focus filters the tree without changing business data',()=>{const before=JSON.stringify(items);assert.deepEqual(visibleIds(new Set(['research','release','experience']),'content').sort(),['goal','content','cards','facts','tone'].sort());assert.equal(JSON.stringify(items),before);});

test('closure distinguishes technical completion, partial decision, return and final acceptance',()=>{
 const base={...items[2],id:'closure',parent:undefined,status:'未开始',acceptance:[{id:'a',condition:'A',weight:1,accepted:false},{id:'b',condition:'B',weight:1,accepted:false}]};
 assert.equal(closureStatus('closure',[base]),'未开始');base.status='已完成';assert.equal(closureStatus('closure',[base]),'待验收');
 base.acceptance[0].accepted=true;assert.equal(closureStatus('closure',[base]),'部分通过');assert.equal(closureStatus('closure',[base],true),'退回');
 base.acceptance[1].accepted=true;assert.equal(closureStatus('closure',[base]),'已验收');
});

test('resolved acceptance notice filter preserves genuine pending scope decisions',()=>{assert.equal(isResolvedAcceptanceNotice({kind:'待决定',text:'等待最终验收'}),true);assert.equal(isResolvedAcceptanceNotice({kind:'待决定',text:'决定是否新增验收条件'}),false);assert.equal(isResolvedAcceptanceNotice({kind:'待决定',text:'批准下一轮验收范围提案'}),false);assert.equal(isResolvedAcceptanceNotice({kind:'偏差',text:'等待最终验收'}),false);});
