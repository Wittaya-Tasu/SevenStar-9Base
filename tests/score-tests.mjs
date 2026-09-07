import assert from 'node:assert/strict';
import {relationScore,scoreHouse,scoreTopic,levelFor} from '../js/score-engine.js';
import {calculateNineBases} from '../js/chart-engine.js';
import {TOPIC_DEFINITIONS,resolveTopic,topicHighlights,GROUP_STYLES} from '../js/topic-engine.js';
import {selectionHighlights,toggleSelection} from '../js/selection-engine.js';
assert.equal(TOPIC_DEFINITIONS.length,23);
assert.equal(new Set(TOPIC_DEFINITIONS.map(d=>d.category)).size,6);
assert.equal(relationScore(19,['กำลังตน']).points,45);
assert.equal(relationScore(12,['สมพล','ศัตรู']).points,40);
assert.equal(relationScore(19,['ศัตรู']).points,35);
assert.equal(relationScore(13,[]).points,35);
assert.equal(relationScore(3,[]).points,null);
for(const [score,label] of [[39.999,'แย่มาก'],[40,'แย่'],[50,'ปานกลาง'],[60,'ดี'],[80,'ดีมาก'],[100,'ดีมาก']])
 assert.equal(levelFor(score)[1],label);
const chart=calculateNineBases(7,5,1);
const finance=scoreTopic(chart,'ฐานะการเงิน');
assert.deepEqual(finance.groups.map(g=>g.items.length),[2,4,3]);
assert.deepEqual(finance.groups[0].positions.map(p=>p.key),['1:3','2:2']);
assert.deepEqual(finance.groups[1].positions.map(p=>p.key),['1:6','3:4','3:2','9:4']);
assert.deepEqual(finance.groups.map(g=>g.weight),[.7,.2,.1]);
// Manual fixture: stars 2/6 = 23+15+35+12+5; star 5 = 23+10+35+9+0;
// star 4 = 23+5+20+12+0. Main mean 90; secondary mean 76; supplementary mean 90.
assert.deepEqual(finance.groups[0].items.map(i=>i.raw),[90,90]);
assert.deepEqual(finance.groups[1].items.map(i=>i.raw),[77,60,90,77]);
assert(Math.abs(finance.score-87.2)<1e-10);
assert.equal(scoreHouse(calculateNineBases(2,2,7),1,4).raw,100);
assert.deepEqual(scoreTopic(chart,'หุ้นส่วน').groups.map(g=>g.weight),[.8,.2]);
assert.deepEqual(scoreTopic(chart,'ความพอดี').groups.map(g=>g.weight),[1]);
assert.equal(scoreTopic(chart,'คู่ครอง').status,'incomplete');
assert.equal(resolveTopic(chart,'คู่ครอง','male').groups[1].positions.at(-1).key,'3:7');
assert.equal(resolveTopic(chart,'คู่ครอง','female').groups[1].positions.at(-1).key,'3:6');
assert.equal(scoreTopic(chart,'อาชีพ').status,'unconfigured');
const love=resolveTopic(chart,'ความรัก');
assert.equal(love.groups[0].positions.length,3);
assert(love.groups[0].positions.every(p=>p.base<=3 && chart.bases[p.base-1][p.column-1]===6));
assert.equal(resolveTopic(chart,'การเรียน').groups[2].positions.length,9);
const overlap=calculateNineBases(6,2,1);
assert.equal(topicHighlights(overlap,'วาสนา').get('1:1'),0);
assert(resolveTopic(overlap,'วาสนา').groups[2].positions.some(p=>p.key==='1:1'));
assert.equal(topicHighlights(chart,'').size,0);
let evaluated=0;
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const ch=calculateNineBases(a,b,c);
 for(const {topic} of TOPIC_DEFINITIONS)for(const gender of ['male','female']){
  const r=scoreTopic(ch,topic,gender);
  assert.equal(r.status,'complete',topic);
  assert(r.score>=33 && r.score<=100);
  assert(Math.abs(r.groups.reduce((s,g)=>s+g.weight,0)-1)<1e-12);
  const colors=topicHighlights(ch,topic,gender);
  for(const g of r.groups)for(const h of g.items){
   assert.equal(h.raw,h.planet+h.basePoints+h.relation.points+h.majorPoints+h.minorPoints);
   assert(h.major<=4 && h.minor<=1);
   assert.equal(h.majorPoints,12-3*h.major);
   assert.equal(h.minorPoints,h.minor?0:5);
   if(h.bad.length&&h.sum===6)assert.equal(h.basePoints,5);
   if(h.bad.length&&[9,11].includes(h.sum))assert.equal(h.basePoints,10);
   assert(colors.get(h.base+':'+h.column)<=g.index);
  }
  evaluated++;
 }
 assert(scoreHouse(ch,1,2).bad.some(p=>p.base===1&&p.house==='หินะ'));
}
console.log('✓ New scores, mappings, gender, overlapping groups: '+evaluated+' evaluations');
const {createChartCanvas}=await import('../js/export-engine.js');
const text=[];const fills=[];
const ctx=new Proxy({measureText:t=>({width:Array.from(t).length*9}),fillText:(t,x,y)=>text.push({t:String(t),x,y}),fill:()=>fills.push(ctx.fillStyle)},
 {get:(t,k)=>k in t?t[k]:()=>{}});
globalThis.document={fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>ctx})};
const calendar={input:{day:22,month:4,yearBe:2527,time:'01:49'},effectiveDate:'1984-04-21',weekday:{name:'เสาร์'},lunar:{monthName:'เดือน 5'},zodiac:{name:'ชวด'}};
for(const topic of ['การเรียน','ฐานะการเงิน','คู่ครอง']){
 text.length=0;fills.length=0;
 const canvas=await createChartCanvas({chart,topic,gender:'female',calendar,highlights:selectionHighlights(chart,toggleSelection(chart,new Map(),4,1))});
 assert.equal(canvas.width,2450);
 assert(text.some(v=>v.t===topic));
 assert(text.some(v=>v.t.includes('ไม่มีโบนัส')));
 assert(text.every(v=>v.y<canvas.height-15),'Export text must fit canvas');
 assert(fills.includes('#eef4fc'));
 assert(fills.includes('#fff9ec'));
 assert(fills.includes(GROUP_STYLES[0].fill));
}
delete globalThis.document;
console.log('✓ Export score card, gender, selection and topic colors, expandable height');
