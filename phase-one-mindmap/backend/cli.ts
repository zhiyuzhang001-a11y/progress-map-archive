import {projectMap} from '../src/project-map.ts';
import {readFile,lstat,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {loadConfig,initialForNewData} from './config.ts';
import {exportPackage,verifyPackage,cloneProject} from './packages.ts';
import {Store,LIMITS} from './store.ts';
import {DomainError,envelopeSchema,actionSchema,fail} from '../src/domain.ts';
const args=process.argv.slice(2);const command=args.shift()??'help';
function option(name:string){const i=args.indexOf(name);if(i<0)return undefined;const value=args[i+1];if(!value||value.startsWith('--'))fail('CLI_ARGUMENT',`${name} 需要值`);args.splice(i,2);return value;}
async function json(path:string|undefined){if(!path)fail('CLI_ARGUMENT','需要指定 JSON 输入文件');const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.size>LIMITS.bodyBytes)fail('INVALID_INPUT_FILE','输入须为 128KB 内普通文件');return JSON.parse(await readFile(path,'utf8'));}
async function run(){
 const configFile=option('--config')??'project.config.json';const destination=option('--destination');const root=resolve(option('--root')??fileURLToPath(new URL('../',import.meta.url)));const request=option('--request');const actionFile=option('--action');const out=option('--out');const recordId=option('--record');const recordVersion=option('--version');const operation=option('--operation');const backupId=option('--backup-id');const confirm=args.includes('--confirm-loss');if(confirm)args.splice(args.indexOf('--confirm-loss'),1);const synthetic=args.includes('--synthetic');if(synthetic)args.splice(args.indexOf('--synthetic'),1);
const config=command==='help'?undefined:await loadConfig(root,configFile);const store=new Store(root,config??'synthetic-field-guide-01');
 if(args.length)fail('CLI_ARGUMENT','未知参数');
 if(command==='help')return {commands:['init --synthetic','read','map','doctor','make-request --action action.json --out request.json','submit --request request.json','receipt --operation id','evidence-record --record id --version artifact-version','backups','backup','export --destination new-directory','verify-export --destination directory','clone --destination existing-empty-directory','recovery-preview --backup-id id','recover --request restore.json --confirm-loss'],scope:'显式配置的单个项目。普通submit无用户验收权限；clone/export保全来源，不释放容量。'};
 if(command==='init'){if(config?.kind==='synthetic'&&!synthetic)fail('CLI_ARGUMENT','演示初始化需 --synthetic');if(config?.kind==='real'&&synthetic)fail('SOURCE_MISMATCH','不能合成初始化真实项目');const initial=config?await initialForNewData(root,config):undefined;await store.init(initial);return {initialized:true,projectId:store.projectId};}
 if(command==='evidence-record'){if(!recordId||!recordVersion)fail('CLI_ARGUMENT','需要 --record 和 --version');return store.evidenceRecord(recordId,recordVersion);}
 if(command==='map')return projectMap((await store.read()).state);
 if(command==='read')return store.read();if(command==='recovery-preview'){if(!backupId)fail('CLI_ARGUMENT','需要 --backup-id');return store.recoveryContext(backupId);}
 if(command==='export'){if(!destination)fail('CLI_ARGUMENT','需要 --destination 新目录');return exportPackage(store,destination,config!);}if(command==='verify-export'){if(!destination)fail('CLI_ARGUMENT','需要 --destination');return verifyPackage(destination);}if(command==='clone'){if(!destination)fail('CLI_ARGUMENT','需要 --destination 已存在空目录');return cloneProject(store,destination,config!);}
 if(command==='doctor'){const r=await store.read();return {status:r.readOnly?'read-only-backup':config?.readOnly?'read-only-preview':'ready',projectId:r.state.projectId,revision:r.state.revision,baselineVersion:r.state.baseline.version,recoveryEpoch:r.state.recoveryEpoch,limits:LIMITS,capacity:await store.capacity(),config,root};}
 if(command==='make-request'){const a=actionSchema.parse(await json(actionFile));const {state}=a.type==='restore'?await store.recoveryContext(a.backupId):await store.read();const result={schemaVersion:state.schemaVersion,projectId:state.projectId,recoveryEpoch:state.recoveryEpoch,expectedRevision:state.revision,baselineVersion:state.baseline.version,operationId:randomUUID(),action:a};if(out)await writeFile(out,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});return result;}
 if(command==='submit')return store.submit(await json(request),'ai-cli');
 if(command==='backup')return store.backup();if(command==='backups')return store.backups();
 if(command==='receipt'){if(!operation)fail('CLI_ARGUMENT','需要 --operation');return {receipt:await store.operation(operation)};}
 if(command==='recover'){if(!confirm)fail('CONFIRM_LOSS_REQUIRED','恢复需专用 recover 命令及 --confirm-loss，先核对已知回退');return store.restore(envelopeSchema.parse(await json(request)));}
 fail('CLI_ARGUMENT','未知命令');
}
try{console.log(JSON.stringify(await run(),null,2));}catch(e){console.error(JSON.stringify({error:e instanceof DomainError?e.code:'CLI_ERROR',message:e instanceof Error?e.message:String(e),details:e instanceof DomainError?e.details:null}));process.exitCode=1;}
