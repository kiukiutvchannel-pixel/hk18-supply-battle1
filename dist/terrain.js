import {getMap} from './maps.js';
let active=getMap('10');
export function setTerrainMap(id){active=getMap(id);nodeCache.clear();return active;}
export function terrainProfile(){return active;}
// Shared elevation in metres for geometry, physics, navigation and both renderers.
export const TERRAIN_STEP=2;
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
export function isBridge(x,y){let r=Math.hypot(x,y);return r>active.inner-3&&r<active.outer+3&&(Math.abs(x)<=5.5||Math.abs(y)<=5.5);}
export function isGap(x,y){let r=Math.hypot(x,y);return r>active.inner&&r<active.outer&&!isBridge(x,y);}
export function isWater(x,y){return active.biome!=='canyon'&&isGap(x,y);}
function calculateHeight(x,y){let r=Math.hypot(x,y);let visualBridge=r>active.inner-3&&r<active.outer+3&&(Math.abs(x)<=6||Math.abs(y)<=6);if(isGap(x,y)&&!visualBridge)return active.biome==='canyon'?-5:-3;let h=1.5+(active.centre-1.5)*(1-smooth((r-16)/(active.outer-13)));for(let sx of [-1,1])for(let sy of [-1,1]){let d=Math.hypot(x-sx*35,y-sy*35);h=Math.max(h,1.5+(active.landmark-1.5)*(1-smooth((d-16)/10)));let corner=Math.hypot(x-sx*61,y-sy*61);h=Math.max(h,1.5+(active.corner-1.5)*(1-smooth((corner-4)/16)));}return h;}
const nodeCache=new Map();
export function rawHeight(x,y){let key=(x+128)*512+y+128;if(nodeCache.has(key))return nodeCache.get(key);let h=calculateHeight(x,y);nodeCache.set(key,h);return h;}
// Matches the exact diagonal of every generated terrain triangle.
export function terrainHeight(x,y){let ax=Math.floor(x/2)*2,ay=Math.floor(y/2)*2,u=(x-ax)/2,v=(y-ay)/2,a=rawHeight(ax,ay),b=rawHeight(ax+2,ay),c=rawHeight(ax,ay+2),d=rawHeight(ax+2,ay+2);return v<=u?a*(1-u)+b*(u-v)+d*v:a*(1-v)+c*(v-u)+d*u;}
export function walkableTerrain(x,y,r=.8){return ![[0,0],[r,0],[-r,0],[0,r],[0,-r]].some(([dx,dy])=>isGap(x+dx,y+dy));}
export function terrainName(x,y){if(isBridge(x,y))return active.biome==='canyon'?'跨谷斜橋':'跨河斜橋';if(isGap(x,y))return active.biome==='canyon'?'岩谷':'河道';if(Math.hypot(x,y)<16)return '中央高台';if(terrainHeight(x,y)>7)return '山丘／高地';if(terrainHeight(x,y)>2)return '坡道';return '低地平原';}

export function drawTerrainMini(ctx){ctx.fillStyle='#d7dfcb';ctx.fillRect(0,0,320,208);for(let x=-70;x<70;x+=4)for(let y=-70;y<70;y+=4){let h=terrainHeight(x+2,y+2);ctx.fillStyle=isWater(x+2,y+2)?'#59bdca':isGap(x+2,y+2)?'#a08063':isBridge(x+2,y+2)?'#b88d54':Math.hypot(x+2,y+2)<16?'#e0c56c':h>7?'#7a9b65':h>2?'#a5b983':'#d4d6b0';ctx.fillRect(56+(x+70)*208/140,(70-y-4)*208/140,208/35+.5,208/35+.5);}ctx.fillStyle='#4d6659';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('N',160,10);}
