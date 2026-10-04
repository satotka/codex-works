import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFile} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer(async(req,res)=>{try {const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;} const data=await readFile(file); res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(4173,'127.0.0.1',()=>{
  console.log('AMBER POKER: http://127.0.0.1:4173');
  if(process.platform==='win32'&&process.argv.includes('--open'))execFile('cmd.exe',['/c','start','','http://127.0.0.1:4173'],{windowsHide:true});
});
