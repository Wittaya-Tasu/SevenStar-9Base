import { scoreTopic, levelFor, groupSummary, factorSummary, detailLines, LEVELS } from './score-engine.js';
import { GROUP_STYLES } from './topic-engine.js';
import { renderCareerCard } from './career-view.js';
const number=n=>Math.round(n).toLocaleString('th-TH');
export function renderScore(chart, topic, gender = '') {
 const panel=document.querySelector('#score-panel');
 panel.replaceChildren();
 const result=scoreTopic(chart,topic,gender);
 if(result.kind==='composite') {for(const child of result.cards) appendScoreCard(panel,child,child.topic);return result;}
 appendScoreCard(panel,result,topic);return result;
}
function appendScoreCard(panel,result,topic) {
 const card=document.createElement('article');card.className='score-card';panel.append(card);
 const title=document.createElement('h3');title.textContent=topic||'คะแนนรายหัวข้อ';card.append(title);
 if(result.kind==='qualitative') {
  card.style.setProperty('--score-color',result.color);
  title.style.color=result.color;
  for(const line of result.lines||[]){const p=document.createElement('p');p.textContent=line.text;p.style.color=line.color;p.style.fontWeight=line.bold?'700':'400';card.append(p);}
  return result;
 }
 if(result.kind==='career') { renderCareerCard(card,result);return result; }
 if(result.status==='unconfigured') {
  const p=document.createElement('p');p.textContent=topic?'ยังไม่ได้กำหนดภพประเมินสำหรับเรื่องนี้':'เลือกหัวข้อเพื่อดูผลการประเมิน';card.append(p);return result;
 }
 if(result.status==='complete') {
  const [,label,color]=levelFor(result.score);card.style.setProperty('--score-color',color);
  const value=document.createElement('strong');value.className='score-value';value.textContent=number(result.score);card.append(value);
  const dots=document.createElement('div');dots.className='score-dots';dots.setAttribute('aria-label',label);
  [...LEVELS].reverse().forEach((entry,i)=>{const dot=document.createElement('span');dot.style.backgroundColor=entry[1]===label?entry[2]:'#dce0e5';dot.title=entry[1];dots.append(dot);});card.append(dots);
  const level=document.createElement('p');level.textContent=label;card.append(level);
  const bar=document.createElement('div');bar.className='score-bar';bar.setAttribute('role','meter');bar.setAttribute('aria-label',topic);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',result.score);
  const fill=document.createElement('span');fill.style.width=`${result.score}%`;bar.append(fill);card.append(bar);

 } else { const p=document.createElement('p');p.textContent=(result.reasons||['ข้อมูลยังไม่ครบ']).join('\n');card.append(p); }
 if(result.note){const p=document.createElement('p');p.className='bad-detail';p.textContent=result.note;card.append(p);}
 for(const group of result.groups) {
  const section=document.createElement('details');section.open=result.status!=='complete';
  section.style.borderLeft=`4px solid ${GROUP_STYLES[group.index].stripe}`;
  const summary=document.createElement('summary');summary.textContent=groupSummary(group,number);section.append(summary);
  for(const item of group.items) {
   const row=document.createElement('div');row.className='score-house';
   const heading=document.createElement('strong');heading.textContent=`${item.house} (ฐาน ${item.base}) · ดาว ${item.star} · ${item.raw===null?'—':number(item.raw)}`;row.append(heading);
   for(const message of item.raw===null?[item.reason]:detailLines(item)) {const p=document.createElement('p');p.textContent=message;row.append(p);}
   if(item.bad.length) {const bad=document.createElement('p');bad.className='bad-detail';bad.textContent='ภพเสีย: '+item.bad.map(b=>`${b.house} ฐาน ${b.base}`).join(' · ');row.append(bad);}
   section.append(row);
  }
  card.append(section);
 }
 return result;
}
