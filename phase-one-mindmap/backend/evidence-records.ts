import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fail,type EvidenceRecord,type State} from '../src/domain.ts';
const digest=(raw:Buffer)=>createHash('sha256').update(raw).digest('hex');
export const blobName=(r:EvidenceRecord)=>`evidence-files/${r.sha256}.txt`;
async function boundedFile(root:string,relative:string,r:EvidenceRecord){
 const base=await fs.realpath(root);if(base!==resolve(root))fail('SYMLINK_DENIED','证据根路径不能含符号链接');
 let path=base;for(const segment of relative.split('/')){if(!segment||segment==='.'||segment==='..')fail('PATH_DENIED','证据路径越界');path=join(path,segment);let st;try{st=await fs.lstat(path);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')fail('EVIDENCE_MISSING','登记证据文件缺失');throw e;}if(st.isSymbolicLink())fail('SYMLINK_DENIED','证据路径不得跟随符号链接');}
 if(!path.startsWith(base+'/'))fail('PATH_DENIED','证据路径越界');if(await fs.realpath(path)!==path)fail('SYMLINK_DENIED','证据实际路径逃逸');const f=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const st=await f.stat();if(!st.isFile()||st.size>1_000_000||st.size!==r.bytes)fail('EVIDENCE_SIZE_MISMATCH','证据大小不匹配或超过1MB');const raw=await f.readFile();if(raw.length!==r.bytes||digest(raw)!==r.sha256)fail('EVIDENCE_DIGEST_MISMATCH','证据内容摘要不匹配');const content=new TextDecoder('utf-8',{fatal:true}).decode(raw);if(r.mediaType==='application/json'){try{JSON.parse(content);}catch{fail('EVIDENCE_TYPE_MISMATCH','登记JSON记录不是合法JSON');}}return content;}finally{await f.close();}
}
export async function readRecord(root:string,r:EvidenceRecord){return boundedFile(root,blobName(r),r);}
export async function ensureBlob(root:string,r:EvidenceRecord,content:string){const dir=join(root,'evidence-files');try{await fs.mkdir(dir,{mode:0o700});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}if((await fs.lstat(dir)).isSymbolicLink())fail('SYMLINK_DENIED','证据目录不得链接');const path=join(root,blobName(r));try{const f=await fs.open(path,'wx',0o600);try{await f.writeFile(content);await f.sync();}finally{await f.close();}}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}await readRecord(root,r);const d=await fs.open(dir,'r');try{await d.sync();}finally{await d.close();}}
export async function registerFiles(projectRoot:string,dataRoot:string,records:EvidenceRecord[]){for(const r of records){const content=await boundedFile(projectRoot,r.relativePath,r);await ensureBlob(dataRoot,r,content);}}
export async function registeredFiles(dataRoot:string,s:State){const files:Record<string,string>={};for(const r of s.evidenceRecords??[])files[blobName(r)]=await readRecord(dataRoot,r);return files;}
export async function readBackupRecord(dataRoot:string,backupId:string,r:EvidenceRecord){return boundedFile(dataRoot,`backups/${backupId}-evidence/${r.sha256}.txt`,r);}
