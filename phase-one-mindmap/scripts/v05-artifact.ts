import * as fs from 'node:fs/promises';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const digest=(raw:Buffer|string)=>createHash('sha256').update(raw).digest('hex');
const files:{path:string;bytes:number;sha256:string}[]=[];
async function add(p:string){
 const st=await fs.lstat(p);
 if(st.isSymbolicLink())throw new Error('成果摘要不跟随符号链接');
 if(st.isDirectory())for(const name of (await fs.readdir(p)).sort())await add(join(p,name));
 else if(st.isFile()){const b=await fs.readFile(p);files.push({path:relative(root,p),bytes:b.length,sha256:digest(b)});}
}
for(const name of ['backend','src','scripts','tests','dist','package.json','pnpm-lock.yaml','tsconfig.json','index.html','Start.command','Stop.command','project.config.json','demo.config.json','self-project-initial.json','v05-baseline-proposal.json','README.md','CLI_GUIDE.md','MAINTENANCE.md','PERFORMANCE.md','SELF_PROJECT_BASELINE.md'])await add(join(root,name));
files.sort((a,b)=>a.path.localeCompare(b.path));
const artifactVersion='sha256-'+digest(JSON.stringify(files));
const checkNames=process.argv.slice(2);
if(!checkNames.length||checkNames.some(n=>!/^v05-[a-zA-Z0-9_-]+\.(txt|json|md)$/.test(n)))throw new Error('提供本轮实际检查记录文件名，不接受任意路径');
const checks=[];
for(const name of checkNames){
 const p=join(root,'evidence',name),st=await fs.lstat(p);
 if(st.isSymbolicLink()||!st.isFile())throw new Error('检查记录必须为普通文件');
 const b=await fs.readFile(p);checks.push({path:'evidence/'+name,bytes:b.length,sha256:digest(b),recordLastModifiedAt:st.mtime.toISOString()});
}
const output={manifestVersion:1,recordedAt:new Date().toISOString(),artifactVersion,scope:'v0.5本工具程序、测试、产物、基线提案及固定交付说明；不含运行状态或会话凭据。检查记录对应实际本轮执行；旧76项仅历史记录。文件mtime为记录完成时间。',files,checks};
await fs.mkdir(join(root,'evidence/artifact-manifests'),{recursive:true});
const immutable=join(root,'evidence/artifact-manifests',artifactVersion+'.json');
try{await fs.writeFile(immutable,JSON.stringify(output,null,2),{flag:'wx',mode:0o600});}
catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const old=JSON.parse(await fs.readFile(immutable,'utf8'));if(JSON.stringify(old.files)!==JSON.stringify(files)||JSON.stringify(old.checks)!==JSON.stringify(checks))throw new Error('已有成果清单不匹配，禁止覆盖');}
await fs.writeFile(join(root,'evidence/v05-artifact-manifest.json'),await fs.readFile(immutable),{mode:0o600});
console.log(JSON.stringify({artifactVersion,files:files.length,checks:checks.length}));
