import assert from 'node:assert/strict';
import fs from 'node:fs';
import {yamAt,yamTable,taksaFor,kalaAt,markerFor} from '../js/kala-engine.js';
import {setCalendarDatasetForTests} from '../js/calendar-engine.js';
import {calculateNineBases} from '../js/chart-engine.js';
import {getLinkedCellKeys} from '../js/relation-engine.js';
setCalendarDatasetForTests(JSON.parse(fs.readFileSync(new URL('../data/lunar-month-boundaries.json',import.meta.url))));
assert.equal(yamAt(1,'09:44').number,4);assert.equal(yamAt(1,'21:44').number,2);
assert.equal(yamAt(1,'00:00').slot,3);assert.equal(yamAt(1,'00:01').slot,4);
assert.equal(yamAt(1,'06:00').slot,7);assert.equal(yamAt(1,'06:01').slot,0);
for(let day=1;day<=7;day++)for(let min=0;min<1440;min++){
 const time=`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
 const y=yamAt(day,time);assert(y.number>=1&&y.number<=7);assert.equal(y.number,yamTable(day)[y.period==='day'?0:1][y.slot].number);
}
const input={day:13,month:9,yearBe:2569,time:'09:44'};
const actual=await kalaAt(input);assert.deepEqual(actual.calendar.seeds,{day:1,month:3,zodiac:7});assert.equal(actual.taksa[4],'ศรี');assert.equal(actual.taksa[6],'กาลี');
assert.equal((await kalaAt({...input,time:'06:00'})).calendar.weekday.seed,7);
assert.equal((await kalaAt({...input,time:'06:01'})).calendar.weekday.seed,1);
assert.deepEqual(markerFor(4,1,12,taksaFor(4)),{kind:'sri',ring:false});
assert.deepEqual(markerFor(4,1,12,taksaFor(6)),{kind:'kali',ring:false});
assert.equal(markerFor(4,1,6,taksaFor(1)).kind,null);
assert(markerFor(1,3,4,taksaFor(1)).ring);assert(!markerFor(9,4,4,taksaFor(1)).ring);
assert(markerFor(8,5,6,taksaFor(1)).ring);assert(!markerFor(8,2,6,taksaFor(1)).ring);
const chart=calculateNineBases(3,4,3),links=getLinkedCellKeys(chart,4,5);
assert.equal(chart.bases[3][4],15);assert.equal(chart.bases[3][6],7);
assert(!links.equal.has('4:7'));assert(links.vertical.has('4:5'));assert(links.equal.has('1:5'));
for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)for(let c=1;c<=7;c++)for(let col=1;col<=7;col++){
 const links=getLinkedCellKeys(calculateNineBases(a,b,c),4,col);
 assert([...links.equal].every(key=>!key.startsWith('4:')));
 assert.deepEqual([...links.vertical].filter(key=>key.startsWith('4:')),[`4:${col}`]);
}
console.log('✓ Kala: 10,080 minute cases, day boundary, Rahu markers, ring houses and all 343 chart highlight regressions');
