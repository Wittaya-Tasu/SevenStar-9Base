import { HOUSE_NAMES } from './chart-engine.js';
import { getBadNumbers, getRelations, relationConstants } from './relation-engine.js';
import { resolveTopic } from './topic-engine.js';

export const LEVELS = [[80,'ดีมาก','#a67c00'],[60,'ดี','#196f45'],[50,'ปานกลาง','#000000'],[40,'แย่','#c95560'],[30,'แย่มาก','#8b1e2d']];
export function levelFor(score) { return LEVELS.find(([min])=>score>=min) || [0,'นอกช่วงคะแนน','#667085']; }
const SPECIAL_SUMS = [9,11,13,14,16,18,19];
export function relationScore(sum, names) {
  const candidates = [...new Set(names)].map(name => {
    const points = name==='มิตรใหญ่'||name==='กำลังตน'?45
      : name==='สมพล'||name.startsWith('ธาตุ')?40
      : name==='กลาง'?25 : name==='ศัตรู'?20 : name==='ศัตรูใหญ่'?15 : null;
    if (points===null) throw new Error('ยังไม่กำหนดคะแนนความสัมพันธ์ '+name);
    return {name,points};
  });
  if (SPECIAL_SUMS.includes(sum)) candidates.push({name:'พิเศษ',points:35});
  const points = candidates.length ? Math.max(...candidates.map(c=>c.points)) : null;
  return {points,candidates,chosen:candidates.filter(c=>c.points===points).map(c=>c.name)};
}
export function scoreHouse(chart, base, column) {
  const house = HOUSE_NAMES[base]?.[column-1];
  if (!house) throw new Error('ต้องประเมินตำแหน่งภพที่มีชื่อ');
  const star=chart.bases[base-1][column-1];
  const pairColumn=chart.bases[2].indexOf(star);
  const sum=chart.bases[3][pairColumn];
  const bad=relationConstants.BAD_HOUSES.filter(p=>chart.bases[p.base-1][HOUSE_NAMES[p.base].indexOf(p.house)]===star);
  const minor=bad.filter(p=>p.base===8&&['มหาโจร','ทาสา'].includes(p.house)).length;
  const major=bad.length-minor;
  let tier=[9,11,14,16,18,19].includes(sum)?'สูง':[5,6,13,15,17,21].includes(sum)?'ปานกลาง':'ต่ำ';
  const originalTier=tier;
  if(bad.length && [9,11].includes(sum)) tier='ปานกลาง';
  if(bad.length && sum===6) tier='ต่ำ';
  const names=getRelations(star,sum,getBadNumbers(chart)).map(r=>r.name);
  const relation=relationScore(sum,names);
  const planet=[2,4,5,6].includes(star)?23:13;
  const basePoints={สูง:15,ปานกลาง:10,ต่ำ:5}[tier];
  // Maximum four major matches: two of the five bad houses occupy distinct base-3 columns.
  if (major>4) throw new Error('แผนผังไม่ถูกต้อง: ภพเสียหลักตรงกันเกิน 4 ภพ');
  const majorPoints=[12,9,6,3,0][major];
  const minorPoints=minor?0:5;
  const raw=relation.points===null?null:planet+basePoints+relation.points+majorPoints+minorPoints;
  return {base,column,house,star,sum,pairColumn:pairColumn+1,tier,originalTier,bad,major,minor,names,relation,planet,basePoints,majorPoints,minorPoints,raw,
    reason:raw===null?'ยังไม่กำหนดความสัมพันธ์คู่ '+star+'–'+sum:null};
}
export function scoreTopic(chart, topic, gender = '') {
  const definition=resolveTopic(chart,topic,gender);
  if(!definition) return {topic,status:'unconfigured'};
  const groups=definition.groups.map(group=>{
    const items=group.positions.map(p=>scoreHouse(chart,p.base,p.column));
    const raw=items.length && items.every(v=>v.raw!==null)?items.reduce((s,v)=>s+v.raw,0)/items.length:null;
    return {...group,items,raw,contribution:raw===null?null:raw*group.weight};
  });
  const reasons=[...definition.missing,...groups.flatMap(g=>g.items.filter(i=>i.raw===null).map(i=>i.reason))];
  if(reasons.length || groups.some(g=>g.raw===null)) return {topic,status:'incomplete',groups,reasons};
  const raw=groups.reduce((s,g)=>s+g.contribution,0);
  return {topic,status:'complete',groups,raw,score:Math.max(0,Math.min(100,raw))};
}
export function groupSummary(group,format) {
  return group.label+' '+Math.round(group.weight*100)+'% · เฉลี่ย '+(group.raw===null?'—':format(group.raw))+' · ได้ '+(group.contribution===null?'—':format(group.contribution));
}
export function factorSummary(item) {
  return 'ดาว '+item.planet+'/23 · ฐาน '+item.basePoints+'/15 · คู่สัมพันธ์ '+(item.relation.points??'—')+'/45 · ภพเสียหลัก '+item.majorPoints+'/12 · ภพเสียรอง '+item.minorPoints+'/5';
}
