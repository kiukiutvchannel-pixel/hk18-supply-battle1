// Account-free game sharing using Cloudflare's official Quick Tunnel client.
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,access,writeFile,chmod,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
process.chdir(root);
let server,tunnel,closing=false,linkSaved=false;
const linkFile=join(root,'JOIN_LINK.txt');
function stop(code=0){if(closing)return;closing=true;server?.kill();tunnel?.kill();process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
process.on('exit',()=>{server?.kill();tunnel?.kill();});
async function main(){
 if(!['win32','linux'].includes(process.platform)||!['x64','arm64'].includes(process.arch))throw Error('This launcher supports Windows/Linux x64 or ARM64.');
 if(Number(process.versions.node.split('.')[0])<20)throw Error('Install Node.js 20 or newer first.');
 try{await unlink(linkFile);}catch{}
 console.log('HK18 FREE ONLINE - keep this window and computer running.');
 console.log('1/4 Preparing the 18 maps...');
 const build=spawnSync(process.execPath,['build.mjs'],{cwd:root,stdio:'inherit'});
 if(build.status!==0)throw Error('Map preparation failed.');
 const tools=join(root,'tools');await mkdir(tools,{recursive:true});
 const arch=process.arch==='x64'?'amd64':'arm64';
 const name=process.platform==='win32'?`cloudflared-windows-${arch}.exe`:`cloudflared-linux-${arch}`;
 const binary=join(tools,process.platform==='win32'?'cloudflared.exe':'cloudflared');
 try{await access(binary);}catch{
  console.log('2/4 Downloading official Cloudflare client (first start only)...');
  const response=await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/'+name,{signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw Error('Cloudflare download failed: HTTP '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length<1000000)throw Error('Cloudflare download was incomplete.');
  await writeFile(binary,bytes);if(process.platform!=='win32')await chmod(binary,0o755);
 }
 console.log('3/4 Starting game server on port 3000...');
 server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'3000'},stdio:'inherit'});
 server.on('error',e=>{console.error(e.message);stop(1);});
 server.on('exit',code=>{if(!closing){console.error('Game server stopped. Close any other game server using port 3000 and try again.');stop(code||1);}});
 let ready=false;
 for(let i=0;i<40&&!closing;i++){
  try{let r=await fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(1000)});let j=await r.json();if(j.online&&j.version==='0.7.0'){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 if(closing)return;if(!ready)throw Error('Game did not become ready.');
 console.log('4/4 Creating a free temporary public URL...');
 tunnel=spawn(binary,['tunnel','--url','http://127.0.0.1:3000'],{cwd:tools,stdio:['ignore','pipe','pipe']});
 let tail='';
 const output=data=>{
  const text=data.toString();process.stdout.write(text);tail=(tail+text).slice(-10000);
  const match=tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i);
  if(match&&!linkSaved){linkSaved=true;const url=match[0];writeFile(linkFile,url+'\r\n\r\nOpen this URL on phone, create a room, share URL and room code.\r\nKeep the computer and this window running.\r\n').then(()=>console.log('\nSHARE THIS URL: '+url+'\nAlso saved in JOIN_LINK.txt\nCreate a room; friends click Join and enter its room code.\n')).catch(e=>console.error('Could not save URL:',e.message));}
 };
 tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);
 tunnel.on('error',e=>{console.error('Tunnel failed:',e.message);stop(1);});
 tunnel.on('exit',code=>{if(!closing){console.error('Public link has stopped. Restart to get a new URL.');stop(code||1);}});
}
main().catch(e=>{console.error('\nERROR: '+e.message);stop(1);});
