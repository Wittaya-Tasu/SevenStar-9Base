import { careerStarLabel, careerPositionLabel, CAREER_BANDS } from './career-engine.js';

export function renderCareerCard(card,result) {
  card.classList.add('career-card');
  const intro=document.createElement('p');
  intro.textContent='เลขดาวเรียงจากกลุ่มที่ดีที่สุดลงมา';card.append(intro);
  const legend=document.createElement('p');legend.className='career-legend';
  legend.textContent='* พบในภพหลัก: อัตตะ ฐาน 1 / ตะนุ ฐาน 2 / กัมมะ ฐาน 3';card.append(legend);
  for(const band of result.bands) {
    const section=document.createElement('section');section.className='career-band';
    const heading=document.createElement('h4');heading.textContent=`ลำดับ ${band.rank}`;section.append(heading);
    const numbers=document.createElement('div');numbers.className='career-stars';
    for(const item of band.stars) {
      const chip=document.createElement('span');chip.className=`career-star career-rank-${band.rank}`;
      chip.style.backgroundColor=band.fill;chip.style.color=band.ink;
      chip.textContent=careerStarLabel(item);
      chip.title=item.positions.map(careerPositionLabel).join(' · ');
      chip.setAttribute('aria-label',`ดาว ${item.star}${item.isMain?' พบในภพหลัก':''} ลำดับ ${band.rank}`);
      numbers.append(chip);
    }
    section.append(numbers);
    const explanation=document.createElement('p');explanation.textContent=band.description;section.append(explanation);
    card.append(section);
  }
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent='ตำแหน่งและเหตุผล';details.append(summary);
  for(const item of result.stars) {
    const section=document.createElement('div');section.className='score-house';
    const heading=document.createElement('strong');heading.textContent=`ดาว ${careerStarLabel(item)} · ลำดับ ${item.rank}`;section.append(heading);
    for(const message of [
      item.positions.map(careerPositionLabel).join('\n'),
      `ฐาน 3 เลข ${item.star} → ฐาน 4 เลข ${item.sum} · ${item.names.join(' / ')||'ไม่มีศัตรูหรือศัตรูใหญ่'}`,
      CAREER_BANDS[item.rank-1].description,
      'ภพเสียที่เชื่อม: '+(item.bad.map(p=>`${p.house} ฐาน ${p.base}`).join(' · ')||'ไม่มี'),
    ]) { const p=document.createElement('p');p.textContent=message;section.append(p); }
    details.append(section);
  }
  card.append(details);
}
