import { HOUSE_NAMES, houseNamesFor, chartWithGender } from './chart-engine.js';
import { getBadNumbers, getRelations, relationConstants } from './relation-engine.js';
import { resolveTopic, TOPIC_DEFINITIONS } from './topic-engine.js';
import { analyzeCareer } from './career-engine.js';

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
  const house = houseNamesFor(chart)[base]?.[column-1];
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
export function scoreTopic(chart, topic, gender = chart.gender || '') {
  chart=chartWithGender(chart,gender);
  const definition=resolveTopic(chart,topic,gender);
  if(!definition) return {topic,status:'unconfigured'};
  if(['merit','transition','study'].includes(definition.mode)) return specialTopic(chart,definition);
  if(definition.mode==='pending') return {topic,status:'incomplete',groups:[],reasons:['รอเพิ่มเงื่อนไข: '+definition.sourceNote]};
  if(definition.mode==='composite') return {topic,kind:'composite',status:'complete',groups:[],cards:definition.children.map(id=>scoreTopic(chart,TOPIC_DEFINITIONS.find(d=>d.id===id).topic,gender))};
  if(definition.mode==='career') return analyzeCareer(chart);
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

export function detailLines(item) {
 const lines=[];
 if(!item.excludePlanet&&item.planet)lines.push(`ดาว ${item.planet}/23`);
 if(item.basePoints)lines.push(`ฐาน ${item.basePoints}/15`);
 if(item.relation.points)lines.push(`คู่สัมพันธ์ ${item.relation.points}/45`);
 if(item.majorPoints)lines.push(`ภพเสียหลัก ${item.majorPoints}/12`);
 if(item.minorPoints)lines.push(`ภพเสียรอง ${item.minorPoints}/5`);
 if(item.sum)lines.push(`ฐาน 4 = ${item.sum}`);
 if(item.tier)lines.push(`ระดับ${item.tier}`);
 if(item.relation.candidates.length)lines.push('คู่สัมพันธ์: '+item.relation.candidates.filter(c=>c.points).map(c=>`${c.name} ${c.points}`).join(' / '));
 if(item.relation.points)lines.push(`ใช้ค่าสูงสุด ${item.relation.points}`);
 if(item.excludePlanet)lines.push('แปลงคะแนน 77 เป็นเต็ม 100');
 return lines;
}
function oneGroupCard(chart,title,positions,excludePlanet=false) {
 const items=positions.map(p=>scoreHouse(chart,p.base,p.column)).map(i=>excludePlanet?{...i,excludePlanet:true,raw:i.raw===null?null:(i.raw-i.planet)/77*100}:i);
 const raw=items.every(i=>i.raw!==null)?items.reduce((n,i)=>n+i.raw,0)/items.length:null;
 return {topic:title,status:raw===null?'incomplete':'complete',score:raw,raw,groups:[{index:0,label:'ภพหลัก',weight:1,items,positions,raw,contribution:raw}]};
}
export function meritCards(items) {
 const sets=[items.slice(0,2),[items[2]],[items[3]]];
 const good=sets.map(g=>g.every(i=>!i.bad.length));
 const bad=sets.map(g=>g.every(i=>i.bad.length>0));
 const goodCount=good.filter(Boolean).length,badCount=bad.filter(Boolean).length;
 const best=goodCount===3&&items.every(i=>i.names.some(n=>n==='มิตรใหญ่'||n==='สมพล'||n.startsWith('ธาตุ')));
 const worst=badCount===3&&items.every(i=>i.major>0&&i.minor===0);
 const goodLevels=[['ไม่เข้าเกณฑ์','#64748b'],['ระดับอ่อน','#6ba5d7'],['ระดับกลาง','#196f45'],['ระดับสูง','#183e75']];
 const badLevels=[['ไม่เข้าเกณฑ์','#64748b'],['ระดับอ่อน','#888888'],['ระดับกลาง','#111111'],['ระดับแรง','#c95560']];
 return [['ดวงบุญ',goodCount,good,best?['ระดับสูงมาก','#a67c00']:goodLevels[goodCount]],['ดวงบาป',badCount,bad,worst?['ระดับรุนแรง','#8b1e2d']:badLevels[badCount]]].map(([topic,count,checks,[label,color]])=>({topic,kind:'qualitative',status:'complete',count,checks,label,color,items,groups:[]}));
}
function specialTopic(chart,definition) {
 let cards;
 if(definition.mode==='merit')cards=meritCards(definition.groups[0].positions.map(p=>scoreHouse(chart,p.base,p.column)));
 if(definition.mode==='transition') {
  const positions=keys=>keys.map(k=>{const [base,column]=k.split(':').map(Number);return {base,column};});
  cards=[oneGroupCard(chart,'ปิตา · มาตา · พันธุ',positions(['1:4','1:5','2:4'])),oneGroupCard(chart,'ธนัง · โภคา · กดุมภะ · ลาภะ · สุภะ',positions(['1:3','1:6','2:2','3:4','3:2']))];
 }
 if(definition.mode==='study')cards=[[5,'ต้นทุนปัญญา'],[4,'ไหวพริบ,ค.จำ ,ค.สนใจ'],[3,'ค.ขยัน มานะ อดทน ดิ้นรน']].map(([star,title])=>{
  const positions=definition.groups[0].positions.filter(p=>chart.bases[p.base-1][p.column-1]===star);
  const card=oneGroupCard(chart,title,positions,true);
  if(star===5&&card.groups[0].items.some(i=>i.major>0))card.note='สู้ครู, เรียนต่างถิ่น, สู้เรียน';
  return card;
 });
 return {topic:definition.topic,kind:'composite',status:'complete',cards,groups:[]};
}
