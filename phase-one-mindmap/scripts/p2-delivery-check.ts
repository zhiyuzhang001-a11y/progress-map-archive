import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const out=resolve('../outputs/P2-global-progress'),runtime={url:'http://127.0.0.1:4173/',sourceRevision:209,sourceStateSha256:'0b4ac5226da432e8632d0f8859e85a5db17ee457cd7b419808acff8f5315a7e9'};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),stateBefore=await readFile('project-data/state.json'),viewBefore=await readFile('project-data/view.json');
const browser=await chromium.launch({channel:'chrome'});const cases:any[]=[],errors:string[]=[];
try{
 for(const mobile of [false,true]){
  const width=mobile?390:1440,height=mobile?844:900,device=mobile?'mobile':'desktop';const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const click=async(locator:ReturnType<typeof page.locator>)=>mobile?locator.tap():locator.click();
  await page.goto(runtime.url);await expect(page.getByTestId('stage-app')).toBeVisible();
  await expect(page.getByRole('heading',{name:'看清整个项目的目标、进展与难题',exact:true})).toBeVisible();
  for(const id of ['P1','P2','P3','P4'])await expect(page.getByTestId('stage-'+id)).toBeVisible();
  const goalBox=await page.locator('.stage-goal').boundingBox();expect(goalBox).not.toBeNull();
  const routeBox=await page.locator('.stage-route').boundingBox();expect(routeBox).not.toBeNull();expect(routeBox!.y).toBeGreaterThan(goalBox!.y+goalBox!.height);
  for(const id of ['P1','P2','P3','P4']){const box=await page.getByTestId('stage-'+id).boundingBox();expect(box!.width).toBeGreaterThan(mobile?140:240);const title=await page.getByTestId('stage-'+id).locator('h2').boundingBox();expect(title!.y).toBeLessThan(height);expect(title!.x).toBeGreaterThanOrEqual(0);expect(title!.x+title!.width).toBeLessThanOrEqual(width);}
  await expect(page.getByTestId('current-gap')).toContainText('正式入口');await expect(page.getByTestId('recent-resolved')).toContainText('长分支');
  expect(await page.locator('.stage-route').textContent()).not.toMatch(/\d+%/);await expect(page.locator('.stage-current-work button')).toHaveCount(3);
  expect(await page.getByTestId('stage-app').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
  await page.screenshot({path:join(out,`CP3-${device}-R1-R4-overview.png`),fullPage:true});
  const p2=page.getByTestId('stage-P2').locator('.stage-stop-open');await click(p2);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('不是本阶段的完成比例');await expect(page.getByRole('dialog')).toContainText('4项已由你验收，5项仍待确认');
  await page.screenshot({path:join(out,`CP3-${device}-R2-R3-stage-detail.png`),fullPage:true});
  await click(page.getByRole('button',{name:'关闭详情',exact:true}));await expect(p2).toBeFocused();
  await click(page.getByTestId('recent-resolved'));await expect(page.getByRole('dialog')).toContainText('这次已解决');await page.screenshot({path:join(out,`CP3-${device}-R4-resolved-detail.png`),fullPage:true});
  await click(page.getByRole('button',{name:'关闭详情',exact:true}));await expect(page.getByTestId('recent-resolved')).toBeFocused();
  let taskCount=0;for(const id of ['P1','P2','P3','P4']){
   const toggle=page.getByTestId('stage-'+id).locator('.stage-expand');if(await toggle.getAttribute('aria-expanded')!=='true')await click(toggle);
   const supports=page.locator('.stage-supports');if(!await supports.evaluate(el=>(el as HTMLDetailsElement).open))await click(supports.locator('summary'));
   const tasks=page.locator('.stage-tasks .stage-task');taskCount+=await tasks.count();
   for(let i=0;i<await tasks.count();i++){
    const button=tasks.nth(i),title=await button.locator('h3').innerText();await click(button);await expect(page.locator('#stage-detail-title')).toHaveText(title);await expect(page.getByRole('dialog')).toContainText('现在怎么样');
    await click(page.getByRole('button',{name:'关闭详情',exact:true}));await expect(button).toBeFocused();
   }
  }expect(taskCount).toBe(28);
  const p2Toggle=page.getByTestId('stage-P2').locator('.stage-expand');if(await p2Toggle.getAttribute('aria-expanded')!=='true')await click(p2Toggle);
  const p2Supports=page.locator('.stage-supports');if(!await p2Supports.evaluate(el=>(el as HTMLDetailsElement).open))await click(p2Supports.locator('summary'));
  await expect(page.locator('.stage-tasks .stage-task')).toHaveCount(9);
  const app=page.getByTestId('stage-app');await app.evaluate(el=>{el.scrollTop=el.scrollHeight;});await page.waitForTimeout(80);expect(await app.evaluate(el=>el.scrollTop)).toBeGreaterThan(20);
  for(const id of ['P1','P2','P3','P4']){const title=await page.getByTestId('stage-'+id).locator('h2').boundingBox();expect(title!.y).toBeGreaterThanOrEqual(0);expect(title!.y+title!.height).toBeLessThan(height);}
  await page.screenshot({path:join(out,`CP3-${device}-R1-R5-branch-bottom-route-visible.png`),fullPage:true});
  await click(page.getByTestId('stage-P2').locator('.stage-stop-open'));await expect(page.locator('#stage-detail-title')).toHaveText('看清计划和当前位置');await click(page.getByRole('button',{name:'关闭详情',exact:true}));await expect(p2).toBeFocused();
  await app.evaluate(el=>{el.scrollTop=0;});await page.waitForTimeout(80);
  await page.getByTestId('stage-P2').locator('.stage-stop-open').focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'关闭详情',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(p2).toBeFocused();
  await page.screenshot({path:join(out,`CP3-${device}-R5-return.png`),fullPage:true});
  const token=await page.locator('meta[name="mindmap-session"]').getAttribute('content');
  const actual=await (await page.request.get(new URL('/api/state',runtime.url).href,{headers:{'x-mindmap-session':token!}})).json();
  const isolated=structuredClone(actual);const later=isolated.state.report.nodes.find((n:any)=>n.nodeId==='v07-changes'&&n.baselineVersion===3);later.status='受阻';later.flags=[{kind:'受阻',text:'隔离情景：后阶段并行推进，但范围尚待核对'}];
  const candidate=isolated.state.report.candidates.filter((c:any)=>c.nodeId==='v07-plan'&&c.baselineVersion===3).at(-1);isolated.state.decisions.acceptance.push({id:'cp2-isolated-return',acceptanceId:'v07-accept-plan',candidateId:candidate.id,version:candidate.version,baselineVersion:3,state:'withdrawn',source:'user-local',reason:'隔离情景：本项需修改，不代表主项目决定',at:new Date().toISOString()});
  await page.route('**/api/state',route=>route.fulfill({json:isolated}));await page.reload();await expect(page.getByTestId('stage-app')).toBeVisible();await expect(page.getByTestId('stage-P3')).toContainText('隔离情景');await expect(page.getByTestId('stage-P2')).toContainText('本项需修改');
  await click(page.locator('.stage-supports summary'));await expect(page.getByTestId('task-b3-v07-plan')).toHaveClass(/tone-review/);await expect(page.getByTestId('stage-P1')).toContainText('阶段未确认完成');
  await page.screenshot({path:join(out,`CP3-${device}-R6-isolated-parallel-return.png`),fullPage:true});
  await page.unroute('**/api/state');
  await page.reload();await expect(page.getByTestId('stage-app')).toBeVisible();await expect(page.getByTestId('stage-P2')).toContainText('当前重点');
  const noOverflow=await page.getByTestId('stage-app').evaluate(el=>el.scrollWidth<=el.clientWidth+1);expect(noOverflow).toBeTruthy();
  await page.route('**/api/version',route=>route.fulfill({status:503,json:{error:'TEMP_UNAVAILABLE',message:'隔离读取中断'}}));await expect(page.getByRole('alert')).toContainText('最新进展暂时无法读取');await expect(page.locator('.stage-task.tone-accepted')).toHaveCount(0);
  await page.screenshot({path:join(out,`CP3-${device}-R6-reading-error.png`),fullPage:true});
  cases.push({device,width,height,R1_R4:'Real main r209 GET with default production assets; executor layout/labels checked; dot human reading pending',R5:{allOriginalTasksOpened:taskCount,closeFocus:true,keyboardEnterTabEscape:true,viewportReturnScreenshot:true},R6:{isolatedParallelAndReturn:true,isolatedDecisionNotPersisted:true,refreshNoPercent:true,readingErrorVisible:true,noAcceptedFillWhileUnknown:true},noHorizontalOverflow:noOverflow,realMainReadsBeforeIsolation:true});await context.close();
 }
 const stateUnchanged=hash(stateBefore)===hash(await readFile('project-data/state.json')),viewUnchanged=hash(viewBefore)===hash(await readFile('project-data/view.json'));
 if(!stateUnchanged||!viewUnchanged||errors.length)throw Error('Main preservation or browser runtime failed');
 await writeFile(join(out,'CP3_BROWSER_RESULT.json'),JSON.stringify({passed:true,executorSelfTest:true,dotAcceptance:false,cases,errors,mainStateUnchanged:stateUnchanged,mainViewUnchanged:viewUnchanged,sourceRevision:runtime.sourceRevision,sourceStateSha256:runtime.sourceStateSha256,productionUrl:runtime.url},null,2));console.log('Desktop/mobile CP3 checks passed, main state/view unchanged.');
}finally{await browser.close();}
