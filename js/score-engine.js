import { HOUSE_NAMES } from './chart-engine.js';
import { getBadNumbers, getRelations, relationConstants } from './relation-engine.js';
const aliases = { 'กดุมพะ':'กดุมภะ', 'ตนุ':'ตะนุ' };
export const TOPICS = { 'ฐานะการเงิน': [ ['ธนัง','กดุมภะ','โภคา','ลาภะ','โภคสมบัติ'], ['อัตตะ','ตะนุ'], ['ปิตา','มาตา','พันธุ'] ] };
export const LEVELS = [[100,'ดีสมบูรณ์','#D4AF37'],[80,'ดีมาก','#2E7D32'],[60,'ดี','#8FAF3C'],[40,'ปานกลาง','#757575'],[20,'เสีย','#E64A19'],[0,'เสียรุนแรง','#8B0000']];
export function levelFor(score) { return LEVELS.find(([min])=>score>=min); }
const bonusCounts = [0,0,20,30,45,60,60,70,80,90];
export function relationScore(tier, names) {
  let points=0, joint=0, good=0;
  for (const name of new Set(names)) {
    const type = name==='มิตรใหญ่'?0 : name==='สมพล'||name==='กำลังตน'||name.startsWith('ธาตุ')?1 : name==='กลาง'?2 : name==='ศัตรู'?3 : name==='ศัตรูใหญ่'?4 : -1;
    if(type<0) throw new Error(`ยังไม่กำหนดคะแนนความสัมพันธ์ ${name}`);
    points += [40,30,20,10,5][type];
    joint += {สูง:[25,15,0,-10,-5],ปานกลาง:[10,5,0,-5,0],ต่ำ:[5,0,0,-10,-15]}[tier][type];
    if(type<2) good++;
  }
  if(good>9) throw new Error('ยังไม่กำหนดโบนัสเกิน 9 ความสัมพันธ์');
  return {points,joint,good,multiple:bonusCounts[good]};
}
export function scoreHouse(chart, base, column) {
  const star=chart.bases[base-1][column-1];
  const pairColumn=chart.bases[2].indexOf(star);
  const sum=chart.bases[3][pairColumn];
  const bad=relationConstants.BAD_HOUSES.filter(p=>chart.bases[p.base-1][HOUSE_NAMES[p.base].indexOf(p.house)]===star);
  const minor=bad.filter(p=>p.base===8&&['มหาโจร','ทาสา'].includes(p.house)).length;
  const major=bad.length-minor;
  const deduction=5*bad.length+[0,0,10,15,25,40][major]+(minor===2?5:0);
  let tier=[9,11,14,16,18,19].includes(sum)?'สูง':[5,6,13,15,17,21].includes(sum)?'ปานกลาง':'ต่ำ';
  if(bad.length && [9,11].includes(sum)) tier='ปานกลาง';
  if(bad.length && sum===6) tier='ต่ำ';
  const names=getRelations(star,sum,getBadNumbers(chart)).map(r=>r.name);
  const item={base,column,house:HOUSE_NAMES[base][column-1],star,sum,tier,bad,major,minor,deduction,names};
  if(!names.length) return {...item,raw:null,reason:`ยังไม่กำหนดความสัมพันธ์คู่ ${star}–${sum}`};
  const relation=relationScore(tier,names);
  const planet=[2,4,5,6].includes(star)?35:15;
  const planetBonus=star===5?5:star===7?-5:0;
  const basePoints={สูง:25,ปานกลาง:15,ต่ำ:5}[tier];
  const raw=planet+basePoints+relation.points+planetBonus+relation.joint+relation.multiple-deduction;
  return {...item,planet,planetBonus,basePoints,relation,raw};
}
export function scoreTopic(chart, topic) {
  if(!TOPICS[topic]) return {topic,status:'unconfigured'};
  const definitions=TOPICS[topic];
  const weights=definitions.length===1?[1]:definitions.length===2?[.7,.3]:[.7,.2,.1];
  const groups=definitions.map((names,i)=>{
    const wanted=names.map(n=>aliases[n]||n);
    const items=[];
    for(const [base,houses] of Object.entries(HOUSE_NAMES)) houses.forEach((name,c)=>{
      if(wanted.includes(name)) items.push(scoreHouse(chart,Number(base),c+1));
    });
    const raw=items.length && items.every(v=>v.raw!==null)?items.reduce((s,v)=>s+v.raw,0)/items.length:null;
    return {label:['ภพหลัก','ภพเสริม 1','ภพเสริม 2'][i],weight:weights[i],items,raw};
  });
  if(groups.some(g=>g.raw===null)) return {topic,status:'incomplete',groups};
  const raw=groups.reduce((s,g)=>s+g.raw*g.weight,0);
  const score=Math.max(0,Math.min(100,raw));
  return {topic,status:'complete',groups,raw,score};
}
