import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {root,cli} from './v05-cli-helpers.ts';
const outputPrefix=process.argv.find(arg=>arg.startsWith('--output-prefix='))?.slice('--output-prefix='.length)??'v07-final';
if(!/^v07-[a-z0-9-]+$/.test(outputPrefix))throw new Error('Invalid output prefix');
const config=JSON.parse(await readFile(join(root,'project.config.json'),'utf8')),url=`http://127.0.0.1:${config.port}`;
const s=(await cli(['read'])).state;if(s.projectId!=='progress-mindmap-self'||s.baseline.version!==3)throw new Error('本次项目范围不匹配');
const html=await(await fetch(url)).text(),token=html.match(/name="mindmap-session" content="([a-f0-9]+)"/)?.[1];if(!token)throw new Error('会话缺失');
const packs=[];for(const version of [2,3]){const response=await fetch(url+`/api/acceptance-pack?baselineVersion=${version}`,{headers:{'x-mindmap-session':token}});const p=await response.json();if(!response.ok||p.projectId!==s.projectId||p.baselineVersion!==version||p.revision!==s.revision||p.recoveryEpoch!==s.recoveryEpoch||p.items.length!==6||p.items.some((i:any)=>!i.ready||i.state==='accepted'))throw new Error('验收范围、事实或版本已变化，请重新核对');packs.push(p);}
const after=(await cli(['read'])).state;if(after.revision!==s.revision||after.recoveryEpoch!==s.recoveryEpoch)throw new Error('取验收上下文期间状态变化，不能缓存旧决定');
await writeFile(join(root,'evidence',outputPrefix+'-acceptance-context.json'),JSON.stringify({recordedAt:new Date().toISOString(),purpose:'只读准备上一轮六项与本次六项明确范围及原成果版本，供最终聊天决定后受控录入；没有用户决定，不保存会话凭据。任何决定时仍须读取最新pack核对，不能自动换版本重放。',packs},null,2),{mode:0o600});
console.log(JSON.stringify({prepared:true,scopes:[2,3],pending:12,revision:s.revision,noDecisionsWritten:true}));
