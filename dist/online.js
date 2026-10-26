import {currentMap} from './map-menu.js';
import {TEAM_NAMES} from './engine.js';
const $=id=>document.getElementById(id);
export function bindOnline(b){
 let ticket=null,controls={},pending=[],serial=0,busy=false,stopped=false,started=false,lastReply=0;
 const original={};for(let name of ['update','start','reset','interact','action','jump','openPad','choosePlan','cycleMode','switchUnit'])original[name]=b[name].bind(b);
 let begin=$('start').onclick;
 const panel=document.createElement('section');panel.id='onlinePanel';panel.innerHTML='<h2>朋友連機 · 最多四人</h2><p>一人一隊；空位由電腦控制。房主選圖，大家入齊先開始。</p><div class="room-entry"><input id="roomCode" aria-label="六位房號" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="六位房號"><button id="joinRoom">加入</button><button id="createRoom">開房</button></div><p id="networkMessage" role="status">正在檢查連機伺服器…</p><button id="onlineStart" hidden>人齊，開始對戰</button><button id="leaveRoom" hidden>離開房間</button><p id="serverHelp" hidden>此網址目前只有單機網頁。下載連機版，在 Node.js 主機執行 npm start，然後分享該主機網址。</p>';
 $('start').before(panel);
 let banner=document.createElement('div');banner.id='roomBanner';banner.hidden=true;banner.innerHTML='<span></span><button id="shareRoom">房號</button><button id="mobileBuild">建造</button><button id="onlineLeave">離房</button>';document.body.append(banner);
 const say=t=>$('networkMessage').textContent=t;
 const request=async(path,data={},auth=ticket)=>{let response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.token}:{})},body:JSON.stringify({code:auth?.code,...data}),signal:AbortSignal.timeout(6000)});let result;try{result=await response.json();}catch{throw new Error('此網址未啟用連機伺服器，請使用下載包嘅 Node.js 網址。');}if(!response.ok)throw new Error(result.error||'連線失敗');return result;};
 function queue(type,value){if(ticket&&pending.length<32)pending.push({id:++serial,type,value});}
 function leave(){stopped=true;sessionStorage.removeItem('hk18-room');location.assign('?map='+currentMap.id);}
 function apply(packet){
  if(stopped)return;lastReply=Date.now();b.localTeam=packet.team;let state=packet.state;
  for(let key of ['time','status','winner','limit','protection','specialTimer','mode','stats','crates','items','shots','effects'])b[key]=state[key];
  for(let data of state.bases)Object.assign(b.bases[data.team],data);
  b.units=state.units.map(u=>({...u,path:[],player:false}));let id=packet.players.find(p=>p.team===packet.team)?.unit;b.player=b.units.find(u=>u.id===id)||b.units.find(u=>u.team===packet.team)||{id:-1,team:packet.team,hp:0,maxHp:240,x:b.bases[packet.team].x,y:b.bases[packet.team].y,z:0,weapon:'fist',ammo:0};b.player.player=true;
  pending=pending.filter(a=>a.id>packet.ack);serial=Math.max(serial,packet.ack);let count=packet.players.filter(p=>p.connected).length;
  say('房號 '+packet.code+' · '+TEAM_NAMES[packet.team]+' · '+count+'/4 人');banner.querySelector('span').textContent=packet.code+' · '+TEAM_NAMES[packet.team]+' · '+count+'/4';banner.hidden=false;
  $('onlineStart').hidden=!packet.host||state.status!=='ready';$('leaveRoom').hidden=false;$('start').hidden=!!ticket;$('mapSelect').disabled=true;$('applyMap').disabled=true;
  if(state.status==='playing'&&!started){started=true;begin();$("toast").textContent="你係"+TEAM_NAMES[packet.team]+"，先搬箱建造隊友。";}
  if(state.status==='over'&&b._onlineOver!==true){b._onlineOver=true;b.events.push({type:'over'});$('endOverlay').classList.remove('hidden');$('endTitle').textContent=state.winner===packet.team?'你嘅隊伍勝出！':'對戰結束';$('endReason').textContent=state.winner<0?'平手':TEAM_NAMES[state.winner]+'勝出';}
 }
 async function enter(packet){ticket={code:packet.code,token:packet.token,map:packet.map};sessionStorage.setItem('hk18-room',JSON.stringify(ticket));if(packet.map!==currentMap.id){location.assign('?map='+packet.map+'&room='+packet.code);return;}history.replaceState(null,'','?map='+ticket.map+'&room='+ticket.code);apply(packet);$('createRoom').disabled=true;$('joinRoom').disabled=true;}
 $('createRoom').onclick=async()=>{try{$('createRoom').disabled=true;await enter(await request('create',{map:currentMap.id},null));}catch(e){say(e.message);$('createRoom').disabled=false;}};
 $('joinRoom').onclick=async()=>{try{$('joinRoom').disabled=true;await enter(await request('join',{code:$('roomCode').value.trim().toUpperCase()},null));}catch(e){say(e.message);$('joinRoom').disabled=false;}};
 $('onlineStart').onclick=async()=>{try{apply(await request('start'));}catch(e){say(e.message);}};
 $('leaveRoom').onclick=leave;$('onlineLeave').onclick=leave;$('shareRoom').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/?map='+ticket.map+'&room='+ticket.code);banner.querySelector('span').textContent='邀請網址已複製 · '+ticket.code;}catch{banner.querySelector('span').textContent='分享此網址及房號 '+ticket.code;}};
 $('mobileBuild').onclick=()=>document.body.classList.toggle('show-build');
 b.update=(dt,input)=>{if(ticket){controls={...input};return;}return original.update(dt,input);};
 b.start=()=>ticket?undefined:original.start();b.reset=()=>ticket?leave():original.reset();
 for(let name of ['interact','action','jump','switchUnit','cycleMode','choosePlan','openPad'])b[name]=(...args)=>{if(!ticket)return original[name](...args);queue(name,args[0]);return true;};
 $('autoBuild').onclick=()=>{if(ticket)queue('auto');else b.bases[0].autoPlan=!b.bases[0].autoPlan;};
 async function poll(){if(!ticket||busy||stopped)return;busy=true;try{let active=!document.hidden&&$('pauseOverlay').classList.contains('hidden')&&b.status==='playing';apply(await request('input',{controls:active?controls:{},actions:active?pending:[]}));}catch(e){banner.querySelector('span').textContent='重連中 · '+e.message;if(Date.now()-lastReply>10000)controls={};}finally{busy=false;}}
 setInterval(poll,66);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)controls={};});
 fetch('/api/health',{signal:AbortSignal.timeout(5000)}).then(async r=>{let j=await r.json();if(!j.online)throw Error();document.querySelector('.download-online').hidden=true;say('連機伺服器就緒 · 開房或輸入朋友房號');}).catch(()=>{say('單機可玩 · 此網址未啟用連機伺服器');$('serverHelp').hidden=false;$('joinRoom').disabled=true;$('createRoom').disabled=true;});
 let query=new URLSearchParams(location.search);$('roomCode').value=query.get('room')||'';
 try{let saved=JSON.parse(sessionStorage.getItem('hk18-room')||'null');if(saved&&query.get('room')===saved.code&&saved.map===currentMap.id){ticket=saved;request('state').then(apply).catch(e=>{ticket=null;sessionStorage.removeItem('hk18-room');say(e.message);});}}catch{}
 // Build panel stays reachable even offline on narrow touch screens.
 const toggle=document.createElement('button');toggle.id='buildToggle';toggle.textContent='建造／隊友';toggle.onclick=()=>document.body.classList.toggle('show-build');document.body.append(toggle);
}
