// Gameplay uses XY with north = +Y; renderers map it to Three.js X,-Z.
export const WORLD={min:-70,max:70};
export const BASE_POS=[[0,-54],[54,0],[0,54],[-54,0]];
export const DIRECTIONS=['南','東','北','西'];
export const SUPPLY={x:0,y:0,radius:11.5};
export const COVERS=[[-14,-14],[14,-14],[-14,14],[14,14]].map(([x,y])=>({name:'Cover',x,y,w:3,h:3,height:1.3}));
export function spawnPoint(base,side=0){let len=Math.hypot(base.x,base.y)||1,dx=-base.x/len,dy=-base.y/len;return{x:base.x+dx*6-dy*side,y:base.y+dy*6+dx*side};}
export const BUILDING_SLOTS=[{asset:'B01_Nina_Inspired_Tower',x:-35,y:35},{asset:'B03_Citywalk_Inspired_Mall',x:35,y:35},{asset:'B10_SamTungUk_Inspired_Courtyard',x:35,y:-35},{asset:'B06_OldTown_Market',x:-35,y:-35}];
