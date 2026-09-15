import {buildPdfFromJpegBytes} from './export-engine.js';
import {HOUSE_NAMES} from './chart-engine.js';
import {markerFor} from './kala-engine.js';
import {buildRelationColumns} from './relation-engine.js';
import {houseAppearance,isSpecialResult} from './selection-engine.js';
export async function kalaCanvas(state,active){
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1190;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('ไม่สามารถสร้างภาพได้');
 const text=(s,x,y,size=20,color='#24314f',bold=false,align='left',max=1900)=>{ctx.font=`${bold?700:400} ${size}px Sarabun, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y,max);};
 const box=(x,y,w,h,fill='#fff',stroke='#ccd6e5')=>{ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();};
 const dot=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 ctx.fillStyle='#fff';ctx.fillRect(0,0,2000,1190);
 text('โยราศาสตร์ วิทยา · กาลชะตา',30,38,30,'#24314f',true);
 const i=state.input,cal=state.calendar;
 text(`วันที่ ${i.day}/${i.month}/${i.yearBe} เวลา ${i.time} น. · ประเทศไทย · วัน${cal.weekday.name} ปี${cal.zodiac.name} · รหัส ${Object.values(cal.seeds).join('-')}`,30,80,22);
 text(`เลขยาม ${active.number} · ${active.period==='day'?'กลางวัน':'กลางคืน'} · ยามลำดับ ${active.slot+1}${active.subperiod!==undefined?' · ยาม'+['ต้น','กลาง','ปลาย'][active.subperiod]:' · เลือกยามด้วยตนเอง'}${cal.shifted?' · ใช้วันก่อนหน้า '+cal.effectiveDate:''}`,30,115,21);
 const top=155,major=110,minor=55,gap=8,relationH=50,chartWidth=1480;
 const rowHeights=[major,major,major,major,minor,minor,minor,major,major];
 const bottom=top+rowHeights.reduce((a,b)=>a+b,0)+8*gap+relationH;
 const w=(chartWidth-80)/7;
 let y=top;
 state.chart.bases.forEach((values,index)=>{
 const base=index+1,h=rowHeights[index];box(30,y,65,h,'#eef1f5');text(`ฐาน ${base}`,62,y+h/2,18,'#7b8ba3',false,'center',60);
 values.forEach((value,c)=>{
 const x=105+c*w,cw=w-8,linked=base===4?state.chart.bases[2][c]===active.number:value===active.number;
 if(base<5||base>7||linked)box(x,y,cw,h,linked?'#fff4cc':'#fff',linked?'#ca922d':'#ccd6e5');
 const center=x+cw/2,ny=y+h/2+(base===4?-12:10),marker=markerFor(base,c+1,value,state.taksa);
 if(marker.kind&&!(base>=5&&base<=7)){
 ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=marker.kind==='kali'?'#d22332':'#1e9b4c';ctx.beginPath();
 if(marker.kind==='kali'){ctx.moveTo(center,ny-25);ctx.lineTo(center+25,ny+22);ctx.lineTo(center-25,ny+22);ctx.closePath();ctx.fill();}else ctx.fillRect(center-22,ny-22,44,44);ctx.restore();
 if(marker.ring){ctx.beginPath();ctx.arc(center,ny,31,0,Math.PI*2);ctx.strokeStyle=marker.kind==='kali'?'#a51d30':'#176b3b';ctx.lineWidth=2;ctx.stroke();}
 }
 if(state.selectedMeaning?.keys.includes(`${base}:${c+1}`)){for(const r of [38,44]){ctx.beginPath();ctx.arc(center,ny,r,0,Math.PI*2);ctx.strokeStyle='#6541a5';ctx.lineWidth=2;ctx.stroke();}}
 if(base!==4&&!(base>=5&&base<=7)){const a=houseAppearance(base,c+1);text(HOUSE_NAMES[base]?.[c]||'',center,y+25,19,a.color,a.weight===700,'center',cw-12);}
 text(value,center,base>=5&&base<=7?y+h/2:ny,base>=5&&base<=7?17:34,'#24314f',!(base>=5&&base<=7),'center');
 if(base===4)text(state.chart.base4Names[c],center,y+h-26,18,isSpecialResult(value)?'#946300':'#111',isSpecialResult(value),'center',cw-12);
 if(active.subperiod!==undefined&&base===active.subperiod+1&&value===active.number)dot(x+13,y+13,6,'#b78613');
 });
 y+=h+(index<8?gap:0);
 if(base===3){buildRelationColumns(state.chart).forEach((col,c)=>text(col.relations.map(r=>r.name).join(' / '),105+c*w+(w-8)/2,y+relationH/2,17,col.relations.some(r=>r.name.includes('ศัตรู'))?'#922337':'#196f45',false,'center',w-12));y+=relationH;}
 });
 const sx=1530,sw=440;text('ยามอัฐกาล',sx,top+15,26,'#24314f',true);
 state.table.forEach((entries,p)=>{const x=sx+p*225;text(p?'กลางคืน':'กลางวัน',x+104,top+55,22,'#24314f',true,'center');entries.forEach(e=>{const yy=top+80+e.slot*54,selected=e.period===active.period&&e.slot===active.slot;box(x,yy,210,46,selected?'#e1efff':'#fff',selected?'#295f9b':'#ccd6e5');text(`${e.range} · ${e.number}`,x+105,yy+23,19,'#24314f',selected,'center',200);});});
 const th=95,ty=bottom-3*th-16;text('ทักษา',sx,ty-25,26,'#24314f',true);
 [1,2,3,6,null,4,8,5,7].forEach((n,index)=>{if(!n)return;const x=sx+(index%3)*150,yy=ty+Math.floor(index/3)*(th+8),label=state.taksa[n],fill=label==='ศรี'?'#d7efdc':label==='กาลี'?'#f8dce0':n===cal.seeds.day?'#e1efff':'#fff';box(x,yy,140,th,fill);text(label,x+70,yy+25,20,'#24314f',false,'center');text(n,x+70,yy+64,32,'#24314f',true,'center');});
 if(state.selectedMeaning)text('ความหมายตามภพ: '+state.selectedMeaning.text,30,1135,19,'#6541a5');
 text('โยราศาสตร์ วิทยา · V1.15',1970,1165,16,'#8c99ab',false,'right');
 return canvas;
}
export async function exportKala(state,active,format){
 const canvas=await kalaCanvas(state,active);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('สร้างภาพไม่สำเร็จ')),format==='pdf'?'image/jpeg':'image/png',.95));
 const result=format==='pdf'?new Blob([buildPdfFromJpegBytes(new Uint8Array(await blob.arrayBuffer()),canvas.width,canvas.height)],{type:'application/pdf'}):blob;
 const url=URL.createObjectURL(result),a=document.createElement('a');a.href=url;a.download=`กาลชะตา-${state.input.yearBe}-${state.input.month}-${state.input.day}-${state.input.time.replace(':','')}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
