import assert from 'node:assert/strict';
import {relationScore,scoreHouse,scoreTopic,levelFor,meritCards,detailLines} from '../js/score-engine.js';
import {calculateNineBases,chartWithGender,houseNamesFor} from '../js/chart-engine.js';
import {TOPIC_DEFINITIONS,resolveTopic,topicHighlights,GROUP_STYLES} from '../js/topic-engine.js';
import {selectionHighlights,toggleSelection} from '../js/selection-engine.js';
assert.equal(TOPIC_DEFINITIONS.length,24);
assert.equal(TOPIC_DEFINITIONS.filter(d=>d.mode==='score').length,10);
assert.equal(new Set(TOPIC_DEFINITIONS.map(d=>d.category)).size,6);
assert.equal(relationScore(19,['กำลังตน']).points,45);
assert.equal(relationScore(12,['สมพล','ศัตรู']).points,40);
assert.equal(relationScore(19,['ศัตรู']).points,35);
assert.equal(relationScore(13,[]).points,35);
assert.equal(relationScore(3,[]).points,null);
for(const [score,label] of [[39.999,'แย่มาก'],[40,'แย่'],[50,'ปานกลาง'],[60,'ดี'],[80,'ดีมาก'],[100,'ดีมาก']])
 assert.equal(levelFor(score)[1],label);
const chart=calculateNineBases(7,5,1);
const finance=scoreTopic(chart,'ดวง "คนรวย"');
assert.deepEqual(finance.groups.map(g=>g.items.length),[4,2,3]);
assert.deepEqual(finance.groups[0].positions.map(p=>p.key),['1:3','1:6','2:2','3:4']);
assert.deepEqual(finance.groups.map(g=>g.weight),[.7,.2,.1]);
assert.equal(scoreHouse(calculateNineBases(2,2,7),1,4).raw,100);
assert.deepEqual(resolveTopic(chart,'คู่ครอง (ของ ช.)').groups[1].positions.map(p=>p.key),['1:7','3:7']);
assert.deepEqual(resolveTopic(chart,'คู่ครอง (ของ ญ.)').groups[1].positions.map(p=>p.key),['1:7','3:6']);
assert.equal(scoreTopic(chart,'ฐานะการเงิน').status,'unconfigured');
assert.equal(resolveTopic(chart,'คุณภาพความรัก').groups[0].positions.length,5);
assert.equal(TOPIC_DEFINITIONS.filter(d=>d.mode==='pending').length,9);
for(const t of TOPIC_DEFINITIONS.filter(d=>d.mode==='pending'))assert.equal(scoreTopic(chart,t.topic).status,'incomplete');
const femaleChart=chartWithGender(chart,'female');
assert.deepEqual(femaleChart.bases,chart.bases);
assert.deepEqual(houseNamesFor(femaleChart)[3].slice(5),['ทาสี','ทาสา']);
assert.deepEqual(houseNamesFor(chart)[3].slice(5),['ทาสา','ทาสี']);
const femaleSpouse=resolveTopic(femaleChart,'คู่ครอง (ของ ญ.)');
assert.equal(femaleSpouse.groups[1].positions[1].key,'3:7');
assert.equal(femaleSpouse.groups[1].positions[1].house,'ทาสา');
assert.equal(scoreHouse(femaleChart,3,6).house,'ทาสี');
assert.equal(topicHighlights(femaleChart,'คู่ครอง (ของ ญ.)').get('3:7'),1);
const composite=scoreTopic(chart,'ความดี-ความรวย');
assert.equal(composite.kind,'composite');assert.equal(composite.cards.length,2);
assert.equal(composite.cards[1].score,finance.score);
assert.equal(topicHighlights(chart,'').size,0);
let evaluated=0;
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const ch=calculateNineBases(a,b,c);
 for(const {topic} of TOPIC_DEFINITIONS.filter(d=>d.mode==='score'))for(const gender of ['male','female']){
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
for(const topic of ['ดวง "คนดี"','ดวง "คนรวย"','คู่ครอง (ของ ญ.)']){
 text.length=0;fills.length=0;
 const canvas=await createChartCanvas({chart,topic,gender:'female',calendar,highlights:selectionHighlights(chart,toggleSelection(chart,new Map(),4,1))});
 assert.equal(canvas.width,2450);
 assert(text.some(v=>v.t===topic));
 assert(!text.some(v=>v.t.includes('ไม่มีโบนัส')));
 assert(text.every(v=>v.y<canvas.height-15),'Export text must fit canvas');
 assert(fills.includes('#eef4fc'));
 assert(fills.includes('#fff9ec'));
 assert(fills.includes(GROUP_STYLES[0].fill));
}
text.length=0;
const combined=await createChartCanvas({chart,topic:'ความดี-ความรวย',calendar});
assert(text.some(v=>v.t==='ดวง "คนดี"'));assert(text.some(v=>v.t==='ดวง "คนรวย"'));
assert(text.every(v=>v.y<combined.height-15));
text.length=0;
await createChartCanvas({chart:femaleChart,topic:'คู่ครอง (ของ ญ.)',calendar});
const maid=text.find(t=>t.t==='ทาสี');const servant=text.find(t=>t.t==='ทาสา');
assert(maid&&servant&&maid.x<servant.x);
for(const topic of ['ดวง "บุญ-บาป"','พลิก "รวย-จน"','การเล่าเรียน']) {
 text.length=0;
 const canvas=await createChartCanvas({chart,topic,calendar});
 assert(text.every(v=>v.y<canvas.height-15));
 assert(!text.some(v=>v.t.includes('ไม่มีโบนัส')));
}
delete globalThis.document;
console.log('✓ Export score card, gender, selection and topic colors, expandable height');

const goodItem={bad:[],major:0,minor:0,names:['มิตรใหญ่']};
const badItem={bad:[{}],major:1,minor:0,names:[]};
assert.equal(meritCards(Array(4).fill(goodItem))[0].label,'ระดับสูงมาก');
assert.equal(meritCards(Array(4).fill({...goodItem,names:['กำลังตน']}))[0].label,'ระดับสูง');
assert.equal(meritCards(Array(4).fill(badItem))[1].label,'ระดับรุนแรง');
assert.equal(meritCards([badItem,badItem,badItem,{...badItem,minor:1}])[1].label,'ระดับแรง');
assert.equal(meritCards([goodItem,badItem,goodItem,goodItem])[0].count,2);
assert.equal(meritCards([goodItem,badItem,goodItem,goodItem])[1].count,0);
assert(!TOPIC_DEFINITIONS.some(t=>t.id===2005));
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++) {
 const chart=calculateNineBases(a,b,c);
 const transition=scoreTopic(chart,'พลิก "รวย-จน"');
 assert.equal(transition.cards.length,2);
 assert.equal(transition.cards[0].score,[scoreHouse(chart,1,4),scoreHouse(chart,1,5),scoreHouse(chart,2,4)].reduce((s,i)=>s+i.raw,0)/3);
 const study=scoreTopic(chart,'การเล่าเรียน');
 assert.equal(study.cards.length,3);
 study.cards.forEach((card,i)=>{
  const star=[5,4,3][i];const source=scoreHouse(chart,1,chart.bases[0].indexOf(star)+1);
  assert(Math.abs(card.score-(source.raw-source.planet)/77*100)<1e-9);
  assert.equal(Boolean(card.note),star===5&&source.major>0);
  for(const item of card.groups[0].items)assert(!detailLines(item).some(line=>line.startsWith('ดาว ')));
 });
}
console.log('✓ Merit AND rules, severity, learning without planet points, transition groups, full export height');
