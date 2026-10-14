import {test,expect} from '@playwright/test';
import {layout} from '../../src/model';
import {mkdtemp,realpath,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createBridge} from '../../backend/server';
let bridge:Awaited<ReturnType<typeof createBridge>>,root:string;
test.afterEach(async()=>{await bridge?.stop();if(root)await rm(root,{recursive:true,force:true});});
test.beforeEach(async({page})=>{root=await realpath(await mkdtemp(join(tmpdir(),'mindmap-demo-interaction-')));await cp(process.env.MINDMAP_TEST_DIST??resolve('dist'),join(root,'dist'),{recursive:true});bridge=await createBridge({root,port:0,init:true,config:{configVersion:1,projectId:'synthetic-field-guide-01',name:'城市自然观察手册',kind:'synthetic',dataDirectory:'runtime-data',port:4173,readOnly:false}});const initialView=page.waitForResponse(r=>r.url().endsWith('/api/view')&&r.request().method()==='GET');await page.goto(bridge.url+'/internal');await initialView;await page.evaluate(async positions=>{const token=document.querySelector<HTMLMetaElement>('meta[name="mindmap-session"]')!.content;const r=await fetch('/api/state',{headers:{'X-Mindmap-Session':token}});const {state}=await r.json();await fetch('/api/view',{method:'POST',headers:{'X-Mindmap-Session':token,'Content-Type':'application/json'},body:JSON.stringify({projectId:state.projectId,recoveryEpoch:state.recoveryEpoch,view:{positions,collapsed:['research','content','experience','release']}})});},layout());const viewLoaded=page.waitForResponse(r=>r.url().endsWith('/api/view')&&r.request().method()==='GET');await page.reload();await viewLoaded;await page.getByRole('button',{name:'阶段视图',exact:true}).click();await expect(page.locator('.react-flow__node')).toHaveCount(5);await expect(page.getByTestId('card-goal')).toBeVisible();await expect(page.locator('.context-bar')).toContainText(/revision \d+/);await page.waitForTimeout(100);});
test('default visual, all four edge states, ancestor summaries and sidebar',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.locator('.react-flow__node')).toHaveCount(5);
 await expect(page.getByTestId('edge-research')).toHaveAttribute('data-percent','100');
 await expect(page.getByTestId('edge-content')).toHaveAttribute('data-percent','60');
 await expect(page.getByTestId('edge-experience')).toHaveAttribute('data-percent','0');
 await expect(page.getByTestId('edge-release')).toHaveAttribute('data-percent','unknown');
 await expect(page.getByTestId('edge-experience').locator('.progress-fill')).toHaveCount(0);
 await expect(page.getByTestId('edge-release').locator('.progress-fill')).toHaveCount(0);
 await expect(page.getByTestId('edge-content').locator('.progress-fill')).toHaveAttribute('stroke-dasharray','60 40');
 await expect(page.locator('.details .acceptance-summary')).toContainText('待评估');
 await expect(page.getByTestId('card-content')).toContainText('3 个异常');
 await page.screenshot({path:'evidence/default.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('search reveals hidden long title, escape restores collapsed view',async({page})=>{
 await page.getByPlaceholder('搜索目标、阻碍或偏差…').fill('交叉核对');
 await page.getByPlaceholder('搜索目标、阻碍或偏差…').press('Enter');
 await expect(page.getByTestId('card-facts')).toBeVisible();
 await expect(page.locator('.details h2')).toContainText('辨识特征与相似物种的交叉核对（长标题示例）');
 await page.getByPlaceholder('搜索目标、阻碍或偏差…').press('Escape');
 await expect(page.locator('.react-flow__node')).toHaveCount(5);
});
test('collapse keeps progress and anomalies, footer jumps to hidden anomaly',async({page})=>{
 await page.getByRole('button',{name:'展开02 · 内容与表达',exact:true}).click();
 await expect(page.getByTestId('card-facts')).toBeVisible();
 await page.getByRole('button',{name:'折叠02 · 内容与表达',exact:true}).click();
 await expect(page.getByTestId('card-facts')).toHaveCount(0);
 await expect(page.getByTestId('card-content')).toContainText('60%');
 await page.locator('footer').getByRole('button',{name:'受阻 1',exact:true}).click();
 await expect(page.getByTestId('card-facts')).toBeVisible();
 await expect(page.locator('.details .flags')).toContainText('参考图使用范围未确认');
});
test('focus, expand all and keyboard details',async({page})=>{
 await page.getByTestId('card-content').getByRole('button',{name:'02 · 内容与表达',exact:true}).click();
 await page.getByRole('button',{name:'聚焦分支',exact:true}).click();
 await expect(page.locator('.react-flow__node')).toHaveCount(5);
 await expect(page.getByTestId('card-research')).toHaveCount(0);
 await page.getByRole('button',{name:'返回完整导图'}).click();
 await page.getByRole('button',{name:'全部展开',exact:true}).click();
 await expect(page.locator('.react-flow__node')).toHaveCount(14);
 await page.getByTestId('card-tone').getByRole('button',{name:'叙述风格',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('.details h2')).toHaveText('叙述风格');
 await page.keyboard.press('F6');await expect(page.locator('.details')).toBeFocused();
 await page.screenshot({path:'evidence/expanded.png',fullPage:true});
});
test('drag survives collapse, refresh and reload; rearrange can be undone',async({page})=>{
 const key=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('mindmap:synthetic-field-guide-01:'))!);
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 const before=await read();const handle=page.getByTestId('card-content').locator('.node-top');const box=(await handle.boundingBox())!;
 await page.mouse.move(box.x+30,box.y+5);await page.mouse.down();await page.mouse.move(box.x+70,box.y+40,{steps:12});await page.mouse.up();
 await expect.poll(async()=> (await read()).positions.content.x).not.toEqual(before.positions.content.x);
 const dragged=await read();
 await page.getByRole('button',{name:'展开02 · 内容与表达',exact:true}).click();await page.getByRole('button',{name:'折叠02 · 内容与表达',exact:true}).click();
 await page.getByRole('button',{name:'重读示例',exact:true}).click();await page.reload();await expect(page.getByTestId('card-goal')).toBeVisible();
 await expect.poll(async()=> (await read()).positions.content).toEqual(dragged.positions.content);
 await page.getByRole('button',{name:'重新整理布局',exact:true}).click();expect((await read()).positions.content).toEqual(before.positions.content);
 await page.getByRole('button',{name:'恢复前一视图',exact:true}).click();expect((await read()).positions.content).toEqual(dragged.positions.content);
});
test('read failure preserves display and root cannot accept without candidate',async({page})=>{
 await page.getByRole('button',{name:'模拟读取失败',exact:true}).click();await expect(page.locator('.context-bar')).toContainText('数据未刷新');
 await page.getByRole('button',{name:'验收候选结果',exact:true}).click();await expect(page.locator('.demo-panel')).toContainText('本演示不会改变进度');
 await expect(page.getByTestId('edge-content')).toHaveAttribute('data-percent','60');
 await page.getByRole('button',{name:'重读示例',exact:true}).click();await expect(page.locator('.context-bar')).not.toContainText('数据未刷新');
});
test('left edge starts at parent and fills toward child',async({page})=>{
 await expect(page.getByTestId('edge-content').locator('path')).toHaveCount(2);const paths=await page.getByTestId('edge-content').locator('path').evaluateAll(nodes=>nodes.map(n=>({start:(n as SVGPathElement).getPointAtLength(0).x,end:(n as SVGPathElement).getPointAtLength((n as SVGPathElement).getTotalLength()).x})));
 expect(paths).toHaveLength(2);for(const p of paths)expect(p.start).toBeGreaterThan(p.end);
});
test('corrupt view rebuilds and 1280px desktop remains usable',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>localStorage.setItem(Object.keys(localStorage).find(k=>k.startsWith('mindmap:synthetic-field-guide-01:'))!,'bad json'));await page.reload();
 await expect(page.locator('.react-flow__node')).toHaveCount(5);await expect(page.locator('.details')).toBeVisible();
 await page.screenshot({path:'evidence/desktop-1280.png',fullPage:true});
});
