import assert from 'node:assert/strict';
import {calculateNineBases} from '../js/chart-engine.js';
import {analyzeCareer,careerRank,CAREER_BANDS,careerStarLabel} from '../js/career-engine.js';
import {CAREER_TOPIC,topicHighlights,resolveTopic} from '../js/topic-engine.js';
import {scoreTopic} from '../js/score-engine.js';
import {getBadNumbers,getRelations} from '../js/relation-engine.js';
import {createChartCanvas} from '../js/export-engine.js';
import {renderScore} from '../js/score-view.js';
import {OCCUPATIONS,occupationsFor,OCCUPATION_REVIEW} from '../js/occupation-data.js';

const cases=[
 [2,[],false,1],[1,[],false,2],[2,[],true,3],[1,[],true,4],
 [2,['ศัตรู'],false,5],[1,['ศัตรูใหญ่'],false,6],
 [2,['ศัตรูใหญ่'],true,7],[1,['ศัตรู'],true,8],
];
for(const [star,names,bad,rank] of cases)assert.equal(careerRank(star,names,bad),rank);
assert.equal(careerRank(2,['สมพล','ศัตรู'],true),7);
assert.equal(careerRank(5,['ธาตุดิน','ศัตรู'],true),7);
assert.deepEqual(CAREER_BANDS.map(b=>b.ink),['#ffffff','#ffffff','#000000','#ffffff','#ffffff','#000000','#8b1e2d','#ffffff']);
assert.equal(CAREER_BANDS[5].fill,CAREER_BANDS[6].fill);

const chart=calculateNineBases(7,5,1);
const result=analyzeCareer(chart);
assert.deepEqual(result.bands.map(b=>[b.rank,b.stars.map(careerStarLabel)]),[
 [1,['2','6']],[2,['7*']],[3,['5*']],[4,['3*']],[7,['4']],
]);
assert.deepEqual(resolveTopic(chart,CAREER_TOPIC).groups.map(g=>g.positions.map(p=>p.key)),[
 ['1:1','2:1','3:3'],['1:3','2:2','1:6','3:4','3:2'],
]);
const five=result.stars.find(s=>s.star===5);
assert.equal(five.isMain,true);
assert.equal(five.positions.length,2);
assert.equal('score' in result,false);
assert.equal('raw' in result,false);
assert.equal(scoreTopic(chart,CAREER_TOPIC).kind,'career');

for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const ch=calculateNineBases(a,b,c),r=analyzeCareer(ch);
 const colors=topicHighlights(ch,CAREER_TOPIC);
 assert.equal(colors.size,8);
 assert.equal([...colors.values()].filter(i=>i===0).length,3);
 assert.equal(new Set(r.stars.map(s=>s.star)).size,r.stars.length);
 assert.equal(r.stars.reduce((n,s)=>n+s.positions.length,0),8);
 const main=new Set([ch.bases[0][0],ch.bases[1][0],ch.bases[2][2]]);
 for(const s of r.stars){
  assert.equal(s.isMain,main.has(s.star));
  assert.equal(s.sum,ch.bases[3][ch.bases[2].indexOf(s.star)]);
  assert.equal(s.bad.length>0,getBadNumbers(ch).has(s.star));
  const enemy=getRelations(s.star,s.sum,getBadNumbers(ch)).some(r=>['ศัตรู','ศัตรูใหญ่'].includes(r.name));
  assert.equal(s.rank>=5,enemy);
 }
 assert(r.stars.every((s,i)=>i===0||s.rank>=r.stars[i-1].rank));
}
console.log('✓ Eight ranking conditions, exact houses, any-enemy precedence, 343 charts, main-star markers');

// Test the real view builder with a minimal DOM adapter, without browser automation.
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.className='';this.attributes={};this.style={setProperty(){}};this.classList={add:name=>{this.className+=' '+name;}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attributes[k]=String(v);}
}
const panel=new Element('aside');
globalThis.document={querySelector:()=>panel,createElement:tag=>new Element(tag)};
const flatten=e=>[e,...e.children.flatMap(flatten)];
renderScore(chart,CAREER_TOPIC);
let elements=flatten(panel);
assert.deepEqual(Object.keys(OCCUPATIONS),['1','2','3','4','5','6','7']);
assert.deepEqual(Object.values(OCCUPATIONS).map(items=>items.length),[11,24,26,35,23,30,34]);
for(const labels of Object.values(OCCUPATIONS)) {
 assert(labels.every(label=>typeof label==='string'&&label.trim()));
 assert.equal(new Set(labels).size,labels.length);
}
assert(!occupationsFor(4).includes('แชร์ลูกโซ่'));
assert.equal(OCCUPATION_REVIEW[0].label,'แชร์ลูกโซ่');
const occupationSections=elements.filter(e=>e.className==='career-occupations');
assert.equal(occupationSections.length,6);
for(const section of occupationSections) {
 assert.equal(section.tag,'details');
 assert.notEqual(section.open,true);
 assert.equal(section.children[0].tag,'summary');
 assert.deepEqual(section.children[1].children.map(li=>li.textContent.trim()),occupationsFor(Number(section.attributes['data-career-star'])));
}
assert.equal(elements.filter(e=>e.className.startsWith('career-star ')).length,6);
assert.equal(elements.filter(e=>e.className==='score-value').length,0);
assert.equal(elements.filter(e=>e.attributes.role==='meter').length,0);
assert(elements.some(e=>e.textContent==='5*'));
renderScore(chart,'ดวง "คนรวย"');
elements=flatten(panel);
assert.equal(elements.filter(e=>e.className==='score-value').length,1);
assert.equal(elements.filter(e=>e.className.startsWith('career-star ')).length,0);

renderScore(chart,'ความดี-ความรวย');
elements=flatten(panel);
assert.equal(elements.filter(e=>e.className==='score-card').length,2);
assert.equal(elements.filter(e=>e.className==='score-value').length,2);
renderScore(chart,'ดวง "บุญ-บาป"');
assert(flatten(panel).some(e=>e.textContent.includes('รอเพิ่มเงื่อนไข')));
const texts=[],fills=[];
const ctx=new Proxy({measureText:t=>({width:Array.from(t).length*9}),fillText:(t,x,y)=>texts.push({t:String(t),x,y}),fill:()=>fills.push(ctx.fillStyle),save(){},restore(){}},{get:(t,k)=>k in t?t[k]:()=>{}});
globalThis.document={fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>ctx})};
const calendar={input:{day:22,month:4,yearBe:2527,time:'01:49'},effectiveDate:'1984-04-21',weekday:{name:'เสาร์'},lunar:{monthName:'เดือน 5'},zodiac:{name:'ชวด'}};
const canvas=await createChartCanvas({chart,calendar,topic:CAREER_TOPIC});
assert(texts.some(t=>t.t===CAREER_TOPIC));
for(const label of ['2','6','7*','5*','3*','4'])assert(texts.some(t=>t.x>1800&&t.t===label));
assert(!texts.some(t=>t.t.includes('คะแนนรวมถ่วงน้ำหนัก')));
assert(texts.every(t=>t.y<canvas.height-15));
for(const band of result.bands)assert(fills.includes(band.fill));
assert(!texts.map(t=>t.t).join('').includes('ชิปปิ้ง'));
texts.length=0;
const expanded=await createChartCanvas({chart,calendar,topic:CAREER_TOPIC,expandedCareerStars:[2]});
assert(texts.map(t=>t.t).join('').includes('ชิปปิ้ง'));
assert(!texts.map(t=>t.t).join('').includes('สัปเหร่อ'));
assert(expanded.height>canvas.height);
assert(texts.every(t=>t.y<expanded.height-15));
texts.length=0;
const allExpanded=await createChartCanvas({chart,calendar,topic:CAREER_TOPIC,expandedCareerStars:[1,2,3,4,5,6,7]});
assert(texts.map(t=>t.t).join('').includes('สัปเหร่อ'));
assert(texts.every(t=>t.y<allExpanded.height-15));
assert(allExpanded.height>expanded.height);
delete globalThis.document;
console.log('✓ Career card and switch back to scores, exported colors/asterisks, no overall score, full height');
console.log('✓ Merged occupation labels, seven planets, native collapsed disclosures, selective export and full-list height');

let eligible9=0,eligible12=0,excluded=0;
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++){
 const result=analyzeCareer(calculateNineBases(a,b,c));
 const ranks=result.bands.slice(0,2).map(b=>b.rank);
 for(const item of result.stars){
  const expected=ranks.includes(item.rank)&&[9,12].includes(item.sum)?item.sum:null;
  assert.equal(item.extraOccupationBase,expected);
  if(expected===9)eligible9++;if(expected===12)eligible12++;
  if(!expected&&[9,12].includes(item.sum))excluded++;
 }
}
assert(eligible9>0&&eligible12>0&&excluded>0);
console.log({eligible9,eligible12,excluded});
