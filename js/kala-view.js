import {kalaAt,markerFor} from './kala-engine.js';
import {HOUSE_NAMES} from './chart-engine.js';
import {houseAppearance,isSpecialResult} from './selection-engine.js';
import {buildRelationColumns} from './relation-engine.js';
const $=s=>document.querySelector(s);
let live=true,current=null,chosen=null,request=0;
function nowInput(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return {day:+parts.day,month:+parts.month,yearBe:+parts.year+543,time:`${parts.hour}:${parts.minute}`};}
function setInput(i){for(const key of ['day','month','yearBe','time'])$('#kala-'+key).value=i[key];}
function readInput(){return Object.fromEntries(['day','month','yearBe','time'].map(key=>[key,$('#kala-'+key).value]));}
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function paint(){
 const {calendar,chart,taksa,table,yam}=current,active=chosen||yam;
 $('#kala-state').textContent=live?'เวลาปัจจุบัน · ประเทศไทย':'หยุดเวลาชั่วคราว';
 const date=new Date(calendar.effectiveDate+'T12:00:00Z');
 $('#kala-summary').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'full'}).format(date)+` · ปี${calendar.zodiac.name} · รหัส ${Object.values(calendar.seeds).join('-')} · เลขยาม ${active.number}`+(calendar.shifted?' · ใช้วันก่อนหน้า เนื่องจากยังไม่ถึง 06:01 น.':'');
 const grid=$('#kala-chart');grid.replaceChildren();
 chart.bases.forEach((values,index)=>{
 const base=index+1,row=element('div',undefined,'kala-row'+(base>=5&&base<=7?' secondary':''));row.append(element('div',`ฐาน ${base}`,'base-label'));
 values.forEach((value,col)=>{
 const cell=element('div',undefined,'kala-cell');
 const related=base===4?chart.bases[2][col]===active.number:value===active.number;
 if(related)cell.classList.add('yam-linked');
 const house=element('span',base===4?'':HOUSE_NAMES[base]?.[col]||'','house');const appearance=houseAppearance(base,col+1);house.style.color=appearance.color;house.style.fontWeight=appearance.weight;
 const number=element('span',String(value),'kala-number');const marker=markerFor(base,col+1,value,taksa);
 if(marker.kind){number.classList.add(marker.kind);if(marker.ring)number.classList.add('marker-ring');number.title=marker.kind==='kali'?'กาลี':'ศรี';}
 cell.append(house,number);
 if(base===4)cell.append(element('span',chart.base4Names[col],'result-name'+(isSpecialResult(value)?'':' plain-result')));
 row.append(cell);
 });grid.append(row);
 if(base===3){const relations=element('div',undefined,'kala-row kala-relations');relations.append(element('span',''));
 buildRelationColumns(chart).forEach(c=>{const wrap=element('div');c.relations.forEach(r=>{const label=element('span',r.name);label.style.color=r.name.includes('ศัตรู')?'#922337':'#196f45';wrap.append(label);});relations.append(wrap);});grid.append(relations);}
 });
 const tableRoot=$('#kala-yams');tableRoot.replaceChildren();
 table.forEach((entries,i)=>{
 const section=element('section');section.append(element('h3',i?'กลางคืน':'กลางวัน'));
 entries.forEach(entry=>{const button=element('button',`${entry.range}  ·  ${entry.number}`,'yam-slot');button.type='button';const selected=entry.period===active.period&&entry.slot===active.slot;button.setAttribute('aria-pressed',String(selected));if(selected)button.classList.add('active');if(entry.period===yam.period&&entry.slot===yam.slot)button.title='ยามตามเวลาที่ระบุ';button.onclick=()=>{live=false;chosen=entry;paint();};section.append(button);});tableRoot.append(section);
 });
 const taksaGrid=$('#kala-taksa');taksaGrid.replaceChildren();
 [1,2,3,6,null,4,8,5,7].forEach(n=>{const cell=element('div',undefined,'taksa-cell');if(n){cell.append(element('span',taksa[n]),element('strong',String(n)));if(n===calendar.seeds.day)cell.classList.add('active');}taksaGrid.append(cell);});
}
async function refresh(){const ticket=++request;try{const input=live?nowInput():readInput();if(live)setInput(input);const value=await kalaAt(input);if(ticket!==request)return;current=value;chosen=null;$('#kala-error').textContent='';paint();}catch(e){if(ticket===request){$('#kala-error').textContent=e.message;$('#kala-chart').replaceChildren();$('#kala-yams').replaceChildren();$('#kala-taksa').replaceChildren();$('#kala-summary').textContent='';}}}
export function enterKala(){if(!current||live)refresh();}
$('#kala-form').addEventListener('submit',e=>{e.preventDefault();live=false;refresh();});
$('#kala-form').addEventListener('change',()=>{live=false;refresh();});
$('#kala-now').onclick=()=>{live=true;refresh();};
setInterval(()=>{if(live&&$('#view-kala').classList.contains('is-active'))refresh();},60000);
