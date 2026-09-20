(()=>{
const KEY='kantong-bersama-v1',$=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),
dailyCats=['Makan & minum','Parkir'],
recurringCats=['Kos','Bensin','Jajan','Hiburan','Servis kendaraan','Internet','Laundry','Belanja kebutuhan pribadi','Langganan'],
getAllCats=()=>[...dailyCats,...(db.customCategories?.daily||[]),...recurringCats,...(db.customCategories?.recurring||[])],
incomeSources=['Gaji','Uang Saku','Uang Orang Tua','Bonus','Freelance','Hadiah'],
TRANSFER_SOURCES=['Tabungan Bulanan','Tabungan Bulanan (Auto)','Tarik Tabungan'],
fmt=n=>'Rp'+Math.abs(Math.round(n||0)).toLocaleString('id-ID'),
fmtSigned=n=>(n<0?'−':'')+fmt(n),
fmtShort=n=>{let a=Math.abs(n||0);if(a>=1e9)return 'Rp'+(a/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M';if(a>=1e6)return 'Rp'+(a/1e6).toLocaleString('id-ID',{maximumFractionDigits:2})+' jt';if(a>=1e4)return 'Rp'+Math.round(a/1e3).toLocaleString('id-ID')+' rb';return fmt(a)},
esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
isTransferCat=c=>false, // fitur tabungan terpisah sudah dihapus (v36)
isTransferIncome=x=>false,
isLight=()=>document.documentElement.getAttribute('data-theme')==='light',
icon=name=>'<svg class="i"><use href="#i-'+name+'"/></svg>';

const EMOJI={'Makan & minum':'🍜','Parkir':'🅿️','Jajan':'🧋','Kos':'🏠','Bensin':'⛽','Servis kendaraan':'🔧','Internet':'📶','Laundry':'🧺','Belanja kebutuhan pribadi':'🛍️','Langganan':'📺','Hiburan':'🎬','Tabungan':'🐷','Tarik Tabungan':'💸','Jajan / hiburan':'🎮','Nongkrong / jajan':'☕',
  'Gaji':'💼','Uang Saku':'👛','Uang Orang Tua':'🤲','Bonus':'🎁','Freelance':'💻','Hadiah':'🎉','Tabungan Bulanan':'🐷','Tabungan Bulanan (Auto)':'🐷'};
const TONES=['violet','blue','amber','pink','teal','red','green'];
const CAT_TONE={'Makan & minum':'amber','Parkir':'blue','Jajan':'pink','Kos':'violet','Bensin':'red','Servis kendaraan':'teal','Internet':'blue','Laundry':'teal','Belanja kebutuhan pribadi':'pink','Langganan':'violet','Hiburan':'red','Cicilan':'red','Kirim keluarga':'green',
  'Gaji':'green','Uang Saku':'green','Uang Orang Tua':'green','Bonus':'green','Freelance':'green','Hadiah':'green'};
const toneOf=name=>{if(CAT_TONE[name])return CAT_TONE[name];let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return TONES[h%TONES.length]};
const emojiOf=(name,income)=>EMOJI[name]||(income?'💰':'🏷️');
// Ikon garis seragam untuk kategori (emoji tetap dipakai di teks & kartu rekap)
const CAT_ICON={'Makan & minum':'food','Parkir':'parking','Jajan':'cup','Kos':'home','Bensin':'fuel','Servis kendaraan':'wrench','Internet':'wifi','Laundry':'shirt','Belanja kebutuhan pribadi':'bag','Langganan':'play','Hiburan':'film','Cicilan':'card','Kirim keluarga':'heart','Tabungan':'piggy','Tarik Tabungan':'piggy',
  'Gaji':'briefcase','Uang Saku':'wallet2','Uang Orang Tua':'heart','Bonus':'gift','Freelance':'laptop','Hadiah':'gift'};
const CAT_ICON_RE=[[/makan|minum|resto|food|sarapan|kuliner|warteg/i,'food'],[/kopi|coffee|jajan|snack|boba|cemil/i,'cup'],[/parkir/i,'parking'],[/transport|ojek|ojol|grab|gojek|kereta|krl|bus|tol|travel|tiket/i,'bus'],[/bensin|bbm|fuel/i,'fuel'],[/servis|bengkel|motor|mobil|kendaraan/i,'wrench'],[/pulsa|internet|wifi|kuota/i,'wifi'],[/listrik|pln|token/i,'bolt'],[/\bair\b|pdam|galon/i,'drop'],[/kos|sewa|rumah|kontrak/i,'home'],[/sehat|obat|dokter|klinik|apotek|medis/i,'pill'],[/sekolah|kuliah|kursus|buku|pendidikan|les\b/i,'book'],[/hadiah|kado|gift|angpao/i,'gift'],[/donasi|sedekah|zakat|infa|amal|keluarga|ortu|orang tua/i,'heart'],[/baju|pakaian|fashion|sepatu|laundry/i,'shirt'],[/belanja|shopping|sayur|pasar|market|mart/i,'bag'],[/game|hiburan|nonton|film|konser|liburan/i,'film'],[/langganan|netflix|spotify|youtube|premium/i,'play'],[/cicil|kredit|paylater|utang|pinjam/i,'card'],[/hewan|kucing|anjing|pet/i,'paw'],[/olahraga|gym|futsal|badminton|fitness/i,'dumbbell'],[/rokok|vape/i,'smoke'],[/gaji|kerja|salary/i,'briefcase'],[/freelance|proyek|project|jualan|usaha|bisnis|dagang/i,'laptop'],[/bonus|thr/i,'gift'],[/tabung/i,'piggy'],[/investasi|saham|reksa|emas|crypto/i,'trend'],[/saku|uang|dompet/i,'wallet2']];
const iconKeyOf=(name,income)=>CAT_ICON[name]||(CAT_ICON_RE.find(([re])=>re.test(String(name||'')))||[])[1]||(income?'coins':'tag');
const catIcon=(name,income)=>'<svg class="ci" aria-hidden="true"><use href="#c-'+iconKeyOf(name,income)+'"/></svg>';
const catTag=(name,income)=>'<span class="ct"><span class="ct-ic t-'+(income?'green':toneOf(name))+'">'+catIcon(name,income)+'</span><span class="ct-t">'+esc(name)+'</span></span>';

let viewMonth=null,lastKind='daily';

// ---------- Toast (dengan opsi urungkan) ----------
let toastTimer=null;
function toast(message,undoFn){
  clearTimeout(toastTimer);
  $('#undoToastMsg').textContent=message;
  const btn=$('#undoBtn');
  if(undoFn){
    buzz();
    btn.classList.remove('hidden');
    btn.onclick=()=>{undoFn();render();$('#undoToast').classList.add('hidden');clearTimeout(toastTimer)};
  }else btn.classList.add('hidden');
  $('#undoToast').classList.remove('hidden');
  toastTimer=setTimeout(()=>$('#undoToast').classList.add('hidden'),undoFn?5000:2200);
}
const buzz=(ms=12)=>{try{if(navigator.vibrate&&(!navigator.userActivation||navigator.userActivation.hasBeenActive))navigator.vibrate(ms)}catch(e){}};
function flash(sel,msg,ms=1800){$(sel).textContent=msg;setTimeout(()=>{if($(sel).textContent===msg)$(sel).textContent=''},ms)}

// ---------- Tanggal ----------
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
day=()=>ymd(new Date()),
yesterday=()=>{let d=new Date();d.setDate(d.getDate()-1);return ymd(d)},
month=()=>day().slice(0,7),
MN_CACHE=new Map(),SD_CACHE=new Map(),
monthName=m=>{let v=MN_CACHE.get(m);if(v===undefined){v=new Date(m+'-01T12:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'});MN_CACHE.set(m,v)}return v},
shortDate=d=>{let v=SD_CACHE.get(d);if(v===undefined){v=new Date(d+'T12:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'});SD_CACHE.set(d,v)}return v},
dateLabel=d=>d===day()?'Hari ini':(d===yesterday()?'Kemarin':new Date(d+'T12:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short'}));

// ---------- Data ----------
// v36: semua dompet digabung jadi 1 saldo, fitur tabungan terpisah dihapus.
// Pasangan transaksi setor/tarik tabungan dihapus; efek bersihnya dipindah ke saldo awal sehingga total uang tidak berubah.
const isOldSavingsExpense=x=>(x.category==='Tabungan'&&(x.method&&x.method!=='Tabungan')&&/^(Tabungan bulanan|Auto-tabung surplus)/i.test(x.note||''))||(x.category==='Tarik Tabungan'&&x.method==='Tabungan');
const isOldSavingsIncome=x=>x.method==='Tabungan'||(x.source==='Tarik Tabungan'&&x.method&&x.method!=='Tabungan');
function singleBalanceMigration(d){
  const keys=Object.keys(d.methodBalances);
  const tExp=d.expenses.filter(isOldSavingsExpense),tInc=d.incomes.filter(isOldSavingsIncome);
  const needs=tExp.length||tInc.length||keys.some(k=>k!=='Utama')||Number(d.profile&&d.profile.total)||d.autoSaveSurplus||d.savingsTarget;
  if(!needs)return;
  try{if(!localStorage.getItem('cmoneytracker-backup-pre-v36'))localStorage.setItem('cmoneytracker-backup-pre-v36',localStorage.getItem(KEY)||'')}catch(e){}
  const sum=a=>a.reduce((t,x)=>t+Number(x.amount||0),0);
  let opening=Object.values(d.methodBalances).reduce((t,v)=>t+(Number(v)||0),0)+Number((d.profile&&d.profile.total)||0)+sum(tInc)-sum(tExp);
  d.methodBalances={Utama:opening};
  if(d.profile)d.profile.total=0;
  d.expenses=d.expenses.filter(x=>!isOldSavingsExpense(x));
  d.incomes=d.incomes.filter(x=>!isOldSavingsIncome(x));
  d.autoSaveSurplus=false;d.savingsTarget=0;
  try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}
}
function load(){
  let d;try{d=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){d={}}
  if(!d||typeof d!=='object')d={};
  d.expenses=Array.isArray(d.expenses)?d.expenses:[];
  d.incomes=Array.isArray(d.incomes)?d.incomes:[];
  d.history=Array.isArray(d.history)?d.history:(d.monthlyHistory||[]);
  d.categoryBudgets=(d.categoryBudgets&&typeof d.categoryBudgets==='object')?d.categoryBudgets:{};
  d.customCategories=(d.customCategories&&typeof d.customCategories==='object')?d.customCategories:{daily:[],recurring:[]};
  d.customCategories.daily=Array.isArray(d.customCategories.daily)?d.customCategories.daily:[];
  d.customCategories.recurring=Array.isArray(d.customCategories.recurring)?d.customCategories.recurring:[];
  d.methodBalances=(d.methodBalances&&typeof d.methodBalances==='object')?d.methodBalances:{};
  d.savingsTarget=Number(d.savingsTarget)||0;
  d.autoSaveSurplus=!!d.autoSaveSurplus;
  d.savingsSourceMethod=d.savingsSourceMethod||'';
  d.recurringTemplates=Array.isArray(d.recurringTemplates)?d.recurringTemplates:[];
  d.customMethods=Array.isArray(d.customMethods)?d.customMethods:[];
  d.disabledMethods=Array.isArray(d.disabledMethods)?d.disabledMethods:[];
  d.categoryClass=(d.categoryClass&&typeof d.categoryClass==='object')?d.categoryClass:{};
  d.debts=Array.isArray(d.debts)?d.debts:[];
  d.categoryPattern=(d.categoryPattern&&typeof d.categoryPattern==='object')?d.categoryPattern:{};
  d.logicDismiss=(d.logicDismiss&&typeof d.logicDismiss==='object')?d.logicDismiss:{};
  d.planSnap=(d.planSnap&&typeof d.planSnap==='object')?d.planSnap:{};
  d.homeLayout=(d.homeLayout&&typeof d.homeLayout==='object')?d.homeLayout:{};
  d.wishes=Array.isArray(d.wishes)?d.wishes:[];
  d.challenges=Array.isArray(d.challenges)?d.challenges:[];
  d.events=Array.isArray(d.events)?d.events:[];
  d.badges=(d.badges&&typeof d.badges==='object')?d.badges:{};
  d.payday=Math.min(31,Math.max(0,Number(d.payday)||0));
  d.monthlyBudget=Number(d.monthlyBudget)||0;
  if(d.profile&&!d.profile.total&&d.profile.total!==0)d.profile.total=Number(d.profile.monthly)||0;
  d.expenses=d.expenses.map(x=>({...x,id:String(x.id),type:x.type||(dailyCats.includes(x.category)||x.category==='Jajan / hiburan'||x.category==='Nongkrong / jajan'?'daily':'recurring')}));
  // Jajan dipindah ke Berkala (biasanya seminggu sekali, bukan tiap hari)
  d.expenses.forEach(x=>{if(x.category==='Jajan'&&x.type==='daily')x.type='recurring'});
  d.incomes=d.incomes.map(x=>({...x,id:String(x.id)}));
  singleBalanceMigration(d);
  return d;
}
let db=load();
let storageWarned=false;
function warnStorageFailure(){
  if(storageWarned)return;
  storageWarned=true;
  alert('Penyimpanan browser tidak bisa diakses (mungkin mode Incognito/Privat, atau penyimpanan penuh). Perubahan mungkin tidak tersimpan setelah halaman ditutup.');
}
// memo per render: hasil hitungan berat dipakai ulang sampai data berubah
let MEMO=new Map();
const memo=(k,f)=>{if(!MEMO.has(k))MEMO.set(k,f());return MEMO.get(k)};
const save=()=>{
  MEMO=new Map();
  try{localStorage.setItem(KEY,JSON.stringify(db));return true}
  catch(e){warnStorageFailure();return false}
};
const newId=()=>String(Date.now())+Math.random().toString(36).slice(2,5);

function archive(){
  if(!db.profile)return;
  // satu kali lintasan data; hanya disimpan kalau ada yang berubah
  const current=month(),G={};
  const grp=m=>G[m]||(G[m]={spent:0,income:0,detail:{}});
  db.expenses.forEach(x=>{const m=x.date.slice(0,7);if(m>=current)return;const g=grp(m);if(isTransferCat(x.category))return;const a=Number(x.amount||0);g.spent+=a;g.detail[x.category]=(g.detail[x.category]||0)+a});
  db.incomes.forEach(x=>{const m=x.date.slice(0,7);if(m>=current)return;grp(m).income+=Number(x.amount||0)});
  const byMonth=new Map(db.history.map(h=>[h.month,h]));
  let changed=false;
  Object.entries(G).forEach(([m,g])=>{
    const rec={month:m,spent:g.spent,income:g.income,net:g.income-g.spent,detail:g.detail},old=byMonth.get(m);
    if(!old){db.history.push(rec);changed=true}
    else if(old.spent!==rec.spent||old.income!==rec.income||old.net!==rec.net||JSON.stringify(old.detail)!==JSON.stringify(rec.detail)){Object.assign(old,rec);changed=true}
  });
  const before=db.history.map(h=>h.month).join();
  db.history.sort((a,b)=>b.month.localeCompare(a.month));
  if(changed||before!==db.history.map(h=>h.month).join())save();
}

// ---------- Baris transaksi ----------
function tagged(){
  return [...db.expenses.map(x=>({...x,kind:'expense'})),...db.incomes.map(x=>({...x,kind:'income'}))]
    .sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)));
}
function txRow(x,showDate=false){
  const inc=x.kind==='income',label=inc?x.source:x.category;
  const tone=inc?'green':toneOf(label);
  const typeLbl=inc?'Pemasukan':(x.spread?'Sesekali':x.type==='daily'?'Harian':'Berkala');
  const sub=[showDate?dateLabel(x.date):null,x.note||null].filter(Boolean).map(esc).join(' · ');
  return '<button class="tx" data-open="'+x.kind+'" data-id="'+esc(x.id)+'"><span class="tx-ico t-'+tone+'">'+catIcon(label,inc)+'</span>'
    +'<span class="tx-main"><span class="tx-title">'+esc(label)+'</span>'+(sub?'<span class="tx-sub">'+sub+'</span>':'')+'</span>'
    +'<span class="tx-amt num'+(inc?' in':'')+'">'+(inc?'+':'−')+fmt(x.amount)+'<small>'+typeLbl+'</small></span></button>';
}
const emptyBox=(emoji,text)=>'<p class="empty"><span class="em">'+emoji+'</span>'+text+'</p>';
function groupedList(items){
  if(!items.length)return '<div class="tx-list">'+emptyBox('🧾','Belum ada transaksi yang cocok.')+'</div>';
  let groups={},order=[];
  items.forEach(x=>{if(!groups[x.date]){groups[x.date]=[];order.push(x.date)}groups[x.date].push(x)});
  return order.map(d=>{
    let xs=groups[d],net=xs.reduce((s,x)=>s+(x.kind==='income'?1:-1)*Number(x.amount||0),0);
    return '<div class="day-head"><span>'+dateLabel(d)+'</span><span class="num">'+(net>=0?'+':'−')+fmt(net)+'</span></div><div class="tx-list">'+xs.map(x=>txRow(x)).join('')+'</div>';
  }).join('');
}

// ---------- Grafik ----------
const pieColors=['#9b7cff','#3B82F6','#34D399','#FBBF24','#F472B6','#2DD4BF','#F87171'];
const cssVar=(n,f)=>(getComputedStyle(document.documentElement).getPropertyValue(n)||'').trim()||f;
function roundBar(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h);
  ctx.beginPath();
  ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();
}
function prepCanvas(canvas,cssH,fixedW){
  const dpr=window.devicePixelRatio||1;
  const cssW=fixedW||canvas.clientWidth||320;
  canvas.width=cssW*dpr;canvas.height=cssH*dpr;
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssW,cssH);
  return {ctx,cssW};
}
function renderCategoryPie(monthly){
  let totals={};
  monthly.forEach(x=>totals[x.category]=(totals[x.category]||0)+Number(x.amount||0));
  let entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  let top=entries.slice(0,6);
  let restSum=entries.slice(6).reduce((s,[,v])=>s+v,0);
  if(restSum>0)top.push(['Lainnya',restSum]);
  let total=top.reduce((s,[,v])=>s+v,0);
  const size=150,{ctx}=prepCanvas($('#categoryPieChart'),size,size);
  $('#pieTotal').textContent=fmtShort(total);
  let cx=size/2,cy=size/2,outerR=size/2-3,innerR=outerR*0.66,start=-Math.PI/2;
  if(!total){
    ctx.beginPath();ctx.arc(cx,cy,outerR,0,Math.PI*2);ctx.arc(cx,cy,innerR,Math.PI*2,0,true);
    ctx.fillStyle=isLight()?'#e4e0f0':'#282342';ctx.fill();
    $('#categoryPieLegend').innerHTML='<p class="empty" style="padding:8px">Belum ada pengeluaran bulan ini.</p>';
    return;
  }
  const gap=top.length>1?0.03:0;
  const pc=[cssVar('--accent','#9b7cff'),...pieColors.slice(1)];
  top.forEach(([cat,val],i)=>{
    let slice=(val/total)*Math.PI*2;
    ctx.beginPath();
    ctx.arc(cx,cy,outerR,start+gap/2,start+slice-gap/2);
    ctx.arc(cx,cy,innerR,start+slice-gap/2,start+gap/2,true);
    ctx.closePath();
    ctx.fillStyle=pc[i%pc.length];
    ctx.fill();
    start+=slice;
  });
  $('#categoryPieLegend').innerHTML=top.map(([cat,val],i)=>{
    let pct=Math.round(val/total*100);
    return '<div data-cat-detail="'+esc(cat)+'" style="display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0;cursor:pointer"><span style="width:10px;height:10px;border-radius:4px;background:'+pc[i%pc.length]+';flex-shrink:0"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(cat)+'</span><b class="num">'+pct+'%</b></div>';
  }).join('');
}
function renderCategoryBreakdown(monthly){
  let totals={};
  monthly.forEach(x=>totals[x.category]=(totals[x.category]||0)+Number(x.amount||0));
  let entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){$('#categoryBreakdown').innerHTML='';return}
  let caps=db.categoryBudgets||{};
  $('#categoryBreakdown').innerHTML='<div style="border-top:1px solid var(--line);margin-top:10px"></div>'+entries.map(([cat,amt])=>{
    let cap=caps[cat],over=cap&&amt>cap;
    let pct=cap?Math.min(100,Math.round(amt/cap*100)):Math.max(4,Math.round(amt/entries[0][1]*100));
    const m=lastAnalysis&&lastAnalysis.CM[cat];
    const projTxt=m&&m.pattern==='spread'&&m.proj>amt*1.02?' · proyeksi '+fmt(m.proj):m&&m.pattern==='lump'?' · bulanan':'';
    return '<div class="bar-row tap" data-cat-detail="'+esc(cat)+'"><div class="bar-top"><span>'+catTag(cat)+'</span><b class="num">'+fmt(amt)+'</b></div><div class="bar-track"><div class="bar-fill'+(over?' over':'')+'" style="width:'+pct+'%"></div></div><div class="bar-cap'+(over?' over':'')+'">'+(cap?(over?'Lewat '+fmt(amt-cap)+' dari batas ':Math.round(amt/cap*100)+'% dari batas ')+fmt(cap):'Tanpa batas')+projTxt+'</div></div>';
  }).join('');
}
function renderSimpleBars(el,entries,cls,emptyText,labelFn){
  if(!entries.length){$(el).innerHTML=emptyBox('📭',emptyText);return}
  let max=entries[0][1];
  $(el).innerHTML=entries.map(([k,v])=>{
    let pct=Math.max(4,Math.round(v/max*100));
    return '<div class="bar-row"><div class="bar-top"><span>'+labelFn(k)+'</span><b class="num">'+fmt(v)+'</b></div><div class="bar-track"><div class="bar-fill '+cls+'" style="width:'+pct+'%"></div></div></div>';
  }).join('');
}
function renderIncomeBreakdown(list){
  let totals={};
  list.forEach(x=>totals[x.source]=(totals[x.source]||0)+Number(x.amount||0));
  renderSimpleBars('#incomeBreakdown',Object.entries(totals).sort((a,b)=>b[1]-a[1]),'green','Belum ada pemasukan bulan ini.',k=>catTag(k,true));
}
function renderHeatmap(monthlySpend,mon){
  let daysInMonth=new Date(Number(mon.slice(0,4)),Number(mon.slice(5,7)),0).getDate();
  let sums=new Array(daysInMonth+1).fill(0);
  monthlySpend.forEach(x=>{let d=Number(x.date.slice(8,10));if(d>=1&&d<=daysInMonth)sums[d]+=Number(x.amount||0)});
  let max=Math.max(...sums,1);
  let firstDow=new Date(Number(mon.slice(0,4)),Number(mon.slice(5,7))-1,1).getDay();
  let todayNum=Number(day().slice(8,10));
  let isCurMonth=mon===month();
  let cells='';
  for(let i=0;i<firstDow;i++)cells+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    let val=sums[d],intensity=val/max;
    let bg=val===0?'var(--surface-2)':'rgba(123,94,250,'+(0.2+intensity*0.8).toFixed(2)+')';
    let ring=(isCurMonth&&d===todayNum)?'box-shadow:inset 0 0 0 2px var(--amber);':'';
    cells+='<div data-heat="'+d+' '+monthName(mon)+': '+fmt(val)+'" style="aspect-ratio:1;border-radius:9px;background:'+bg+';'+ring+'font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;color:'+(intensity>0.5?'#fff':'var(--muted)')+'">'+d+'</div>';
  }
  $('#spendHeatmap').innerHTML=cells;
}
function renderTrend(monthly){
  const canvas=$('#trendChart'),cssH=160,{ctx,cssW}=prepCanvas(canvas,cssH);
  const mon=month();
  const daysInMonth=new Date(Number(mon.slice(0,4)),Number(mon.slice(5,7)),0).getDate();
  let sums=new Array(daysInMonth).fill(0);
  monthly.forEach(x=>{let d=Number(x.date.slice(8,10));if(d>=1&&d<=daysInMonth)sums[d-1]+=Number(x.amount||0)});
  let max=Math.max(...sums,1);
  let todayNum=Number(day().slice(8,10));
  let baseline=cssH-20,plotH=cssH-30;
  let barW=cssW/daysInMonth;
  const light=isLight();
  const grad=ctx.createLinearGradient(0,baseline-plotH,0,baseline);
  grad.addColorStop(0,cssVar('--accent','#9b7cff'));grad.addColorStop(1,cssVar('--brand','#5333e6'));
  const dim=cssVar('--accent','#9b7cff');
  sums.forEach((v,i)=>{
    let h=Math.max((v/max)*plotH,2),w=Math.max(barW*0.62,2),x=i*barW+(barW-w)/2;
    ctx.fillStyle=(i+1)===todayNum?grad:dim;
    ctx.globalAlpha=(i+1)===todayNum?1:(light?.28:.35);
    roundBar(ctx,x,baseline-h,w,h,3);
    ctx.globalAlpha=1;
  });
  ctx.fillStyle=light?'#a19db4':'#5c5584';
  ctx.font='600 10px "Archivo", sans-serif';
  ctx.textAlign='left';ctx.fillText('1',2,cssH-4);
  ctx.textAlign='center';ctx.fillText('15',barW*14.5,cssH-4);
  ctx.textAlign='right';ctx.fillText(String(daysInMonth),cssW-2,cssH-4);
  ctx.textAlign='left';
  let peak=Math.max(...sums),peakDay=sums.indexOf(peak)+1;
  canvas.setAttribute('aria-label','Grafik pengeluaran harian bulan ini. Tertinggi tanggal '+peakDay+' sebesar '+fmt(peak)+'. Total bulan ini '+fmt(sums.reduce((a,b)=>a+b,0))+'.');
}
function last12Months(){
  let arr=[],now=new Date();
  for(let i=11;i>=0;i--){
    let dt=new Date(now.getFullYear(),now.getMonth()-i,1);
    arr.push(dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'));
  }
  return arr;
}
function renderYearlyComparison(){
  const canvas=$('#yearlyChart'),cssH=170,{ctx,cssW}=prepCanvas(canvas,cssH);
  const months=last12Months();
  const data=months.map(m=>({
    m,
    inc:db.incomes.filter(x=>x.date.startsWith(m)&&!isTransferIncome(x)).reduce((s,x)=>s+Number(x.amount||0),0),
    exp:db.expenses.filter(x=>x.date.startsWith(m)&&!isTransferCat(x.category)).reduce((s,x)=>s+Number(x.amount||0),0)
  }));
  const max=Math.max(...data.map(d=>Math.max(d.inc,d.exp)),1);
  const baseline=cssH-20,plotH=cssH-32,groupW=cssW/12,barW=Math.max(Math.min(groupW*0.28,10),3);
  const monthAbbr=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const light=isLight(),curMonth=month();
  ctx.textAlign='center';
  data.forEach((d,i)=>{
    let gx=i*groupW;
    if(d.m===curMonth){
      ctx.fillStyle=light?'rgba(108,78,248,.07)':'rgba(155,124,255,.09)';
      roundBar(ctx,gx+1,2,groupW-2,cssH-4,8);
    }
    let incH=Math.max((d.inc/max)*plotH,d.inc?2:0),expH=Math.max((d.exp/max)*plotH,d.exp?2:0);
    ctx.fillStyle='#34D399';
    if(incH)roundBar(ctx,gx+groupW/2-barW-1,baseline-incH,barW,incH,3);
    ctx.fillStyle=cssVar('--accent','#9b7cff');
    if(expH)roundBar(ctx,gx+groupW/2+1,baseline-expH,barW,expH,3);
    ctx.fillStyle=d.m===curMonth?(light?'#201e1d':'#f4f2ff'):(light?'#a19db4':'#5c5584');
    ctx.font='600 9.5px "Archivo", sans-serif';
    ctx.fillText(monthAbbr[Number(d.m.slice(5,7))-1],gx+groupW/2,cssH-5);
  });
  ctx.textAlign='left';
  let totalInc=data.reduce((s,d)=>s+d.inc,0),totalExp=data.reduce((s,d)=>s+d.exp,0);
  canvas.setAttribute('aria-label','Grafik perbandingan pemasukan dan pengeluaran 12 bulan terakhir. Total pemasukan '+fmt(totalInc)+', total pengeluaran '+fmt(totalExp)+'.');
}
function renderCharts(){
  db=load();
  const mon=month();
  const spend=db.expenses.filter(x=>x.date.startsWith(mon)&&!isTransferCat(x.category));
  renderTrend(spend);
  renderYearlyComparison();
  renderCategoryPie(spend);
}

// ---------- Saldo tunggal ----------
function getSaldo(){
  const initial=Object.values(db.methodBalances||{}).reduce((t,v)=>t+(Number(v)||0),0)+Number((db.profile&&db.profile.total)||0);
  return initial+db.incomes.reduce((t,x)=>t+Number(x.amount||0),0)-db.expenses.reduce((t,x)=>t+Number(x.amount||0),0)+debtCashEffect();
}
function renderBalancePage(){
  const s=getSaldo();
  $('#balanceNow').textContent=fmtSigned(s);
  $('#balanceNow').style.color=s<0?'var(--red)':'';
  if(document.activeElement!==$('#balanceInput'))$('#balanceInput').value=s;
}

// ---------- Tagihan berkala ----------
// Tagihan/langganan: bulanan (default) atau tahunan (cycle:'yearly', month:1-12)
const tplYearly=t=>t.cycle==='yearly';
const tplPosted=t=>t.skip===(tplYearly(t)?day().slice(0,4):month())||db.expenses.some(x=>x.templateId===t.id&&x.date.startsWith(tplYearly(t)?day().slice(0,4):month()));
const tplDueThisMonth=t=>!tplYearly(t)||Number(t.month)===Number(day().slice(5,7));
const pendingTemplates=()=>(db.recurringTemplates||[]).filter(t=>tplDueThisMonth(t)&&!tplPosted(t));
// eslint-disable-next-line no-unused-vars -- dipakai modul lain setelah digabung oleh scripts/build.mjs
const tplMonthly=t=>tplYearly(t)?Number(t.amount||0)/12:Number(t.amount||0);
// eslint-disable-next-line no-unused-vars -- dipakai modul lain setelah digabung oleh scripts/build.mjs
function tplUpcoming(t,until){
  // tanggal jatuh tempo berikutnya yang belum tercatat, sebelum 'until'
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),out=[];
  const mk=(yy,mm)=>ymd(new Date(yy,mm,Math.min(Number(t.dayOfMonth)||1,new Date(yy,mm+1,0).getDate())));
  if(tplYearly(t)){
    const tm=Number(t.month)-1;
    let d=mk(y,tm);
    if(tplPosted(t)||d<day())d=mk(y+1,tm);
    if(d<until)out.push(d);
  }else{
    for(let k=0;k<3;k++){
      const d=mk(y,m+k);
      if(k===0&&(tplPosted(t)||d<day()))continue;
      if(d<until)out.push(d);
    }
  }
  return out;
}
function renderRecurringTemplates(){
  let templates=(db.recurringTemplates||[]).filter(t=>t.kind!=='sub');
  $('#recurringTemplateList').innerHTML=templates.length?templates.map(t=>{
    let posted=tplPosted(t);
    return '<button class="tx" data-rt-delete="'+esc(t.id)+'"><span class="tx-ico t-'+toneOf(t.category)+'">'+catIcon(t.category)+'</span><span class="tx-main"><span class="tx-title">'+esc(t.category)+'</span><span class="tx-sub">Tiap tgl '+t.dayOfMonth+(t.note?' · '+esc(t.note):'')+'</span></span><span class="tx-amt num">'+fmt(t.amount)+'<small style="color:'+(posted?'var(--green)':'var(--faint)')+'">'+(posted?'✓ Sudah bulan ini':'Belum bulan ini')+'</small></span></button>';
  }).join(''):emptyBox('🗓️','Belum ada tagihan otomatis.');
  $('#menuBillsMeta').textContent=templates.length?templates.length+' aktif':'';

  let catSel=$('#rtCategory'),prevCat=catSel.value;
  let cats=[...recurringCats,...(db.customCategories?.recurring||[])];
  catSel.innerHTML=cats.map(c=>'<option>'+esc(c)+'</option>').join('');
  catSel.value=cats.includes(prevCat)?prevCat:cats[0];
}
$('#addRecurringTemplate').onclick=()=>{
  let amount=Number($('#rtAmount').value),dayOfMonth=Number($('#rtDay').value);
  if(amount<=0){flash('#rtStatus','Masukkan nominal lebih dari Rp0.');return}
  if(!dayOfMonth||dayOfMonth<1||dayOfMonth>28){flash('#rtStatus','Tanggal harus 1-28.');return}
  db=load();
  db.recurringTemplates.push({id:String(Date.now()),category:$('#rtCategory').value,amount,dayOfMonth,note:$('#rtNote').value.trim()});
  save();
  $('#rtAmount').value='';$('#rtDay').value='';$('#rtNote').value='';
  render();
  toast('Tagihan otomatis ditambahkan.');
};
function runRecurringTemplates(){
  let templates=db.recurringTemplates||[];
  if(!templates.length)return;
  let todayNum=Number(day().slice(8,10)),curMonth=month(),changed=false;
  templates.forEach(t=>{
    if(!tplDueThisMonth(t)||tplPosted(t))return;
    const dom=Math.min(Number(t.dayOfMonth)||1,daysInMonthOf(curMonth));
    if(todayNum>=dom){
      db.expenses.push({id:newId(),date:day(),type:'recurring',category:t.category,note:(t.note?t.note+' ':'')+'(otomatis)',amount:t.amount,templateId:t.id});
      changed=true;
    }
  });
  if(changed)save();
}

// ---------- Target kategori ----------
function renderCategoryBudgetForm(){
  let caps=db.categoryBudgets||{};
  let active=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.catBudget:null;
  if(active)return;
  $('#categoryBudgetForm').innerHTML=getAllCats().map(c=>{
    const cls=classOf(c);
    const m=lastAnalysis&&lastAnalysis.CM[c];
    const hint=m&&m.validMonths?(m.pattern==='lump'?(m.avgWhenPaid?'biasanya '+fmtK(m.avgWhenPaid):''):(m.histAvg?'rata-rata '+fmtK(m.histAvg)+'/bln':'')):'';
    return '<div class="budget-row"><div style="min-width:0"><b data-cat-detail="'+esc(c)+'" style="cursor:pointer">'+catTag(c)+'</b><div class="row-chips"><button type="button" class="class-chip '+cls+'" data-class-toggle="'+esc(c)+'" data-val="'+cls+'">'+(cls==='need'?'Kebutuhan':'Keinginan')+'</button>'+patternChip(c,m)+'</div>'+(hint?'<small class="hint">'+hint+'</small>':'')+'</div>'
      +'<input class="input num" type="number" inputmode="numeric" min="0" step="10000" data-cat-budget="'+esc(c)+'" value="'+(caps[c]||'')+'" placeholder="Tanpa batas"></div>';
  }).join('');
}
$('#categoryBudgetForm').addEventListener('click',e=>{
  const b=e.target.closest('[data-class-toggle]');if(!b)return;
  const v=b.dataset.val==='need'?'want':'need';
  b.dataset.val=v;b.className='class-chip '+v;b.textContent=v==='need'?'Kebutuhan':'Keinginan';
});
// eslint-disable-next-line no-unused-vars -- dipakai modul lain setelah digabung oleh scripts/build.mjs
function persistBudgetForm(){
  if(!$('#categoryBudgetForm').children.length)return;
  let caps={};
  $$('[data-cat-budget]').forEach(inp=>{let v=Number(inp.value);if(v>0)caps[inp.dataset.catBudget]=v});
  db.categoryBudgets=caps;
  $$('[data-class-toggle]').forEach(b=>{
    const c=b.dataset.classToggle,v=b.dataset.val,def=NEED_DEFAULT.includes(c)?'need':'want';
    if(v===def)delete db.categoryClass[c];else db.categoryClass[c]=v;
  });
}
$('#saveCategoryBudgets').onclick=()=>{
  db=load();
  let caps={};
  $$('[data-cat-budget]').forEach(inp=>{let v=Number(inp.value);if(v>0)caps[inp.dataset.catBudget]=v});
  db.categoryBudgets=caps;
  $$('[data-class-toggle]').forEach(b=>{
    const c=b.dataset.classToggle,v=b.dataset.val,def=NEED_DEFAULT.includes(c)?'need':'want';
    if(v===def)delete db.categoryClass[c];else db.categoryClass[c]=v;
  });
  save();render();
  toast('Target & jenis kategori disimpan.');
};

// ---------- Analisis keuangan & saran ----------
const NEED_DEFAULT=['Makan & minum','Parkir','Kos','Bensin','Servis kendaraan','Internet','Laundry','Belanja kebutuhan pribadi'];
const classOf=c=>(db.categoryClass&&db.categoryClass[c])||(NEED_DEFAULT.includes(c)?'need':'want');
const sumAmt=xs=>xs.reduce((s,x)=>s+Number(x.amount||0),0);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(v,x0,x1,y0,y1)=>y0+(clamp(v,Math.min(x0,x1),Math.max(x0,x1))-x0)/(x1-x0)*(y1-y0);
const fmtPct=v=>(v===null||v===undefined||!isFinite(v))?'-':(Math.round(v*10)/10).toLocaleString('id-ID')+'%';
const fmtMonths=v=>(v===null||!isFinite(v))?'-':(Math.round(v*10)/10).toLocaleString('id-ID')+' bln';
const daysInMonthOf=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0).getDate();
const isHousing=c=>/\b(kos|kost|sewa|kontrak|kontrakan|kpr|rumah)\b/i.test(c);

// Pola kategori: 'spread' (sering, tersebar sepanjang bulan) atau 'lump' (dibayar sekali/sebulan, mis. kos)
const LUMP_DEFAULT=['Kos','Internet','Langganan','Servis kendaraan'];
const SPREAD_RECURRING=['Jajan','Bensin','Laundry','Belanja kebutuhan pribadi'];
function pastMonths(n){return Array.from({length:n},(_,k)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k-1);return ymd(d).slice(0,7)})}
function categoryModel(){return memo('cm',categoryModelRaw)}
function categoryModelRaw(){
  const now=day(),mon=month(),dim=daysInMonthOf(mon),de=Number(now.slice(8,10)),remaining=dim-de;
  const first=db.expenses.reduce((m,x)=>!m||x.date<m?x.date:m,null);
  const vm=pastMonths(3).filter(m=>first&&first.slice(0,7)<=m);
  const tplCats=new Set(pendingTemplates().map(t=>t.category));
  const cats=new Set(db.expenses.filter(x=>x.date.startsWith(mon)||vm.some(m=>x.date.startsWith(m))).map(x=>x.category));
  const M={};
  cats.forEach(c=>{
    const cur=db.expenses.filter(x=>x.category===c&&x.date.startsWith(mon));
    const spent=sumAmt(cur),oneOff=sumAmt(cur.filter(x=>x.spread));
    const hm=vm.map(m=>{const xs=db.expenses.filter(x=>x.category===c&&x.date.startsWith(m));return {m,sum:sumAmt(xs),n:xs.length,dim:daysInMonthOf(m)}});
    const paid=hm.filter(h=>h.sum>0);
    const histAvg=vm.length?hm.reduce((s,h)=>s+h.sum,0)/vm.length:0;
    const avgWhenPaid=paid.length?paid.reduce((s,h)=>s+h.sum,0)/paid.length:0;
    const avgCount=paid.length?paid.reduce((s,h)=>s+h.n,0)/paid.length:null;
    let pattern=(db.categoryPattern||{})[c]||null;const auto=!pattern;
    if(!pattern){
      if(avgCount!==null&&paid.length>=2)pattern=avgCount<=1.5?'lump':'spread';
      else if(LUMP_DEFAULT.includes(c))pattern='lump';
      else if(cur.length>=3)pattern='spread';
      else{
        const rec=recurringCats.includes(c)||(db.customCategories.recurring||[]).includes(c);
        pattern=rec&&!SPREAD_RECURRING.includes(c)?'lump':'spread';
      }
    }
    let proj=spent,left=0,rate=0,note;
    if(pattern==='lump'){
      const regular=vm.length>=2&&paid.length>=2&&(paid.length===vm.length||paid.length/vm.length>=0.75);
      if(spent>0){note=spent>avgWhenPaid*1.3&&avgWhenPaid>0?'lebih besar dari biasanya':'sudah dibayar'}
      else if(tplCats.has(c)){note='tagihan otomatis menunggu'}
      else if(regular){left=avgWhenPaid;proj=avgWhenPaid;note='biasanya dibayar ±'+fmt(avgWhenPaid)}
      else note=paid.length?'tidak rutin':'belum ada data';
    }else{
      const hr=paid.length?hm.reduce((s,h)=>s+h.sum/h.dim,0)/vm.length:null;
      const rc=(spent-oneOff)/Math.max(de,hr===null?5:1);
      const w=Math.min(1,de/dim*1.5);
      rate=hr===null?rc:rc*w+hr*(1-w);
      left=rate*remaining;proj=spent+left;
      note=remaining?'proyeksi ±'+fmt(rate)+'/hari':'bulan selesai';
    }
    M[c]={c,pattern,auto,spent,count:cur.length,histAvg,avgWhenPaid,avgCount,paidMonths:paid.length,validMonths:vm.length,proj,left,rate,note,hm,regular:pattern==='lump'&&left>0};
  });
  return M;
}
function analyzeFinance(){
  const now=day(),mon=month(),dim=daysInMonthOf(mon),de=Number(now.slice(8,10)),remaining=dim-de;
  const exps=db.expenses.filter(x=>x.date.startsWith(mon)&&!isTransferCat(x.category));
  const incs=db.incomes.filter(x=>x.date.startsWith(mon)&&!isTransferIncome(x));
  const income=sumAmt(incs),spend=sumAmt(exps);
  const dailySpend=sumAmt(exps.filter(x=>x.type==='daily')),recurSpend=spend-dailySpend;
  const catTotals={};exps.forEach(x=>catTotals[x.category]=(catTotals[x.category]||0)+Number(x.amount||0));
  const srcTotals={};incs.forEach(x=>srcTotals[x.source]=(srcTotals[x.source]||0)+Number(x.amount||0));
  const catSorted=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const CM=categoryModel();
  const avgDaily=Object.values(CM).reduce((s,m)=>s+m.rate,0);
  const pendingBills=pendingTemplates();
  const pendingBillsSum=sumAmt(pendingBills);
  const lumpDue=Object.values(CM).filter(m=>m.regular);
  const lumpDueSum=lumpDue.reduce((s,m)=>s+m.left,0);
  const projSpend=Object.values(CM).reduce((s,m)=>s+m.proj,0)+pendingBillsSum;
  const saldo=getSaldo();
  const projEndBalance=saldo-(projSpend-spend);

  const hist=db.history.slice(0,6),h3=hist.slice(0,3);
  const avgHistSpend=h3.length?h3.reduce((s,h)=>s+(h.spent||0),0)/h3.length:0;
  const avgHistIncome=h3.length?h3.reduce((s,h)=>s+(h.income||0),0)/h3.length:0;
  // acuan pemasukan: rata-rata riwayat, atau (untuk pengguna baru) pemasukan rutin dari panduan awal
  const refIncome=avgHistIncome>0?avgHistIncome:Number((db.profile&&db.profile.incomeMonthly)||0);
  const incomePending=refIncome>0&&income<refIncome*0.6&&remaining>0;
  const expectedIncome=incomePending?refIncome:income;
  const everIncome=db.incomes.some(x=>!isTransferIncome(x));

  // Tingkat menabung (proyeksi bulan ini, dipadukan dengan riwayat)
  const srMonth=expectedIncome>0?(expectedIncome-projSpend)/expectedIncome*100:null;
  const hInc=h3.reduce((s,h)=>s+(h.income||0),0),hNet=h3.reduce((s,h)=>s+((h.income||0)-(h.spent||0)),0);
  const srHist=hInc>0?hNet/hInc*100:null;
  const savingsRate=srMonth!==null?(srHist!==null?srMonth*0.6+srHist*0.4:srMonth):srHist;
  const projNet=expectedIncome-projSpend;

  // Dana cadangan
  const budget=Number(db.monthlyBudget||0);
  // bulan pertama (belum ada riwayat): proyeksi belum lengkap, jadi pakai anggaran sebagai batas bawah supaya tidak terlalu optimis
  const baseMonthlySpend=h3.length&&avgHistSpend>0?avgHistSpend:Math.max(projSpend,budget);
  const DS=debtSummary();
  const reserve=Math.max(0,projEndBalance-DS.iOwe);
  const coverage=baseMonthlySpend>0?reserve/baseMonthlySpend:null;

  // Komposisi kebutuhan vs keinginan (diproyeksikan ke akhir bulan)
  let needsProj=0,wantsProj=0;
  Object.values(CM).forEach(m=>{if(classOf(m.c)==='need')needsProj+=m.proj;else wantsProj+=m.proj});
  pendingBills.forEach(t=>{if(classOf(t.category)==='need')needsProj+=Number(t.amount||0);else wantsProj+=Number(t.amount||0)});
  const needPct=expectedIncome>0?needsProj/expectedIncome*100:null;
  const wantPct=expectedIncome>0?wantsProj/expectedIncome*100:null;
  const wantCats=catSorted.filter(([c])=>classOf(c)==='want');
  const needCats=catSorted.filter(([c])=>classOf(c)==='need');
  const housing=catSorted.filter(([c])=>isHousing(c)).reduce((s,[,v])=>s+v,0)+sumAmt(pendingBills.filter(t=>isHousing(t.category)));

  // Batas kategori
  const caps=db.categoryBudgets||{};
  const capInfo=Object.entries(caps).filter(([,v])=>v>0).map(([c,cap])=>{
    const m=CM[c]||{pattern:LUMP_DEFAULT.includes(c)?'lump':'spread',spent:0,proj:0,rate:0,count:0,avgWhenPaid:0};
    const spent=m.spent,proj=m.proj+sumAmt(pendingBills.filter(t=>t.category===c));
    const over=spent>cap;
    let near=false,fast=false,lumpWarn=false,hitDay=null;
    if(m.pattern==='spread'){
      near=!over&&remaining>0&&spent>=cap*0.8;
      fast=!over&&!near&&de>=5&&m.count>=3&&proj>cap*1.05;
      if(fast&&m.rate>0)hitDay=Math.min(dim,de+Math.ceil((cap-spent)/m.rate));
    }else{
      lumpWarn=!over&&spent===0&&proj>cap*1.05;
    }
    return {c,cap,spent,proj,pattern:m.pattern,over,near,fast,lumpWarn,hitDay,rate:m.rate,usual:m.avgWhenPaid};
  });

  // Kebocoran kecil
  const small=exps.filter(x=>classOf(x.category)==='want'&&Number(x.amount)<=50000);
  const smallSum=sumAmt(small);

  // Tren & stabilitas
  const trendPct=avgHistSpend>0&&de>=7&&h3.length>=2?(projSpend-avgHistSpend)/avgHistSpend*100:null;
  let incomeCV=null,incomeMin=null;
  if(hist.length>=3){
    const xs=hist.map(h=>h.income||0),mean=xs.reduce((a,b)=>a+b,0)/xs.length;
    if(mean>0){incomeCV=Math.sqrt(xs.reduce((s,v)=>s+(v-mean)**2,0)/xs.length)/mean;incomeMin=Math.min(...xs)}
  }
  let creep=null;
  if(hist.length>=6){
    const avg=(arr,k)=>arr.reduce((s,h)=>s+(h[k]||0),0)/arr.length;
    const r=hist.slice(0,3),o=hist.slice(3,6);
    const sg=avg(o,'spent')>0?(avg(r,'spent')-avg(o,'spent'))/avg(o,'spent')*100:null;
    const ig=avg(o,'income')>0?(avg(r,'income')-avg(o,'income'))/avg(o,'income')*100:null;
    if(sg!==null&&ig!==null)creep={sg,ig};
  }
  let surplusStreak=0,deficitStreak=0;
  for(const h of hist){if((h.net??((h.income||0)-(h.spent||0)))>0)surplusStreak++;else break}
  for(const h of hist){if((h.net??((h.income||0)-(h.spent||0)))<0)deficitStreak++;else break}

  // Tagihan 7 hari ke depan
  const soonBills=pendingBills.filter(t=>t.dayOfMonth-de>=0&&t.dayOfMonth-de<=7);
  const shortBills=sumAmt(soonBills)>saldo&&saldo>=0?soonBills:[];

  // Kualitas data
  const recordedDays=new Set(db.expenses.filter(x=>x.date.startsWith(mon)).map(x=>x.date)).size;
  const gapDays=Math.max(0,de-recordedDays);

  const hasData=exps.length+incs.length>0||hist.length>0;

  // ---- Skor 0-100 ----
  let pSR=0,nSR;
  if(savingsRate===null){nSR='Belum ada data pemasukan'}
  else{
    const s=savingsRate;
    pSR=s>=20?25:s>=10?lerp(s,10,20,15,25):s>=0?lerp(s,0,10,5,15):s>=-10?lerp(s,-10,0,0,5):0;
    nSR=fmtPct(s)+' (acuan ≥20%)';
  }
  let pRes=0,nRes;
  if(coverage===null){nRes='Belum ada data pengeluaran'}
  else{
    const c=coverage;
    pRes=c>=6?25:c>=3?lerp(c,3,6,18,25):c>=1?lerp(c,1,3,8,18):lerp(c,0,1,0,8);
    nRes=fmtMonths(c)+' (acuan 3–6 bln)';
  }
  let pProj,nProj;
  if(!hasData){pProj=0;nProj='-'}
  else if(projEndBalance<0){pProj=incomePending?6:0;nProj='Saldo diproyeksikan minus'}
  else if(projNet<0){pProj=10;nProj='Masih ada saldo, tapi bulan ini defisit'}
  else{pProj=20;nProj='Aman sampai akhir bulan'}
  let pComp=0,nComp;
  if(needPct===null){nComp='Belum ada data pemasukan'}
  else{
    pComp=Math.max(0,15-lerp(Math.max(0,wantPct-30),0,20,0,8)-lerp(Math.max(0,needPct-50),0,30,0,10));
    nComp='Kebutuhan '+fmtPct(needPct)+' · Keinginan '+fmtPct(wantPct);
  }
  let pBud,nBud;
  if(!capInfo.length){pBud=hasData?(budget>0?(projSpend>budget?5:10):6):0;nBud=budget>0?(projSpend>budget?'Proyeksi melewati anggaran bulanan':'Ada anggaran bulanan, belum ada batas kategori'):'Belum ada batas kategori'}
  else{
    const o=capInfo.filter(x=>x.over).length,n=capInfo.filter(x=>x.near).length,f=capInfo.filter(x=>x.fast).length;
    pBud=Math.max(0,15-5*o-2*n-1*f-(budget>0&&projSpend>budget?3:0));
    nBud=o?o+' kategori lewat batas':(n||f)?(n+f)+' kategori mendekati/terlalu cepat':'Semua dalam batas';
  }
  const parts=[
    {key:'sr',label:'Tingkat menabung',pts:pSR,max:25,note:nSR},
    {key:'res',label:'Dana cadangan',pts:pRes,max:25,note:nRes},
    {key:'proj',label:'Proyeksi akhir bulan',pts:pProj,max:20,note:nProj},
    {key:'comp',label:'Kebutuhan vs keinginan',pts:pComp,max:15,note:nComp},
    {key:'bud',label:'Disiplin anggaran',pts:pBud,max:15,note:nBud}
  ].map(p=>({...p,pts:Math.round(p.pts)}));
  const penalties=[];
  if(de>=7&&gapDays>=Math.ceil(de*0.4))penalties.push({pts:3,label:gapDays+' hari tanpa catatan pengeluaran'});
  if(DS.overdue.some(d=>d.dir==='borrow'))penalties.push({pts:4,label:'Ada utang yang lewat jatuh tempo'});
  if(deficitStreak>=2)penalties.push({pts:5,label:'Defisit '+deficitStreak+' bulan berturut-turut'});
  let score=Math.max(0,parts.reduce((s,p)=>s+p.pts,0)-penalties.reduce((s,p)=>s+p.pts,0));
  if(saldo<0)score=Math.min(score,30);
  let verdict=!hasData?'Belum ada data':score>=80?'Sehat':score>=60?'Cukup':score>=40?'Waspada':'Kritis';
  const confidence=(hist.length>=3&&de>=10)?'tinggi':(hist.length>=1||de>=10)?'sedang':'rendah';

  const A={now,mon,dim,de,remaining,income,expectedIncome,incomePending,everIncome,spend,dailySpend,recurSpend,catTotals,catSorted,srcTotals,
    avgDaily,pendingBills,pendingBillsSum,projSpend,saldo,projEndBalance,hist,avgHistSpend,avgHistIncome,savingsRate,projNet,
    baseMonthlySpend,reserve,coverage,needsProj,wantsProj,needPct,wantPct,wantCats,needCats,housing,capInfo,small,smallSum,trendPct,
    incomeCV,incomeMin,creep,surplusStreak,refIncome,deficitStreak,soonBills,shortBills,gapDays,hasData,DS,budget,
    parts,penalties,score,verdict,confidence,CM,lumpDue,lumpDueSum};
  A.findings=buildFindings(A);
  return A;
}

function buildFindings(A){
  const F=[],add=(sev,title,detail,action)=>F.push({sev,title,detail,action});
  const I=A.expectedIncome;
  if(!A.hasData){
    const planned=db.profile&&db.profile.planAt;
    add('tip','Belum ada data untuk dianalisis','Analisis butuh catatan pemasukan dan pengeluaran. Tanpa itu, skor dan rekomendasi tidak bisa dihitung secara jujur.'+(planned?' Rencana awal & tujuanmu sudah tersimpan.':''),planned?'Catat semua transaksi 1–2 minggu (termasuk pemasukan saat masuk) supaya skor & saran bisa dihitung.':'Isi saldo awal (Lainnya → Koreksi saldo), lalu catat transaksi minimal 1–2 minggu.');
    return F;
  }
  const incomeNote=A.incomePending?' Catatan: pemasukan bulan ini baru '+fmt(A.income)+', di bawah '+(A.avgHistIncome>0?'rata-rata ':'pemasukan rutin ')+fmt(A.refIncome)+' — proyeksi memakai angka itu.':'';

  if(A.saldo<0)add('critical','Saldo minus '+fmt(A.saldo),
    'Saldo −'+fmt(A.saldo)+'. Artinya pengeluaran yang tercatat melebihi uang yang ada — kemungkinan ada utang/kartu kredit yang belum dicatat, atau saldo awal belum dikoreksi.',
    'Koreksi saldo di Lainnya → Koreksi saldo, lalu hentikan pengeluaran non-kebutuhan sampai saldo kembali positif.');
  else if(A.projEndBalance<0&&A.avgDaily>0){
    const usable=A.saldo-A.pendingBillsSum;
    const lastDay=usable>0?Math.min(A.dim,A.de+Math.floor(usable/A.avgDaily)):A.de;
    const maxDaily=A.remaining>0?Math.max(0,usable/A.remaining):0;
    add(A.incomePending?'warning':'critical','Saldo diproyeksikan habis sekitar tanggal '+lastDay,
      'Laju pengeluaran harian '+fmt(A.avgDaily)+' × sisa '+A.remaining+' hari'+(A.pendingBillsSum?' + tagihan yang belum jatuh tempo '+fmt(A.pendingBillsSum):'')+' = '+fmt(A.projSpend-A.spend)+', melebihi saldo '+fmt(A.saldo)+'.'+(A.incomePending?' Belum termasuk pemasukan yang biasanya masuk (~'+fmt(A.refIncome)+').':''),
      maxDaily>0?'Batasi pengeluaran harian maksimal '+fmt(maxDaily)+' sampai akhir bulan.':'Tunda semua pengeluaran yang bisa ditunda dan prioritaskan tagihan wajib.');
  }

  if(A.savingsRate===null){
    if(!A.everIncome)add('warning','Belum ada pemasukan tercatat','Tanpa data pemasukan, tingkat menabung dan kemampuan bayar tidak bisa dinilai — skor jadi tidak akurat.','Catat pemasukan lewat tombol + → Pemasukan.');
  }else if(A.projNet<0&&I>0){
    const gap=-A.projNet,topWant=A.wantCats[0];
    add('critical','Defisit: pengeluaran melebihi pemasukan',
      'Proyeksi pengeluaran bulan ini '+fmt(A.projSpend)+' vs pemasukan '+fmt(I)+' → kurang '+fmt(gap)+'. Defisit yang dibiarkan akan menggerus tabungan atau berujung utang.'+incomeNote,
      'Pangkas minimal '+fmt(gap)+' sebelum akhir bulan'+(topWant?', mulai dari '+topWant[0]+' ('+fmt(topWant[1])+' sejauh ini).':'.'));
  }else if(A.savingsRate<10){
    add('warning','Tingkat menabung hanya '+fmtPct(A.savingsRate),
      'Acuan sehat minimal 20% dari pemasukan. Dengan pemasukan '+fmt(I)+', idealnya '+fmt(I*0.2)+'/bulan tersisih; proyeksi sisa bulan ini hanya '+fmt(Math.max(0,A.projNet))+'.'+incomeNote,
      'Balik urutannya: sisihkan '+fmt(I*0.2)+' di awal bulan ke rekening terpisah, baru belanjakan sisanya.');
  }else if(A.savingsRate<20){
    add('info','Tingkat menabung '+fmtPct(A.savingsRate)+' — belum mencapai 20%',
      'Sudah positif, tapi masih di bawah acuan. Selisih ke 20% ≈ '+fmt(Math.max(0,I*0.2-A.projNet))+'/bulan.'+incomeNote,
      'Naikkan setoran tabungan bertahap, misalnya +'+fmt(Math.max(10000,Math.round(I*0.05/10000)*10000))+' per bulan.');
  }else{
    add('good','Tingkat menabung '+fmtPct(A.savingsRate)+' — di atas acuan 20%',
      'Proyeksi surplus bulan ini '+fmt(A.projNet)+'.'+incomeNote,
      'Pastikan surplus benar-benar dipindah ke tabungan/investasi, bukan mengendap di dompet belanja.');
  }

  if(A.coverage!==null){
    const B=A.baseMonthlySpend,monthlySave=Math.max(0,I*0.2);
    const need3=Math.max(0,B*3-A.reserve);
    const eta=monthlySave>0&&need3>0?Math.ceil(need3/monthlySave):null;
    const base='Sisa saldo setelah kebutuhan bulan ini'+(A.DS.iOwe?' dan dikurangi utang '+fmt(A.DS.iOwe):'')+' ≈ '+fmt(A.reserve)+', setara '+fmtMonths(A.coverage)+' pengeluaran (acuan '+fmt(B)+'/bulan).';
    if(A.coverage<1)add('critical','Dana darurat belum ada',base+' Satu kejadian tak terduga (sakit, kendaraan rusak, kehilangan pemasukan) bisa langsung memaksa berutang.',
      'Prioritaskan dana darurat '+fmt(B*3)+' (3 bulan) sebelum belanja besar'+(eta?' — dengan menabung '+fmt(monthlySave)+'/bulan butuh ± '+eta+' bulan.':'.'));
    else if(A.coverage<3)add('warning','Dana darurat baru '+fmtMonths(A.coverage),base+' Minimal 3 bulan, idealnya 6 bulan.',
      'Kekurangan ke 3 bulan: '+fmt(need3)+(eta?' → ± '+eta+' bulan dengan setoran '+fmt(monthlySave)+'/bulan.':'.'));
    else if(A.coverage<6)add('info','Dana darurat '+fmtMonths(A.coverage)+' — sudah di atas minimum',base,'Lanjutkan hingga 6 bulan ('+fmt(B*6)+'), terutama jika pemasukan tidak tetap.');
    else add('good','Dana darurat aman ('+fmtMonths(A.coverage)+')',base,'Kelebihan di atas 6 bulan bisa dialokasikan ke investasi sesuai profil risiko dan tujuanmu.');
  }

  if(A.wantPct!==null&&A.wantPct>30){
    const over=A.wantsProj-I*0.3;
    add('warning','Pengeluaran keinginan '+fmtPct(A.wantPct)+' dari pemasukan (batas 30%)',
      'Proyeksi keinginan '+fmt(A.wantsProj)+'. Terbesar: '+A.wantCats.slice(0,3).map(([c,v])=>c+' '+fmt(v)).join(', ')+'.',
      'Turunkan ke '+fmt(I*0.3)+' → hemat '+fmt(over)+'/bulan (≈ '+fmt(over*12)+'/tahun).');
  }
  if(A.needPct!==null&&A.needPct>50){
    add('warning','Biaya kebutuhan '+fmtPct(A.needPct)+' dari pemasukan (batas 50%)',
      'Biaya pokok yang tinggi membuat keuangan rapuh bila pemasukan terganggu. Terbesar: '+A.needCats.slice(0,3).map(([c,v])=>c+' '+fmt(v)).join(', ')+'.',
      'Tinjau 1–2 biaya pokok terbesar: cari alternatif lebih murah, negosiasi, atau tingkatkan pemasukan.');
  }
  if(I>0&&A.housing>I*0.3)add('warning','Biaya tempat tinggal '+fmtPct(A.housing/I*100)+' dari pemasukan',
    'Acuan umum maksimal 30% ('+fmt(I*0.3)+'). Saat ini '+fmt(A.housing)+'.','Jika sulit diturunkan, kompensasi dengan menekan pos keinginan lebih ketat.');

  A.capInfo.filter(x=>x.over).forEach(x=>{
    if(x.pattern==='lump')add('warning','Tagihan '+x.c+' melebihi batas',
      x.c+' bulan ini '+fmt(x.spent)+', batasnya '+fmt(x.cap)+' (lebih '+fmt(x.spent-x.cap)+').'+(x.usual&&x.spent>x.usual*1.3?' Ini juga lebih besar dari biasanya ('+fmt(x.usual)+').':''),
      x.usual&&x.spent>x.usual*1.3?'Cek apakah ada pembayaran ganda atau kenaikan harga.':'Kalau memang segitu biayanya, naikkan batas ke '+fmt(Math.ceil(x.spent/10000)*10000)+' supaya analisis tetap akurat.');
    else add('critical','Lewat batas: '+x.c+' ('+Math.round(x.spent/x.cap*100)+'%)',
      'Terpakai '+fmt(x.spent)+' dari batas '+fmt(x.cap)+' (lebih '+fmt(x.spent-x.cap)+')'+(A.remaining?', padahal bulan masih '+A.remaining+' hari.':'.'),
      'Bekukan kategori ini sampai akhir bulan, atau revisi batasnya secara realistis — batas yang selalu dilanggar tidak berfungsi.');
  });
  A.capInfo.filter(x=>x.near).forEach(x=>add('warning','Hampir habis: '+x.c+' ('+Math.round(x.spent/x.cap*100)+'%)',
    'Sisa batas '+fmt(x.cap-x.spent)+' untuk '+A.remaining+' hari, sementara kategori ini biasanya keluar ±'+fmt(x.rate)+'/hari.',
    'Maksimal '+fmt(A.remaining?(x.cap-x.spent)/A.remaining:0)+' per hari untuk kategori ini.'));
  A.capInfo.filter(x=>x.fast).forEach(x=>add('warning','Laju terlalu cepat: '+x.c,
    'Laju sekarang ±'+fmt(x.rate)+'/hari; proyeksi akhir bulan '+fmt(x.proj)+' dari batas '+fmt(x.cap)+(x.hitDay?'. Batas diperkirakan tembus sekitar tanggal '+x.hitDay+'.':'.'),
    'Maksimal '+fmt(A.remaining?(x.cap-x.spent)/A.remaining:0)+' per hari sampai akhir bulan.'));
  A.capInfo.filter(x=>x.lumpWarn).forEach(x=>add('info','Batas '+x.c+' lebih kecil dari tagihan biasanya',
    x.c+' biasanya '+fmt(x.proj)+' per bulan, sedangkan batasnya '+fmt(x.cap)+'.',
    'Sesuaikan batasnya, atau cari cara menurunkan biaya '+x.c+'.'));
  const lumpLate=A.lumpDue.filter(m=>usualDay(m.c)<=A.de),lumpNext=A.lumpDue.filter(m=>usualDay(m.c)>A.de);
  if(lumpLate.length)add('info','Pengeluaran bulanan belum tercatat',
    lumpLate.map(m=>m.c+' (±'+fmt(m.left)+', biasanya tgl '+usualDay(m.c)+')').join(', ')+' — tanggal biasanya sudah lewat tapi belum ada catatan bulan ini. Sudah ikut dihitung di proyeksi.',
    'Kalau sudah dibayar, catat supaya saldo akurat. Kalau memang tidak ada bulan ini, abaikan.');
  if(lumpNext.length&&A.remaining>0)add('info','Pengeluaran bulanan yang akan datang: '+fmt(lumpNext.reduce((s,m)=>s+m.left,0)),
    lumpNext.map(m=>m.c+' ±'+fmt(m.left)+' (sekitar tgl '+usualDay(m.c)+')').join(', ')+'. Sudah disisihkan di proyeksi & batas harian.',
    'Siapkan dananya — atau jadikan tagihan otomatis supaya tercatat sendiri.');
  if(A.budget>0&&A.projSpend>A.budget)add(A.spend>A.budget?'critical':'warning',A.spend>A.budget?'Anggaran bulanan sudah terlampaui':'Proyeksi melewati anggaran bulanan',
    'Anggaran '+fmt(A.budget)+', terpakai '+fmt(A.spend)+', proyeksi akhir bulan '+fmt(A.projSpend)+' (lebih '+fmt(A.projSpend-A.budget)+').',
    A.spend>A.budget?'Hentikan pengeluaran non-kebutuhan sampai bulan berganti.':'Ikuti angka "aman dibelanjakan hari ini" di Beranda sampai akhir bulan.');
  A.DS.overdue.filter(d=>d.dir==='borrow').forEach(d=>add('critical','Utang ke '+d.person+' lewat jatuh tempo',
    'Sisa '+fmt(debtLeft(d))+', jatuh tempo '+shortDate(d.due)+'. Utang yang molor merusak kepercayaan dan bisa berbunga.',
    'Bayar sekarang, atau hubungi '+d.person+' untuk sepakati jadwal baru (Lainnya → Utang & piutang).'));
  A.DS.soon.filter(d=>d.dir==='borrow').forEach(d=>add('warning','Utang ke '+d.person+' jatuh tempo '+shortDate(d.due),
    'Sisa '+fmt(debtLeft(d))+'; saldo saat ini '+fmtSigned(A.saldo)+'.','Siapkan dananya sebelum tanggal itu.'));
  const lendLate=A.DS.overdue.filter(d=>d.dir==='lend');
  if(lendLate.length)add('info','Piutang lewat jatuh tempo: '+fmt(lendLate.reduce((s,d)=>s+debtLeft(d),0)),
    lendLate.map(d=>d.person+' '+fmt(debtLeft(d))).join(', ')+'.','Tagih lewat tombol "Ingatkan via WhatsApp" di Utang & piutang.');
  if(A.DS.iOwe>0&&I>0&&A.DS.iOwe>I*0.5)add('warning','Total utang '+fmtPct(A.DS.iOwe/I*100)+' dari pemasukan bulanan',
    'Utang aktif '+fmt(A.DS.iOwe)+' ke '+A.DS.borrow.length+' orang.','Prioritaskan pelunasan sebelum menambah pengeluaran keinginan.');
  if(!A.capInfo.length&&A.catSorted.length)add('tip','Belum ada batas per kategori',
    'Tanpa batas, pemborosan baru terasa setelah uangnya habis.',
    'Pasang batas untuk 3 kategori terbesar: '+A.catSorted.slice(0,3).map(([c])=>c).join(', ')+' (Lainnya → Target kategori).');

  if(A.small.length>=8||(A.spend>0&&A.smallSum>=A.spend*0.1&&A.small.length>=4)){
    const yearly=A.smallSum/Math.max(A.de,1)*365;
    add('info','Kebocoran kecil: '+A.small.length+' transaksi keinginan ≤ Rp50rb',
      'Total '+fmt(A.smallSum)+' bulan ini ('+fmtPct(A.spend?A.smallSum/A.spend*100:0)+' pengeluaran). Jika pola ini berlanjut ≈ '+fmt(yearly)+' per tahun.',
      'Kurangi separuhnya → hemat ± '+fmt(yearly/2)+' per tahun.');
  }

  if(A.trendPct!==null&&A.trendPct>=15)add('warning',A.trendPct>200?'Pengeluaran bulan ini ± '+(Math.round(A.projSpend/A.avgHistSpend*10)/10).toLocaleString('id-ID')+'× rata-rata sebelumnya':'Pengeluaran naik '+fmtPct(A.trendPct)+' dari rata-rata 3 bulan',
    'Proyeksi bulan ini '+fmt(A.projSpend)+' vs rata-rata '+fmt(A.avgHistSpend)+'.','Cek kategori yang melonjak di Laporan → Kategori dan tentukan mana yang sekali saja vs kebiasaan baru.');
  else if(A.trendPct!==null&&A.trendPct<=-15)add('good','Pengeluaran turun '+fmtPct(-A.trendPct)+' dari rata-rata 3 bulan',
    'Proyeksi '+fmt(A.projSpend)+' vs rata-rata '+fmt(A.avgHistSpend)+'.','Pindahkan selisih penghematan (± '+fmt(A.avgHistSpend-A.projSpend)+') langsung ke tabungan.');

  if(A.creep&&A.creep.sg-A.creep.ig>10)add('warning','Gaya hidup naik lebih cepat dari pemasukan',
    'Rata-rata 3 bulan terakhir: pengeluaran '+(A.creep.sg>=0?'+':'')+fmtPct(A.creep.sg)+', pemasukan '+(A.creep.ig>=0?'+':'')+fmtPct(A.creep.ig)+' dibanding 3 bulan sebelumnya.',
    'Kunci kenaikan pengeluaran maksimal setengah dari kenaikan pemasukan.');
  if(A.incomeCV!==null&&A.incomeCV>0.3)add('info','Pemasukan tidak stabil',
    'Variasi pemasukan 6 bulan terakhir tinggi (terendah '+fmt(A.incomeMin)+').',
    'Susun anggaran dari pemasukan terendah, dan targetkan dana darurat 6–12 bulan.');
  if(A.deficitStreak>=2)add('critical','Defisit '+A.deficitStreak+' bulan berturut-turut','Pola ini menandakan masalah struktural, bukan kebetulan.','Buat anggaran ulang dari nol: daftar biaya wajib dulu, lalu tetapkan batas untuk sisanya.');
  else if(A.surplusStreak>=3)add('good','Surplus '+A.surplusStreak+' bulan berturut-turut','Konsistensi yang baik.','Naikkan target tabungan atau mulai investasi rutin.');

  if(A.shortBills.length)add('warning','Saldo kurang untuk tagihan 7 hari ke depan',
    'Tagihan '+A.shortBills.map(t=>t.category+' '+fmt(t.amount)+' (tgl '+t.dayOfMonth+')').join(', ')+' — total '+fmt(sumAmt(A.shortBills))+', saldo saat ini '+fmtSigned(A.saldo)+'.',
    'Siapkan kekurangan '+fmt(sumAmt(A.shortBills)-A.saldo)+' sebelum jatuh tempo, atau tunda pengeluaran lain.');
  if(A.soonBills.length&&!A.shortBills.length)add('info','Tagihan 7 hari ke depan: '+fmt(sumAmt(A.soonBills)),
    A.soonBills.map(t=>t.category+' '+fmt(t.amount)+' (tgl '+t.dayOfMonth+')').join(', ')+'. Saldo saat ini cukup.','Tidak perlu tindakan — akan tercatat otomatis.');

  if(A.de>=7&&A.gapDays>=Math.ceil(A.de*0.4))add('info',A.gapDays+' dari '+A.de+' hari tanpa catatan pengeluaran',
    'Jika memang ada pengeluaran yang tidak dicatat, analisis ini cenderung terlalu optimis.','Biasakan mencatat saat itu juga — pakai Ketik cepat di Beranda.');

  logicFindings(A,add);
  const order={critical:0,warning:1,info:2,good:3,tip:4};
  return F.sort((a,b)=>order[a.sev]-order[b.sev]);
}
const SEV={critical:{icon:'alert',tone:'red',label:'Kritis',type:'warning'},warning:{icon:'alert',tone:'amber',label:'Perhatian',type:'warn'},info:{icon:'info',tone:'blue',label:'Catatan',type:'info'},good:{icon:'check',tone:'green',label:'Positif',type:'success'},tip:{icon:'bulb',tone:'violet',label:'Saran',type:'tip'}};
const VERDICT_STYLE={'Sehat':{cls:'ok',color:'var(--green)',msg:'Fondasi keuangan kuat. Fokus berikutnya: optimalkan surplus.'},'Cukup':{cls:'info',color:'var(--blue)',msg:'Cukup stabil, tapi masih ada celah yang perlu ditutup.'},'Waspada':{cls:'warn',color:'var(--amber)',msg:'Ada risiko nyata — perlu perbaikan dalam 1–2 bulan.'},'Kritis':{cls:'bad',color:'var(--red)',msg:'Kondisi rawan — ambil tindakan minggu ini.'},'Belum ada data':{cls:'info',color:'var(--faint)',msg:'Catat transaksi dulu agar kondisi keuanganmu bisa dinilai.'}};

let lastAnalysis=null;
function renderAdvice(){
  const A=analyzeFinance();lastAnalysis=A;
  const V=VERDICT_STYLE[A.verdict];
  $('#healthPill').className='pill '+V.cls;
  $('#healthPill').textContent=A.hasData?A.score+' · '+A.verdict:'Mulai catat';
  $('#menuAdviceMeta').textContent=A.hasData?A.score+'/100':'';
  $('#scoreRing').style.setProperty('--p',A.hasData?A.score:0);
  $('#scoreRing').style.setProperty('--c',V.color);
  $('#scoreNum').textContent=A.hasData?A.score:'–';
  $('#healthStamp').className='pill '+V.cls;
  $('#healthStamp').textContent=A.verdict;
  const weakest=A.hasData?[...A.parts].sort((a,b)=>a.pts/a.max-b.pts/b.max)[0]:null;
  $('#scoreSummary').textContent=V.msg+(weakest?' Titik terlemah: '+weakest.label.toLowerCase()+' ('+weakest.pts+'/'+weakest.max+').':'');
  $('#scoreConf').textContent='Keyakinan analisis: '+A.confidence+' · data s.d. '+shortDate(A.now)+(A.hist.length?' · '+A.hist.length+' bln riwayat':' · belum ada riwayat bulan');
  $('#scoreParts').innerHTML=A.parts.map(p=>{
    const r=p.pts/p.max,col=r>=0.8?'green':r>=0.5?'':'over';
    return '<div class="bar-row"><div class="bar-top"><span>'+p.label+'</span><b class="num">'+p.pts+'<span style="color:var(--faint);font-weight:600">/'+p.max+'</span></b></div><div class="bar-track"><div class="bar-fill '+col+'" style="width:'+Math.max(3,Math.round(r*100))+'%"></div></div><div class="bar-cap">'+esc(p.note)+'</div></div>';
  }).join('')+A.penalties.map(p=>'<div class="line" style="font-size:12.5px;padding:8px 0"><span style="color:var(--muted)">'+esc(p.label)+'</span><span style="color:var(--red)">−'+p.pts+'</span></div>').join('');
  const m=(dot,label,val,sub)=>'<div class="stat"><small><i class="dot" style="background:var(--'+dot+')"></i>'+label+'</small><b class="num">'+val+'</b><span class="stat-sub">'+sub+'</span></div>';
  $('#keyMetrics').innerHTML=
    m('green','Tingkat menabung',A.hasData?fmtPct(A.savingsRate):'-','acuan ≥ 20%')+
    m('violet','Dana cadangan',A.hasData?fmtMonths(A.coverage):'-','acuan 3–6 bulan')+
    m(A.projEndBalance<0?'red':'blue','Saldo akhir bulan',A.hasData?fmtSigned(A.projEndBalance):'-','proyeksi tanpa pemasukan baru')+
    m('amber','Kebutuhan / keinginan',A.needPct===null||!A.hasData?'-':Math.round(A.needPct)+'% / '+Math.round(A.wantPct)+'%','acuan 50% / 30%');
  const card=f=>{
    const s=SEV[f.sev];
    return '<div class="advice-card"><span class="ic t-'+s.tone+'">'+icon(s.icon)+'</span><div style="min-width:0"><span class="tag" style="color:var(--'+s.tone+')">'+s.label+'</span><b>'+esc(f.title)+'</b><p>'+esc(f.detail)+'</p>'+(f.action?'<div class="act"><b>Langkah</b>'+esc(f.action)+'</div>':'')+'</div></div>';
  };
  const main=A.findings.slice(0,5),rest=A.findings.slice(5);
  $('#adviceList').innerHTML=main.map(card).join('')+(rest.length?'<details class="more-findings"><summary>Lihat '+rest.length+' temuan lainnya</summary>'+rest.map(card).join('')+'</details>':'');
  const eb=$('#tileEndBalance');eb.textContent=A.hasData?(A.projEndBalance<0?'−':'')+(Math.abs(A.projEndBalance)>=1e6?fmtShort(A.projEndBalance):fmt(A.projEndBalance)):'-';eb.style.color=A.hasData&&A.projEndBalance<0?'var(--red)':'';
  const top=A.findings[0],ts=SEV[top.sev];
  $('#homeInsight').innerHTML='<button class="insight '+ts.type+'" data-goto="'+(A.hasData?'advice':'wallets')+'"><span class="ic">'+icon(ts.icon)+'</span><div style="min-width:0"><b>'+esc(top.title)+'</b><span>'+esc(top.action||top.detail)+'</span></div></button>';
  if($('#advice').classList.contains('active'))updateClaudePreview();
}

// ---------- Konsultasi dengan Claude ----------
const CLAUDE_TEMPLATES=[
  ['Evaluasi bulan ini','Evaluasi kondisi keuangan saya bulan ini secara kritis. Apa 3 masalah terbesar dan 3 prioritas perbaikan yang paling berdampak?'],
  ['Mampu beli?','Saya mau membeli [barang] seharga Rp[harga], dibayar [tunai / cicilan ... bulan bunga ...%]. Apakah saya mampu? Hitung dampaknya ke saldo, dana darurat, dan tabungan saya.'],
  ['Anggaran bulan depan','Buatkan anggaran bulan depan per kategori berdasarkan pola pengeluaran dan pemasukan saya, dengan kerangka 50/30/20. Tunjukkan angka per kategori.'],
  ['Rencana dana darurat','Berapa dana darurat ideal untuk saya, dan berapa bulan untuk mencapainya? Hitung beberapa skenario setoran per bulan.'],
  ['Lunasi utang','Saya punya utang Rp[jumlah] dengan bunga [..]% per [bulan/tahun] dan cicilan Rp[..]. Hitung strategi pelunasan tercepat dan total bunga yang bisa dihemat.'],
  ['Target beli sesuatu','Saya ingin mengumpulkan Rp[target] untuk [tujuan] dalam [..] bulan. Berapa yang harus disisihkan per bulan dan pos mana yang realistis dipangkas?']
];
function buildFinanceSummary(A){
  const L=[],dm=(x)=>new Date(x+'T12:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  L.push('DATA KEUANGAN (dari aplikasi CMoney Tracker, per '+dm(A.now)+' — hari ke-'+A.de+' dari '+A.dim+'):');
  L.push('');
  L.push('Bulan berjalan ('+monthName(A.mon)+'):');
  L.push('- Pemasukan: '+fmt(A.income)+(Object.keys(A.srcTotals).length?' ('+Object.entries(A.srcTotals).map(([k,v])=>k+' '+fmt(v)).join(', ')+')':''));
  L.push('- Pengeluaran sejauh ini: '+fmt(A.spend)+' (harian '+fmt(A.dailySpend)+', berkala '+fmt(A.recurSpend)+')');
  L.push('- Proyeksi pengeluaran s.d. akhir bulan: '+fmt(A.projSpend)+' (laju harian '+fmt(A.avgDaily)+')');
  if(A.catSorted.length){
    L.push('- Per kategori:');
    A.catSorted.forEach(([c,v])=>{
      const cap=(db.categoryBudgets||{})[c],m=A.CM[c];
      L.push('  • '+c+': '+fmt(v)+(m?' → proyeksi '+fmt(m.proj):'')+' ['+(classOf(c)==='need'?'kebutuhan':'keinginan')+', '+(m&&m.pattern==='lump'?'bayar sekali/bulan':'harian')+(cap?', batas '+fmt(cap):'')+']');
    });
    if(A.lumpDue.length)L.push('  • Belum tercatat tapi biasanya rutin: '+A.lumpDue.map(m=>m.c+' ±'+fmt(m.left)).join(', '));
  }
  L.push('');
  const G=typeof goalSummaryLine==='function'?goalSummaryLine():'';
  if(G)L.push(G,'');
  L.push('Posisi saat ini:');
  L.push('- Saldo saat ini (semua uang, 1 dompet): '+fmtSigned(A.saldo));
  if(A.budget>0)L.push('- Anggaran belanja bulanan: '+fmt(A.budget));
  if(A.DS.act.length){
    if(A.DS.borrow.length)L.push('- Utang saya: '+fmt(A.DS.iOwe)+' ('+A.DS.borrow.map(d=>d.person+' '+fmt(debtLeft(d))+(d.due?' jatuh tempo '+d.due:'')).join('; ')+')');
    if(A.DS.lend.length)L.push('- Piutang (orang berutang ke saya): '+fmt(A.DS.owedToMe));
  }
  if((db.recurringTemplates||[]).length)L.push('- Tagihan & langganan rutin: '+db.recurringTemplates.map(t=>(t.kind==='sub'?t.name:t.category)+' '+fmt(t.amount)+(tplYearly(t)?' per tahun (bulan ke-'+t.month+')':' tiap tgl '+t.dayOfMonth)+(t.rare?' [jarang dipakai]':'')).join('; '));
  if(A.hist.length){
    L.push('');
    L.push('Riwayat bulan sebelumnya:');
    A.hist.forEach(h=>{
      const net=(h.income||0)-(h.spent||0);
      const top=Object.entries(h.detail||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,v])=>c+' '+fmt(v)).join(', ');
      L.push('- '+monthName(h.month)+': masuk '+fmt(h.income||0)+', keluar '+fmt(h.spent||0)+', selisih '+(net<0?'−':'+')+fmt(net)+(top?' (terbesar: '+top+')':''));
    });
  }
  L.push('');
  L.push('Indikator hitungan aplikasi: skor kesehatan '+(A.hasData?A.score+'/100 ('+A.verdict+')':'belum ada')+'; tingkat menabung '+fmtPct(A.savingsRate)+'; dana cadangan '+fmtMonths(A.coverage)+'; proyeksi saldo akhir bulan '+fmtSigned(A.projEndBalance)+'; kebutuhan '+fmtPct(A.needPct)+' / keinginan '+fmtPct(A.wantPct)+' dari pemasukan.');
  return L.join('\n');
}
let claudeMode='serius';
function buildClaudePrompt(){
  const A=lastAnalysis||analyzeFinance();
  const q=($('#claudeQuestion').value||'').trim()||(claudeMode==='roast'?'Roasting kondisi keuangan saya bulan ini.':CLAUDE_TEMPLATES[0][1]);
  const parts=[
    claudeMode==='roast'?'Kamu teman anak muda Indonesia yang jago keuangan. Roasting kebiasaan keuangan saya dengan gaya santai, lucu, dan pedas pakai bahasa gaul — tapi jangan merendahkan, jangan kasar, dan tetap berbasis angka dari data di bawah. Setelah roasting, tutup dengan 3 saran konkret yang bisa langsung saya lakukan minggu ini (serius, dengan angka). Jawab dalam Bahasa Indonesia santai.':'Bertindaklah sebagai perencana keuangan pribadi yang independen dan berpengalaman di Indonesia. Jawab dengan kritis, jujur, dan berbasis angka — jangan sekadar menyemangati. Tunjukkan risiko, tampilkan hitungan beserta rumusnya, sebutkan asumsi yang kamu pakai, dan akhiri dengan langkah konkret yang bisa saya lakukan minggu ini. Jika data kurang untuk menjawab dengan tepat, tanyakan dulu. Jawab dalam Bahasa Indonesia.',
    '',
    'PERTANYAAN SAYA:',
    q
  ];
  if($('#claudeIncludeData').checked){parts.push('','---',buildFinanceSummary(A))}
  return parts.join('\n');
}
function updateClaudePreview(){$('#claudePreview').textContent=buildClaudePrompt()}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true}
  catch(e){
    try{
      const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0';
      document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
    }catch(e2){return false}
  }
}
function renderClaudeTemplates(){
  $('#claudeTemplates').innerHTML=CLAUDE_TEMPLATES.map((t,i)=>'<button type="button" class="chip" data-claude-tpl="'+i+'">'+esc(t[0])+'</button>').join('');
}
renderClaudeTemplates();
$('#claudeTemplates').addEventListener('click',e=>{
  const b=e.target.closest('[data-claude-tpl]');if(!b)return;
  $('#claudeQuestion').value=CLAUDE_TEMPLATES[Number(b.dataset.claudeTpl)][1];
  $$('#claudeTemplates .chip').forEach(x=>x.classList.toggle('on',x===b));
  updateClaudePreview();
  const ta=$('#claudeQuestion'),i=ta.value.indexOf('[');
  ta.focus();
  if(i>=0)ta.setSelectionRange(i,ta.value.indexOf(']',i)+1);
});
$('#claudeQuestion').addEventListener('input',()=>{$$('#claudeTemplates .chip').forEach(x=>x.classList.remove('on'));updateClaudePreview()});
$('#claudeIncludeData').addEventListener('change',updateClaudePreview);
$('#askClaudeBtn').onclick=async()=>{
  const text=buildClaudePrompt();
  if(/\[[^\]]*\]/.test($('#claudeQuestion').value)&&!confirm('Masih ada bagian [dalam kurung] yang belum diisi. Tetap lanjut?'))return;
  const win=window.open('about:blank','_blank');
  const copied=await copyText(text);
  const url=text.length<=6000?'https://claude.ai/new?q='+encodeURIComponent(text):'https://claude.ai/new';
  if(win){try{win.opener=null}catch(e){}win.location.href=url}
  else location.href=url;
  toast(copied?'Teks disalin. Kalau kolom chat Claude kosong, tempel saja.':'Membuka Claude…');
};
$('#copyClaudeBtn').onclick=async()=>{
  toast(await copyText(buildClaudePrompt())?'Teks disalin — tempel di chat Claude.':'Gagal menyalin. Salin manual dari pratinjau.');
};

$('#saveBalance').onclick=()=>{
  db=load();
  const desired=Number($('#balanceInput').value);
  if(!isFinite(desired)||$('#balanceInput').value===''){toast('Isi saldo yang benar dulu.');return}
  const current=getSaldo();
  db.methodBalances={Utama:(Number(db.methodBalances.Utama)||0)+(desired-current)};
  $('#balanceInput').blur();
  save();render();
  toast('Saldo disetel ke '+fmtSigned(desired)+'.');
};

// ---------- Angka saldo beranimasi ----------
let lastSaldoAnimated=null;
const moneyHTML=n=>{const s=fmtSigned(n),i=s.indexOf('Rp');return esc(s.slice(0,i))+'<span class="cur">Rp</span>'+esc(s.slice(i+2))};
function animateNumber(el,target){
  let start=lastSaldoAnimated===null?target:lastSaldoAnimated;
  lastSaldoAnimated=target;
  if(start===target){el.innerHTML=moneyHTML(target);return}
  let startTime=performance.now(),dur=550;
  function step(now){
    let t=Math.min(1,(now-startTime)/dur),eased=1-Math.pow(1-t,3);
    el.innerHTML=moneyHTML(start+(target-start)*eased);
    if(t<1)requestAnimationFrame(step);else el.innerHTML=moneyHTML(target);
  }
  requestAnimationFrame(step);
}

// ---------- Render utama ----------
function render(){
  MEMO=new Map();
  db=load();
  if(!db.profile){$('#profileModal').classList.add('hidden');openOnboarding(true);return}
  $('#profileModal').classList.add('hidden');
  runRecurringTemplates();
  archive();
  let all=db.expenses,incomesAll=db.incomes,now=day(),mon=month(),
  saldo=getSaldo();

  let h=new Date().getHours();
  $('#greetTime').textContent=h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  $('#greeting').textContent=db.profile.name+' 👋';
  let initial=(db.profile.name||'C').trim().charAt(0).toUpperCase()||'C';
  $('#moreAvatar').textContent=initial;
  $('#moreName').textContent=db.profile.name;

  animateNumber($('#saldoTersedia'),saldo);
  $('#saldoStamp').textContent=saldo<0?'Defisit':'Aman';
  $('#balanceMonth').textContent='Per '+new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  renderBalancePage();
  renderRecurringTemplates();
  if(typeof updatePinUI==='function')updatePinUI();

  let monthly=all.filter(x=>x.date.startsWith(mon));
  let monthlyIncome=incomesAll.filter(x=>x.date.startsWith(mon));
  let monthlySpend=monthly.filter(x=>!isTransferCat(x.category));
  let monthlyIncomeReal=monthlyIncome.filter(x=>!isTransferIncome(x));
  let incomeSumMonth=monthlyIncomeReal.reduce((s,x)=>s+Number(x.amount||0),0);
  let spendSumMonth=monthlySpend.reduce((s,x)=>s+Number(x.amount||0),0);
  $('#incomeMonthTotal').textContent=fmt(incomeSumMonth);
  $('#expenseMonthTotal').textContent=fmt(spendSumMonth);


  // Transaksi terbaru di beranda
  let recent=tagged().slice(0,6);
  $('#recentList').innerHTML=recent.length?recent.map(x=>txRow(x,true)).join(''):emptyBox('✨','Belum ada transaksi. Ketuk tombol <b>+</b> di bawah untuk mulai mencatat.');

  renderQuickChips();

  // Tab transaksi
  let prevCat=$('#filterCategory').value;
  let labels=[...new Set([...all.map(x=>x.category),...incomesAll.map(x=>x.source)])].filter(Boolean).sort((a,b)=>a.localeCompare(b));
  $('#filterCategory').innerHTML='<option value="">Semua</option>'+labels.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  $('#filterCategory').value=labels.includes(prevCat)?prevCat:'';

  if(viewMonth===null)viewMonth=mon;
  let viewItems=tagged().filter(x=>x.date.startsWith(viewMonth));
  let q=($('#searchInput').value||'').toLowerCase().trim(),cat=$('#filterCategory').value;
  let filtered=viewItems.filter(x=>{
    if(txType!=='all'&&x.kind!==txType)return false;
    let label=x.category||x.source||'';
    if(cat&&label!==cat)return false;
    if(q&&!(label.toLowerCase().includes(q)||(x.note||'').toLowerCase().includes(q)))return false;
    return true;
  });
  $('#monthlyList').innerHTML=groupedList(filtered);
  $('#monthLabel').textContent=monthName(viewMonth);
  $('#nextMonthBtn').disabled=viewMonth>=mon;
  $('#txMonthIn').textContent=fmt(viewItems.filter(x=>x.kind==='income'&&!isTransferIncome(x)).reduce((s,x)=>s+Number(x.amount||0),0));
  $('#txMonthOut').textContent=fmt(viewItems.filter(x=>x.kind==='expense'&&!isTransferCat(x.category)).reduce((s,x)=>s+Number(x.amount||0),0));

  // Laporan
  $('#summaryMonth').textContent='Perincian '+monthName(mon);
  let dsum=monthlySpend.filter(x=>x.type==='daily').reduce((s,x)=>s+Number(x.amount||0),0),
  rsum=monthlySpend.filter(x=>x.type==='recurring').reduce((s,x)=>s+Number(x.amount||0),0),
  daysElapsed=Number(now.slice(8,10)),
  avgPerDay=daysElapsed>0?dsum/daysElapsed:0,
  runway=avgPerDay>0?saldo/avgPerDay:Infinity;
  let runwayText=avgPerDay<=0?'Belum ada data':(saldo<=0?'Sudah habis':'~'+Math.floor(runway)+' hari');
  $('#sumDaily').textContent=fmt(dsum);
  $('#sumRecurring').textContent=fmt(rsum);
  $('#sumIncome').textContent=fmt(incomeSumMonth);
  $('#sumAvgDay').textContent=fmt(avgPerDay);
  $('#sumRunway').textContent=runwayText;
  $('#sumCount').textContent=monthly.length+monthlyIncome.length;
  $('#tileAvg').textContent=fmt(avgPerDay);
  $('#tileRunway').textContent=runwayText;

  renderCategoryPie(monthlySpend);
  renderCategoryBreakdown(monthlySpend);
  renderCategoryBudgetForm();
  renderIncomeBreakdown(monthlyIncomeReal);
  renderTrend(monthlySpend);
  renderHeatmap(monthlySpend,mon);
  renderYearlyComparison();

  // Analisis & saran
  renderAdvice();
  renderV39();
  renderV41();
  renderDetailV42();
  renderLogicV43();
  renderPlanV44();
  renderReviewV45();
  renderDesignV43();
  renderHomeV43();

  // Riwayat bulan selesai
  $('#archiveList').innerHTML=db.history.length?db.history.map(hh=>{
    let income=hh.income||0,net=(hh.net!==undefined?hh.net:income-(hh.spent||0));
    let rows=Object.entries(hh.detail||{}).sort((a,b)=>b[1]-a[1]).map(([c,n])=>'<div class="line"><span>'+catTag(c)+'</span><span class="num">'+fmt(n)+'</span></div>').join('');
    return '<details class="archive"><summary><div><b>'+monthName(hh.month)+'</b><small class="num">Masuk '+fmt(income)+' · Keluar '+fmt(hh.spent||0)+'</small></div><span class="pill '+(net<0?'bad':'ok')+' num">'+(net<0?'−':'+')+fmt(net)+'</span></summary><div class="body">'+(rows||'<p class="empty">Tidak ada rincian.</p>')+'<button class="btn btn-soft btn-block" data-recap="'+hh.month+'" style="margin:10px 0 8px">✨ Lihat rekap '+monthName(hh.month)+'</button></div></details>';
  }).join(''):'<div class="tx-list">'+emptyBox('📅','Belum ada bulan yang selesai. Rekap muncul otomatis di awal bulan berikutnya.')+'</div>';

  maybeShowTips();
  maybeShowNews();
}

function renderQuickChips(){
  let freq={};
  db.expenses.filter(x=>!isTransferCat(x.category)&&!x.templateId).forEach(x=>{
    let key=[x.type,x.category,x.amount].join('|');
    freq[key]=(freq[key]||0)+1;
  });
  let top=Object.entries(freq).filter(([,c])=>c>1).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $('#quickWrap').classList.toggle('hidden',!top.length);
  $('#quickChips').innerHTML=top.map(([key])=>{
    let [type,cat,amt]=key.split('|');
    return '<button type="button" class="chip quick-chip" data-quick="'+esc(type)+'" data-cat="'+esc(cat)+'" data-amt="'+esc(amt)+'"><span class="em t-'+toneOf(cat)+'">'+catIcon(cat)+'</span>'+esc(cat)+' <small class="num">'+fmt(Number(amt))+'</small></button>';
  }).join('');
}

// ---------- Sheet tambah / ubah transaksi ----------
let sheet={mode:'add',kind:'daily',cat:null,editId:null};
const parseAmount=v=>Number(String(v||'').replace(/\D/g,''))||0;
const plainAmount=n=>n?Number(n).toLocaleString('id-ID'):'';
function catsFor(kind){
  if(kind==='income'){
    let used=db.incomes.map(x=>x.source).filter(s=>s&&!TRANSFER_SOURCES.includes(s));
    return [...new Set([...incomeSources,...used])];
  }
  return [...(kind==='daily'?dailyCats:recurringCats),...(db.customCategories[kind]||[])];
}
function renderSheet(){
  const isInc=sheet.kind==='income';
  $$('#kindSeg button').forEach(b=>{
    b.classList.toggle('on',b.dataset.kind===sheet.kind);
    b.classList.toggle('hidden',sheet.mode==='edit'&&((b.dataset.kind==='income')!==isInc));
  });
  $('#kindSeg').classList.toggle('hidden',sheet.mode==='edit'&&isInc);
  $('#sheetCatLabel').textContent=isInc?'Sumber pemasukan':'Kategori';
  $('#amountLabel').textContent=isInc?'Nominal pemasukan':'Nominal pengeluaran';
  let list=catsFor(sheet.kind);
  if(sheet.cat&&!list.includes(sheet.cat))list=[sheet.cat,...list];
  if(!sheet.cat&&!sheet.pickCat)sheet.cat=list[0];
  $('#sheetCats').innerHTML=list.map(c=>'<button type="button" class="chip'+(c===sheet.cat?' on':'')+'" data-sheet-cat="'+esc(c)+'"><span class="em chip-ic t-'+(isInc?'green':toneOf(c))+'">'+catIcon(c,isInc)+'</span>'+esc(c)+'</button>').join('')
    +'<button type="button" class="chip dashed" data-sheet-newcat="1">+ '+(isInc?'Sumber':'Kategori')+' lain</button>';
  updateDateChips();
  renderEvents();
  updateSheetHints();
}
function updateDateChips(){
  let v=$('#sheetDate').value;
  $('#dateToday').classList.toggle('on',v===day());
  $('#dateYesterday').classList.toggle('on',v===yesterday());
}
function setSheetMsg(text,neutral){
  $('#sheetError').textContent=text||'';
  $('#sheetError').style.color=neutral?'var(--muted)':'var(--red)';
}
function openSheet(o={}){
  db=load();
  sheet={mode:o.editId?'edit':'add',kind:o.kind||lastKind||'daily',cat:o.cat||null,editId:o.editId||null,pickCat:!!o.pickCat,eventId:o.editId?(o.eventId||null):(activeEvent()||{}).id||null,spread:o.editId?!!o.spread:null};
  $('#sheetTitle').textContent=sheet.mode==='edit'?(sheet.kind==='income'?'Ubah pemasukan':'Ubah pengeluaran'):'Tambah transaksi';
  $('#sheetAmount').value=plainAmount(o.amount);
  $('#sheetDate').max=day();
  $('#sheetDate').value=o.date||day();
  $('#sheetNote').value=o.note||'';
  setSheetMsg(o.pickCat?'Pilih kategorinya dulu, lalu simpan.':'',true);
  $('#sheetDelete').classList.toggle('hidden',sheet.mode!=='edit');
  $('#sheetSave').textContent=sheet.mode==='edit'?'Simpan perubahan':'Simpan';
  renderSheet();
  $('#txSheet').classList.remove('hidden');
  $('#txSheet .sheet').scrollTop=0;
  if(!o.amount)setTimeout(()=>{try{$('#sheetAmount').focus({preventScroll:true})}catch(e){}},280);
}
function closeSheet(){$('#txSheet').classList.add('hidden')}
function openEdit(kind,id){
  db=load();
  if(kind==='income'){
    let x=db.incomes.find(v=>v.id===id);if(!x)return;
    openSheet({editId:id,kind:'income',cat:x.source,amount:x.amount,date:x.date,note:x.note});
  }else{
    let x=db.expenses.find(v=>v.id===id);if(!x)return;
    openSheet({editId:id,kind:x.type==='daily'?'daily':'recurring',cat:x.category,amount:x.amount,date:x.date,note:x.note,eventId:x.eventId,spread:x.spread});
  }
}
function saveSheet(){
  let amount=parseAmount($('#sheetAmount').value);
  if(amount<=0){setSheetMsg('Masukkan nominal lebih dari Rp0.');$('#sheetAmount').focus();return}
  if(!sheet.cat){setSheetMsg(sheet.kind==='income'?'Pilih sumber pemasukan dulu.':'Pilih kategori dulu.');return}
  let date=$('#sheetDate').value||day();
  if(date>day())date=day();
  let note=$('#sheetNote').value.trim();
  let isInc=sheet.kind==='income';
  db=load();
  const warn=preSaveCheck(isInc,sheet.cat,amount,date);
  if(warn&&sheet.confirmKey!==warn.key){sheet.confirmKey=warn.key;setSheetMsg(warn.msg+' Ketuk "Tetap simpan" kalau sudah benar.');$('#sheetSave').textContent='Tetap simpan';buzz(20);return}
  const unu=isInc?0:unusualRatio(sheet.cat,amount,sheet.editId);
  if(sheet.mode==='edit'){
    let arr=isInc?db.incomes:db.expenses,x=arr.find(v=>v.id===sheet.editId);
    if(!x){closeSheet();return}
    let before={...x};
    if(isInc)Object.assign(x,{source:sheet.cat,amount,note,date});
    else{Object.assign(x,{category:sheet.cat,amount,note,date,type:sheet.kind});if(sheet.eventId)x.eventId=sheet.eventId;else delete x.eventId;if(sheetSpreadOn())x.spread=true;else delete x.spread}
    save();closeSheet();render();
    toast('Perubahan disimpan.',()=>{db=load();let a=isInc?db.incomes:db.expenses,i=a.findIndex(v=>v.id===before.id);if(i>=0)a[i]=before;save()});
    return;
  }
  let id=newId();
  if(isInc)db.incomes.push({id,date,source:sheet.cat,note,amount});
  else db.expenses.push(Object.assign({id,date,type:sheet.kind,category:sheet.cat,note,amount},sheet.eventId?{eventId:sheet.eventId}:{},sheetSpreadOn()?{spread:true}:{}));
  lastKind=sheet.kind;
  save();closeSheet();render();
  toast((isInc?'+':'−')+fmt(amount)+' · '+sheet.cat+(date!==day()?' ('+shortDate(date)+')':'')+' tersimpan'+unusualText(unu),()=>{
    db=load();
    if(isInc)db.incomes=db.incomes.filter(v=>v.id!==id);else db.expenses=db.expenses.filter(v=>v.id!==id);
    save();
  });
}
function deleteFromSheet(){
  let isInc=sheet.kind==='income';
  db=load();
  let arr=isInc?db.incomes:db.expenses,x=arr.find(v=>v.id===sheet.editId);
  if(!x){closeSheet();return}
  if(isInc)db.incomes=db.incomes.filter(v=>v.id!==x.id);else db.expenses=db.expenses.filter(v=>v.id!==x.id);
  save();closeSheet();render();
  toast('"'+(isInc?x.source:x.category)+'" '+fmt(x.amount)+' dihapus.',()=>{db=load();(isInc?db.incomes:db.expenses).push(x);save()});
}
$('#fabAdd').onclick=()=>openSheet({});
$('#sheetClose').onclick=closeSheet;
$('#sheetSave').onclick=saveSheet;
$('#sheetDelete').onclick=deleteFromSheet;
$('#sheetAmount').addEventListener('input',e=>{
  let n=parseAmount(e.target.value);
  e.target.value=n?n.toLocaleString('id-ID'):'';
  if(n>0&&$('#sheetError').style.color!=='var(--muted)')setSheetMsg('');
});
['sheetAmount','sheetNote'].forEach(id=>$('#'+id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveSheet()}}));
$('#sheetDate').addEventListener('change',updateDateChips);
$('#dateToday').onclick=()=>{$('#sheetDate').value=day();updateDateChips()};
$('#dateYesterday').onclick=()=>{$('#sheetDate').value=yesterday();updateDateChips()};
$('#kindSeg').addEventListener('click',e=>{
  let b=e.target.closest('[data-kind]');if(!b)return;
  let k=b.dataset.kind;if(k===sheet.kind)return;
  let wasInc=sheet.kind==='income';
  sheet.kind=k;
  if(sheet.mode==='add'&&(wasInc!==(k==='income')||!catsFor(k).includes(sheet.cat)))sheet.cat=null;
  if(sheet.mode==='add')lastKind=k;
  renderSheet();
});
$('#txSheet').addEventListener('click',e=>{
  if(e.target===$('#txSheet')){closeSheet();return}
  let c=e.target.closest('[data-sheet-cat]');
  if(c){sheet.cat=c.dataset.sheetCat;sheet.pickCat=false;setSheetMsg('');renderSheet();return}
  if(e.target.closest('[data-sheet-newcat]')){
    let kind=sheet.kind,isInc=kind==='income';
    openQuickInput(isInc?'Sumber pemasukan baru':'Kategori baru',isInc?'Contoh: Jualan online':'Contoh: Donasi, Hiburan',(name)=>{
      if(!isInc){
        db=load();
        let defaults=kind==='daily'?dailyCats:recurringCats,customs=db.customCategories[kind];
        if(!defaults.includes(name)&&!customs.includes(name)){customs.push(name);save()}
      }
      sheet.cat=name;sheet.pickCat=false;setSheetMsg('');renderSheet();
    });
  }
});

// ---------- Input singkat (modal kecil) ----------
function openQuickInput(title,placeholder,onSave,onCancel,opts={}){
  $('#quickInputTitle').textContent=title;
  $('#quickInputField').type=opts.numeric?'number':'text';
  $('#quickInputField').inputMode=opts.numeric?'numeric':'text';
  $('#quickInputField').value=opts.defaultValue||'';
  $('#quickInputField').placeholder=placeholder;
  $('#quickInputModal').classList.remove('hidden');
  setTimeout(()=>{$('#quickInputField').focus();$('#quickInputField').select()},60);
  const done=ok=>{
    let val=$('#quickInputField').value.trim();
    $('#quickInputModal').classList.add('hidden');
    if(ok&&val)onSave(val);else if(onCancel)onCancel();
  };
  $('#quickInputSave').onclick=()=>done(true);
  $('#quickInputCancel').onclick=()=>done(false);
  $('#quickInputModal').onclick=e=>{if(e.target===$('#quickInputModal'))done(false)};
  $('#quickInputField').onkeydown=e=>{
    if(e.key==='Enter'){e.preventDefault();done(true)}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false)}
  };
}

// ---------- Ketik cepat ----------
const PAY_WORDS_RE=/\b(?:(?:pakai|pake|pakek|via|lewat|bayar|byr)\s+)?(?:cash|tunai|cod|transfer|tf|qris|debit|gopay|go-pay|ovo|dana(?!\s+(?:darurat|pensiun|pendidikan|kaget|desa|bos))|shopeepay|shopee\s?pay|spay|linkaja|bca|bri|bni|mandiri|bsi|jenius|jago|seabank|blu|bank)\b/gi;
const CAT_KEYWORDS=[
  [/\b(kopi|makan|minum|nasi|sarapan|lunch|dinner|bakso|mie|mi|ayam|resto|warteg|gofood|grabfood|shopeefood|teh|air)\b/,'Makan & minum'],
  [/\bparkir\b/,'Parkir'],
  [/\b(nonton|bioskop|xxi|cgv|cinepolis|konser|karaoke|timezone|bowling|billiard|biliar)\b/,'Hiburan'],
  [/\b(jajan|snack|cemilan|camilan|boba|eskrim|gorengan|roti)\b/,'Jajan'],
  [/\b(bensin|pertalite|pertamax|solar|bbm)\b/,'Bensin'],
  [/\b(kos|kost|sewa|kontrakan)\b/,'Kos'],
  [/\b(servis|service|bengkel|oli|tambal)\b/,'Servis kendaraan'],
  [/\b(internet|wifi|kuota|pulsa|indihome)\b/,'Internet'],
  [/\b(laundry|londri)\b/,'Laundry'],
  [/\b(sabun|sampo|shampo|odol|skincare|indomaret|alfamart|toiletries)\b/,'Belanja kebutuhan pribadi']
];
const SOURCE_KEYWORDS=[[/\bgaji(an)?\b/,'Gaji'],[/\b(uang saku|saku)\b/,'Uang Saku'],[/\b(ortu|orang tua|ayah|ibu|papa|mama)\b/,'Uang Orang Tua'],[/\b(bonus|thr)\b/,'Bonus'],[/\b(freelance|project|proyek)\b/,'Freelance'],[/\b(hadiah|kado|angpao)\b/,'Hadiah']];
function parseSmartInput(text){
  let lower=text.toLowerCase(),note=text;
  let m=lower.match(/(\d+(?:[.,]\d+)*)\s*(?:(rb|ribu|k|jt|juta)(?![a-z]))?/);
  let amount=0;
  if(m){
    let raw=m[1];
    amount=/^\d{1,3}([.,]\d{3})+$/.test(raw)?Number(raw.replace(/[.,]/g,'')):parseFloat(raw.replace(',','.'));
    if(m[2]==='rb'||m[2]==='ribu'||m[2]==='k')amount*=1000;
    else if(m[2]==='jt'||m[2]==='juta')amount*=1000000;
    note=note.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),' ');
  }
  // Buang kata metode bayar (sudah tidak dipakai sejak v36) supaya catatan tetap bersih.
  note=note.replace(PAY_WORDS_RE,' ').replace(/\b(pakai|pake|pakek|via|lewat|bayar|byr)\s*$/i,' ');
  note=note.trim().replace(/\s+/g,' ');
  return {amount:Math.round(amount),note,unit:!!(m&&m[2])};
}
function guessCategory(note){
  let lower=' '+note.toLowerCase()+' ';
  for(let type of ['daily','recurring']){
    let customs=db.customCategories[type]||[];
    for(let c of customs)if(lower.includes(c.toLowerCase()))return {cat:c,type};
  }
  for(let c of dailyCats)if(lower.includes(c.toLowerCase()))return {cat:c,type:'daily'};
  for(let c of recurringCats)if(lower.includes(c.toLowerCase()))return {cat:c,type:'recurring'};
  const learned=learnedCategory(note);if(learned)return learned;
  for(let [re,c] of CAT_KEYWORDS)if(re.test(lower))return {cat:c,type:dailyCats.includes(c)?'daily':'recurring'};
  return null;
}
function guessSource(note){
  let lower=' '+note.toLowerCase()+' ';
  let used=catsFor('income');
  for(let s of used)if(lower.includes(s.toLowerCase()))return s;
  for(let [re,s] of SOURCE_KEYWORDS)if(re.test(lower))return s;
  return null;
}
$('#smartForm').addEventListener('submit',e=>{
  e.preventDefault();
  let raw=$('#smartQuickInput').value.trim();
  if(!raw)return;
  db=load();
  const incRe=/^(\+|(pemasukan|terima|dapat|masuk|plus)\b)\s*/i;
  let isInc=incRe.test(raw),p=parseSmartInput(raw.replace(incRe,''));
  if(p.amount<=0){
    $('#smartForm').classList.remove('err');void $('#smartForm').offsetWidth;$('#smartForm').classList.add('err');
    toast('Nominalnya belum ada, mis. "kopi 15rb".');
    return;
  }
  $('#smartQuickInput').value='';
  $('#smartQuickInput').blur();
  if(isInc){
    let src=guessSource(p.note);
    if(!src){openSheet({kind:'income',amount:p.amount,note:p.note,pickCat:true});return}
    if(!p.unit&&p.amount<1000){
      const f=fixSmallAmount(p.amount,src,true);
      if(!f){openSheet({kind:'income',cat:src,amount:p.amount*1000,note:p.note});setSheetMsg('Cek lagi nominalnya — "'+raw+'" tanpa satuan (rb/jt).',true);return}
      p.amount=f;
    }
    let note=p.note.toLowerCase()===src.toLowerCase()?'':p.note,id=newId();
    db.incomes.push({id,date:day(),source:src,note,amount:p.amount});
    save();render();
    toast('+'+fmt(p.amount)+' · '+src+' tersimpan',()=>{db=load();db.incomes=db.incomes.filter(v=>v.id!==id);save()});
    return;
  }
  let g=guessCategory(p.note);
  if(!p.unit&&p.amount<1000)p.amount=fixSmallAmount(p.amount,g&&g.cat,false);
  if(!g){openSheet({kind:'daily',amount:p.amount,note:p.note,pickCat:true});return}
  let note=p.note.toLowerCase()===g.cat.toLowerCase()?'':p.note,id=newId();
  const ev=activeEvent();
  const dup=findDuplicate(false,g.cat,p.amount,day()),unu=unusualRatio(g.cat,p.amount);
  db.expenses.push(Object.assign({id,date:day(),type:g.type,category:g.cat,note,amount:p.amount},ev?{eventId:ev.id}:{},autoSpread(g.cat,p.amount)?{spread:true}:{}));
  save();render();
  toast('−'+fmt(p.amount)+' · '+g.cat+' tersimpan'+(dup?' · mirip catatan '+agoText(dup.ago)+', urungkan kalau dobel':unusualText(unu)),()=>{db=load();db.expenses=db.expenses.filter(v=>v.id!==id);save()});
});
$('#smartQuickInput').addEventListener('input',()=>$('#smartForm').classList.remove('err'));

// ---------- Navigasi ----------
const MAIN_PAGES=['home','tx','report','more'];
function goToPanel(name,fromHistory){
  let page=$('#'+name);if(!page)return;
  let isSub=!MAIN_PAGES.includes(name);
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===name));
  let navName=isSub?(page.dataset.parent||'more'):name;
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===navName));
  $('#topbar').classList.toggle('hidden',name!=='home');
  window.scrollTo(0,0);
  if(!fromHistory){
    try{
      if(isSub)history.pushState({p:name,sub:true},'');
      else history.replaceState({p:name},'');
    }catch(e){}
  }
  if(name==='report')requestAnimationFrame(renderCharts);
  if(name==='advice')updateClaudePreview();
}
function goBack(){
  if(history.state&&history.state.sub)history.back();
  else goToPanel('more');
}
window.addEventListener('popstate',e=>{
  $$('.sheet-wrap').forEach(s=>{if(s.id!=='profileModal'&&!(s.id==='onboard'&&!db.profile))s.classList.add('hidden')});
  goToPanel((e.state&&e.state.p)||'home',true);
});
try{history.replaceState({p:'home'},'')}catch(e){}
$$('.nav-btn').forEach(b=>b.onclick=()=>goToPanel(b.dataset.nav));
$('#healthPill').onclick=()=>goToPanel('advice');
$('#reportSeg').addEventListener('click',e=>{
  let b=e.target.closest('[data-rseg]');if(!b)return;
  $$('#reportSeg button').forEach(x=>x.classList.toggle('on',x===b));
  $$('#report .pane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+b.dataset.rseg));
  requestAnimationFrame(renderCharts);
});
// ---------- Klik global (delegasi) ----------
document.addEventListener('click',e=>{
  let t=e.target;
  let back=t.closest('[data-back]');
  if(back){goBack();return}
  let go=t.closest('[data-goto]');
  if(go){
    goToPanel(go.dataset.goto);
    if(go.dataset.scroll)setTimeout(()=>$('#'+go.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'}),120);
    return;
  }
  let open=t.closest('[data-open]');
  if(open){openEdit(open.dataset.open,open.dataset.id);return}
  let quick=t.closest('[data-quick]');
  if(quick){openSheet({kind:quick.dataset.quick,cat:quick.dataset.cat,amount:Number(quick.dataset.amt)});return}
  let heat=t.closest('[data-heat]');
  if(heat){$('#heatmapInfo').textContent=heat.dataset.heat;return}
  let rt=t.closest('[data-rt-delete]');
  if(rt){
    let id=rt.dataset.rtDelete;
    db=load();
    let tpl=db.recurringTemplates.find(x=>String(x.id)===id);
    if(!tpl)return;
    if(!confirm('Hapus tagihan otomatis "'+tpl.category+'" ('+fmt(tpl.amount)+')? Transaksi yang sudah tercatat tidak ikut terhapus.'))return;
    db.recurringTemplates=db.recurringTemplates.filter(x=>String(x.id)!==id);
    save();render();
    toast('Tagihan dihapus.',()=>{db=load();db.recurringTemplates.push(tpl);save()});
  }
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(!$('#quickInputModal').classList.contains('hidden'))return;
  ['#txSheet','#aboutModal'].forEach(s=>$(s).classList.add('hidden'));
});

// ---------- Profil, panduan, tentang ----------
function openProfile(edit=false){
  $('#profileTitle').textContent=edit?'Ubah nama panggilan':'Selamat datang';
  $('#nameInput').value=db.profile?.name||'';
  $('#cancelProfile').style.display=edit?'flex':'none';
  $('#profileModal').classList.remove('hidden');
  setTimeout(()=>$('#nameInput').focus(),250);
}
$('#profileBtn').onclick=()=>openProfile(true);
$('#saveProfile').onclick=()=>{
  let name=$('#nameInput').value.trim();
  if(!name){$('#profileTitle').textContent='Isi nama panggilan dulu ya';return}
  db=load();
  db.profile={name,total:Number(db.profile?.total||0)};
  save();
  $('#profileModal').classList.add('hidden');
  render();
};
$('#nameInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#saveProfile').click()}});
$('#cancelProfile').onclick=()=>$('#profileModal').classList.add('hidden');
$('#profileModal').addEventListener('click',e=>{if(e.target===$('#profileModal')&&db.profile)$('#profileModal').classList.add('hidden')});

const TIPS_KEY='cmoneytracker-tips-seen-v39';
function maybeShowTips(){
  try{if(!localStorage.getItem(TIPS_KEY))$('#tipsModal').classList.remove('hidden')}catch(e){}
}
$('#helpBtn').onclick=()=>$('#tipsModal').classList.remove('hidden');
$('#closeTips').onclick=()=>{
  $('#tipsModal').classList.add('hidden');
  try{localStorage.setItem(TIPS_KEY,'1')}catch(e){}
};
$('#aboutBtn').onclick=()=>$('#aboutModal').classList.remove('hidden');
$('#closeAbout').onclick=()=>$('#aboutModal').classList.add('hidden');
$('#aboutModal').addEventListener('click',e=>{if(e.target===$('#aboutModal'))$('#aboutModal').classList.add('hidden')});

// ---------- Sembunyikan saldo ----------
const HIDE_KEY='cmoneytracker-hide-balance';
function applyPrivacy(on){
  $('#app').classList.toggle('privacy',on);
  $('#toggleHide use').setAttribute('href',on?'#i-eye-off':'#i-eye');
  $('#toggleHide').setAttribute('aria-label',on?'Tampilkan saldo':'Sembunyikan saldo');
}
try{applyPrivacy(localStorage.getItem(HIDE_KEY)==='1')}catch(e){}
$('#toggleHide').onclick=()=>{
  let on=!$('#app').classList.contains('privacy');
  applyPrivacy(on);
  try{localStorage.setItem(HIDE_KEY,on?'1':'0')}catch(e){}
};

// ---------- Cari & filter ----------
let searchDebounce;
$('#searchInput').oninput=()=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(render,250)};
$('#filterCategory').onchange=render;
const shiftMonth=(mm,delta)=>{let [y,m]=mm.split('-').map(Number);let d=new Date(y,m-1+delta,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
$('#prevMonthBtn').onclick=()=>{viewMonth=shiftMonth(viewMonth,-1);render()};
$('#nextMonthBtn').onclick=()=>{if(viewMonth>=month())return;viewMonth=shiftMonth(viewMonth,1);render()};

// ---------- Backup & ekspor ----------
async function imgDataUrl(src){
  const blob=await (await fetch(src)).blob();
  return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)});
}
function downloadBlob(blob,name){
  let url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('#exportBtn').onclick=()=>{
  db=load();
  downloadBlob(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),'cmoneytracker-backup-'+day()+'.json');
  toast('Backup diunduh.');
};
function combinedRows(){
  db=load();
  let rows=[
    ...db.expenses.map(x=>({date:x.date,tipe:x.type==='daily'?'Harian':'Berkala',label:x.category,note:x.note||'',amount:x.amount})),
    ...db.incomes.map(x=>({date:x.date,tipe:'Pemasukan',label:x.source,note:x.note||'',amount:x.amount}))
  ];
  return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
const getExportScope=()=>document.querySelector('input[name="exportScope"]:checked').value;
$('#exportCsvBtn').onclick=()=>{
  let scope=getExportScope(),data=combinedRows();
  if(scope==='month')data=data.filter(x=>x.date.startsWith(viewMonth));
  let rows=[['Tanggal','Tipe','Kategori/Sumber','Catatan','Nominal'],...data.map(x=>[x.date,x.tipe,x.label,x.note,x.amount])];
  let csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  downloadBlob(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),'cmoneytracker-'+(scope==='month'?viewMonth:'semua-data')+'.csv');
  toast('CSV diunduh.');
};
$('#exportPdfBtn').onclick=async()=>{
  $('#exportStatus').textContent='Menyiapkan PDF...';
  try{
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    db=load();
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();
    const scope=getExportScope();
    const saldo=getSaldo();
    let data,periodLabel,incomeSum,expenseSum;
    if(scope==='month'){
      data=combinedRows().filter(x=>x.date.startsWith(viewMonth));
      periodLabel=monthName(viewMonth);
      expenseSum=db.expenses.filter(x=>x.date.startsWith(viewMonth)).reduce((s,x)=>s+Number(x.amount||0),0);
      incomeSum=db.incomes.filter(x=>x.date.startsWith(viewMonth)).reduce((s,x)=>s+Number(x.amount||0),0);
    }else{
      data=combinedRows();
      periodLabel='Semua data';
      expenseSum=db.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
      incomeSum=db.incomes.reduce((s,x)=>s+Number(x.amount||0),0);
    }
    doc.setFillColor(12,10,22);doc.rect(0,0,210,30,'F');
    try{doc.addImage(await imgDataUrl('icons/logo-ring.png'),'PNG',14,7,16,16)}catch(e){}
    doc.setTextColor(244,242,255);doc.setFontSize(16);doc.text('Laporan Keuangan - '+periodLabel,35,15);
    doc.setFontSize(10);doc.setTextColor(139,130,182);doc.text('CMoney Tracker · '+db.profile.name,35,22);
    doc.setTextColor(60);
    doc.text('Saldo tersedia: '+fmtSigned(saldo),14,40);
    doc.text((scope==='month'?'Pemasukan bulan ini: ':'Total pemasukan: ')+fmt(incomeSum)+'     '+(scope==='month'?'Pengeluaran bulan ini: ':'Total pengeluaran: ')+fmt(expenseSum),14,46);
    doc.autoTable({
      startY:52,
      head:[['Tanggal','Tipe','Kategori/Sumber','Catatan','Nominal']],
      body:data.map(x=>[x.date,x.tipe,x.label,x.note||'-',fmt(x.amount)]),
      styles:{fontSize:8},
      headStyles:{fillColor:[108,78,248]},
      alternateRowStyles:{fillColor:[244,242,255]}
    });
    doc.save('cmoneytracker-'+(scope==='month'?viewMonth:'semua-data')+'.pdf');
    $('#exportStatus').textContent='';
    toast('PDF diunduh.');
  }catch(err){
    flash('#exportStatus','Gagal membuat PDF, cek koneksi internet.',3000);
  }
};
$('#exportXlsxBtn').onclick=async()=>{
  $('#exportStatus').textContent='Menyiapkan Excel...';
  try{
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    db=load();
    const scope=getExportScope();
    const wb=XLSX.utils.book_new();
    let txData=combinedRows();
    let expensesForSummary=db.expenses,incomesForSummary=db.incomes;
    if(scope==='month'){
      txData=txData.filter(x=>x.date.startsWith(viewMonth));
      expensesForSummary=db.expenses.filter(x=>x.date.startsWith(viewMonth));
      incomesForSummary=db.incomes.filter(x=>x.date.startsWith(viewMonth));
    }
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(txData.map(x=>({Tanggal:x.date,Tipe:x.tipe,'Kategori/Sumber':x.label,Catatan:x.note,Nominal:Number(x.amount)}))),'Transaksi');
    let totals={};
    expensesForSummary.forEach(x=>totals[x.category]=(totals[x.category]||0)+Number(x.amount||0));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(Object.entries(totals).map(([k,v])=>({Kategori:k,Total:v}))),'Ringkasan Pengeluaran');
    let incTotals={};
    incomesForSummary.forEach(x=>incTotals[x.source]=(incTotals[x.source]||0)+Number(x.amount||0));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(Object.entries(incTotals).map(([k,v])=>({Sumber:k,Total:v}))),'Ringkasan Pemasukan');
    XLSX.writeFile(wb,'cmoneytracker-'+(scope==='month'?viewMonth:'semua-data')+'.xlsx');
    $('#exportStatus').textContent='';
    toast('Excel diunduh.');
  }catch(err){
    flash('#exportStatus','Gagal membuat Excel, cek koneksi internet.',3000);
  }
};
function buildShareCardHTML(){
  db=load();
  const mon=month();
  const monthly=db.expenses.filter(x=>x.date.startsWith(mon)&&!isTransferCat(x.category));
  const saldo=getSaldo();
  const monthlyExpense=monthly.reduce((s,x)=>s+Number(x.amount||0),0);
  const monthlyIncome=db.incomes.filter(x=>x.date.startsWith(mon)&&!isTransferIncome(x)).reduce((s,x)=>s+Number(x.amount||0),0);
  const totals={};
  monthly.forEach(x=>totals[x.category]=(totals[x.category]||0)+Number(x.amount||0));
  const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const max=top.length?top[0][1]:1;
  const F="font-family:'Archivo',sans-serif;";
  return '<div style="width:380px;padding:26px;background:#0c0a16;color:#f4f2ff;'+F+'border-radius:24px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><img src="icons/logo-ring.png" width="30" height="30" style="display:block"><div><div style="font-size:17px;font-weight:800;letter-spacing:-.035em;line-height:1">CMoney</div><div style="font-size:8px;font-weight:600;letter-spacing:.34em;color:#8b82b6;margin-top:3px">TRACKER</div></div><div style="margin-left:auto;font-size:12px;color:#8b82b6;font-weight:600">'+esc(db.profile.name)+'</div></div>'
    +'<div style="font-size:21px;font-weight:800;margin:2px 0 16px">Ringkasan '+monthName(mon)+'</div>'
    +'<div style="background:linear-gradient(135deg,#9b7cff,#6c4ef8 50%,#5333e6);border-radius:20px;padding:18px;color:#fff;margin-bottom:16px">'
      +'<div style="font-size:12px;opacity:.85">Saldo tersedia</div>'
      +'<div style="font-size:28px;font-weight:800;margin:2px 0 12px">'+fmtSigned(saldo)+'</div>'
      +'<div style="display:flex;gap:10px">'
        +'<div style="flex:1;background:rgba(255,255,255,.16);border-radius:12px;padding:8px 10px"><div style="font-size:10.5px;opacity:.85">Pemasukan</div><div style="font-size:14px;font-weight:700">'+fmt(monthlyIncome)+'</div></div>'
        +'<div style="flex:1;background:rgba(255,255,255,.16);border-radius:12px;padding:8px 10px"><div style="font-size:10.5px;opacity:.85">Pengeluaran</div><div style="font-size:14px;font-weight:700">'+fmt(monthlyExpense)+'</div></div>'
      +'</div></div>'
    +(top.length?'<div style="font-size:13px;font-weight:700;margin-bottom:8px">Pengeluaran terbesar</div>':'')
    +top.map(([c,v],i)=>'<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span>'+emojiOf(c)+' '+esc(c)+'</span><b>'+fmt(v)+'</b></div><div style="height:7px;border-radius:99px;background:#282342"><div style="height:100%;border-radius:99px;background:'+pieColors[i]+';width:'+Math.max(6,Math.round(v/max*100))+'%"></div></div></div>').join('')
    +'<div style="margin-top:14px;font-size:10.5px;color:#5c5584;text-align:right">dibuat dengan CMoney Tracker</div>'
  +'</div>';
}
$('#exportImageBtn').onclick=async()=>{
  db=load();
  if(!db.profile)return;
  $('#exportStatus').textContent='Menyiapkan gambar...';
  try{
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    let holder=document.createElement('div');
    holder.style.cssText='position:fixed;left:-9999px;top:0';
    holder.innerHTML=buildShareCardHTML();
    document.body.appendChild(holder);
    const canvas=await html2canvas(holder.firstElementChild,{backgroundColor:null,scale:2});
    document.body.removeChild(holder);
    canvas.toBlob(blob=>{
      const file=new File([blob],'cmoneytracker-ringkasan.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'Ringkasan CMoney Tracker'}).catch(()=>{});
      }else downloadBlob(blob,'cmoneytracker-ringkasan-'+month()+'.png');
      $('#exportStatus').textContent='';
      toast('Gambar siap.');
    },'image/png');
  }catch(err){
    flash('#exportStatus','Gagal membuat gambar, cek koneksi internet.',3000);
  }
};
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=e=>{
  let file=e.target.files[0];
  if(!file)return;
  let reader=new FileReader();
  reader.onload=()=>{
    try{
      let parsed=JSON.parse(reader.result);
      if(!parsed||!Array.isArray(parsed.expenses)||!parsed.profile){flash('#backupStatus','File backup tidak valid.',3000);return}
      if(!confirm('Pulihkan data dari file ini? Data yang ada sekarang di perangkat ini akan ditimpa.'))return;
      localStorage.setItem(KEY,JSON.stringify(parsed));
      lastSaldoAnimated=null;
      render();
      toast('Data berhasil dipulihkan.');
    }catch(err){
      flash('#backupStatus','Gagal membaca file backup.',3000);
    }
    e.target.value='';
  };
  reader.readAsText(file);
};

// ---------- Tema ----------
function applyTheme(light){
  if(light)document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  $('#themeColorMeta').content=light?'#f4f3f8':'#0c0a16';
  $('#themeSwitch').checked=!light;
}
applyTheme(isLight());
$('#themeSwitch').onchange=()=>{
  let light=!$('#themeSwitch').checked;
  applyTheme(light);
  try{localStorage.setItem('kantong-theme',light?'light':'dark')}catch(e){}
  renderCharts();
};

// ---------- Install PWA ----------
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  $('#installBtn').classList.remove('hidden');
});
$('#installBtn').onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  $('#installBtn').classList.add('hidden');
};
window.addEventListener('appinstalled',()=>$('#installBtn').classList.add('hidden'));
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{})});
}
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if($('#report').classList.contains('active'))renderCharts()},200)});

/*__SECURITY__*/

/*__FEATURES__*/
/*__FUN__*/
/*__DETAIL__*/
/*__LOGIC__*/
/*__PLAN__*/
/*__REVIEW__*/
/*__DESIGN__*/
/*__HOME__*/
/*__NATIVE__*/
render();
handleShortcut();
// Splash singkat saat aplikasi dibuka
setTimeout(()=>{const sp=$('#splash');if(!sp)return;sp.classList.add('gone');setTimeout(()=>sp.remove(),400)},650);
})();
