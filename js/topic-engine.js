import { HOUSE_NAMES } from './chart-engine.js';
// Source: หัวข้อ และ ภพ.xlsx, sheet หัวข้อ, rows 2–24; positions are base:column.
const stars = (...values) => ({ stars: values });
const spouse = { byGender: { male: '3:7', female: '3:6' } };
export const CAREER_TOPIC = 'อาชีพที่เหมาะสม';
export const TOPIC_DEFINITIONS = [
  ['เจ้าชะตา','วาสนา',['1:1','2:1'],['8:1','9:1'],[stars(6,2)]],
  ['เจ้าชะตา','ความดี',['1:1','2:1'],['2:4','3:2'],[stars(5)]],
  ['เจ้าชะตา','ชื่อเสียง',['3:2'],['8:3'],[stars(1)]],
  ['เจ้าชะตา','ความพอดี',['1:7']],
  ['การงาน','การงาน',['3:3'],['1:1','2:1','8:7'],[stars(3)]],
  ['การงาน','การเรียน',['3:3'],['1:1','2:1','8:7'],[stars(3,4,5)]],
  ['การงาน','หุ้นส่วน',['2:7'],['9:7']],
  ['การงาน',CAREER_TOPIC,['1:1','2:1','3:3'],['1:3','2:2','1:6','3:4','3:2']],
  ['ฐานะการเงิน','ฐานะการเงิน',['1:3','2:2'],['1:6','3:4','3:2','9:4'],[stars(6)]],
  ['ฐานะการเงิน','สมบัติฯ',['1:6'],['8:4']],
  ['ฐานะการเงิน','ยานพาหนะ',['2:4'],['9:6']],
  ['ฐานะการเงิน','บ้านที่อยู่',['2:4'],['9:5']],
  ['ความรัก','ความรัก',[stars(6)]],
  ['ความรัก','คู่ครอง',['2:7'],['9:7','1:7',spouse]],
  ['สังคม','ญาติพี่น้อง',['2:4'],['9:3']],
  ['สังคม','ทายาท',['2:5'],['3:6','3:7']],
  ['สังคม','บริวารชาย',['3:6'],['8:2']],
  ['สังคม','บริวารหญิง',['3:7'],['8:2']],
  ['สังคม','สังคม',['2:3'],['9:2']],
  ['สังคม','ผู้สนับสนุน ชาย',['1:4'],['8:7']],
  ['สังคม','ผู้สนับสนุน หญิง',['1:5'],['8:7']],
  ['สุขภาพ','สุขภาพ',['3:5'],['8:6']],
  ['สุขภาพ','ป่วยหนัก',['3:1'],['8:6']],
  ['สุขภาพ','ศัตรู-หนี้สิน',['2:6'],['8:5']],
].map(([category,topic,...groups]) => ({category,topic,groups,mode:topic===CAREER_TOPIC?'career':'score'}));
export const GROUP_STYLES = [
  {label:'ภพหลัก', fill:'#183e75', ink:'#ffffff', stripe:'#183e75'},
  {label:'ภพรอง', fill:'#237647', ink:'#ffffff', stripe:'#237647'},
  {label:'ภพเสริม', fill:'#d9efc9', ink:'#20371c', stripe:'#7bae58'},
];
export function resolveTopic(chart, topic, gender = '') {
  const definition = TOPIC_DEFINITIONS.find(d => d.topic === topic);
  if (!definition) return null;
  const missing = [];
  const weights = definition.mode==='career' ? [null,null] : {1:[1],2:[.8,.2],3:[.7,.2,.1]}[definition.groups.length];
  const groups = definition.groups.map((selectors,index) => {
    const keys = new Set();
    for (const selector of selectors) {
      if (typeof selector === 'string') keys.add(selector);
      else if (selector.stars) {
        for (let b=1;b<=3;b++) chart.bases[b-1].forEach((star,c) => {
          if (selector.stars.includes(star)) keys.add(`${b}:${c+1}`);
        });
      } else if (selector.byGender) {
        if (selector.byGender[gender]) keys.add(selector.byGender[gender]);
        else missing.push('กรุณาเลือกเพศเจ้าชะตาเพื่อประเมินเรื่องคู่ครอง');
      }
    }
    const positions = [...keys].map(key => {
      const [base,column] = key.split(':').map(Number);
      const house = HOUSE_NAMES[base]?.[column-1];
      if (!house) throw new Error(`ไม่พบตำแหน่ง ${key}`);
      return {key,base,column,house};
    });
    return {index,label:GROUP_STYLES[index].label,weight:weights[index],positions};
  });
  return {topic,category:definition.category,mode:definition.mode,groups,missing};
}
// Repeated positions score in every group; color priority is main, secondary, supplementary.
export function topicHighlights(chart, topic, gender = '') {
  const colors = new Map();
  for (const group of resolveTopic(chart,topic,gender)?.groups || []) {
    for (const position of group.positions) if (!colors.has(position.key)) colors.set(position.key,group.index);
  }
  return colors;
}
