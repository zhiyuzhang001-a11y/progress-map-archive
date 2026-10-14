import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {cli,root} from './v05-cli-helpers.ts';
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const before=await readFile(join(root,'project-data/state.json')),state=(await cli(['read'])).state;
const viewBefore=await readFile(join(root,'project-data/view.json')).catch(()=>Buffer.from('missing'));
if(state.baseline.version!==3||state.decisions.acceptance.some((d:any)=>d.baselineVersion===2||d.baselineVersion===3))throw new Error('主范围或待验收状态不符');
const config=JSON.parse(await readFile(join(root,'project.config.json'),'utf8')),url=`http://127.0.0.1:${config.port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});const errors:string[]=[],checks:any[]=[];
try{
 for(const compact of [false,true]){
  const context=await browser.newContext({viewport:compact?{width:390,height:844}:{width:1440,height:900},hasTouch:compact});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  // This smoke reads real business facts, but keeps the user's saved browsing preference untouched.
  await page.route('**/api/map-view',route=>route.fulfill({json:route.request().method()==='POST'?{saved:true}:null}));
  await page.goto(url);await expect(page.locator('.project-card')).toHaveCount(5);await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('header,aside,.react-flow__controls,.toolbar,.topbar')).toHaveCount(0);
  await expect(page.getByTestId('card-map-goal')).toContainText('待验收');
  const text=await page.locator('main.pure-map').innerText();
  await page.screenshot({path:join(root,`evidence/v07-final-real-${compact?'mobile':'desktop'}.png`)});
  await page.getByTestId('card-map-planning').locator('.project-card-read').click();await expect(page.getByRole('dialog')).toContainText('分计划');
  const detail=await page.getByRole('dialog').innerText();
  if(/sha256-|recoveryEpoch|baselineVersion|\/Users\/|evidence\/|验收包|证据登记/.test(detail))throw new Error('用户详情泄漏技术字段');
  await page.screenshot({path:join(root,`evidence/v07-final-real-${compact?'mobile':'desktop'}-detail.png`)});
  await page.getByRole('button',{name:'关闭详情',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'展开看清计划与进展',exact:true}).click();await expect(page.locator('.project-card')).toHaveCount(13);
  const cards=await page.locator('.project-card').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {id:e.getAttribute('data-testid'),x:r.x,y:r.y,w:r.width,h:r.height};}));
  let overlaps=0;for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1)overlaps++;}
  if(overlaps)throw new Error('实际主图展开卡片重叠');
  await page.screenshot({path:join(root,`evidence/v07-final-real-${compact?'mobile':'desktop'}-expanded.png`)});
  await page.getByRole('button',{name:'收起看清计划与进展',exact:true}).click();await expect(page.locator('.project-card')).toHaveCount(5);
  checks.push({device:compact?'Chrome touch 390×844':'Chrome 1440×900',defaultCards:5,defaultText:text,detail,expandedCards:13,overlaps,detailClosed:true});await context.close();
 }
 if(errors.length)throw new Error(errors.join(';'));
 if(digest(await readFile(join(root,'project-data/state.json')))!==digest(before)||digest(await readFile(join(root,'project-data/view.json')).catch(()=>Buffer.from('missing')))!==digest(viewBefore))throw new Error('只读主页面核对改变状态或偏好');
 await writeFile(join(root,'evidence/v07-final-real-ui.json'),JSON.stringify({recordedAt:new Date().toISOString(),url,revision:state.revision,artifactVersion:state.report.candidates.filter((c:any)=>c.baselineVersion===3).at(-1)?.version,method:'真实主业务事实及最终生产页面；仅为默认布局核对截断视角GET/POST，不修改用户偏好；业务状态未mock，未写决定。',mainStateUnchanged:true,userViewUnchanged:true,checks,errors,passed:true},null,2),{mode:0o600});
 console.log(JSON.stringify({passed:true,devices:2,mainStateUnchanged:true,userViewUnchanged:true}));
}finally{await browser.close();}
