// ================= Logika pintar =================
const tsOfId=id=>{const n=Number(String(id).slice(0,13));return n>1e12&&n<4e12?n:0};
const normNote=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const STOPW=new Set(['di','ke','dan','yang','buat','untuk','sama','beli','bayar','ama','dari','pagi','siang','sore','malam','tadi','lagi','sm','yg','utk','dgn','dengan']);
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),h=s.length>>1;return s.length%2?s[h]:(s[h-1]+s[h])/2};
const agoText=ms=>ms<60000?'barusan':Math.round(ms/60000)+' menit lalu';
const WD=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const typeOfCat=c=>{const last=[...db.expenses].reverse().find(x=>x.category===c);if(last)return last.type;return dailyCats.includes(c)||(db.customCategories.daily||[]).includes(c)?'daily':'recurring'};
const patternOf=(c,CMx)=>((CMx||{})[c]||{}).pattern||(db.categoryPattern||{})[c]||(LUMP_DEFAULT.includes(c)?'lump':'spread');

// ---------- 1. Belajar kategori dari catatanmu sendiri ----------
function learnedCategory(note){
  const n=normNote(note);if(!n)return null;
  const rows=db.expenses.filter(x=>!x.templateId&&x.note).map(x=>({c:x.category,n:normNote(x.note)})).filter(r=>r.n);
  if(!rows.length)return null;
  const tally=pred=>{const t={};rows.forEach(r=>{if(pred(r.n))t[r.c]=(t[r.c]||0)+1});const e=Object.entries(t).sort((a,b)=>b[1]-a[1]);return {top:e[0],tot:e.reduce((s,x)=>s+x[1],0)}};
  let best=null;
  const ex=tally(v=>v===n);
  if(ex.top&&ex.top[1]>=2&&ex.top[1]/ex.tot>=0.6)best=ex.top;
  else{
    n.split(' ').filter(w=>w.length>=3&&!STOPW.has(w)&&!/^\d+$/.test(w)).forEach(w=>{
      const t=tally(v=>(' '+v+' ').includes(' '+w+' '));
      if(t.top&&t.top[1]>=2&&t.top[1]/t.tot>=0.7&&(!best||t.top[1]>best[1]))best=t.top;
    });
  }
  return best?{cat:best[0],type:typeOfCat(best[0]),learned:true}:null;
}

// ---------- 2. Nominal: tebak ribuan & nominal yang biasa ----------
const typicalAmounts=c=>db.expenses.filter(x=>x.category===c&&!x.templateId).map(x=>Number(x.amount)).filter(v=>v>0);
function fixSmallAmount(v,c,income){
  if(v<=0||v>=1000)return v;
  const xs=income?db.incomes.filter(x=>x.source===c).map(x=>Number(x.amount)):(c?typicalAmounts(c):[]);
  const opts=income?[v*1000,v*1e6]:[v,v*1000];
  if(xs.length>=3){const md=median(xs);return opts.sort((a,b)=>Math.abs(Math.log(a/md))-Math.abs(Math.log(b/md)))[0]}
  return income?null:v*1000;
}
function frequentAmounts(c,n=3){
  const f={};typicalAmounts(c).slice(-60).forEach(v=>f[v]=(f[v]||0)+1);
  return Object.entries(f).filter(([,k])=>k>=2).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,n).map(([v])=>Number(v));
}

// ---------- 3. Transaksi dobel & tidak biasa ----------
function findDuplicate(isInc,cat,amount,date,excludeId){
  const arr=isInc?db.incomes:db.expenses,now=Date.now();
  return arr.filter(x=>x.id!==excludeId&&!x.templateId&&(isInc?x.source:x.category)===cat&&Number(x.amount)===amount&&x.date===date)
    .map(x=>({x,ago:tsOfId(x.id)?now-tsOfId(x.id):null})).filter(o=>o.ago!==null&&o.ago>=0&&o.ago<15*60000).sort((a,b)=>a.ago-b.ago)[0]||null;
}
const catStats=cat=>memo('cs:'+cat,()=>{const xs=typicalAmounts(cat);return {n:xs.length,md:median(xs)}});
function unusualRatio(cat,amount,excludeId){
  const S=catStats(cat);
  if((excludeId?S.n-1:S.n)<5)return 0;
  const md=S.md;
  return md>0&&amount>=md*3&&amount>=30000?amount/md:0;
}
const unusualText=r=>r?' · '+(r>=10?'>10':Math.round(r))+'× lebih besar dari biasanya':'';
function monthDuplicates(){
  const xs=db.expenses.filter(x=>x.date.startsWith(month())&&!x.templateId&&Number(x.amount)>=10000&&tsOfId(x.id));
  const g={};xs.forEach(x=>{const k=[x.date,x.category,x.amount,normNote(x.note)].join('|');(g[k]=g[k]||[]).push(x)});
  const out=[];
  Object.values(g).forEach(a=>{
    if(a.length<2)return;
    a.sort((p,q)=>tsOfId(p.id)-tsOfId(q.id));
    for(let i=1;i<a.length;i++)if(tsOfId(a[i].id)-tsOfId(a[i-1].id)<5*60000){out.push(a[i]);}
  });
  return out;
}
function monthUnusual(){
  return db.expenses.filter(x=>x.date.startsWith(month())&&!x.templateId).map(x=>({x,r:unusualRatio(x.category,Number(x.amount),x.id)})).filter(o=>o.r).sort((a,b)=>b.r-a.r);
}

// ---------- 4. Deteksi pengeluaran rutin & tanggal gajian ----------
function recurringSuggestions(){return memo('recsug',recurringSuggestionsRaw)}
function recurringSuggestionsRaw(){
  const months=pastMonths(3),cur=month();
  const tplCats=new Set((db.recurringTemplates||[]).map(t=>t.category));
  const dis=db.logicDismiss||{};
  const groups={};
  db.expenses.filter(x=>!x.templateId&&months.some(m=>x.date.startsWith(m))).forEach(x=>{
    const k=x.category+'|'+normNote(x.note);(groups[k]=groups[k]||[]).push(x);
  });
  const out=[];
  Object.entries(groups).forEach(([k,xs])=>{
    const cat=k.slice(0,k.lastIndexOf('|'));
    if(tplCats.has(cat)||dis['rec:'+k])return;
    const byM={};xs.forEach(x=>{const m=x.date.slice(0,7);byM[m]=(byM[m]||0)+1});
    if(Object.keys(byM).length<3||Object.values(byM).some(n=>n!==1))return;
    const amts=xs.map(x=>Number(x.amount)),md=median(amts);
    if(md<10000||amts.some(a=>Math.abs(a-md)>md*0.15))return;
    const days=xs.map(x=>Number(x.date.slice(8,10))),dd=median(days);
    if(days.some(d=>Math.abs(d-dd)>5))return;
    const latest=[...xs].sort((a,b)=>b.date.localeCompare(a.date))[0];
    const thisMonth=db.expenses.find(x=>!x.templateId&&x.date.startsWith(cur)&&x.category===cat&&normNote(x.note)===k.slice(k.lastIndexOf('|')+1));
    out.push({key:k,cat,note:String(latest.note||'').replace(/\s*\(otomatis\)/,'').trim(),amount:Math.round(Number(latest.amount)),day:Math.max(1,Math.min(28,Math.round(dd))),paidId:thisMonth?thisMonth.id:null});
  });
  return out;
}
function applyRecurring(s){
  db=load();
  const id=newId();
  db.recurringTemplates.push({id,category:s.cat,amount:s.amount,dayOfMonth:s.day,note:s.note});
  if(s.paidId){const x=db.expenses.find(v=>v.id===s.paidId);if(x)x.templateId=id}
  save();render();
  toast(s.cat+' '+fmt(s.amount)+' jadi tagihan otomatis tiap tgl '+s.day+'.');
}
function detectPayday(){
  if(db.payday)return null;
  const months=[month(),...pastMonths(3)];
  const inc=db.incomes.filter(x=>months.some(m=>x.date.startsWith(m)));
  const tot={};inc.forEach(x=>tot[x.source]=(tot[x.source]||0)+Number(x.amount||0));
  const src=tot['Gaji']?'Gaji':(Object.entries(tot).sort((a,b)=>b[1]-a[1])[0]||[])[0];
  if(!src)return null;
  const days=[];
  months.forEach(m=>{const xs=inc.filter(x=>x.source===src&&x.date.startsWith(m)).sort((a,b)=>b.amount-a.amount);if(xs.length)days.push(Number(xs[0].date.slice(8,10)))});
  if(days.length<2)return null;
  const md=Math.round(median(days));
  if(days.some(d=>Math.abs(d-md)>3))return null;
  return {day:md,src,n:days.length};
}

// ---------- 5. Saldo bertahan (simulasi harian) ----------
function usualDay(c){
  const d=db.expenses.filter(x=>x.category===c&&pastMonths(3).some(m=>x.date.startsWith(m))).map(x=>Number(x.date.slice(8,10)));
  return d.length?Math.round(median(d)):1;
}
function simulateRunway(A){
  const today=day(),saldo=A.saldo,rate=A.avgDaily;
  if(saldo<=0)return {days:0,date:today,reason:'saldo'};
  const lumps=Object.values(A.CM).filter(m=>m.pattern==='lump'&&m.avgWhenPaid>0&&m.paidMonths>=2&&m.validMonths>=2&&m.paidMonths/m.validMonths>=0.75)
    .filter(m=>!(db.recurringTemplates||[]).some(t=>t.category===m.c)).map(m=>({c:m.c,amt:m.avgWhenPaid,day:usualDay(m.c),paidNow:m.spent>0}));
  const until=addDays(today,120);
  const ev={};
  const put=(d,v)=>{ev[d]=(ev[d]||0)+v};
  (db.recurringTemplates||[]).forEach(t=>tplUpcoming(t,until).forEach(d=>put(d,Number(t.amount||0))));
  // tagihan bulanan untuk bulan ke-4 dst tidak terjangkau tplUpcoming → cukup untuk 120 hari (±3 bulan)
  const base=new Date(today+'T12:00');
  for(let k=0;k<5;k++){
    const y=base.getFullYear(),mo=base.getMonth()+k;
    lumps.forEach(l=>{
      if(k===0&&l.paidNow)return;
      let d=ymd(new Date(y,mo,Math.min(l.day,new Date(y,mo+1,0).getDate())));
      if(k===0&&d<today)d=today;
      if(d<=until)put(d,l.amt);
    });
  }
  let s=saldo-(ev[today]||0);
  if(s<0)return {days:0,date:today,reason:'tagihan'};
  if(rate<=0&&!Object.keys(ev).length)return null;
  for(let i=1;i<=120;i++){
    const d=addDays(today,i);
    s-=rate+(ev[d]||0);
    if(s<0)return {days:i,date:d};
  }
  return {days:Infinity,date:null};
}
function runwayLabel(R,pd){
  if(!R)return {text:'Belum ada data',long:'Belum ada data',tone:''};
  if(R.days===0)return {text:R.reason==='tagihan'?'Kurang':'Sudah habis',long:R.reason==='tagihan'?'Saldo kurang untuk tagihan':'Sudah habis',tone:'red'};
  if(R.days===Infinity)return {text:'> 4 bulan',long:'Lebih dari 4 bulan',tone:'green'};
  const short=pd&&R.date<=pd.date;
  return {text:'~'+R.days+' hari',long:'~'+R.days+' hari (s.d. '+shortDate(R.date)+')'+(pd?(short?' · sebelum gajian':' · aman s.d. gajian'):''),tone:short?'red':(R.days<=7?'amber':'')};
}

// ---------- 6. Pola kebiasaan ----------
function habitStats(CMx){return memo('habit',()=>habitStatsRaw(CMx))}
function habitStatsRaw(CMx){
  const today=day(),first=db.expenses.reduce((m,x)=>!m||x.date<m?x.date:m,null);
  if(!first)return null;
  const since=[addDays(today,-83),first].sort().pop();
  const span=daysBetween(since,today)+1;
  const med={};
  db.expenses.forEach(x=>{if(!x.templateId)(med[x.category]=med[x.category]||[]).push(Number(x.amount))});
  Object.keys(med).forEach(c=>med[c]=med[c].length>=5?median(med[c]):0);
  const outlier=x=>med[x.category]>0&&Number(x.amount)>=med[x.category]*3&&Number(x.amount)>=30000;
  const xs=db.expenses.filter(x=>x.date>=since&&x.date<=today&&!x.templateId&&patternOf(x.category,CMx)==='spread'&&!outlier(x));
  if(xs.length<10||span<14)return null;
  const wdSum=Array(7).fill(0),wdCnt=Array(7).fill(0);
  for(let i=0;i<span;i++){wdCnt[new Date(addDays(since,i)+'T12:00').getDay()]++}
  xs.forEach(x=>{wdSum[new Date(x.date+'T12:00').getDay()]+=Number(x.amount)});
  const wdAvg=wdSum.map((s,i)=>wdCnt[i]?s/wdCnt[i]:0);
  const order=[1,2,3,4,5,6,0];
  const peak=order.reduce((b,i)=>wdAvg[i]>wdAvg[b]?i:b,1);
  const low=order.reduce((b,i)=>wdAvg[i]<wdAvg[b]?i:b,1);
  const we=(wdSum[0]+wdSum[6])/Math.max(1,wdCnt[0]+wdCnt[6]);
  const wk=[1,2,3,4,5].reduce((s,i)=>s+wdSum[i],0)/Math.max(1,[1,2,3,4,5].reduce((s,i)=>s+wdCnt[i],0));
  // minggu ini vs minggu-minggu sebelumnya (sampai hari yang sama)
  const tdw=(new Date(today+'T12:00').getDay()+6)%7; // 0=Senin
  const weekStart=addDays(today,-tdw);
  const thisWeek=sumAmt(xs.filter(x=>x.date>=weekStart));
  const prev=[];
  for(let w=1;w<=8;w++){
    const s=addDays(weekStart,-7*w),e=addDays(s,tdw);
    if(s<since)break;
    prev.push(sumAmt(xs.filter(x=>x.date>=s&&x.date<=e)));
  }
  const weekAvg=prev.length>=2?prev.reduce((a,b)=>a+b,0)/prev.length:null;
  // awal bulan (tgl 1-10) vs akhir bulan (tgl 21+)
  let e1=0,n1=0,e3=0,n3=0;
  for(let i=0;i<span;i++){const d=Number(addDays(since,i).slice(8,10));if(d<=10)n1++;else if(d>20)n3++}
  xs.forEach(x=>{const d=Number(x.date.slice(8,10));if(d<=10)e1+=Number(x.amount);else if(d>20)e3+=Number(x.amount)});
  const early=n1?e1/n1:0,late=n3?e3/n3:0;
  const catT={};xs.forEach(x=>catT[x.category]=(catT[x.category]||0)+Number(x.amount));
  const topCat=Object.entries(catT).sort((a,b)=>b[1]-a[1])[0];
  return {span,wdAvg,order,peak,low,we,wk,thisWeek,weekAvg,tdw,early,late,n1,n3,topCat,total:sumAmt(xs)};
}

// ---------- 7. Saran anggaran otomatis (50/30/20) ----------
function autoBudget(A){
  const I=A.refIncome>0?A.refIncome:A.expectedIncome;
  if(!(I>0))return null;
  const rows=[];
  const known=new Set(getAllCats());
  Object.values(A.CM).forEach(m=>{
    if(!known.has(m.c))return;
    let base=m.validMonths?(m.pattern==='lump'?(m.avgWhenPaid||m.histAvg):m.histAvg):m.proj;
    if(m.pattern==='lump'&&m.validMonths&&m.paidMonths/m.validMonths<0.75)base=m.histAvg;
    const t=(db.recurringTemplates||[]).filter(t=>t.category===m.c).reduce((s,t)=>s+tplMonthly(t),0);
    base=Math.max(base,t);
    if(base>0)rows.push({c:m.c,cls:classOf(m.c),pattern:m.pattern,base});
  });
  (db.recurringTemplates||[]).forEach(t=>{if(known.has(t.category)&&!rows.some(r=>r.c===t.category))rows.push({c:t.category,cls:classOf(t.category),pattern:'lump',base:tplMonthly(t)})});
  if(!rows.length)return null;
  const needs=rows.filter(r=>r.cls==='need').reduce((s,r)=>s+r.base,0);
  const wants=rows.filter(r=>r.cls==='want').reduce((s,r)=>s+r.base,0);
  const wantBudget=Math.min(I*0.3,Math.max(0,I*0.8-needs));
  const scale=wants>0?Math.min(1,wantBudget/wants):1;
  rows.forEach(r=>{
    r.sug=r.cls==='need'?Math.ceil(r.base*(r.pattern==='lump'?1:1.05)/10000)*10000:Math.max(0,Math.floor(r.base*scale/10000)*10000);
  });
  rows.sort((a,b)=>b.sug-a.sug);
  const total=rows.reduce((s,r)=>s+r.sug,0);
  return {I,rows,needs,wants,scale,total,saveAmt:I-total,needHeavy:needs>I*0.5};
}

// ---------- Temuan tambahan untuk analisis ----------
function logicFindings(A,add){
  const dup=monthDuplicates();
  if(dup.length)add('warning','Kemungkinan tercatat dobel ('+dup.length+')',
    dup.slice(0,3).map(x=>x.category+' '+fmt(x.amount)+' tgl '+Number(x.date.slice(8,10))).join(', ')+' — dicatat 2× dalam beberapa menit dengan nominal & catatan yang sama.',
    'Cek di halaman Transaksi dan hapus yang dobel supaya saldo akurat.');
  const un=monthUnusual();
  if(un.length)add('info','Transaksi tidak biasa bulan ini',
    un.slice(0,3).map(o=>o.x.category+' '+fmt(o.x.amount)+' (≈'+Math.round(o.r)+'× biasanya)').join(', ')+'.',
    'Kalau ini sekali saja (mis. beli barang), tidak masalah. Kalau salah ketik nominal, perbaiki di Transaksi.');
  const H=habitStats(A.CM);
  if(H){
    if(H.weekAvg!==null&&H.weekAvg>0&&H.thisWeek>H.weekAvg*1.3&&H.thisWeek-H.weekAvg>=50000)
      add('warning','Minggu ini '+Math.round((H.thisWeek/H.weekAvg-1)*100)+'% lebih boros',
        'Pengeluaran rutin Senin–'+WD[(H.tdw+1)%7]+' minggu ini '+fmt(H.thisWeek)+', biasanya ± '+fmt(H.weekAvg)+' sampai hari yang sama.',
        'Rem dulu sampai akhir minggu: targetkan maksimal '+fmt(Math.max(0,(H.weekAvg/(H.tdw+1))*7-H.thisWeek)/Math.max(1,6-H.tdw))+' per hari.');
    if(H.wk>0&&H.we>H.wk*1.5&&H.we-H.wk>=20000)
      add('tip','Akhir pekan jadi titik bocor',
        'Rata-rata Sabtu–Minggu '+fmt(H.we)+'/hari, hari kerja '+fmt(H.wk)+'/hari ('+Math.round(H.we/H.wk*10)/10+'×).',
        'Tentukan batas akhir pekan di awal, mis. '+fmt(Math.round(H.wk*1.2/5000)*5000)+'/hari, atau rencanakan aktivitas yang lebih hemat.');
    if(H.n1>=10&&H.n3>=10&&H.late>0&&H.early>H.late*1.6&&H.early-H.late>=20000)
      add('tip','Boros di awal bulan, irit di akhir',
        'Tgl 1–10 rata-rata '+fmt(H.early)+'/hari, tgl 21 ke atas '+fmt(H.late)+'/hari. Pola "habis gajian langsung royal" bikin akhir bulan tertekan.',
        'Pakai angka "aman dibelanjakan hari ini" sejak awal bulan supaya ritmenya rata.');
  }
  const rs=recurringSuggestions();
  if(rs.length)add('tip','Pengeluaran rutin terdeteksi',
    rs.slice(0,3).map(s=>s.cat+' '+fmt(s.amount)+' ± tgl '+s.day).join(', ')+' muncul tiap bulan dengan nominal hampir sama.',
    'Jadikan tagihan otomatis (Lainnya → Tagihan otomatis) supaya tidak lupa dicatat dan proyeksi lebih akurat.');
  const pd=detectPayday();
  if(pd)add('tip','Tanggal gajian terdeteksi: tgl '+pd.day,
    pd.src+' biasanya masuk sekitar tanggal '+pd.day+' ('+pd.n+' bulan terakhir).',
    'Atur tanggal gajian (Lainnya → Tanggal gajian) supaya batas harian dihitung sampai gajian berikutnya.');
}

// ---------- UI: saran pintar di Beranda ----------
function smartNudges(A){
  const N=[],dis=db.logicDismiss||{},today=day(),h=new Date().getHours();
  if(h>=19&&!db.expenses.some(x=>x.date===today&&!x.templateId)&&db.expenses.some(x=>x.date>=addDays(today,-3)&&x.date<today))
    N.push({key:'log:'+today,em:'✍️',t:'Belum ada catatan hari ini',s:'Ada makan atau jajan yang belum dicatat?',btn:'Catat',act:'add'});
  A.pendingBills.filter(t=>Number(t.dayOfMonth)===A.de+1).forEach(t=>N.push({key:'bill:'+t.id+':'+today,em:'🗓️',t:'Besok: '+(t.name||t.category)+' '+fmt(t.amount),s:A.saldo<Number(t.amount)?'Saldo belum cukup — siapkan dananya.':'Akan tercatat otomatis.',btn:'Lihat',act:'goto:'+(t.kind==='sub'?'subs':'bills'),tone:A.saldo<Number(t.amount)?'red':''}));
  Object.values(A.CM).filter(m=>m.regular&&!(db.recurringTemplates||[]).some(t=>t.category===m.c)).forEach(m=>{
    const ud=usualDay(m.c);
    if(A.de>=ud+2)N.push({key:'lump:'+m.c+':'+month(),em:catIcon(m.c),tone:'',ic:toneOf(m.c),t:m.c+' belum tercatat',s:'Biasanya dibayar sekitar tgl '+ud+' (±'+fmt(m.avgWhenPaid)+').',btn:'Catat',act:'addcat:'+m.c+':'+Math.round(m.avgWhenPaid)});
  });
  const dup=monthDuplicates();
  if(dup.length)N.push({key:'dup:'+dup.map(x=>x.id).join(','),em:'👯',t:'Ada '+dup.length+' catatan yang mungkin dobel',s:dup[0].category+' '+fmt(dup[0].amount)+' tercatat 2× berdekatan.',btn:'Cek',act:'dup:'+dup[0].category,tone:'amber'});
  if(db.profile&&!db.profile.planAt&&!db.profile.goal)N.push({key:'plan',em:'🎯',t:'Lengkapi rencana keuangan',s:'± 1 menit: pemasukan, pengeluaran tetap & tujuan — supaya saran lebih tepat.',btn:'Mulai',act:'plan'});
  const rv=typeof reviewNudge==='function'?reviewNudge():null;if(rv)N.unshift(rv);
  const bk=typeof backupNudge==='function'?backupNudge():null;if(bk)N.push(bk);
  if(persistState==='off'&&db.expenses.length+db.incomes.length>=20)N.push({key:'persist:'+month(),em:'🔒',t:'Amankan datamu dari terhapus otomatis',s:'Aktifkan penyimpanan permanen di browser.',btn:'Aktifkan',act:'persist'});
  const pd=detectPayday();
  if(pd)N.push({key:'payday',em:'💸',t:'Gajianmu sepertinya tiap tgl '+pd.day,s:'Pakai tanggal ini supaya batas harian dihitung sampai gajian.',btn:'Pakai',act:'payday:'+pd.day});
  const rs=recurringSuggestions()[0];
  if(rs)N.push({key:'rec:'+rs.key,em:'🔁',t:rs.cat+' '+fmt(rs.amount)+' rutin tiap bulan',s:'Jadikan tagihan otomatis tiap tgl '+rs.day+'?',btn:'Jadikan',act:'rec:'+rs.key});
  // kalau sudah ada peringatan utama di atasnya, cukup 2 saran supaya Beranda tidak penuh
  const hasTop=!!(lastAnalysis&&lastAnalysis.findings&&lastAnalysis.findings[0]&&['critical','warning'].includes(lastAnalysis.findings[0].sev));
  return N.filter(n=>!dis[n.key]).slice(0,hasTop?2:3);
}
function renderNudges(A){
  const N=smartNudges(A);
  $('#smartNudges').innerHTML=N.length?'<div class="nudges">'+N.map(n=>'<div class="nudge'+(n.tone?' '+n.tone:'')+'"><span class="nd-em'+(n.ic?' t-'+n.ic:'')+'">'+n.em+'</span><div class="nd-txt"><b>'+esc(n.t)+'</b><small>'+esc(n.s)+'</small></div><button class="nd-btn" data-nudge="'+esc(n.act)+'">'+esc(n.btn)+'</button><button class="nd-x" data-nudge-x="'+esc(n.key)+'" aria-label="Sembunyikan">'+icon('x')+'</button></div>').join('')+'</div>':'';
}
function dismissKey(k){
  db=load();
  const dis=db.logicDismiss,cut=addDays(day(),-60);
  Object.keys(dis).forEach(x=>{if(!/^(rec:|payday)/.test(x)&&dis[x]<cut)delete dis[x]});
  dis[k]=day();save();
}
$('#smartNudges').addEventListener('click',e=>{
  const x=e.target.closest('[data-nudge-x]');
  if(x){dismissKey(x.dataset.nudgeX);render();return}
  const b=e.target.closest('[data-nudge]');if(!b)return;
  const a=b.dataset.nudge;
  if(a==='add')openSheet({});
  else if(a==='plan')openOnboarding(false,0);
  else if(a==='persist')requestPersist(true);
  else if(a==='backup'){$('#exportBtn').click()}
  else if(a.startsWith('review:')){revMonth=a.slice(7);goToPanel('review');renderReview()}
  else if(a.startsWith('addcat:')){const p=a.split(':'),c=p.slice(1,-1).join(':');openSheet({kind:typeOfCat(c),cat:c,amount:Number(p[p.length-1])})}
  else if(a.startsWith('goto:'))goToPanel(a.slice(5));
  else if(a.startsWith('dup:')){goToPanel('tx');viewMonth=month();$('#filterCategory').value=a.slice(4);render()}
  else if(a.startsWith('payday:')){db=load();db.payday=Number(a.slice(7));save();render();toast('Tanggal gajian diatur tiap tgl '+db.payday+'.')}
  else if(a.startsWith('rec:')){const s=recurringSuggestions().find(r=>r.key===a.slice(4));if(s)applyRecurring(s)}
});

// ---------- UI: tagihan terdeteksi ----------
function renderBillSuggestions(){
  const rs=recurringSuggestions();
  $('#billSugCard').classList.toggle('hidden',!rs.length);
  $('#billSugList').innerHTML=rs.map(s=>'<div class="sug-row"><span class="tx-ico t-'+toneOf(s.cat)+'">'+catIcon(s.cat)+'</span><div style="flex:1;min-width:0"><b>'+esc(s.cat)+(s.note?' · '+esc(s.note):'')+'</b><small>'+fmt(s.amount)+' · ± tgl '+s.day+' · 3 bln berturut</small></div><button class="btn btn-soft btn-sm" data-rec-apply="'+esc(s.key)+'">Jadikan</button><button class="nd-x" data-rec-x="'+esc(s.key)+'" aria-label="Abaikan">'+icon('x')+'</button></div>').join('');
}
$('#billSugList').addEventListener('click',e=>{
  const a=e.target.closest('[data-rec-apply]');
  if(a){const s=recurringSuggestions().find(r=>r.key===a.dataset.recApply);if(s)applyRecurring(s);return}
  const x=e.target.closest('[data-rec-x]');
  if(x){dismissKey('rec:'+x.dataset.recX);render()}
});

// ---------- UI: saran anggaran ----------
let lastAutoBudget=null;
function renderAutoBudget(A){
  const B=autoBudget(A);lastAutoBudget=B;
  $('#autoBudgetCard').classList.toggle('hidden',!B);
  if(!B)return;
  const pct=v=>Math.round(v/B.I*100)+'%';
  const needSug=B.rows.filter(r=>r.cls==='need').reduce((s,r)=>s+r.sug,0),wantSug=B.total-needSug;
  $('#autoBudgetSub').innerHTML='Dari pemasukan rata-rata <b class="num">'+fmt(B.I)+'</b> dan kebiasaanmu 3 bulan terakhir, pakai pola 50/30/20.'
    +(B.needHeavy?' <span style="color:var(--amber)">Kebutuhan pokokmu sudah '+pct(B.needs)+' dari pemasukan, jadi porsi keinginan dipangkas lebih ketat.</span>':'');
  const sv=Math.max(0,B.saveAmt),tot=Math.max(1,needSug+wantSug+sv);
  $('#autoBudgetSplit').innerHTML='<div class="ab-bar"><i class="need" style="width:'+needSug/tot*100+'%"></i><i class="want" style="width:'+wantSug/tot*100+'%"></i><i class="save" style="width:'+sv/tot*100+'%"></i></div>'
    +'<div class="ab-legend">'
    +'<div class="need"><small>Kebutuhan</small><b class="num">'+fmtShort(needSug)+'</b><i>'+pct(needSug)+' dari maks 50%</i></div>'
    +'<div class="want"><small>Keinginan</small><b class="num">'+fmtShort(wantSug)+'</b><i>'+pct(wantSug)+' dari maks 30%</i></div>'
    +'<div class="save"><small>Ditabung</small><b class="num">'+(B.saveAmt<0?'−':'')+fmtShort(B.saveAmt)+'</b><i>'+pct(sv)+' dari min 20%</i></div></div>';
  $('#autoBudgetRows').innerHTML=B.rows.map(r=>{
    const cut=r.cls==='want'&&r.sug<r.base*0.95;
    return '<div class="ab-row"><span>'+catTag(r.c)+'<small>'+(r.cls==='need'?'kebutuhan':'keinginan')+' · biasanya '+fmtShort(r.base)+'</small></span><b class="num"'+(cut?' style="color:var(--amber)"':'')+'>'+fmt(r.sug)+(cut?'<small>−'+Math.round((1-r.sug/r.base)*100)+'%</small>':'')+'</b></div>';
  }).join('');
}
$('#applyAutoBudget').onclick=()=>{
  const B=lastAutoBudget;if(!B)return;
  B.rows.forEach(r=>{const inp=[...$$('[data-cat-budget]')].find(i=>i.dataset.catBudget===r.c);if(inp)inp.value=r.sug||''});
  $('#monthlyBudgetInput').value=Math.round(B.total/50000)*50000||'';
  toast('Saran sudah diisi. Cek lagi, lalu ketuk Simpan.');
};

// ---------- UI: pola kebiasaan ----------
function renderHabits(A){
  const H=habitStats(A.CM);
  $('#habitCard').classList.toggle('hidden',!H);
  if(!H)return;
  const max=Math.max(1,...H.wdAvg);
  $('#habitBars').innerHTML=H.order.map(i=>'<div class="wd"><div class="wd-col"><i class="'+(i===H.peak?'peak':i===H.low?'low':'')+'" style="height:'+Math.max(4,Math.round(H.wdAvg[i]/max*100))+'%"></i></div><small>'+WD[i].slice(0,3)+'</small></div>').join('');
  const L=[];
  L.push('Paling boros hari <b>'+WD[H.peak]+'</b> (± '+fmt(H.wdAvg[H.peak])+'), paling hemat hari <b>'+WD[H.low]+'</b> (± '+fmt(H.wdAvg[H.low])+').');
  if(H.wk>0){const r=H.we/H.wk;L.push('Akhir pekan '+fmt(H.we)+'/hari vs hari kerja '+fmt(H.wk)+'/hari'+(r>=1.15?' — <b style="color:var(--amber)">'+Math.round((r-1)*100)+'% lebih tinggi</b>':r<=0.85?' — <b style="color:var(--green)">lebih hemat</b>':' — seimbang')+'.')}
  if(H.weekAvg!==null){const d=H.weekAvg>0?(H.thisWeek/H.weekAvg-1)*100:0;L.push('Minggu ini '+fmt(H.thisWeek)+' vs biasanya '+fmt(H.weekAvg)+' sampai hari '+WD[(H.tdw+1)%7]+(Math.abs(d)>=10?' (<b style="color:var(--'+(d>0?'amber':'green')+')">'+(d>0?'+':'−')+Math.round(Math.abs(d))+'%</b>)':' (normal)')+'.')}
  if(H.n1>=10&&H.n3>=10)L.push('Tgl 1–10: '+fmt(H.early)+'/hari · tgl 21+: '+fmt(H.late)+'/hari'+(H.early>H.late*1.3?' — cenderung royal di awal bulan.':H.late>H.early*1.3?' — pengeluaran naik di akhir bulan.':'.'));
  if(H.topCat)L.push('Pos harian terbesar: <b>'+esc(H.topCat[0])+'</b> ('+Math.round(H.topCat[1]/H.total*100)+'% dari pengeluaran rutin).');
  $('#habitList').innerHTML=L.map(l=>'<li>'+l+'</li>').join('');
  $('#habitSpan').textContent='Dari '+H.span+' hari terakhir · makan, jajan, bensin, dll · tanpa tagihan bulanan & belanja sekali-besar';
}

// ---------- UI: bantuan pintar di form transaksi ----------
function updateSheetHints(){
  if(!$('#sheetAmtHelp'))return;
  const amt=parseAmount($('#sheetAmount').value),isInc=sheet.kind==='income';
  const chips=[];let hint='',tone='muted';
  if(amt>0&&amt<1000){
    const f=fixSmallAmount(amt,sheet.cat,isInc)||amt*(isInc?1e6:1000);
    if(f!==amt)chips.push([f,'Maksud '+fmt(f)+'?']);
  }
  if(!isInc&&sheet.cat){
    if(!amt)frequentAmounts(sheet.cat).forEach(v=>chips.push([v,fmt(v)]));
    const date=$('#sheetDate').value||day();
    if(amt>=1000){
      const cap=(db.categoryBudgets||{})[sheet.cat]||0;
      const r=unusualRatio(sheet.cat,amt,sheet.editId);
      const oldAmt=sheet.mode==='edit'?Number((db.expenses.find(x=>x.id===sheet.editId)||{}).amount||0):0;
      if(sheet.mode==='add'||amt>oldAmt){
        const saldoAfter=getSaldo()-(amt-oldAmt);
        if(cap&&date.startsWith(month())){
          const spent=sumAmt(db.expenses.filter(x=>x.category===sheet.cat&&x.date.startsWith(month())&&x.id!==sheet.editId));
          if(spent+amt>cap){hint='Lewat batas '+sheet.cat+' '+fmt(spent+amt-cap)+(spent<cap?' (sisa batas '+fmt(cap-spent)+')':' (batas sudah habis)')+'.';tone='amber'}
        }
        if(saldoAfter<0){hint='Saldo tinggal '+fmtSigned(getSaldo())+' — transaksi ini bikin saldo minus.';tone='red'}
      }
      if(!hint&&r){const md=median(typicalAmounts(sheet.cat));hint='Lebih besar dari biasanya (± '+fmt(md)+'). Pastikan nominalnya benar.';tone='amber'}
    }
  }
  $('#sheetAmtHelp').innerHTML=chips.map(([v,l])=>'<button type="button" class="chip mini" data-amt-fill="'+v+'">'+esc(l)+'</button>').join('');
  $('#sheetHint').textContent=hint;
  $('#sheetHint').className='sheet-hint'+(hint?' '+tone:'');
  updateSpreadToggle();
}
$('#sheetAmtHelp').addEventListener('click',e=>{
  const b=e.target.closest('[data-amt-fill]');if(!b)return;
  $('#sheetAmount').value=plainAmount(Number(b.dataset.amtFill));
  sheet.confirmKey=null;updateSheetHints();
});
$('#sheetAmount').addEventListener('input',updateSheetHints);
$('#sheetDate').addEventListener('change',updateSheetHints);
$('#txSheet').addEventListener('click',e=>{if(e.target.closest('[data-sheet-cat]'))sheet.catTouched=true},true);
$('#sheetNote').addEventListener('input',()=>{
  if(sheet.mode!=='add'||sheet.catTouched)return;
  const note=$('#sheetNote').value.trim();if(note.length<3)return;
  if(sheet.kind==='income'){const s=guessSource(note);if(s&&s!==sheet.cat){sheet.cat=s;sheet.pickCat=false;renderSheet();sheetAutoMsg(s)}return}
  const g=guessCategory(note);
  if(g&&(g.cat!==sheet.cat||g.type!==sheet.kind)){sheet.cat=g.cat;sheet.kind=g.type;sheet.pickCat=false;lastKind=g.type;renderSheet();sheetAutoMsg(g.cat)}
});
function sheetAutoMsg(c){setSheetMsg('Kategori otomatis: '+c+' (ketuk kategori lain kalau salah)',true)}

// dicek sebelum menyimpan dari form: nominal janggal & kemungkinan dobel
function preSaveCheck(isInc,cat,amount,date){
  if(amount<1000){const f=fixSmallAmount(amount,cat,isInc);return {key:'small|'+amount,msg:'Nominal '+fmt(amount)+' kecil sekali — '+(f&&f!==amount?'maksudnya '+fmt(f)+'? Ketuk saran di atas, atau':'yakin benar?')}}
  if(sheet.mode==='add'){
    const d=findDuplicate(isInc,cat,amount,date);
    if(d)return {key:'dup|'+cat+'|'+amount+'|'+date,msg:'Sepertinya sudah dicatat '+agoText(d.ago)+' ('+cat+' '+fmt(amount)+').'};
  }
  return null;
}

function renderLogicV43(){
  const A=lastAnalysis;if(!A)return;
  // saldo bertahan & rata-rata harian yang lebih tepat
  const R=simulateRunway(A),pd=typeof nextPayday==='function'?nextPayday():null,RL=runwayLabel(R,pd);
  $('#tileRunway').textContent=RL.text;
  $('#tileRunway').style.color=RL.tone?'var(--'+RL.tone+')':'';
  $('#tileRunway').title=RL.long;
  $('#sumRunway').textContent=RL.text;
  $('#sumRunway').style.color=RL.tone?'var(--'+RL.tone+')':'';
  $('#sumRunwaySub').textContent=RL.long.startsWith(RL.text)?RL.long.slice(RL.text.length).replace(/^\s*\(?s\.d\./,'s.d.').replace(/\)/,''):'';
  // rata-rata per hari: hanya kategori Harian (makan & parkir + kategori harian buatan sendiri)
  const dCats=[...dailyCats,...(db.customCategories.daily||[])];
  const dSum=sumAmt(db.expenses.filter(x=>x.date.startsWith(A.mon)&&x.type==='daily'&&!x.templateId));
  const avg=A.de?dSum/A.de:0;
  const lbl=dCats.length<=2?dCats.map(c=>c.split(' ')[0].toLowerCase()).join(' & '):'kategori harian';
  $('#tileAvg').textContent=fmt(avg);
  $('#tileAvg').previousElementSibling.textContent=(lbl.charAt(0).toUpperCase()+lbl.slice(1)).replace(' & ','+')+'/hr';
  $('#tileAvg').parentElement.title='Rata-rata per hari: '+lbl;
  $('#sumAvgDay').textContent=fmt(avg);
  $('#sumAvgSub').textContent=lbl+' saja';
  renderNudges(A);
  renderBillSuggestions();
  renderAutoBudget(A);
  renderHabits(A);
  updateSheetHints();
}

// ---------- Pengeluaran sesekali: sebar ke sisa hari ----------
// Transaksi bertanda spread tidak memotong jatah hari ini; saldo tetap berkurang, jadi dampaknya otomatis terbagi rata ke sisa hari.
function autoSpread(cat,amount,note){
  if(cat==='Hiburan')return true;
  const n=normNote(note);
  return !!(n&&db.expenses.some(x=>x.spread&&x.category===cat&&normNote(x.note)===n));
}
function spreadToggleVisible(){
  return sheet.kind!=='income'&&!!sheet.cat&&patternOf(sheet.cat,lastAnalysis&&lastAnalysis.CM)==='spread';
}
function sheetSpreadOn(){
  if(sheet.kind==='income'||!sheet.cat)return false;
  if(sheet.spread===null||sheet.spread===undefined)return autoSpread(sheet.cat,parseAmount($('#sheetAmount').value),$('#sheetNote').value);
  return !!sheet.spread;
}
function updateSpreadToggle(){
  const el=$('#sheetSpread');if(!el)return;
  const vis=spreadToggleVisible();
  el.classList.toggle('hidden',!vis);
  if(!vis)return;
  const on=sheetSpreadOn(),amt=parseAmount($('#sheetAmount').value);
  el.classList.toggle('on',on);
  el.classList.remove('suggest');
  let sub='Tidak memotong jatah hari ini sekaligus — dibagi rata ke sisa hari.';
  try{
    const S=computeSafeSpend();
    if(amt>0&&S.left>0){
      const per=amt/S.left,pct=S.limit>0?Math.round(amt/S.limit*100):0;
      if(on)sub=fmt(amt)+' dibagi ke '+S.left+' hari ≈ '+fmt(per)+'/hari'+(S.pd?' sampai gajian':'')+'. Jatah hari ini tidak langsung terpotong.';
      else if(pct>=30){sub='Ini '+pct+'% dari jatah harian ('+fmt(S.limit)+'). Kalau jarang, aktifkan supaya hari ini tetap bisa makan dengan tenang.';el.classList.add('suggest')}
    }
  }catch(e){}
  $('#sheetSpreadSub').textContent=sub;
}
$('#sheetSpread').addEventListener('click',()=>{sheet.spread=!sheetSpreadOn();updateSpreadToggle();buzz()});
$('#sheetNote').addEventListener('input',updateSpreadToggle);
function renderOneOff(S){
  const el=$('#safeOneOff');if(!el)return;
  const dis=db.logicDismiss||{};
  const typical=x=>{const S=catStats(x.category);return S.n>=5&&Number(x.amount)<=S.md*1.5};
  const big=(S.todayFlexTx||[]).filter(x=>!dis['oneoff:'+x.id]&&S.limit>0&&!(classOf(x.category)==='need'&&typical(x))&&Number(x.amount)>=Math.max(20000,S.limit*(x.type==='daily'?1:classOf(x.category)==='want'?0.3:0.45))&&S.left>1);
  let h='';
  if(big.length){
    const sum=sumAmt(big),x=big[0];
    const what=big.length===1?esc(x.category)+(x.note?' · '+esc(x.note):'')+' '+fmt(x.amount):big.length+' transaksi besar ('+fmt(sum)+')';
    h='<span class="oo-em">'+(big.length===1?catIcon(x.category):'🧾')+'</span><div class="oo-txt"><b>'+what+' memotong '+Math.round(sum/S.limit*100)+'% jatah hari ini</b><small>Kalau ini sesekali, sebar ke '+S.left+' hari: jatah harian turun ± '+fmt(sum/S.left)+' saja.</small></div>'
      +'<button class="oo-btn" data-spread-ids="'+esc(big.map(v=>v.id).join(','))+'">Sebar</button><button class="nd-x" data-oneoff-x="'+esc(big.map(v=>v.id).join(','))+'" aria-label="Tidak">'+icon('x')+'</button>';
  }else if(S.spreadToday&&S.spreadToday.length){
    const sum=sumAmt(S.spreadToday);
    h='<span class="oo-em">✓</span><div class="oo-txt"><b>'+fmt(sum)+' sesekali disebar</b><small>'+esc(S.spreadToday.map(v=>v.note||v.category).join(', '))+' — jatah harian turun ± '+fmt(sum/Math.max(1,S.left))+' untuk '+S.left+' hari ke depan.</small></div>'
      +'<button class="oo-btn ghost" data-unspread-ids="'+esc(S.spreadToday.map(v=>v.id).join(','))+'">Batalkan</button>';
  }
  el.innerHTML=h;
  el.classList.toggle('hidden',!h);
  el.classList.toggle('done',!big.length&&!!h);
}
$('#safeOneOff').addEventListener('click',e=>{
  const setSpread=(ids,on)=>{db=load();ids.forEach(id=>{const x=db.expenses.find(v=>v.id===id);if(x){if(on)x.spread=true;else delete x.spread}});save();render()};
  const a=e.target.closest('[data-spread-ids]');
  if(a){
    const ids=a.dataset.spreadIds.split(','),S0=computeSafeSpend();
    setSpread(ids,true);
    const S1=computeSafeSpend();
    toast('Disebar ke '+S1.left+' hari · aman hari ini jadi '+fmt(S1.safe)+' (tadi '+fmt(S0.safe)+')',()=>setSpread(ids,false));
    return;
  }
  const u=e.target.closest('[data-unspread-ids]');
  if(u){const ids=u.dataset.unspreadIds.split(',');setSpread(ids,false);toast('Kembali memotong jatah hari ini.',()=>setSpread(ids,true));return}
  const x=e.target.closest('[data-oneoff-x]');
  if(x){db=load();x.dataset.oneoffX.split(',').forEach(id=>db.logicDismiss['oneoff:'+id]=day());save();render()}
});
