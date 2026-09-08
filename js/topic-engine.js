import { HOUSE_NAMES, houseNamesFor, chartWithGender } from './chart-engine.js';
// Source: หัวข้อ และ ภพ.xlsx, sheet หัวข้อ, rows 2–24; positions are base:column.
const stars = (...values) => ({ stars: values });
const spouse = { byGender: { male: '3:7', female: '3:6' } };
export const CAREER_TOPIC = 'อาชีพที่เหมาะสม';
export const configured = [
 ['ตัวเจ้าชะตา',1001,'ดวง "คนดี"',['1:1','2:1','2:4','3:2'],[stars(5)]],
 ['การเงิน',1002,'ดวง "คนรวย"',['1:3','1:6','2:2','3:4'],['1:1','2:1'],[stars(6)]],
 ['การเงิน',1005,'ร่ำรวย สุขสบาย',['1:3','1:6','2:2','3:4']],
 ['การเงิน',1006,'ร่ำรวย สุขสบาย วงค์ดี',['1:3','1:6','2:2','3:4','3:2'],['1:4','1:5','2:4']],
 ['การเงิน',1007,'สร้างฐานะง่าย',['1:3','1:6','2:2','3:4','3:2','1:4','1:5','2:4'],['1:1','2:1']],
 ['ความรัก',1008,'คุณภาพความรัก',[{stars:[6],bases:[1,2,3,8,9]}]],
 ['ความรัก',1009,'คู่ครอง (ของ ช.)',['2:7'],['1:7','3:7'],['9:7']],
 ['ความรัก',1010,'คู่ครอง (ของ ญ.)',['2:7'],['1:7','3:6'],['9:7']],
 ['ชื่อเสียง',1003,'ดวง "คนดัง"',['1:1','2:1'],['3:2']],
 ['ตัวเจ้าชะตา',null,'ความพอดี',['1:7']],
].map(([category,id,topic,...groups])=>({category,id,topic,groups,mode:'score'}));
export const TOPIC_DEFINITIONS = [
 configured[0],
 {category:'วาสนา',id:1004,topic:'ความดี-ความรวย',mode:'composite',children:[1001,1002],groups:[]},
 ...configured.slice(1).filter(d=>![1008,1009,1010].includes(d.id)),
 {category:"ความรัก",id:2016,topic:"ความรัก-ชีวิตคู่",mode:"love",groups:[[{stars:[6],bases:[1,2,3,8,9]},"2:7","1:7","3:7","3:6"],["9:7"]]},
 {category:'การงาน',id:2002,topic:CAREER_TOPIC,mode:'career',groups:[['1:1','2:1','3:3'],['1:3','2:2','1:6','3:4','3:2']]},
 ...[
 ['วาสนา',2001,'ดวง "บุญ-บาป"','หน้า 120'],
 ['การงาน',2003,'การเล่าเรียน','หน้า 137'],
 ['การเงิน',2004,'พลิกรวยสู่จน','หน้า 126'],
 ['ความรัก',2006,'อายุคู่ครอง','หน้า 142'],
 ['ความรัก',2007,'มากคู่ครอง','หน้า 142'],
 ['ความรัก',2008,'เรื่องของความรัก','รวมหลายข้อของความรัก'],
 ['ความรัก',2009,'ข้อสังเกตเรื่อง "รัก"','หน้า 145'],
 ['ความรัก',2010,'แต่ช้า-ไม่แต่ง','หน้า 149'],
 ['ความรัก',2011,'ไม่แต่ง-บวช','หน้า 151'],
 ['ความรัก',2012,'ดวง "หม้าย-เลิก"','หน้า 154'],
 ['ความรัก',2013,'ดวง "หม้าย-จาก"','หน้า 154'],
 ['ความรัก',2014,'แต่งกับ "หม้าย"','ยังไม่ระบุรายละเอียด'],
 ].map(([category,id,topic,sourceNote])=>({category,id,topic,sourceNote,mode:'pending',groups:[]})),
];
for(const t of TOPIC_DEFINITIONS) {
 if(t.id===2006) Object.assign(t,{mode:'spouseAge',groups:[['2:7'],['1:1','1:4','1:5','1:7','2:1','2:5','3:6','3:7']]});
 if(t.id===2001) Object.assign(t,{mode:'merit',groups:[['1:1','2:1','2:4','3:2']]});
 if(t.id===2004) Object.assign(t,{topic:'พลิก "รวย-จน"',mode:'transition',groups:[['1:4','1:5','2:4','1:3','1:6','2:2','3:4','3:2']]});
 if(t.id===2003) Object.assign(t,{mode:'study',groups:[[{stars:[5,4,3],bases:[1,2,3,8,9]}]]});
}
export const GROUP_STYLES = [
  {label:'ภพหลัก', fill:'#183e75', ink:'#ffffff', stripe:'#183e75'},
  {label:'ภพรอง', fill:'#237647', ink:'#ffffff', stripe:'#237647'},
  {label:'ภพเสริม', fill:'#d9efc9', ink:'#20371c', stripe:'#7bae58'},
];
export function resolveTopic(chart, topic, gender = chart.gender || '') {
  chart=chartWithGender(chart,gender);
  const definition = [...TOPIC_DEFINITIONS,...configured].find(d => d.topic === topic);
  if (!definition) return null;
  const missing = [];
  const weights = definition.mode==='career' ? [null,null] : {1:[1],2:[.8,.2],3:[.7,.2,.1]}[definition.groups.length];
  const groups = definition.groups.map((selectors,index) => {
    const keys = new Set();
    for (const selector of selectors) {
      if (typeof selector === 'string') {
        const [base,column]=selector.split(':').map(Number);
        const house=HOUSE_NAMES[base][column-1];
        keys.add(`${base}:${houseNamesFor(chart)[base].indexOf(house)+1}`);
      }
      else if (selector.stars) {
        for (const b of selector.bases || [1,2,3]) chart.bases[b-1].forEach((star,c) => {
          if (selector.stars.includes(star)) keys.add(`${b}:${c+1}`);
        });
      } else if (selector.byGender) {
        if (selector.byGender[gender]) keys.add(selector.byGender[gender]);
        else missing.push('กรุณาเลือกเพศเจ้าชะตาเพื่อประเมินเรื่องคู่ครอง');
      }
    }
    const positions = [...keys].map(key => {
      const [base,column] = key.split(':').map(Number);
      const house = houseNamesFor(chart)[base]?.[column-1];
      if (!house) throw new Error(`ไม่พบตำแหน่ง ${key}`);
      return {key,base,column,house};
    });
    return {index,label:GROUP_STYLES[index].label,weight:weights[index],positions};
  });
  return {...definition,groups,missing};
}
// Repeated positions score in every group; color priority is main, secondary, supplementary.
export function topicHighlights(chart, topic, gender = chart.gender || '') {
  const colors = new Map();
  const definition=TOPIC_DEFINITIONS.find(d=>d.topic===topic);
  if(definition?.mode==='love') {
    for(const topicName of ['คุณภาพความรัก',gender==='female'?'คู่ครอง (ของ ญ.)':'คู่ครอง (ของ ช.)'])for(const [key,index] of topicHighlights(chart,topicName,gender))if(!colors.has(key)||index<colors.get(key))colors.set(key,index);
    for(const base of [1,2,3])colors.set(`${base}:7`,0);
    return colors;
  }
  if(definition?.mode==='composite') {
    for(const id of definition.children) for(const [key,index] of topicHighlights(chart,TOPIC_DEFINITIONS.find(d=>d.id===id).topic,gender)) {
      if(!colors.has(key)||index<colors.get(key)) colors.set(key,index);
    }
    return colors;
  }
  for (const group of resolveTopic(chart,topic,gender)?.groups || []) {
    for (const position of group.positions) if (!colors.has(position.key)) colors.set(position.key,group.index);
  }
  return colors;
}
