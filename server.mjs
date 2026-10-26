// Node.js 20+, no dependencies. One authoritative simulation per room.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {Battle} from './dist/engine.js';
import {setTerrainMap} from './dist/terrain.js';
import {MAPS} from './dist/maps.js';
import {MODES} from './dist/weapons.js';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const secret=()=>randomBytes(24).toString('hex');
const omit=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
export function createGameServer(){
 const rooms=new Map(),creation=new Map();
 let last=performance.now();
 function assign(room){for(let u of room.battle.units){u.player=false;u.human=false;}for(let s of room.slots){let alive=room.battle.alive(s.team);let u=alive.find(u=>u.id===s.unit)||alive[0];s.unit=u?.id??null;if(u&&Date.now()-s.seen<10000)u.human=true;}}
 function snapshot(r,s){let b=r.battle;return {code:r.code,map:r.map,team:s.team,host:s.team===0,ack:s.ack,players:r.slots.map(p=>({team:p.team,connected:Date.now()-p.seen<10000,unit:p.unit})),state:{time:b.time,status:b.status,winner:b.winner,limit:b.limit,protection:b.protection,specialTimer:b.specialTimer,mode:b.teamModes[s.team],stats:b.teamStats[s.team],units:b.units.map(u=>omit(u,['path','goal','human'])),bases:b.bases.map(v=>omit(v,['store'])),crates:b.crates,items:b.items,shots:b.shots,effects:b.effects}};}
 function act(r,s,a){let b=r.battle,u=b.units.find(u=>u.id===s.unit);if(!u||u.hp<=0)return;switch(a.type){case'interact':b.interact(u);break;case'action':b.action(u);break;case'jump':b.jump(u);break;case'openPad':b.openPad(s.team,u);break;case'choosePlan':if(['light','grenade','buddy','heavy','elite','tank'].includes(a.value))b.choosePlan(a.value,s.team);break;case'cycleMode':b.teamModes[s.team]=MODES[(MODES.indexOf(b.teamModes[s.team])+1)%MODES.length];break;case'auto':b.bases[s.team].autoPlan=!b.bases[s.team].autoPlan;break;case'switchUnit':{let list=b.alive(s.team);s.unit=list[(list.findIndex(v=>v.id===s.unit)+1)%list.length]?.id;assign(r);break;}}}
 const timer=setInterval(()=>{for(let [ip,v]of creation)if(Date.now()-v.time>60000)creation.delete(ip);let now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;for(let [key,r]of rooms){if(Date.now()-r.seen>1800000){rooms.delete(key);continue;}setTerrainMap(r.map);assign(r);r.battle.networkInputs=Object.fromEntries(r.slots.map(s=>[s.team,Date.now()-s.seen<600?s.controls:{}]));for(let remaining=dt;remaining>0;remaining-=1/30)r.battle.update(Math.min(1/30,remaining),{});r.battle.events=[];}},1000/30);timer.unref();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{try{
  let url=new URL(req.url,'http://local');
  if(url.pathname.startsWith('/api/')){
   // No cross-origin credentialed API: clients and server share one origin.
   if(req.headers.origin&&req.headers.origin!==`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`){return json(res,403,{error:'來源不符'});}
   if(url.pathname==='/api/health')return json(res,200,{online:true,version:'0.7.0'});
   if(req.method!=='POST')return json(res,405,{error:'使用 POST'});
   let chunks=[],length=0;for await(let c of req){length+=c.length;if(length>8192)return json(res,413,{error:'資料太大'});chunks.push(c);}let body;try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{return json(res,400,{error:'格式錯誤'});}
   if(url.pathname==='/api/create'){
    let ip=req.socket.remoteAddress,rate=creation.get(ip)||{n:0,time:Date.now()};if(Date.now()-rate.time>60000)rate={n:0,time:Date.now()};creation.set(ip,rate);if(++rate.n>10||rooms.size>=16)return json(res,429,{error:'房間已滿，請稍後再試'});
    let map=MAPS.find(m=>m.id===body.map)?.id;if(!map)return json(res,400,{error:'地圖不存在'});setTerrainMap(map);let obstacles=JSON.parse(await readFile(resolve(root,'assets/maps',map,'collision.json'),'utf8'));setTerrainMap(map);let b=new Battle(obstacles,randomBytes(4).readUInt32LE());b.networked=true;b.protection=0;b.teamModes=['build','build','build','build'];let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));let slot={team:0,token:secret(),seen:Date.now(),ack:0,controls:{},window:Date.now(),count:0};let r={code,map,battle:b,slots:[slot],seen:Date.now()};rooms.set(code,r);assign(r);return json(res,201,{token:slot.token,...snapshot(r,slot)});
   }
   let r=rooms.get(String(body.code||'').toUpperCase());if(!r)return json(res,404,{error:'房間不存在或已過期'});r.seen=Date.now();setTerrainMap(r.map);
   if(url.pathname==='/api/join'){
    if(r.battle.status!=='ready')return json(res,409,{error:'已開戰，請等房主開新房'});if(r.slots.length>=4)return json(res,409,{error:'房間已有四人'});let slot={team:r.slots.length,token:secret(),seen:Date.now(),ack:0,controls:{},window:Date.now(),count:0};r.slots.push(slot);assign(r);return json(res,200,{token:slot.token,...snapshot(r,slot)});
   }
   let token=(req.headers.authorization||'').replace(/^Bearer /,'');let s=r.slots.find(s=>s.token===token);if(!s)return json(res,401,{error:'房間通行證失效'});
   if(Date.now()-s.window>1000){s.window=Date.now();s.count=0;}if(++s.count>40)return json(res,429,{error:'操作太頻密'});s.seen=Date.now();assign(r);
   if(url.pathname==='/api/start'){if(s.team!==0)return json(res,403,{error:'只有房主可以開始'});r.battle.start();}
   else if(url.pathname==='/api/input'){
    let c=body.controls||{};s.controls={x:Number.isFinite(c.x)?Math.max(-1,Math.min(1,c.x)):0,y:Number.isFinite(c.y)?Math.max(-1,Math.min(1,c.y)):0,fire:c.fire===true};let actions=Array.isArray(body.actions)?body.actions.slice(0,16):[];
    for(let a of actions){if(!a||!Number.isSafeInteger(a.id)||a.id<=s.ack||a.id>s.ack+100)continue;if(r.battle.status==='playing')act(r,s,a);s.ack=a.id;}
   }else if(url.pathname!=='/api/state')return json(res,404,{error:'找不到此服務'});
   return json(res,200,snapshot(r,s));
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let path;try{path=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}let file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root)||path.split('/').some(x=>x.startsWith('.'))){res.writeHead(403);return res.end();}
  let data=await readFile(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.zip':'application/zip'};res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':['.html','.js','.css','.json'].includes(extname(file))?'no-cache':'public,max-age=3600'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(e.code==='ENOENT'){res.writeHead(404);res.end('Not found');}else{console.error(e.message);json(res,500,{error:'伺服器暫時失效'});}}});
 server.on('close',()=>clearInterval(timer));return {server,rooms};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){let {server}=createGameServer();server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`HK18 online ready on port ${server.address().port}`));}
