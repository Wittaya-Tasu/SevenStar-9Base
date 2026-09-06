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

const {specialCardBonus}=await import('../js/score-engine.js');
for(const n of [9,11,14,16,18])assert.equal(specialCardBonus(n),30);
assert.equal(specialCardBonus(19),55);assert.equal(specialCardBonus(13),20);assert.equal(specialCardBonus(5),0);
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const result=scoreTopic(calculateNineBases(a,b,c),'ฐานะการเงิน');
 assert.equal(result.status,'complete');
 for(const group of result.groups)for(const item of group.items)
 assert.equal(item.raw,item.planet+item.basePoints+item.relation.points+item.planetBonus+item.relation.joint+item.relation.multiple+item.specialBonus-item.deduction);
}
const {createChartCanvas}=await import('../js/export-engine.js');
const text=[];const ctx=new Proxy({measureText:t=>({width:t.length*7}),fillText:t=>text.push(String(t))},{get:(t,k)=>k in t?t[k]:()=>{}});
globalThis.document={fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>ctx})};
const exportChart=calculateNineBases(7,5,1);
const expected=scoreTopic(exportChart,'ฐานะการเงิน');
const canvas=await createChartCanvas({chart:exportChart,topic:'ฐานะการเงิน',calendar:{input:{day:22,month:4,yearBe:2527,time:'01:49'},effectiveDate:'1984-04-21',weekday:{name:'เสาร์'},lunar:{monthName:'เดือน 5'},zodiac:{name:'ชวด'}}});
assert.equal(canvas.width,2450);assert(text.includes('ฐานะการเงิน'));
assert(text.some(t=>t.startsWith('คะแนนก่อนจำกัดค่า '+Number(expected.raw.toFixed(2)))));
assert(text.some(t=>t.includes('ภพเสริม 2')));
delete globalThis.document;
console.log('✓ V1.0 special bonuses, 343 complete topic scores, exported score card match');
