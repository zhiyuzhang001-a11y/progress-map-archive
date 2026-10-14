import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {manageService} from '../../scripts/manage-service.ts';
import {Store} from '../../backend/store.ts';
import {cloneProject} from '../../backend/packages.ts';
import {loadConfig} from '../../backend/config.ts';
const source=process.cwd();
async function cli(root:string,command:string){const p=spawn(process.execPath,[join(root,'scripts/manage-service.ts'),command],{cwd:root});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);const [code]=await once(p,'exit');assert.equal(code,0,err);return JSON.parse(out);}
test('detached launcher survives parent exit, repeats safely, protects foreign ports and confirms shutdown',async()=>{
 const directory=await fs.mkdtemp(join(source,'archives/launcher-verification-'));const config=await loadConfig(source);await cloneProject(new Store(source,config),directory,config);
 for(const name of ['backend','src','scripts','dist'])await fs.cp(join(source,name),join(directory,name),{recursive:true});await fs.copyFile(join(source,'package.json'),join(directory,'package.json'));
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=(reservation.address() as {port:number}).port;await new Promise<void>(r=>reservation.close(()=>r()));
 const p=join(directory,'project.config.json');const cfg=JSON.parse(await fs.readFile(p,'utf8'));cfg.port=port;delete cfg.initialState;await fs.writeFile(p,JSON.stringify(cfg));
 try{const first=await cli(directory,'start');assert.equal(first.started,true);const alive=await cli(directory,'status');assert.equal(alive.status,'ready');const second=await cli(directory,'start');assert.equal(second.started,false);const failedOpen=await manageService('start',{root:directory,open:true,browserOpener:async()=>{throw new Error('合成OS浏览器打开失败');}});assert.equal(failedOpen.browserOpened,false);assert.equal((await cli(directory,'status')).status,'ready');assert.equal((await cli(directory,'stop')).stopped,true);assert.equal((await cli(directory,'status')).status,'offline');
  const foreign=createServer((_q,r)=>r.end('different app'));foreign.listen(port,'127.0.0.1');await once(foreign,'listening');try{await assert.rejects(manageService('start',{root:directory}),{code:'FOREIGN_PORT'});await assert.rejects(manageService('stop',{root:directory}),{code:'FOREIGN_PORT'});assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(),'different app');}finally{await new Promise<void>(r=>foreign.close(()=>r()));}
 }finally{await manageService('stop',{root:directory}).catch(()=>{});await fs.rm(directory,{recursive:true,force:true});}
});
