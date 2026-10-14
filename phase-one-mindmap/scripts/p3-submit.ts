// Ordinary CLI only. Every operation binds a fresh revision; conflicts stop without replay.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const input=process.argv[2],label=process.argv[3];if(!input||!label||!/^[a-zA-Z0-9_-]+$/.test(label))throw Error('action file and stable receipt label required');
const out=resolve('../outputs/P3-continuous-update');await mkdir(out,{recursive:true});
const request=join(out,label+'-request.json');
function run(args:string[]){const result=spawnSync(process.execPath,['backend/cli.ts',...args],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||result.stdout);return result.stdout;}
await readFile(input);run(['make-request','--action',input,'--out',request]);
const raw=run(['submit','--request',request]);await writeFile(join(out,label+'-receipt.json'),raw,{flag:'wx',mode:0o600});
const receipt=JSON.parse(raw);console.log(JSON.stringify({label,committedRevision:receipt.committedRevision,currentRevision:receipt.currentRevision,operationId:JSON.parse(await readFile(request,'utf8')).operationId}));
