import assert from 'node:assert/strict';
import {calculateNineBases,chartWithGender} from '../js/chart-engine.js';
import {scoreTopic,meritCards,marriageLife,spouseAge} from '../js/score-engine.js';
import {TOPIC_DEFINITIONS,topicHighlights} from '../js/topic-engine.js';
assert(!TOPIC_DEFINITIONS.some(t=>[1008,1009,1010].includes(t.id)));
const clean={bad:[],names:[],house:'อัตตะ',star:1},bad={...clean,bad:[{house:'อริ'}]};
for(let n=0;n<=4;n++){
 const cards=meritCards(Array.from({length:4},(_,i)=>i<n?clean:bad));
 assert.equal(cards[0].count,n);assert.equal(cards[1].count,4-n);
 assert(cards.every(c=>!c.lines.some(l=>l.text.includes('คู่สัมพันธ์ ไม่มี'))));
}
let combinations=0;
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++)for(const gender of ['male','female']){
 const chart=chartWithGender(calculateNineBases(a,b,c),gender);
 const result=scoreTopic(chart,'ความรัก-ชีวิตคู่');assert.equal(result.cards.length,3);
 assert.equal(result.cards[1].topic,gender==='male'?'คู่ครอง (ของ ช.)':'คู่ครอง (ของ ญ.)');
 const [x,y,z]=chart.bases.slice(0,3).map(r=>r[6]);
 assert.deepEqual(result.cards[2].pairs.map(p=>[p.x,p.y]),[[x,y],[x,z],[y,z]]);
 const h=topicHighlights(chart,'ความรัก-ชีวิตคู่',gender);assert([1,2,3].every(b=>h.get(`${b}:7`)===0));
 assert(spouseAge(chart).lines.length);combinations++;
}
const example=calculateNineBases(1,1,1);example.bases[0][6]=5;example.bases[1][6]=6;example.bases[2][6]=4;
assert.deepEqual(marriageLife(example).pairs.map(p=>p.name),['ทรัพย์ โชค','บัณฑิต รอบรู้','ธาตุน้ำ เกื้อกูล']);
assert.equal(marriageLife(example).color,'#a67c00');
console.log('✓ V1.9: four independent merit conditions, spouse age, love cards, ordered pairs and gender highlights:',combinations);

// Complete ordered pair coverage, including the newly supplied names and statuses.
const added=[['ยศศักดิ์',true],['ครัวเรือน',true],['ศัตรู ปะทะ',false],['ไหวพริบ',true],['มิตร ปัญญา',true],['สมพล สนับสนุน',true],['ธาตุ',true]];
for(let x=1;x<=7;x++)for(let y=1;y<=7;y++){
 const chart=calculateNineBases(1,1,1);
 // Keep star 1 away from all bad houses for the positive 1/7 case.
 chart.bases=chart.bases.map(row=>row.map(()=>2));
 chart.bases[0][6]=x;chart.bases[1][6]=y;chart.bases[2][6]=4;
 const pair=marriageLife(chart).pairs[0];assert.notEqual(pair.good,null);
 if(x===1)assert.deepEqual([pair.name,pair.good],added[y-1]);
 if(x===2&&y<=4)assert.deepEqual([pair.name,pair.good],[['ครัวเรือน',true],['เสน่ห์',true],['ชู้ ระแวง',false],['มิตร รุ่งเรือง',true]][y-1]);
 if(x===1&&y===7){chart.bases[0][1]=1;const badPair=marriageLife(chart).pairs[0];assert.equal(badPair.name,'ศัตรู เร่งร้อน');assert.equal(badPair.good,false);}
}
console.log('✓ All 49 ordered life pairs, 11 new entries and both 1/7 conditions');
