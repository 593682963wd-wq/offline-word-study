/** 独立静态服务：仅公开构建目录；不读取学习记录或接入外部服务。 */
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpath,readFile,stat} from 'node:fs/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?'':'{"status":"ok"}');return;}
    const requested=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);
    const candidate=path.resolve(root,'.'+requested);
    if(!candidate.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const resolved=await realpath(candidate);
    if(!resolved.startsWith(root+path.sep)||!(await stat(resolved)).isFile()){res.writeHead(404);res.end();return;}
    const data=await readFile(resolved);res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]??'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT??4173),process.env.HOST??'127.0.0.1');
