import assert from 'node:assert/strict';
import {relationScore,scoreHouse,scoreTopic} from '../js/score-engine.js';
import {calculateNineBases} from '../js/chart-engine.js';
assert.deepEqual(relationScore('สูง',['มิตรใหญ่','ธาตุไฟ']),{points:70,joint:40,good:2,multiple:20});
const chart=calculateNineBases(1,1,1);
const result=scoreTopic(chart,'ฐานะการเงิน');
assert.deepEqual(result.groups.map(g=>g.items.length),[6,3,3]);
assert.equal(scoreTopic(chart,'การงาน').status,'unconfigured');
const own=scoreHouse(chart,1,2);
assert(own.bad.some(b=>b.base===1&&b.house==='หินะ'));
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const ch=calculateNineBases(a,b,c);
 const r=scoreTopic(ch,'ฐานะการเงิน');
 if(r.status==='complete') {
  assert.equal(r.raw,r.groups.reduce((s,g)=>s+g.weight*g.raw,0));
  assert.equal(r.score,Math.max(0,Math.min(100,r.raw)));
 }
 for(const g of r.groups)for(const h of g.items){
  if(h.bad.length&&h.sum===6)assert.equal(h.tier,'ต่ำ');
  if(h.bad.length&&[9,11].includes(h.sum))assert.equal(h.tier,'ปานกลาง');
  assert.equal(h.deduction,h.bad.length*5+[0,0,10,15,25,40][h.major]+(h.minor===2?5:0));
 }
}
console.log('✓ Score rules, repeated positions, all 343 charts, downgrades and final-only clamp passed');
