import { HOUSE_NAMES, houseNamesFor, chartWithGender } from './chart-engine.js';
import { getRelations, getBadNumbers, relationConstants } from './relation-engine.js';
import { CAREER_TOPIC, resolveTopic } from './topic-engine.js';

export const CAREER_BANDS = [
  ['ศุภเคราะห์ · ฐานดี · ไม่เชื่อมภพเสีย','#af8620','#ffffff'],
  ['บาปเคราะห์ · ฐานดี · ไม่เชื่อมภพเสีย','#196f45','#ffffff'],
  ['ศุภเคราะห์ · ฐานดี · เชื่อมภพเสีย','#d9efc9','#000000'],
  ['บาปเคราะห์ · ฐานดี · เชื่อมภพเสีย','#b8bcc4','#ffffff'],
  ['ศุภเคราะห์ · ฐานเสีย · ไม่เชื่อมภพเสีย','#565d68','#ffffff'],
  ['บาปเคราะห์ · ฐานเสีย · ไม่เชื่อมภพเสีย','#f7c8cd','#000000'],
  ['ศุภเคราะห์ · ฐานเสีย · เชื่อมภพเสีย','#f7c8cd','#8b1e2d'],
  ['บาปเคราะห์ · ฐานเสีย · เชื่อมภพเสีย','#8b1e2d','#ffffff'],
].map(([description,fill,ink],index)=>({rank:index+1,description,fill,ink}));

export function careerRank(star, relationNames, linkedBadHouse) {
  if (!Number.isInteger(star) || star<1 || star>7) throw new Error('เลขดาวต้องเป็น 1–7');
  // Any eligible enemy relation wins here, even if another relation is beneficial.
  const badBase = relationNames.some(name=>name==='ศัตรู'||name==='ศัตรูใหญ่');
  return 1 + ([2,4,5,6].includes(star)?0:1) + (linkedBadHouse?2:0) + (badBase?4:0);
}

export function analyzeCareer(chart) {
  const definition=resolveTopic(chart,CAREER_TOPIC);
  const badNumbers=getBadNumbers(chart);
  const byStar=new Map();
  for(const group of definition.groups) for(const position of group.positions) {
    const star=chart.bases[position.base-1][position.column-1];
    if(!byStar.has(star)) {
      const pairColumn=chart.bases[2].indexOf(star)+1;
      const sum=chart.bases[3][pairColumn-1];
      const names=getRelations(star,sum,badNumbers).map(r=>r.name);
      const bad=relationConstants.BAD_HOUSES.filter(p=>chart.bases[p.base-1][HOUSE_NAMES[p.base].indexOf(p.house)]===star);
      const rank=careerRank(star,names,bad.length>0);
      byStar.set(star,{star,pairColumn,sum,names,bad,rank,isMain:false,positions:[]});
    }
    const item=byStar.get(star);
    item.isMain ||= group.index===0;
    item.positions.push({...position,groupIndex:group.index,groupLabel:group.label});
  }
  // Same-rank stars sort numerically only for stable display, not additional suitability.
  const stars=[...byStar.values()].sort((a,b)=>a.rank-b.rank||a.star-b.star);
  const bands=CAREER_BANDS.map(band=>({...band,stars:stars.filter(s=>s.rank===band.rank)})).filter(b=>b.stars.length);
  const topRanks=new Set(bands.slice(0,2).map(b=>b.rank));
  for(const item of stars) item.extraOccupationBase=topRanks.has(item.rank)&&[9,12].includes(item.sum)?item.sum:null;
  return {topic:CAREER_TOPIC,kind:'career',status:'complete',groups:definition.groups,stars,bands};
}

export function careerStarLabel(item) { return `${item.star}${item.isMain?'*':''}`; }
export function careerPositionLabel(position) { return `${position.house} ฐาน ${position.base} (${position.groupLabel})`; }
