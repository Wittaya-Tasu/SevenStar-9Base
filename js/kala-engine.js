import {calculateCalendar} from './calendar-engine.js';
import {calculateNineBases} from './chart-engine.js';
const DAY=[1,6,4,2,7,5,3],NIGHT=[1,5,2,6,3,7,4];
const SEQ=[1,2,3,4,7,5,8,6],LABELS=['บริวาร','อายุ','เดช','ศรี','มูละ','อุตสาหะ','มนตรี','กาลี'];
export function yamAt(weekday,time){
 const [h,m]=time.split(':').map(Number),minutes=h*60+m;
 const offset=(minutes-361+1440)%1440,night=offset>=720,slot=Math.floor((offset%720)/90);
 const cycle=night?NIGHT:DAY;
 return {subperiod:Math.floor((offset%90)/30),period:night?'night':'day',slot,number:cycle[(cycle.indexOf(weekday)+slot)%7]};
}
export function yamTable(weekday){return [DAY,NIGHT].map((cycle,period)=>Array.from({length:8},(_,slot)=>{
 const start=(361+period*720+slot*90)%1440,end=(start+89)%1440;
 const format=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 return {period:period?'night':'day',slot,number:cycle[(cycle.indexOf(weekday)+slot)%7],range:`${format(start)}–${format(end)}`};
}));}
export function taksaFor(day){return Object.fromEntries(SEQ.map((_,i)=>[SEQ[(SEQ.indexOf(day)+i)%8],LABELS[i]]));}
export async function kalaAt(input){
 // Only this page shifts the 06:00 minute into the previous astrological day.
 const calendar=await calculateCalendar({...input,time:input.time==='06:00'?'05:59':input.time});
 const day=calendar.seeds.day;
 return {input,calendar,chart:calculateNineBases(day,calendar.seeds.month,calendar.seeds.zodiac),yam:yamAt(day,input.time),table:yamTable(day),taksa:taksaFor(day)};
}
export function markerFor(base,column,value,taksa){
 const number=base===4?(value===12?8:null):value;
 const kind=taksa[number]==='กาลี'?'kali':taksa[number]==='ศรี'?'sri':null;
 const key=`${base}:${column}`;
 const ring=kind==='kali'?['1:2','2:6','3:1','3:5','8:5','8:6'].includes(key):kind==='sri'?['1:3','2:2','3:2','3:4'].includes(key):false;
 return {kind,ring};
}
