import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function cli(args:string[]):Promise<any>{
 return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[join(root,'backend/cli.ts'),...args],{cwd:root});let out='',err='';
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.once('error',reject);
  p.once('exit',code=>{if(code!==0)return reject(new Error(err||`CLI退出${code}`));try{resolve(JSON.parse(out));}catch(e){reject(e);}});
 });
}
export async function submit(dir:string,action:unknown){
 const id=randomUUID(),input=join(dir,id+'-action.json'),request=join(dir,id+'-request.json');
 await writeFile(input,JSON.stringify(action),{flag:'wx',mode:0o600});
 await cli(['make-request','--action',input,'--out',request]);
 return {action,receipt:await cli(['submit','--request',request])};
}
