import { scoreTopic, levelFor } from './score-engine.js';
const number=n=>Number(n.toFixed(2)).toLocaleString('th-TH');
export function renderScore(chart, topic) {
 const panel=document.querySelector('#score-panel');
 panel.replaceChildren();
 const result=scoreTopic(chart,topic);
 const card=document.createElement('article');card.className='score-card';panel.append(card);
 const title=document.createElement('h3');title.textContent=topic||'คะแนนรายหัวข้อ';card.append(title);
 if(result.status==='unconfigured') {
  const p=document.createElement('p');p.textContent=topic?'ยังไม่ได้กำหนดภพประเมินสำหรับเรื่องนี้':'เลือกหัวข้อเพื่อดูผลการประเมิน';card.append(p);return result;
 }
 if(result.status==='complete') {
  const [,label,color]=levelFor(result.score);card.style.setProperty('--score-color',color);
  const value=document.createElement('strong');value.className='score-value';value.textContent=number(result.score);card.append(value);
  const level=document.createElement('p');level.textContent=label;card.append(level);
  const bar=document.createElement('div');bar.className='score-bar';bar.setAttribute('role','meter');bar.setAttribute('aria-label',topic);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',result.score);
  const fill=document.createElement('span');fill.style.width=`${result.score}%`;bar.append(fill);card.append(bar);
  const raw=document.createElement('p');raw.textContent=`คะแนนก่อนจำกัดค่า ${number(result.raw)}`;card.append(raw);
 } else { const p=document.createElement('p');p.textContent='ไม่สามารถคำนวณคะแนนได้ครบ: มีคู่ดาวที่ยังไม่กำหนดความสัมพันธ์';card.append(p); }
 for(const group of result.groups) {
  const section=document.createElement('details');section.open=result.status!=='complete';
  const summary=document.createElement('summary');summary.textContent=`${group.label} ${group.weight*100}% · ${group.raw===null?'ยังไม่ครบ':number(group.raw)}`;section.append(summary);
  for(const item of group.items) {
   const row=document.createElement('div');row.className='score-house';
   const heading=document.createElement('strong');heading.textContent=`${item.house} (ฐาน ${item.base}) · ดาว ${item.star} · ${item.raw===null?'—':number(item.raw)}`;row.append(heading);
   const text=document.createElement('p');text.textContent=item.raw===null?item.reason:`${[2,4,5,6].includes(item.star)?'ศุภเคราะห์':'บาปเคราะห์'} ${item.planet} · ฐาน ${item.sum} (${item.tier}) ${item.basePoints} · ${(item.names.join(' + ')||'ไพ่พิเศษ')} ${item.relation.points}\nพิเศษดาว ${item.planetBonus} · เงื่อนไขร่วม ${item.relation.joint} · หลายความสัมพันธ์ ${item.relation.multiple} · ไพ่พิเศษ ${item.specialBonus} · หักภพเสีย ${item.deduction}`;row.append(text);
   const bad=document.createElement('p');bad.textContent='ภพเสีย: '+(item.bad.map(b=>`${b.house} ฐาน ${b.base}`).join(' • ')||'ไม่มี');row.append(bad);section.append(row);
  }
  card.append(section);
 }
 return result;
}
