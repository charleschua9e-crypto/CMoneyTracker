// ================= Penyimpanan permanen & evaluasi bulanan =================

// ---------- Penyimpanan permanen (navigator.storage.persist) ----------
const PERSIST_ASKED='cmoneytracker-persist-asked';
let persistState=null; // 'on' | 'off' | 'unsupported'
const persistSupported=()=>!!(navigator.storage&&navigator.storage.persist&&navigator.storage.persisted);
async function checkPersist(){
  if(!persistSupported()){persistState='unsupported';return persistState}
  try{persistState=(await navigator.storage.persisted())?'on':'off'}catch(e){persistState='unsupported'}
  return persistState;
}
async function requestPersist(manual){
  if(!persistSupported()){persistState='unsupported';renderPersist();return persistState}
  let ok=false;
  try{ok=await navigator.storage.persist()}catch(e){}
  try{localStorage.setItem(PERSIST_ASKED,day())}catch(e){}
  persistState=ok?'on':'off';
  renderPersist();
  if(manual)toast(ok?'Penyimpanan permanen aktif ✓ Browser tidak akan menghapus data ini otomatis.':'Browser belum mengizinkan. Install aplikasi ke layar utama dulu, lalu coba lagi.');
  if(ok&&manual)render();
  return persistState;
}
function persistEligible(){return !!(db.profile&&(db.expenses.length||db.incomes.length||db.profile.planAt))}
// Chrome memutuskan tanpa pop-up; Firefox menampilkan izin — jadi dipicu dari ketukan pengguna, maksimal seminggu sekali.
document.addEventListener('click',()=>{
  if(persistState!=='off'||!persistEligible())return;
  let asked=null;try{asked=localStorage.getItem(PERSIST_ASKED)}catch(e){}
  if(asked&&daysBetween(asked,day())<7)return;
  requestPersist(false);
},true);
async function renderPersist(){
  if(persistState===null)await checkPersist();
  const st=$('#persistState'),btn=$('#persistBtn');
  const meta=$('#menuExportMeta');
  if(persistState==='on'){
    st.className='persist-state on';
    st.innerHTML='<span>✅</span><div><b>Aktif</b><small>Browser tidak akan menghapus data aplikasi ini otomatis, walaupun memori HP penuh.</small></div>';
    btn.classList.add('hidden');meta.textContent='Permanen ✓';meta.style.color='var(--green)';
  }else if(persistState==='off'){
    st.className='persist-state off';
    st.innerHTML='<span>⚠️</span><div><b>Belum aktif</b><small>Saat memori HP penuh atau lama tidak dibuka, browser bisa menghapus data aplikasi. Paling mudah diaktifkan setelah aplikasi di-install ke layar utama.</small></div>';
    btn.classList.remove('hidden');meta.textContent='Belum permanen';meta.style.color='var(--amber)';
  }else{
    st.className='persist-state off';
    st.innerHTML='<span>ℹ️</span><div><b>Tidak didukung browser ini</b><small>Rutin unduh backup supaya data aman.</small></div>';
    btn.classList.add('hidden');meta.textContent='';
  }
  try{
    {
      const kb=Math.max(1,Math.round(new Blob([localStorage.getItem(KEY)||'']).size/1024));
      $('#persistUsage').textContent='Data catatanmu ± '+kb.toLocaleString('id-ID')+' KB. Tetap unduh backup: penyimpanan permanen tidak melindungi dari hapus aplikasi, reset, atau ganti HP.';
    }
  }catch(e){}
}
$('#persistBtn').onclick=()=>requestPersist(true);
checkPersist().then(()=>{renderPersist();if(db.profile&&lastAnalysis)renderNudges(lastAnalysis)});

// ---------- Rencana per bulan (snapshot) ----------
function currentPlan(){
  const p=db.profile||{},A=lastAnalysis;
  const I=Number(p.incomeMonthly)||(A&&A.avgHistIncome>0?Math.round(A.avgHistIncome):0);
  const tplCats=new Set((db.recurringTemplates||[]).map(t=>t.category));
  const lumps=A?Object.values(A.CM).filter(m=>m.pattern==='lump'&&!tplCats.has(m.c)&&m.validMonths>=2&&m.paidMonths/m.validMonths>=0.75).reduce((s,m)=>s+m.avgWhenPaid,0):0;
  const fixed=Math.round((db.recurringTemplates||[]).reduce((s,t)=>s+tplMonthly(t),0)+lumps);
  let goalSave=0;const g=p.goal||{};
  if(g.type==='beli'&&g.wishId&&g.deadline){
    const pl=wishPlan().plans.find(x=>x.w.id===g.wishId);
    if(pl&&pl.need>0)goalSave=Math.ceil(pl.need/Math.max(1,monthsBetween(month(),g.deadline))/10000)*10000;
  }
  const save=Number(p.saveTarget)>0?Number(p.saveTarget):Math.max(Math.round(I*0.2/10000)*10000,goalSave);
  return {I,fixed,save,living:I-fixed-save,budget:Number(db.monthlyBudget)||0,caps:Object.assign({},db.categoryBudgets||{}),wantCap:Math.round(I*0.3),goal:g.type||null};
}
const hasPlan=()=>!!(db.profile&&(db.profile.planAt||db.profile.incomeMonthly||db.monthlyBudget||Object.keys(db.categoryBudgets||{}).length));
// Rencana bulan berjalan selalu diperbarui; begitu bulan berganti, snapshot terakhir jadi acuan evaluasi bulan itu.
function ensurePlanSnap(force){
  if(!db.profile||(!force&&!hasPlan()))return;
  const m=month(),P=currentPlan(),old=db.planSnap[m];
  if(old&&JSON.stringify(old)===JSON.stringify(P))return;
  db.planSnap[m]=P;save();
}

// ---------- Evaluasi ----------
function evaluateMonth(m){
  const cur=m===month(),A=lastAnalysis;
  const snap=db.planSnap&&db.planSnap[m];
  const plan=snap||currentPlan();
  const xs=db.expenses.filter(x=>x.date.startsWith(m)),ys=db.incomes.filter(x=>x.date.startsWith(m));
  const tplCats=new Set((db.recurringTemplates||[]).map(t=>t.category));
  const isFixed=x=>!!x.templateId||tplCats.has(x.category)||patternOf(x.category,A&&A.CM)==='lump';
  let income=sumAmt(ys),spent=sumAmt(xs),fixed=sumAmt(xs.filter(isFixed)),wants=sumAmt(xs.filter(x=>classOf(x.category)==='want'));
  const cats={};xs.forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount||0));
  const soFar={income,spent};
  if(cur&&A){
    // bulan berjalan: nilai memakai proyeksi akhir bulan
    income=Math.max(income,A.expectedIncome);
    spent=A.projSpend;
    fixed=fixed+A.pendingBillsSum+Object.values(A.CM).filter(c=>tplCats.has(c.c)||c.pattern==='lump').reduce((s,c)=>s+Math.max(0,c.proj-c.spent),0);
    wants=A.wantsProj;
    Object.values(A.CM).forEach(c=>{cats[c.c]=c.proj});
    A.pendingBills.forEach(t=>{cats[t.category]=(cats[t.category]||0)+Number(t.amount||0)});
  }
  const living=spent-fixed,net=income-spent;
  // rata-rata 3 bulan sebelum bulan ini
  const prev=db.history.filter(h=>h.month<m).slice(0,3);
  const avgCat=c=>prev.length?prev.reduce((s,h)=>s+((h.detail||{})[c]||0),0)/prev.length:null;
  const refI=plan.I>0?plan.I:income;
  // nilai
  let pts=0,max=0;
  max+=40;
  if(plan.save>0)pts+=40*clamp(net/plan.save,0,1);
  else pts+=net>=0?40:40*clamp(1+net/Math.max(1,spent),0,1);
  if(plan.budget>0){max+=25;pts+=spent<=plan.budget?25:25*clamp(1-(spent-plan.budget)/plan.budget*2,0,1)}
  const capList=Object.entries(plan.caps||{}).filter(([,v])=>v>0).map(([c,cap])=>({c,cap,actual:cats[c]||0,avg:avgCat(c)}));
  if(capList.length){max+=20;pts+=20*capList.filter(x=>x.actual<=x.cap).length/capList.length}
  if(refI>0){max+=15;const wr=wants/refI;pts+=wr<=0.3?15:15*clamp(1-(wr-0.3)/0.2,0,1)}
  const score=Math.round(pts/max*100);
  const capsOver=capList.filter(x=>x.actual>x.cap).length;
  let grade=score>=85?'A':score>=70?'B':score>=50?'C':'D';
  if(grade==='A'&&(capsOver>0||(plan.save>0&&net<plan.save)))grade='B';
  if(net<0&&(grade==='A'||grade==='B'))grade='C';
  return {m,cur,plan,snap:!!snap,income,spent,fixed,living,net,wants,cats,capList,prev,avgCat,refI,score,grade,soFar,count:xs.length+ys.length};
}
const GRADE_TXT={A:['Luar biasa','Rencana berjalan sesuai — pertahankan kebiasaan ini.','green'],B:['Bagus','Sebagian besar sesuai rencana, ada 1–2 hal yang bisa dirapikan.','blue'],C:['Cukup','Beberapa pos meleset dari rencana. Perlu penyesuaian bulan depan.','amber'],D:['Perlu perbaikan','Banyak yang meleset. Fokus ke 1–2 perubahan paling berdampak dulu.','red']};
function reviewNotes(E){
  const N=[];
  const plan=E.plan;
  if(plan.I>0&&E.income>0&&Math.abs(E.income-plan.I)/plan.I>=0.15&&!E.cur)
    N.push((E.income>plan.I?'📈 Pemasukan '+fmt(E.income)+', lebih tinggi ':'📉 Pemasukan '+fmt(E.income)+', lebih rendah ')+Math.round(Math.abs(E.income-plan.I)/plan.I*100)+'% dari rencana '+fmt(plan.I)+'.');
  if(plan.save>0){
    N.push(E.net>=plan.save?'✅ Tersisa '+fmt(E.net)+' — target sisihan '+fmt(plan.save)+' tercapai'+(E.net>plan.save*1.2?' dan terlampaui.':'.'):E.net>0?'⚠️ Tersisa '+fmt(E.net)+', kurang '+fmt(plan.save-E.net)+' dari target sisihan '+fmt(plan.save)+'.':'⛔ Defisit '+fmt(-E.net)+' — pengeluaran melebihi pemasukan.');
  }else if(E.net<0)N.push('⛔ Defisit '+fmt(-E.net)+' — pengeluaran melebihi pemasukan.');
  if(plan.living>0&&E.living>plan.living*1.1)N.push('🍜 Biaya hidup & jajan '+fmt(E.living)+', lewat '+fmt(E.living-plan.living)+' ('+Math.round((E.living/plan.living-1)*100)+'%) dari jatah '+fmt(plan.living)+'.');
  else if(plan.living>0&&E.living<=plan.living)N.push('🍜 Biaya hidup & jajan '+fmt(E.living)+', masih dalam jatah '+fmt(plan.living)+'.');
  const ups=[],downs=[];
  Object.entries(E.cats).forEach(([c,v])=>{const a=E.avgCat(c);if(a===null||a<=0)return;const cm=lastAnalysis&&lastAnalysis.CM[c];if(patternOf(c,lastAnalysis&&lastAnalysis.CM)==='lump'&&(v===0||E.cur||(cm&&cm.validMonths&&cm.paidMonths/cm.validMonths<0.75)))return;const d=(v-a)/a;if(d>=0.25&&v-a>=50000)ups.push([c,v,a,d]);else if(d<=-0.2&&a-v>=50000)downs.push([c,v,a,d])});
  ups.sort((a,b)=>(b[1]-b[2])-(a[1]-a[2])).slice(0,2).forEach(([c,v,a,d])=>N.push('🔺 '+c+' '+fmt(v)+', naik '+Math.round(d*100)+'% dari rata-rata '+fmt(a)+'.'));
  downs.sort((a,b)=>(b[2]-b[1])-(a[2]-a[1])).slice(0,2).forEach(([c,v,a,d])=>N.push('🟢 '+c+' '+fmt(v)+', turun '+Math.round(-d*100)+'% dari rata-rata '+fmt(a)+' — mantap.'));
  const over=E.capList.filter(x=>x.actual>x.cap);
  if(E.capList.length)N.push(over.length?'🎯 '+(E.capList.length-over.length)+' dari '+E.capList.length+' batas kategori terjaga; lewat: '+over.map(x=>x.c).join(', ')+'.':'🎯 Semua '+E.capList.length+' batas kategori terjaga.');
  if(E.refI>0&&E.wants>E.refI*0.3)N.push('🧋 Keinginan '+fmtPct(E.wants/E.refI*100)+' dari pemasukan (acuan maks 30%).');
  const S=lastAnalysis&&goalStatus(lastAnalysis);
  if(S&&E.net>0&&!E.cur)N.push('🎯 Sisa '+fmt(E.net)+' bisa dipindahkan ke tujuan "'+S.title+'" supaya tidak ikut terpakai.');
  if(!E.snap&&!E.cur)N.push('ℹ️ Belum ada rencana tersimpan untuk bulan ini, jadi dibandingkan dengan rencana saat ini.');
  return N;
}
function reviewSuggestions(E){
  const S=[],plan=E.plan,cp=currentPlan();
  const done=db.history.filter(h=>h.month<month()).slice(0,3);
  const avgInc=done.length?done.reduce((s,h)=>s+(h.income||0),0)/done.length:0;
  const avgSp=done.length?done.reduce((s,h)=>s+(h.spent||0),0)/done.length:0;
  const round5=v=>Math.round(v/50000)*50000;
  if(avgInc>0&&cp.I>0&&Math.abs(avgInc-cp.I)/cp.I>=0.15)
    S.push({t:'Perbarui pemasukan rutin jadi '+fmt(round5(avgInc)),s:'Rata-rata '+done.length+' bulan terakhir '+fmt(avgInc)+', rencana masih '+fmt(cp.I)+'.',act:'income:'+round5(avgInc)});
  if(!cp.I&&avgInc>0)
    S.push({t:'Isi pemasukan rutin '+fmt(round5(avgInc)),s:'Supaya jatah hidup & target sisihan bisa dihitung.',act:'income:'+round5(avgInc)});
  if(plan.living>0&&E.living>plan.living*1.1){
    const want=Object.entries(E.cats).filter(([c])=>classOf(c)==='want').sort((a,b)=>b[1]-a[1])[0];
    if(want&&want[1]>=50000){
      const cap=Math.max(10000,Math.round(want[1]*0.8/10000)*10000);
      if(!((db.categoryBudgets||{})[want[0]]<=cap))S.push({t:'Batasi '+want[0]+' '+fmt(cap)+'/bulan',s:'Pos keinginan terbesar ('+fmt(want[1])+'). Turun 20% = hemat '+fmt(want[1]-cap)+'.',act:'cap:'+want[0]+':'+cap});
    }
    const lower=round5(Math.max(cp.I*0.1,cp.save-(E.living-plan.living)));
    if(cp.I>0&&lower<cp.save&&lower>=cp.I*0.1)S.push({t:'Atau realistiskan target sisihan jadi '+fmt(lower),s:'Jatah hidup kurang '+fmt(E.living-plan.living)+'. Target yang realistis lebih mudah dijaga daripada target yang selalu gagal.',act:'save:'+lower});
  }
  if(plan.save>0&&E.net>plan.save*1.2&&!E.cur){
    const up=round5(E.net*0.9);
    if(up>cp.save)S.push({t:'Naikkan target sisihan jadi '+fmt(up),s:'Bulan ini tersisa '+fmt(E.net)+' — kunci kelebihannya di awal bulan supaya tidak terpakai.',act:'save:'+up});
  }
  if(cp.I>0){
    const ideal=round5(cp.I-cp.save);
    if(!cp.budget&&ideal>0)S.push({t:'Pasang anggaran bulanan '+fmt(ideal),s:'Pemasukan '+fmt(cp.I)+' dikurangi sisihan '+fmt(cp.save)+'.',act:'budget:'+ideal});
    else if(cp.budget>ideal+50000&&ideal>0)S.push({t:'Perketat anggaran jadi '+fmt(ideal),s:'Anggaran sekarang '+fmt(cp.budget)+' — terlalu longgar untuk target sisihan '+fmt(cp.save)+'.',act:'budget:'+ideal});
    else if(cp.budget&&cp.budget<ideal&&E.spent>cp.budget*1.05&&E.net>=cp.save){const nb=Math.min(ideal,round5(E.spent));if(nb>cp.budget)S.push({t:'Longgarkan anggaran jadi '+fmt(nb),s:'Belanja '+fmt(E.spent)+' melewati anggaran '+fmt(cp.budget)+', tapi target sisihan tetap tercapai — anggarannya terlalu ketat.',act:'budget:'+nb})}
  }else if(avgSp>0&&!cp.budget)S.push({t:'Pasang anggaran bulanan '+fmt(round5(avgSp*0.9)),s:'10% di bawah rata-rata pengeluaranmu.',act:'budget:'+round5(avgSp*0.9)});
  E.capList.filter(x=>x.actual>x.cap).slice(0,3).forEach(x=>{
    const prevH=db.history.find(h=>h.month===monthAdd(E.m,-1));
    const prevOver=prevH&&((prevH.detail||{})[x.c]||0)>x.cap;
    if(prevOver){const hi=Math.max(x.actual,(prevH.detail||{})[x.c]||0);const v=Math.ceil((classOf(x.c)==='want'?(x.cap+hi)/2:hi)/10000)*10000;if((db.categoryBudgets||{})[x.c]<v)S.push({t:'Batas '+x.c+' terlalu ketat → '+fmt(v),s:'Lewat batas 2 bulan berturut-turut (terakhir '+fmt(hi)+'). Batas yang selalu dilanggar tidak berfungsi'+(classOf(x.c)==='want'?' — ini angka tengah: lebih realistis, tapi tetap menekan jajan.':' — sesuaikan dengan biaya sebenarnya.'),act:'cap:'+x.c+':'+v})}
  });
  return S.slice(0,5);
}
function applyReview(act){
  db=load();
  const before=JSON.stringify({p:db.profile,b:db.monthlyBudget,c:db.categoryBudgets});
  const [k,...rest]=act.split(':');
  let msg='';
  if(k==='income'){db.profile.incomeMonthly=Number(rest[0]);if(!db.profile.incomeType)db.profile.incomeType='gaji';msg='Pemasukan rutin jadi '+fmt(rest[0])+'.'}
  if(k==='save'){db.profile.saveTarget=Number(rest[0]);msg='Target sisihan jadi '+fmt(rest[0])+'/bulan.'}
  if(k==='budget'){db.monthlyBudget=Number(rest[0]);if(!db.budgetSince)db.budgetSince=month();msg='Anggaran bulanan jadi '+fmt(rest[0])+'.'}
  if(k==='cap'){const v=Number(rest.pop()),c=rest.join(':');db.categoryBudgets[c]=v;msg='Batas '+c+' jadi '+fmt(v)+'.'}
  db.profile.planAt=db.profile.planAt||day();
  save();render();ensurePlanSnap(true);
  toast(msg,()=>{db=load();const o=JSON.parse(before);db.profile=o.p;db.monthlyBudget=o.b;db.categoryBudgets=o.c;save();ensurePlanSnap(true)});
}
let revMonth=null,revText='';
function reviewMonths(){
  const ms=db.history.map(h=>h.month).filter(m=>m<month());
  return [...new Set([...ms,month()])].sort();
}
function defaultReviewMonth(){
  const ms=reviewMonths(),last=monthAdd(month(),-1);
  return Number(day().slice(8,10))<=10&&ms.includes(last)?last:month();
}
function rowBar(label,plan,actual,goodWhenMore,note){
  const max=Math.max(1,plan,Math.abs(actual));
  const diff=actual-plan,ok=plan<=0?null:(goodWhenMore?actual>=plan*0.95:actual<=plan*1.05);
  const tone=ok===null?'':ok?'green':(goodWhenMore?actual>=plan*0.7:actual<=plan*1.2)?'amber':'red';
  return '<div class="rv-row"><div class="rv-top"><span>'+label+(note?'<small>'+note+'</small>':'')+'</span>'
    +(plan>0?'<em class="'+tone+'">'+(diff>=0?'+':'−')+fmtShort(Math.abs(diff))+'</em>':'')+'</div>'
    +'<div class="rv-bar pl"><i style="width:'+(plan>0?Math.max(2,plan/max*100):0)+'%"></i><b class="num">'+(plan>0?fmt(plan):'belum direncanakan')+'</b></div>'
    +'<div class="rv-bar ac '+tone+'"><i style="width:'+Math.max(2,Math.max(0,actual)/max*100)+'%"></i><b class="num">'+fmtSigned(actual)+'</b></div></div>';
}
function renderReview(){
  if(!$('#review').classList.contains('active'))return;
  const ms=reviewMonths();
  if(!revMonth||!ms.includes(revMonth))revMonth=defaultReviewMonth();
  const i=ms.indexOf(revMonth);
  $('#revPrev').disabled=i<=0;$('#revNext').disabled=i>=ms.length-1;
  const E=evaluateMonth(revMonth);
  if(!(db.logicDismiss||{})['review:'+revMonth]){try{db.logicDismiss['review:'+revMonth]=day();save();renderNudges(lastAnalysis)}catch(e){}}
  $('#revMonth').textContent=monthName(revMonth)+(E.cur?' (berjalan)':'');
  if(!E.count){
    $('#revGrade').innerHTML='<div class="rv-empty">Belum ada transaksi di bulan ini.</div>';
    $('#revRows').innerHTML='';$('#revNotes').innerHTML='';$('#revPlanNote').textContent='';
    $('#revCapCard').classList.add('hidden');$('#revSugCard').classList.add('hidden');revText='';return;
  }
  const G=GRADE_TXT[E.grade];
  $('#revGrade').innerHTML='<div class="rv-grade-ring '+G[2]+'"><b>'+E.grade+'</b><small class="num">'+E.score+'</small></div><div style="min-width:0"><span class="pill '+({green:'ok',blue:'info',amber:'warn',red:'bad'}[G[2]])+'">'+G[0]+'</span><p>'+G[1]+'</p>'
    +(E.cur?'<small class="conf">Nilai sementara — memakai proyeksi akhir bulan. Sejauh ini masuk '+fmt(E.soFar.income)+', keluar '+fmt(E.soFar.spent)+'.</small>':'<small class="conf">Dinilai dari: sisihan vs target (40), anggaran (25), batas kategori (20), porsi keinginan (15).</small>')+'</div>';
  const P=E.plan;
  $('#revPlanNote').innerHTML=(E.snap?'Rencana yang tercatat untuk '+monthName(E.m):'Dibandingkan dengan rencana saat ini')+(E.cur?' · kenyataan = proyeksi akhir bulan':'')+'. <span class="rv-legend"><i class="p"></i>rencana <i class="a"></i>kenyataan</span>';
  $('#revRows').innerHTML=
    rowBar('Pemasukan',P.I,E.income,true)
    +rowBar('Pengeluaran tetap',P.fixed,E.fixed,false,'kos, tagihan, cicilan')
    +rowBar('Hidup & jajan',Math.max(0,P.living),E.living,false,'makan, transport, jajan, dll')
    +rowBar('Tersisa / disisihkan',P.save,E.net,true,'pemasukan − pengeluaran')
    +(P.budget>0?rowBar('Total belanja vs anggaran',P.budget,E.spent,false):'')
    +(E.refI>0?rowBar('Keinginan',P.wantCap||Math.round(E.refI*0.3),E.wants,false,'maks 30% pemasukan'):'');
  $('#revCapCard').classList.toggle('hidden',!E.capList.length);
  $('#revCaps').innerHTML=E.capList.sort((a,b)=>b.actual/b.cap-a.actual/a.cap).map(x=>{
    const r=x.actual/x.cap;
    return '<div class="bar-row tap" data-cat-detail="'+esc(x.c)+'"><div class="bar-top"><span>'+catTag(x.c)+'</span><b class="num"'+(r>1?' style="color:var(--red)"':'')+'>'+fmt(x.actual)+' <span style="color:var(--faint);font-weight:600">/ '+fmtShort(x.cap)+'</span></b></div><div class="bar-track"><div class="bar-fill'+(r>1?' over':r>=0.8?'':' green')+'" style="width:'+Math.max(3,Math.min(100,Math.round(r*100)))+'%"></div></div></div>';
  }).join('');
  const notes=reviewNotes(E);
  $('#revNotes').innerHTML=notes.map(n=>'<li>'+esc(n)+'</li>').join('');
  const sugs=reviewSuggestions(E);
  $('#revSugCard').classList.toggle('hidden',!sugs.length);
  $('#revSugs').innerHTML=sugs.map(s=>'<div class="sug-row"><div style="flex:1;min-width:0"><b style="white-space:normal">'+esc(s.t)+'</b><small>'+esc(s.s)+'</small></div><button class="btn btn-soft btn-sm" data-rev-apply="'+esc(s.act)+'">Terapkan</button></div>').join('');
  revText='Evaluasi '+monthName(E.m)+(E.cur?' (bulan berjalan, pakai proyeksi)':'')+': nilai '+E.grade+' ('+E.score+'/100).\n'
    +'Rencana vs kenyataan: pemasukan '+fmt(P.I)+' vs '+fmt(E.income)+'; pengeluaran tetap '+fmt(P.fixed)+' vs '+fmt(E.fixed)+'; hidup & jajan '+fmt(Math.max(0,P.living))+' vs '+fmt(E.living)+'; target sisihan '+fmt(P.save)+' vs tersisa '+fmtSigned(E.net)+(P.budget?'; anggaran '+fmt(P.budget)+' vs belanja '+fmt(E.spent):'')+'.\n'
    +(E.capList.length?'Batas kategori: '+E.capList.map(x=>x.c+' '+fmt(x.actual)+'/'+fmt(x.cap)).join(', ')+'.\n':'')
    +'Catatan: '+notes.map(stripTags).join(' ')+'\n'
    +(sugs.length?'Usulan aplikasi: '+sugs.map(s=>s.t).join('; ')+'.':'');
}
$('#revPrev').onclick=()=>{const ms=reviewMonths(),i=ms.indexOf(revMonth);if(i>0){revMonth=ms[i-1];renderReview()}};
$('#revNext').onclick=()=>{const ms=reviewMonths(),i=ms.indexOf(revMonth);if(i<ms.length-1){revMonth=ms[i+1];renderReview()}};
$('#revSugs').addEventListener('click',e=>{const b=e.target.closest('[data-rev-apply]');if(b)applyReview(b.dataset.revApply)});
document.addEventListener('click',e=>{if(e.target.closest('[data-goto="review"]')){revMonth=null;setTimeout(renderReview,0)}});
$('#revClaude').onclick=async()=>{
  if(!revText){toast('Belum ada data untuk dievaluasi.');return}
  const A=lastAnalysis||analyzeFinance();
  const text=['Bertindaklah sebagai perencana keuangan pribadi yang independen dan berpengalaman di Indonesia. Berikut evaluasi bulanan dari aplikasi pencatat keuangan saya. Nilai secara kritis apa yang berjalan baik dan yang meleset, cari penyebab utamanya, lalu susun rencana bulan depan yang realistis (angka per pos) dan 3 kebiasaan yang perlu diubah. Jawab dalam Bahasa Indonesia.','','EVALUASI:',revText,'','---',buildFinanceSummary(A)].join('\n');
  const win=window.open('about:blank','_blank');
  const copied=await copyText(text);
  const url=text.length<=6000?'https://claude.ai/new?q='+encodeURIComponent(text):'https://claude.ai/new';
  if(win){try{win.opener=null}catch(e){}win.location.href=url}else location.href=url;
  toast(copied?'Teks disalin. Kalau kolom chat Claude kosong, tempel saja.':'Membuka Claude…');
};
function reviewNudge(){
  if(Number(day().slice(8,10))>10)return null;
  const last=monthAdd(month(),-1);
  if(!db.history.some(h=>h.month===last)||(db.logicDismiss||{})['review:'+last])return null;
  const E=evaluateMonth(last);
  if(!E.count)return null;
  return {key:'review:'+last,em:'📋',t:'Evaluasi '+monthName(last)+': nilai '+E.grade,s:'Lihat rencana vs kenyataan & penyesuaian untuk bulan ini.',btn:'Lihat',act:'review:'+last};
}

function renderReviewV45(){
  if(!lastAnalysis)return;
  ensurePlanSnap(false);
  const ms=reviewMonths();
  const last=monthAdd(month(),-1);
  const E=ms.includes(last)?evaluateMonth(last):null;
  $('#menuReviewMeta').textContent=E&&E.count?monthName(last).split(' ')[0]+': '+E.grade:'';
  $('#reviewCtaSub').textContent=E&&E.count?'Nilai '+monthName(last)+': '+E.grade+' ('+E.score+'/100). Lihat rencana vs kenyataan & penyesuaian.':'Rencana vs kenyataan, nilai bulan ini, dan penyesuaian untuk bulan depan.';
  renderReview();
}
