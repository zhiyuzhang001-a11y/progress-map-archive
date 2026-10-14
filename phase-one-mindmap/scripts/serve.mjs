// Static built assets only. No business endpoints or write operations.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,extname} from 'node:path';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const files=new Map();
async function collect(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=join(dir,f.name);if(f.isDirectory())await collect(p);else files.set('/'+relative(root,p).split('\\').join('/'),await readFile(p));}}
await collect(root);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{let path;try{path=new URL(req.url,'http://127.0.0.1:4173').pathname;}catch{res.writeHead(400).end();return;}if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}if(path==='/')path='/index.html';const content=files.get(path);if(!content){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'4173 端口已占用。请关闭先前的原型窗口或检查占用进程。':e);process.exitCode=1;});
server.listen(4173,'127.0.0.1',()=>{console.log('枝序 · 合成数据原型：http://127.0.0.1:4173\n静态页面，无业务接口。按 Ctrl+C 关闭。');if(process.env.MINDMAP_OPEN_BROWSER==='1'&&process.platform==='darwin')spawn('open',['http://127.0.0.1:4173'],{stdio:'ignore'});});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
