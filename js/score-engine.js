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
  if(['merit','transition','study','spouseAge','love','multipleSpouses'].includes(definition.mode)) return specialTopic(chart,definition);
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
 return [false,true].map(isBad=>{
  const checks=items.map(i=>Boolean(i.bad.length)===isBad),count=checks.filter(Boolean).length;
  const topic=isBad?'ดวงบาป':'ดวงบุญ';
  const label=['ไม่เข้าเกณฑ์','อนุบาล','ประถม','มัธยม','มหาลัย'][count];
  const color=(isBad?['#64748b','#888888','#111111','#c95560','#8b1e2d']:['#64748b','#6ba5d7','#196f45','#183e75','#a67c00'])[count];
  const ink=isBad?'#8b1e2d':'#183e75';
  const lines=items.map((item,i)=>({text:`${i+1}. ${item.house}: ${checks[i]?'เข้าเงื่อนไข':'-'}`,color:checks[i]?ink:'#64748b'}));
  items.forEach((item,i)=>{if(checks[i])lines.push({text:`${item.house} · ดาว ${item.star} · ${isBad?'เชื่อม '+item.bad.map(b=>b.house).join(', '):'ไม่เชื่อมภพเสีย'}${item.names.length?' · คู่สัมพันธ์ '+item.names.join(' / '):''}`,color:ink});});
  return {topic:topic+' : '+label,kind:'qualitative',status:'complete',count,checks,label,color,items,groups:[],lines};
 });
}
function specialTopic(chart,definition) {
 let cards;
 if(definition.mode==='multipleSpouses') return multipleSpouses(chart);
 if(definition.mode==='spouseAge') return spouseAge(chart);
 if(definition.mode==='love') return {topic:definition.topic,kind:'composite',status:'complete',groups:[],cards:[{...scoreTopic(chart,'คุณภาพความรัก'),topic:'ความรัก'},scoreTopic(chart,chart.gender==='female'?'คู่ครอง (ของ ญ.)':'คู่ครอง (ของ ช.)'),marriageLife(chart)]};
 if(definition.mode==='merit')cards=meritCards(definition.groups[0].positions.map(p=>scoreHouse(chart,p.base,p.column)));
 if(definition.mode==='transition') {
  const positions=keys=>keys.map(k=>{const [base,column]=k.split(':').map(Number);return {base,column};});
  cards=[oneGroupCard(chart,'ปิตา · มาตา · พันธุ',positions(['1:4','1:5','2:4'])),oneGroupCard(chart,'ธนัง · โภคา · กดุมภะ · ลาภะ · สุภะ',positions(['1:3','1:6','2:2','3:4','3:2']))];
 }
 if(definition.mode==='study')cards=[[5,'ต้นทุนปัญญา'],[4,'ไหวพริบ ความจำ-สนใจ'],[3,'ความขยัน มานะ อดทน']].map(([star,title])=>{
  const positions=definition.groups[0].positions.filter(p=>chart.bases[p.base-1][p.column-1]===star);
  const card=oneGroupCard(chart,title,positions,true);
  if(star===5&&card.groups[0].items.some(i=>i.major>0))card.note='สู้ครู, เรียนต่างถิ่น, สู้เรียน';
  return card;
 });
 return {topic:definition.topic,kind:'composite',status:'complete',cards,groups:[]};
}

const POWER={1:[6],2:[15],3:[8],4:[17],5:[19],6:[21],7:[10,20]};
export function spouseAge(chart) {
 const star=chart.bases[1][6],sum=chart.bases[3][chart.bases[2].indexOf(star)];
 const groups=[['คู่ครองอายุมากกว่า',[[1,4],[1,5],[1,7]],[[1,4],[1,5],[1,7]]],['คู่ครองอายุน้อยกว่า',[[3,6],[3,7]],[[2,5],[3,6],[3,7]]],['คู่ครองอายุใกล้เคียงกัน',[[1,1]],[[1,1],[2,1]]]];
 const lines=[];
 for(const [label,equal,power] of groups){
  const matches=[];
  for(const [base,col] of equal)if(chart.bases[base-1][col-1]===star)matches.push('เลขตรง '+houseNamesFor(chart)[base][col-1]);
  for(const [base,col] of power)if(POWER[chart.bases[base-1][col-1]].includes(sum))matches.push('ฐาน 4 = '+sum+' เป็นเลขกำลังของ '+houseNamesFor(chart)[base][col-1]);
  if(matches.length){lines.push({text:label,color:'#183e75',bold:true});lines.push({text:matches.join(' · '),color:'#183e75'});}
 }
 if(!lines.length)lines.push({text:'ไม่เข้าเกณฑ์อายุคู่ครองที่กำหนด',color:'#64748b'});
 return {topic:'อายุคู่ครอง',kind:'qualitative',status:'complete',groups:[],color:'#183e75',lines};
}
const LIFE_PAIRS={
 '1/1':['ยศศักดิ์',true],'1/2':['ครัวเรือน',true],'1/3':['ศัตรู ปะทะ',false],'1/4':['ไหวพริบ',true],'1/5':['มิตร ปัญญา',true],'1/6':['สมพล สนับสนุน',true],'1/7':['ธาตุ',true,'ศัตรู เร่งร้อน'],
 '2/1':['ครัวเรือน',true],'2/2':['เสน่ห์',true],'2/3':['ชู้ ระแวง',false],'2/4':['มิตร รุ่งเรือง',true],
 '2/5':['เสน่ห์ วิชาการ',true,'ศัตรู ชิงชัง'],'2/6':['สรรเสริญ สำราญ',true],'2/7':['ศัตรู พลักพราก',false],
 '3/1':['ศัตรู ปะทะ',false],'3/2':['ชู้ ระแวง',false],'3/3':['กล้าแกร่ง แข็งขัน',true],'3/4':['ศัตรู ขัดแย้ง',false],'3/5':['สมพล เด็ดเดี่ยว',true],'3/6':['มิตร เสน่หา พึ่งพา',true],'3/7':['ศัตรู แตกหัก',false],
 '4/1':['ไหวพริบ',true],'4/2':['มิตร รุ่งเรือง',true],'4/3':['ศัตรู ขัดแย้ง',false],'4/4':['ปฏิภาณ',true],'4/5':['บัณฑิต รอบรู้',true],'4/6':['ธาตุน้ำ เกื้อกูล',true],'4/7':['สมพล คารม',true,'ผิดสัญญา'],
 '5/1':['มิตร ปัญญา',true],'5/2':['เสน่ห์ วิชาการ',true,'ศัตรู ชิงชัง'],'5/3':['สมพล เด็ดเดี่ยว',true],'5/4':['บัณฑิต รอบรู้',true],'5/5':['ปัญญา',true],'5/6':['ทรัพย์ โชค',true],'5/7':['ศัตรู ปฏิวัติ',false],
 '6/1':['สมพล สนับสนุน',true],'6/2':['สรรเสริญ สำราญ',true],'6/3':['มิตร เสน่หา พึ่งพา',true],'6/4':['ธาตุน้ำ เกื้อกูล',true],'6/5':['ทรัพย์ โชค',true],'6/6':['เสน่หา สำราญ',true],'6/7':['ศัตรู โทษทุกข์',false],
 '7/1':['ธาตุ',true,'ศัตรู เร่งร้อน'],'7/2':['ศัตรู พลักพราก',false],'7/3':['ศัตรู แตกหัก',false],'7/4':['สมพล คารม',true,'ผิดสัญญา'],'7/5':['ศัตรู ปฏิวัติ',false],'7/6':['ศัตรู โทษทุกข์',false],'7/7':['ทรหด',true]
};
export function marriageLife(chart) {
 const [a,b,c]=chart.bases.slice(0,3).map(row=>row[6]);
 const pairs=[[a,b],[a,c],[b,c]].map(([x,y])=>{
  const entry=LIFE_PAIRS[x+'/'+y];
  if(!entry)return {x,y,name:'ยังไม่กำหนด',good:null};
  const enemy=getRelations(x,y,getBadNumbers(chart)).some(r=>['ศัตรู','ศัตรูใหญ่'].includes(r.name));
  return {x,y,name:entry[2]&&enemy?entry[2]:entry[0],good:entry[2]&&enemy?false:entry[1]};
 });
 const unknown=pairs.some(p=>p.good===null),count=pairs.filter(p=>p.good).length;
 const color=unknown?'#64748b':['#8b1e2d','#111111','#196f45','#a67c00'][count];
 const lines=pairs.map(p=>({text:`คู่ ${p.x}/${p.y}: ${p.name}`,color:p.good===null?'#64748b':p.good?'#196f45':'#8b1e2d',bold:p.good===true}));
 if(unknown)lines.push({text:'ยังสรุปสีรวมไม่ได้: ตารางคู่เลขยังไม่ครบ',color:'#64748b'});
 return {topic:'ชีวิตคู่',kind:'qualitative',status:'complete',groups:[],pairs,color,lines};
}

// Topic 2007: each house is evaluated against its own base-3/base-4 pair.
export function multipleSpouseRules({patni,middle,tasi,labha,atta,tanu,bandhu,supha}) {
 const enemy=item=>item.names.some(n=>n==='ศัตรู'||n==='ศัตรูใหญ่');
 const adverse=item=>item.bad.length>0&&enemy(item);
 const favorable=item=>item.bad.length===0&&!enemy(item);
 return [
  patni.star===middle.star||patni.star===tasi.star,
  [1,3,7].includes(patni.star)&&patni.star===labha.star&&enemy(patni),
  (adverse(atta)||adverse(tanu))&&adverse(bandhu)&&adverse(supha),
  (favorable(atta)||favorable(tanu))&&favorable(bandhu)&&favorable(supha),
 ];
}
export function multipleSpouses(chart) {
 const names=houseNamesFor(chart);
 const checks=multipleSpouseRules({
  patni:scoreHouse(chart,2,7),middle:scoreHouse(chart,1,7),
  tasi:scoreHouse(chart,3,names[3].indexOf('ทาสี')+1),labha:scoreHouse(chart,3,4),
  atta:scoreHouse(chart,1,1),tanu:scoreHouse(chart,2,1),bandhu:scoreHouse(chart,2,4),supha:scoreHouse(chart,3,2),
 });
 const labels=['คู่ครองคนเดียว','คู่ครองมาก','มุ่งมีคู่ครองมาก','คู่ครองคนเดียว'];
 const colors=['#196f45','#c95560','#8b1e2d','#196f45'];
 const lines=[];
 checks.forEach((passes,i)=>{if(passes){lines.push({text:labels[i],color:colors[i],bold:true});lines.push({text:`เข้าเกณฑ์ข้อ ${i+1}`,color:'#64748b'});}});
 if(!lines.length)lines.push({text:'ไม่เข้าเกณฑ์ที่กำหนด',color:'#64748b'});
 return {topic:'มากคู่ครอง',kind:'qualitative',status:'complete',groups:[],checks,lines,color:'#64748b'};
}
