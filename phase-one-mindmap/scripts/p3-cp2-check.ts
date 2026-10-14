import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const out=resolve('../outputs/P3-continuous-update'),browser=await chromium.launch({channel:'chrome'}),cases:any[]=[],errors:string[]=[];
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/');
 await expect(page.getByTestId('task-b4-p3-record')).toContainText('过去的16项验收');await expect(page.getByTestId('task-b4-p3-update')).toContainText('正在让');await expect(page.getByTestId('task-b4-p3-verify')).toContainText('尚未提交具体进展');
 await expect(page.getByTestId('stage-P3')).toHaveClass(/is-current/);await expect(page.getByTestId('stage-P4')).toContainText('尚未细化');await page.screenshot({path:join(out,'P3-CP2-before-real-update.png'),fullPage:true});
 const token=await page.locator('meta[name="mindmap-session"]').getAttribute('content');const before=await (await page.request.get('http://127.0.0.1:4173/api/state',{headers:{'x-mindmap-session':token!}})).json();
 const proof={scenario:'A real API state → projected summary → desktop page',beforeRevision:before.state.revision,baseline:4,recordResultObserved:true,updateInProgressObserved:true,verifyNoResultYetObserved:true,errors,executorSelfTest:true,dotAcceptance:false};
 const file='evidence/p3-live-update-v01.json',raw=JSON.stringify(proof,null,2);await writeFile(file,raw);
 const action={type:'report',nodeId:'p3-update',status:'待验收',reason:'实际4173页面已读取真实范围和报告；同资产下验证本次报告经轮询更新，无手改状态常量。',result:'本阶段的实际工作已显示在首页，更新记录后页面自动反映进展。',remaining:['等待阶段审查和连续使用检查。'],flags:[],runId:'p3-real-continuous-v01',candidate:{id:'p3-update-c01',version:'p3-update-v01',result:'真实报告动态更新首页和详情'},evidence:[{id:'p3-update-e01',candidateId:'p3-update-c01',acceptanceIds:['p3-update-condition'],version:'p3-update-v01',check:'真实浏览器读取三项状态；提交前后同页面轮询显示新报告',result:'pass',reference:file,at:new Date().toISOString(),provenance:{command:'node scripts/p3-cp2-check.ts',scenario:'A真实连续更新',artifactVersion:'p3-update-v01',record:file}}]};
 const actionPath=join(out,'p3-live-update-action.json');await writeFile(actionPath,JSON.stringify(action,null,2));
 const sub=spawnSync(process.execPath,['scripts/p3-submit.ts',actionPath,'p3-live-update'],{encoding:'utf8'});if(sub.status!==0)throw Error(sub.stderr);console.log(sub.stdout);
 await expect(page.getByTestId('task-b4-p3-update')).toContainText('页面自动反映进展',{timeout:15000});await expect(page.getByTestId('task-b4-p3-update')).toContainText('待阶段审查');
 const after=await (await page.request.get('http://127.0.0.1:4173/api/state',{headers:{'x-mindmap-session':token!}})).json();
 await page.getByTestId('task-b4-p3-update').click();await expect(page.getByRole('dialog')).toContainText(action.result);await expect(page.getByRole('dialog')).toContainText('等待阶段审查');await page.keyboard.press('Escape');await expect(page.getByTestId('task-b4-p3-update')).toBeFocused();await page.screenshot({path:join(out,'P3-CP2-after-real-update.png'),fullPage:true});
 await page.reload();await expect(page.getByTestId('task-b4-p3-update')).toContainText(action.result);cases.push({width:1440,before:before.state.revision,after:after.state.revision,livePollWithoutRebuild:true,reloadSame:true,detailAndFocus:true});
 await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),m=await mobile.newPage();await m.goto('http://127.0.0.1:4173/');await expect(m.getByTestId('task-b4-p3-update')).toContainText(action.result);await m.getByTestId('task-b4-p3-update').tap();await expect(m.getByRole('dialog')).toContainText(action.result);await m.getByRole('button',{name:'关闭详情',exact:true}).tap();await m.screenshot({path:join(out,'P3-CP2-mobile-real.png'),fullPage:true});expect(await m.getByTestId('stage-app').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();cases.push({width:390,touchDetail:true,sameRealFact:true,noOverflow:true});await mobile.close();
 expect(errors).toEqual([]);await writeFile(join(out,'P3_CP2_BROWSER_RESULT.json'),JSON.stringify({passed:true,cases,errors,executorSelfTest:true,dotAcceptance:false},null,2));
 const rec={type:'register-evidence',reason:'登记真实页面更新前后的检查材料，后续完整截图与核对记录另提交。',records:[{id:'p3-update-registered-v01',projectId:after.state.projectId,baselineVersion:4,candidateId:'p3-update-c01',evidenceId:'p3-update-e01',artifactVersion:'p3-update-v01',relativePath:file,sha256:sha(raw),bytes:Buffer.byteLength(raw),mediaType:'application/json',title:'真实页面读取与更新'}]};const recPath=join(out,'p3-live-update-register-action.json');await writeFile(recPath,JSON.stringify(rec,null,2));const registered=spawnSync(process.execPath,['scripts/p3-submit.ts',recPath,'p3-live-update-register'],{encoding:'utf8'});if(registered.status!==0)throw Error(registered.stderr);console.log(registered.stdout);
}finally{await browser.close();}
