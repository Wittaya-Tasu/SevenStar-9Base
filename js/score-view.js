import { scoreTopic, levelFor, groupSummary, factorSummary } from './score-engine.js';
import { GROUP_STYLES } from './topic-engine.js';
import { renderCareerCard } from './career-view.js';
const number=n=>Number(n.toFixed(2)).toLocaleString('th-TH');
export function renderScore(chart, topic, gender = '') {
 const panel=document.querySelector('#score-panel');
 panel.replaceChildren();
 const result=scoreTopic(chart,topic,gender);
 const card=document.createElement('article');card.className='score-card';panel.append(card);
 const title=document.createElement('h3');title.textContent=topic||'คะแนนรายหัวข้อ';card.append(title);
 if(result.kind==='career') { renderCareerCard(card,result);return result; }
 if(result.status==='unconfigured') {
  const p=document.createElement('p');p.textContent=topic?'ยังไม่ได้กำหนดภพประเมินสำหรับเรื่องนี้':'เลือกหัวข้อเพื่อดูผลการประเมิน';card.append(p);return result;
 }
 if(result.status==='complete') {
  const [,label,color]=levelFor(result.score);card.style.setProperty('--score-color',color);
  const value=document.createElement('strong');value.className='score-value';value.textContent=number(result.score);card.append(value);
  const level=document.createElement('p');level.textContent=label;card.append(level);
  const bar=document.createElement('div');bar.className='score-bar';bar.setAttribute('role','meter');bar.setAttribute('aria-label',topic);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',result.score);
  const fill=document.createElement('span');fill.style.width=`${result.score}%`;bar.append(fill);card.append(bar);
  const raw=document.createElement('p');raw.textContent='คะแนนรวมถ่วงน้ำหนัก / 100 · ไม่มีโบนัส';card.append(raw);
 } else { const p=document.createElement('p');p.textContent=(result.reasons||['ข้อมูลยังไม่ครบ']).join('\n');card.append(p); }
 for(const group of result.groups) {
  const section=document.createElement('details');section.open=result.status!=='complete';
  section.style.borderLeft=`4px solid ${GROUP_STYLES[group.index].stripe}`;
  const summary=document.createElement('summary');summary.textContent=groupSummary(group,number);section.append(summary);
  for(const item of group.items) {
   const row=document.createElement('div');row.className='score-house';
   const heading=document.createElement('strong');heading.textContent=`${item.house} (ฐาน ${item.base}) · ดาว ${item.star} · ${item.raw===null?'—':number(item.raw)}`;row.append(heading);
   const text=document.createElement('p');text.textContent=item.raw===null?item.reason:factorSummary(item)+`\nฐาน 4 = ${item.sum} · ระดับ${item.tier}${item.tier!==item.originalTier?' (ลดระดับจากภพเสีย)':''}\nคู่สัมพันธ์: ${item.relation.candidates.map(c=>`${c.name} ${c.points}`).join(' / ')}\nใช้ค่าสูงสุด ${item.relation.points} · ภพเสียหลัก ${item.major} ภพ / รอง ${item.minor} ภพ`;row.append(text);
   const bad=document.createElement('p');bad.textContent='ภพเสีย: '+(item.bad.map(b=>`${b.house} ฐาน ${b.base}`).join(' • ')||'ไม่มี');row.append(bad);section.append(row);
  }
  card.append(section);
 }
 return result;
}
