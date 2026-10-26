export const WEAPONS=Object.freeze({
 fist:{name:'徒手',range:3.3,damage:12,cool:.65,ammo:0,speed:0,radius:0},
 uzi:{name:'衝鋒槍',range:28,damage:8,cool:.20,ammo:100,speed:45,radius:0},
 grenade:{name:'手榴彈',range:23,damage:42,cool:1.1,ammo:12,speed:16,radius:4.5,fuse:1.3},
 bazooka:{name:'火箭炮',range:39,damage:68,cool:1.4,ammo:12,speed:27,radius:4},
 mech:{name:'機械人火箭炮',range:38,damage:56,cool:.85,ammo:36,speed:27,radius:3.8},
 helicopter:{name:'直昇機火箭',range:42,damage:34,cool:.5,ammo:60,speed:34,radius:2.7},
 tank:{name:'坦克炮',range:42,damage:72,cool:1.2,ammo:40,speed:30,radius:4}
});
// Slot = X + 2*Z + 4*height, in an actual 2x2x2 stacking pad.
export const PLANS=Object.freeze({light:{name:'衝鋒槍',slots:[0],result:'uzi'},grenade:{name:'手榴彈',slots:[0,1],result:'grenade'},buddy:{name:'普通隊友',slots:[0,4],result:'buddy'},heavy:{name:'火箭炮',slots:[0,1,2,3],result:'bazooka'},elite:{name:'突擊隊友',slots:[0,1,4,5],result:'elite'},tank:{name:'坦克',slots:[0,1,2,3,4,5,6,7],result:'tank'}});
export const MODES=['build','follow','attack','defend'];
export const MODE_NAMES={build:'自動拾箱建造',follow:'跟隨護衛',attack:'攻擊敵隊',defend:'防守基地'};
export function padPoint(b){let l=Math.hypot(b.x,b.y)||1;return{x:b.x-b.x/l*9,y:b.y-b.y/l*9};}
export function slotPoint(b,slot){let p=padPoint(b);return{x:p.x+((slot%2)-.5)*1.6,y:p.y+((Math.floor(slot/2)%2)-.5)*1.6,z:.85+Math.floor(slot/4)*1.5};}

export const VEHICLES={tank:{name:'坦克',hp:600,speed:7.2},mech:{name:'機械人',hp:760,speed:8.5},helicopter:{name:'直昇機',hp:430,speed:14}};
