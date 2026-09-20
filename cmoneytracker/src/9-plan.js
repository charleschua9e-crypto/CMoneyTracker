// ================= Panduan awal, tujuan keuangan & simulasi =================
const GOALS={
  darurat:{em:'🛟',t:'Punya dana darurat',s:'Cadangan 3–6 bulan biaya hidup untuk jaga-jaga'},
  utang:{em:'💳',t:'Bebas utang',s:'Lunasi cicilan, paylater, atau pinjaman'},
  beli:{em:'🎯',t:'Nabung untuk sesuatu',s:'HP baru, liburan, motor, nikah…'},
  hemat:{em:'🧋',t:'Kontrol jajan & boros',s:'Tahu uang bocor ke mana dan menguranginya'},
  investasi:{em:'📈',t:'Mulai investasi',s:'Siapkan pondasi supaya uang bisa bertumbuh'}
};
const FIXED_OPTS=[
  {cat:'Kos',em:'🏠',label:'Kos / kontrakan'},
  {cat:'Internet',em:'📶',label:'Internet & pulsa'},
  {cat:'Langganan',em:'📺',label:'Langganan (streaming, musik, cloud)'},
  {cat:'Cicilan',em:'💳',label:'Cicilan / paylater',custom:true},
  {cat:'Kirim keluarga',em:'🤲',label:'Kirim ke orang tua / keluarga',custom:true}
];
EMOJI['Cicilan']='💳';EMOJI['Kirim keluarga']='🤲';
const DEBT_CAT_RE=/cicil|kredit|paylater|angsur|pinjam/i;
const monthAdd=(m,n)=>{const d=new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1+n,1);return ymd(d).slice(0,7)};
const monthsBetween=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5,7))-Number(a.slice(5,7));
const monthLabelAdd=n=>monthName(monthAdd(month(),n));
const pctTxt=(a,b)=>b>0?Math.round(a/b*100)+'%':'-';

// ---------- Panduan awal (onboarding) ----------
const OB_STEPS=6;
let OB=null;
function openOnboarding(first,step=0){
  if(OB&&!$('#onboard').classList.contains('hidden'))return;
  db=load();
  const p=db.profile||{},g=p.goal||{};
  const tpls=(db.recurringTemplates||[]).filter(t=>t.kind!=='sub');
  const A=lastAnalysis;
  OB={first,step,name:p.name||'',saldo:null,
    inc:p.incomeType||null,income:Number(p.incomeMonthly)||(A&&A.avgHistIncome>0?Math.round(A.avgHistIncome):0),payday:db.payday||'',
    fixed:{},goal:g.type||null,gx:Object.assign({},g)};
  if(!OB.inc&&OB.income)OB.inc='gaji';
  FIXED_OPTS.forEach(f=>{
    const t=tpls.find(x=>x.category===f.cat);
    if(t){OB.fixed[f.cat]={on:true,amount:Number(t.amount),day:t.dayOfMonth,existing:true};return}
    const m=A&&A.CM[f.cat];
    // pengeluaran bulanan rutin yang terdeteksi tapi belum jadi tagihan otomatis → isian disiapkan
    if(m&&m.pattern==='lump'&&m.validMonths>=2&&m.paidMonths/m.validMonths>=0.75)OB.fixed[f.cat]={on:false,amount:Math.round(m.avgWhenPaid),day:Math.min(28,usualDay(f.cat)),detected:true};
    else OB.fixed[f.cat]={on:false,amount:0,day:''};
  });
  if(g.type==='beli'&&g.wishId){const w=db.wishes.find(x=>x.id===g.wishId);if(w){OB.gx.name=w.name;OB.gx.price=w.price}if(g.deadline)OB.gx.months=Math.max(1,monthsBetween(month(),g.deadline))}
  const cur=Math.round(getSaldo());
  $('#obName').value=OB.name;
  $('#obSaldo').value=!first&&cur>0?plainAmount(cur):'';
  $('#obSaldoNote').textContent=first?'':'Saldo tercatat sekarang '+fmtSigned(cur)+'. Kalau angkanya diubah, saldo dikoreksi — riwayat transaksi tidak berubah.';
  $('#obIncome').value=OB.income?plainAmount(OB.income):'';
  $('#obPayday').value=OB.payday||'';
  $('#onboard').classList.remove('hidden');
  obGo(step);
}
function obGo(n){
  OB.step=n;
  $$('#onboard .ob-step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));
  $('#obDots').innerHTML=Array.from({length:OB_STEPS},(_,i)=>'<i class="'+(i<n?'done':i===n?'on':'')+'"></i>').join('');
  const closeOnBack=!OB.first&&n===0;
  $('#obBack').style.visibility=(n===0&&OB.first)?'hidden':'';
  $('#obBack').textContent=closeOnBack?'Tutup':'Kembali';
  $('#obNext').textContent=n===0?(OB.first?'Mulai':'Lanjut'):n===OB_STEPS-1?(OB.first?'Selesai, mulai catat!':'Simpan rencana'):'Lanjut';
  $('#obSkip').classList.toggle('hidden',n===0||n===OB_STEPS-1);
  $('#obSkip').textContent=OB.first?'Lewati':'Tutup';
  $('#obErr').textContent='';
  if(n===2)renderObIncome();
  if(n===3)renderObFixed();
  if(n===4)renderObGoals();
  if(n===5)renderObPlan();
  $('#onboard .sheet').scrollTop=0;
  if(n===0)setTimeout(()=>{try{$('#obName').focus({preventScroll:true})}catch(e){}},250);
}
const obErr=t=>{$('#obErr').textContent=t;buzz(20);return false};
function obCollect(){
  const n=OB.step;
  if(n===0){OB.name=$('#obName').value.trim();if(!OB.name)return obErr('Isi nama panggilan dulu ya.')}
  if(n===1){const v=$('#obSaldo').value.trim();OB.saldo=v===''?null:parseAmount(v)}
  if(n===2){
    if(!OB.inc)return obErr('Pilih salah satu dulu.');
    if(OB.inc==='belum'){OB.income=0;OB.payday=''}
    else{
      OB.income=parseAmount($('#obIncome').value);
      if(!OB.income)return obErr('Isi perkiraan pemasukan per bulan (boleh kira-kira).');
      const d=Number($('#obPayday').value);
      OB.payday=OB.inc!=='tidak'&&d>=1&&d<=31?d:'';
    }
  }
  if(n===3){
    for(const f of FIXED_OPTS){const o=OB.fixed[f.cat];if(o.on&&!o.existing&&!(o.amount>0))return obErr('Isi nominal '+f.label.split(' (')[0].toLowerCase()+', atau ketuk lagi untuk batal.')}
  }
  if(n===4){
    if(!OB.goal)return obErr('Pilih satu tujuan dulu.');
    const x=OB.gx;
    if(OB.goal==='beli'){
      if(!x.name)return obErr('Mau nabung untuk apa?');
      if(!(x.price>0))return obErr('Isi perkiraan harganya.');
      if(!(x.months>0))return obErr('Isi target waktunya (bulan).');
    }
  }
  return true;
}
function obFixedTotal(){return FIXED_OPTS.reduce((s,f)=>{const o=OB.fixed[f.cat];return s+(o.on?Number(o.amount)||0:0)},0)}
function renderObIncome(){
  $$('#obIncType [data-inc]').forEach(b=>b.classList.toggle('on',b.dataset.inc===OB.inc));
  const show=OB.inc&&OB.inc!=='belum';
  $('#obIncFields').classList.toggle('hidden',!show);
  $('#obIncLabel').textContent=OB.inc==='gaji'?'Gaji bersih per bulan':OB.inc==='saku'?'Uang saku / kiriman per bulan':'Rata-rata per bulan (pakai angka bulan yang sepi biar aman)';
  $('#obPaydayField').classList.toggle('hidden',OB.inc==='tidak');
}
function renderObFixed(){
  $('#obFixed').innerHTML=FIXED_OPTS.map(f=>{
    const o=OB.fixed[f.cat];
    return '<div class="fx'+(o.on?' on':'')+'"><button type="button" class="fx-head" data-fx="'+esc(f.cat)+'"'+(o.existing?' disabled':'')+'><span class="fx-em">'+f.em+'</span><span class="fx-l">'+esc(f.label)+(o.existing?'<small>Sudah jadi tagihan otomatis · '+fmt(o.amount)+' tiap tgl '+o.day+'</small>':o.detected&&!o.on?'<small class="det">Terdeteksi rutin ± '+fmt(o.amount)+' sekitar tgl '+o.day+' — ketuk untuk jadikan otomatis</small>':'')+'</span><span class="fx-tick">'+(o.on?'✓':'+')+'</span></button>'
      +(o.on&&!o.existing?'<div class="fx-body"><div class="field"><label>Nominal / bulan</label><input class="input num" data-fx-amt="'+esc(f.cat)+'" inputmode="numeric" value="'+(o.amount?plainAmount(o.amount):'')+'" placeholder="0"></div><div class="field"><label>Tanggal bayar</label><input class="input num" data-fx-day="'+esc(f.cat)+'" type="number" inputmode="numeric" min="1" max="28" value="'+(o.day||'')+'" placeholder="1"></div></div>':'')+'</div>';
  }).join('')+'<p class="ob-note" id="obFixedSum"></p>';
  updateObFixedSum();
}
function updateObFixedSum(){
  const t=obFixedTotal();
  $('#obFixedSum').innerHTML=t?'Total pengeluaran tetap <b class="num">'+fmt(t)+'</b>/bulan'+(OB.income?' · <b>'+pctTxt(t,OB.income)+'</b> dari pemasukan':'')+'. Yang tanggalnya sudah lewat dianggap sudah dibayar bulan ini.':'Tidak punya? Langsung ketuk Lanjut.';
}
$('#obFixed').addEventListener('click',e=>{
  const b=e.target.closest('[data-fx]');if(!b||b.disabled)return;
  const o=OB.fixed[b.dataset.fx];o.on=!o.on;renderObFixed();
  if(o.on){const i=$('#obFixed').querySelector('[data-fx-amt="'+CSS.escape(b.dataset.fx)+'"]');if(i)i.focus()}
});
$('#obFixed').addEventListener('input',e=>{
  const a=e.target.closest('[data-fx-amt]');
  if(a){const n=parseAmount(a.value);a.value=n?n.toLocaleString('id-ID'):'';OB.fixed[a.dataset.fxAmt].amount=n;updateObFixedSum()}
  const d=e.target.closest('[data-fx-day]');
  if(d)OB.fixed[d.dataset.fxDay].day=Number(d.value)||'';
});
$('#obIncType').addEventListener('click',e=>{
  const b=e.target.closest('[data-inc]');if(!b)return;
  OB.inc=b.dataset.inc;renderObIncome();$('#obErr').textContent='';
  if(OB.inc!=='belum')setTimeout(()=>{try{$('#obIncome').focus()}catch(e){}},50);
});
amountInput('#obSaldo');amountInput('#obIncome');
function renderObGoals(){
  $('#obGoals').innerHTML=Object.entries(GOALS).map(([k,g])=>'<button type="button" data-goal="'+k+'" class="'+(OB.goal===k?'on':'')+'"><span class="og-em">'+g.em+'</span><span><b>'+g.t+'</b><small>'+g.s+'</small></span></button>').join('');
  const x=OB.gx,g=OB.goal;let h='';
  if(g==='darurat'){
    const m=x.months||(OB.inc==='tidak'||OB.inc==='belum'?6:3);x.months=m;
    h='<span class="label">Target cadangan</span><div class="chips">'+[3,6,12].map(v=>'<button type="button" class="chip'+(v===m?' on':'')+'" data-gx-months="'+v+'">'+v+' bulan</button>').join('')+'</div><p class="ob-note">'+(OB.inc==='tidak'||OB.inc==='belum'?'Pemasukanmu tidak tetap, jadi disarankan minimal 6 bulan.':'Untuk gaji tetap, 3 bulan sudah jadi pondasi yang baik.')+'</p>';
  }else if(g==='beli'){
    h='<div class="field"><label>Untuk apa</label><input class="input" data-gx="name" maxlength="40" value="'+esc(x.name||'')+'" placeholder="Mis. HP baru, liburan"></div>'
     +'<div class="grid2"><div class="field"><label>Perkiraan harga</label><input class="input num" data-gx="price" data-money="1" inputmode="numeric" value="'+(x.price?plainAmount(x.price):'')+'" placeholder="0"></div>'
     +'<div class="field"><label>Target (bulan lagi)</label><input class="input num" data-gx="months" type="number" inputmode="numeric" min="1" max="120" value="'+(x.months||'')+'" placeholder="6"></div></div>';
  }else if(g==='utang'){
    h='<p class="ob-note">Opsional — isi supaya bisa dihitung kapan lunas. Detail per orang/lembaga bisa dicatat di Utang & piutang.</p>'
     +'<div class="grid2"><div class="field"><label>Total sisa utang</label><input class="input num" data-gx="debtTotal" data-money="1" inputmode="numeric" value="'+(x.debtTotal?plainAmount(x.debtTotal):'')+'" placeholder="0"></div>'
     +'<div class="field"><label>Cicilan / bulan</label><input class="input num" data-gx="debtPay" data-money="1" inputmode="numeric" value="'+(x.debtPay?plainAmount(x.debtPay):'')+'" placeholder="0"></div></div>'
     +'<div class="field"><label>Bunga per bulan (%) — kalau tahu</label><input class="input num" data-gx="debtRate" type="number" inputmode="decimal" step="0.1" min="0" value="'+(x.debtRate??'')+'" placeholder="Mis. 2"></div>';
  }else if(g==='hemat'){
    h='<p class="ob-note">Aplikasi akan menjaga pengeluaran keinginan (jajan, hiburan, belanja non-pokok) maksimal 30% dari pemasukan dan memberi tahu pos yang paling bocor.</p>';
  }else if(g==='investasi'){
    h='<p class="ob-note">Sebelum investasi, pastikan 3 pondasi: dana darurat ≥ 3 bulan, tidak ada utang konsumtif, dan rutin menabung ≥ 10%. Aplikasi akan memantau ceklis ini.</p>';
  }
  $('#obGoalExtra').innerHTML=h;
}
$('#obGoals').addEventListener('click',e=>{const b=e.target.closest('[data-goal]');if(!b)return;if(OB.goal!==b.dataset.goal){OB.goal=b.dataset.goal;OB.gx={}}renderObGoals();$('#obErr').textContent=''});
$('#obGoalExtra').addEventListener('click',e=>{const b=e.target.closest('[data-gx-months]');if(b){OB.gx.months=Number(b.dataset.gxMonths);renderObGoals()}});
$('#obGoalExtra').addEventListener('input',e=>{
  const i=e.target.closest('[data-gx]');if(!i)return;
  const k=i.dataset.gx;
  if(i.dataset.money){const n=parseAmount(i.value);i.value=n?n.toLocaleString('id-ID'):'';OB.gx[k]=n}
  else if(i.type==='number')OB.gx[k]=i.value===''?null:Number(i.value);
  else OB.gx[k]=i.value.trim();
});
function payoff(P,ratePct,pay){
  const r=(Number(ratePct)||0)/100;let bal=P,interest=0,m=0;
  if(!(P>0))return {months:0,interest:0};
  if(!(pay>0)||pay<=P*r)return null;
  while(bal>0.5&&m<600){const i=bal*r;interest+=i;bal=bal+i-pay;m++}
  return m>=600?null:{months:m,interest:Math.round(interest)};
}
function obPlanNumbers(){
  const I=OB.inc&&OB.inc!=='belum'?OB.income:0;
  const otherTpl=(db.recurringTemplates||[]).filter(t=>!FIXED_OPTS.some(f=>f.cat===t.category)).reduce((s,t)=>s+tplMonthly(t),0);
  // pengeluaran bulanan rutin yang belum jadi tagihan otomatis tetap dihitung sebagai biaya tetap
  const A=lastAnalysis,tplCats=new Set((db.recurringTemplates||[]).map(t=>t.category));
  const lumps=A?Object.values(A.CM).filter(m=>m.pattern==='lump'&&!tplCats.has(m.c)&&!(OB.fixed[m.c]&&OB.fixed[m.c].on)&&m.validMonths>=2&&m.paidMonths/m.validMonths>=0.75).reduce((s,m)=>s+m.avgWhenPaid,0):0;
  const fixed=obFixedTotal()+otherTpl+lumps;
  const base20=Math.round(I*0.2/10000)*10000;
  const x=OB.gx;
  const goalSave=OB.goal==='beli'&&x.price>0&&x.months>0?Math.ceil(x.price/x.months/10000)*10000:0;
  const saveTarget=Math.max(base20,goalSave);
  const living=I-fixed-saveTarget;
  return {I,fixed,base20,goalSave,saveTarget,living,perDay:living/30,budget:Math.max(0,I-saveTarget)};
}
function renderObPlan(){
  const N=obPlanNumbers(),x=OB.gx,L=[];
  const saldo=OB.saldo!==null?OB.saldo:Math.max(0,Math.round(getSaldo()));
  let h='';
  if(N.I>0){
    const tot=Math.max(1,N.fixed+Math.max(0,N.living)+N.saveTarget);
    h+='<div class="ab-split"><div class="ab-bar"><i class="need" style="width:'+N.fixed/tot*100+'%"></i><i class="want" style="width:'+Math.max(0,N.living)/tot*100+'%"></i><i class="save" style="width:'+N.saveTarget/tot*100+'%"></i></div>'
      +'<div class="ab-legend"><div class="need"><small>Tetap</small><b class="num">'+fmtShort(N.fixed)+'</b><i>'+pctTxt(N.fixed,N.I)+'</i></div><div class="want"><small>Hidup & jajan</small><b class="num">'+(N.living<0?'−':'')+fmtShort(N.living)+'</b><i>'+pctTxt(Math.max(0,N.living),N.I)+'</i></div><div class="save"><small>Sisihkan</small><b class="num">'+fmtShort(N.saveTarget)+'</b><i>'+pctTxt(N.saveTarget,N.I)+'</i></div></div></div>';
    h+='<div class="ob-lines">'
      +'<div class="line"><span>Pemasukan / bulan</span><b class="num">'+fmt(N.I)+'</b></div>'
      +'<div class="line"><span>Pengeluaran tetap</span><b class="num">− '+fmt(N.fixed)+'</b></div>'
      +'<div class="line"><span>Sisihkan di awal bulan'+(N.goalSave>N.base20?' (untuk '+esc(x.name||'target')+')':'')+'</span><b class="num">− '+fmt(N.saveTarget)+'</b></div>'
      +'<div class="line total"><span>Untuk makan, transport, jajan</span><b class="num" style="color:'+(N.living<0?'var(--red)':'var(--green)')+'">'+(N.living<0?'−':'')+fmt(N.living)+'</b></div>'
      +'</div>';
    if(N.living>0)L.push('Artinya sekitar <b>'+fmt(N.perDay)+' per hari</b> untuk kebutuhan sehari-hari & jajan. Angka "aman dibelanjakan hari ini" di Beranda akan menyesuaikan otomatis.');
    if(N.fixed>N.I*0.5)L.push('<span class="warn-t">Pengeluaran tetapmu '+pctTxt(N.fixed,N.I)+' dari pemasukan — di atas acuan 50%.</span> Ruang geraknya sempit; kalau bisa, cari cara menurunkan biaya tetap terbesar.');
    if(N.living<0)L.push('<span class="bad-t">Pemasukan belum cukup untuk biaya tetap + tabungan.</span> Turunkan target tabungan sementara, atau cari tambahan pemasukan.');
    else if(N.perDay<25000)L.push('<span class="warn-t">Sisa harian tipis.</span> Prioritaskan makan & transport, tahan jajan dulu.');
    if(N.goalSave>N.base20)L.push('Target '+esc(x.name||'')+' butuh '+fmt(N.goalSave)+'/bulan — lebih dari 20% pemasukan. '+(N.goalSave>N.I*0.35?'Cukup berat; pertimbangkan memundurkan target.':'Bisa, asal disiplin.'));
  }else{
    h+='<div class="ob-lines"><div class="line"><span>Uang saat ini</span><b class="num">'+fmt(saldo)+'</b></div><div class="line"><span>Pengeluaran tetap / bulan</span><b class="num">'+fmt(N.fixed)+'</b></div></div>';
    L.push('Tanpa pemasukan rutin, kunci utamanya membuat uang yang ada awet. Batas belanja harian di Beranda dihitung dari saldo dibagi sisa hari.');
    if(N.fixed>0&&saldo>0)L.push('Untuk biaya tetap saja, saldo ini cukup ± <b>'+Math.floor(saldo/N.fixed)+' bulan</b> — belum termasuk makan & transport.');
  }
  // rencana tujuan
  // kalau sudah ada riwayat, pakai angka nyata (sama dengan kartu tujuan); kalau belum, pakai rencana
  const AH=lastAnalysis&&lastAnalysis.hist.length?lastAnalysis:null;
  const E=AH?AH.baseMonthlySpend:(N.I>0?N.fixed+Math.max(0,N.living):N.fixed);
  if(OB.goal==='darurat'){
    const m=x.months||3,target=E*m,have=AH?Math.max(0,AH.reserve):saldo;
    if(target>0){const need=Math.max(0,target-have);L.push('🛟 Dana darurat '+m+' bulan ≈ <b>'+fmt(target)+'</b>. '+(need<=0?'Uangmu sekarang sudah cukup — jaga jangan terpakai.':N.saveTarget>0?'Kurang '+fmt(need)+' → dengan menyisihkan '+fmt(N.saveTarget)+'/bulan, tercapai ± <b>'+Math.ceil(need/N.saveTarget)+' bulan</b>.':'Kurang '+fmt(need)+'.'))}
  }else if(OB.goal==='beli'&&x.price){
    L.push('🎯 '+esc(x.name)+' '+fmt(x.price)+' dalam '+x.months+' bulan → sisihkan <b>'+fmt(N.goalSave)+'/bulan</b>. Aplikasi tetap menjaga cadangan 3 bulan sebelum menganggap uangnya "siap dipakai".');
  }else if(OB.goal==='utang'){
    if(x.debtTotal&&x.debtPay){const P=payoff(x.debtTotal,x.debtRate||0,x.debtPay);L.push(P?'💳 Dengan cicilan '+fmt(x.debtPay)+', utang '+fmt(x.debtTotal)+' lunas ± <b>'+P.months+' bulan</b> ('+monthLabelAdd(P.months)+')'+(P.interest?', total bunga '+fmt(P.interest):'')+'. Coba simulasi bayar tambahan untuk mempercepat.':'<span class="bad-t">💳 Cicilan '+fmt(x.debtPay)+' belum menutup bunganya</span> — utang tidak akan berkurang. Perlu tambah cicilan atau negosiasi ulang.')}
    else L.push('💳 Prioritas: lunasi utang berbunga tertinggi dulu dan hindari paylater baru. Catat utangnya di Utang & piutang supaya progresnya terlihat.');
  }else if(OB.goal==='hemat'&&N.I>0){
    const cap=Math.min(N.I*0.3,Math.max(0,N.living));
    L.push('🧋 Batas keinginan (jajan, hiburan, belanja non-pokok) maksimal <b>'+fmt(cap)+'/bulan</b> ≈ '+fmt(cap/4.33)+'/minggu.');
  }else if(OB.goal==='investasi'){
    L.push('📈 Mulai investasi setelah dana darurat ≥ 3 bulan'+(E>0?' (± '+fmt(E*3)+')':'')+' dan tanpa utang konsumtif. Sambil menunggu, sisihkan '+fmt(N.saveTarget)+'/bulan.');
  }
  h+='<ul class="cat-insight">'+L.map(l=>'<li>'+l+'</li>').join('')+'</ul>';
  if(N.I>0&&N.budget>0)h+='<label class="check"><input type="checkbox" id="obUseBudget"'+(OB.first||!db.monthlyBudget?' checked':'')+'><span>Pakai <b class="num">'+fmt(N.budget)+'</b> sebagai anggaran belanja bulanan (pemasukan dikurangi yang disisihkan)</span></label>';
  if(OB.first)h+='<div class="ob-tips"><div>➕ <span>Catat lewat tombol <b>+</b>, atau ketik cepat “kopi 15rb”</span></div><div>🎙️ <span>Ketuk mikrofon & bilang “makan dua puluh ribu”</span></div><div>🧮 <span>Ketuk skor di kanan atas untuk analisis & simulasi</span></div></div>';
  $('#obPlan').innerHTML=h;
}
function obFinish(useBudget){
  db=load();
  const first=!db.profile;
  const prevGoal=(db.profile&&db.profile.goal)||{};
  db.profile=Object.assign({total:0},db.profile||{},{name:OB.name||(db.profile&&db.profile.name)||'Kamu',planAt:day()});
  if(OB.inc){db.profile.incomeType=OB.inc;db.profile.incomeMonthly=OB.inc==='belum'?0:(OB.income||0)}
  if(OB.saldo!==null&&OB.saldo!==undefined){
    const cur=getSaldo();
    if(Math.round(cur)!==OB.saldo)db.methodBalances={Utama:(Number(db.methodBalances.Utama)||0)+(OB.saldo-cur)};
  }
  if(OB.payday)db.payday=OB.payday;
  const today=Number(day().slice(8,10));
  FIXED_OPTS.forEach(f=>{
    const o=OB.fixed[f.cat];if(!o.on||o.existing||!(o.amount>0))return;
    if(f.custom){
      if(!recurringCats.includes(f.cat)&&!db.customCategories.recurring.includes(f.cat))db.customCategories.recurring.push(f.cat);
      db.categoryClass[f.cat]='need';db.categoryPattern[f.cat]='lump';
    }
    const dom=Math.min(28,Math.max(1,Number(o.day)||1));
    const t={id:newId(),category:f.cat,amount:o.amount,dayOfMonth:dom,note:''};
    if(dom<=today)t.skip=month(); // saldo yang diisi sudah memperhitungkan pembayaran bulan ini
    db.recurringTemplates.push(t);
  });
  if(OB.goal){
    const x=OB.gx,g={type:OB.goal,since:prevGoal.type===OB.goal&&prevGoal.since?prevGoal.since:day()};
    if(OB.goal==='darurat')g.months=x.months||3;
    if(OB.goal==='beli'){
      let w=prevGoal.wishId&&db.wishes.find(v=>v.id===prevGoal.wishId&&!v.done);
      if(w)Object.assign(w,{name:x.name,price:x.price});
      else w={id:newId(),name:x.name,price:x.price,emoji:'🎯',img:'',created:day(),done:false};
      db.wishes=[w,...db.wishes.filter(v=>v.id!==w.id)];
      g.wishId=w.id;g.deadline=monthAdd(month(),Number(x.months)||6);
    }
    if(OB.goal==='utang'){g.debtTotal=x.debtTotal||0;g.debtPay=x.debtPay||0;g.debtRate=x.debtRate??null}
    db.profile.goal=g;
  }
  delete db.profile.saveTarget; // rencana baru → target sisihan dihitung ulang
  if(useBudget){const N=obPlanNumbers();if(N.budget>0){db.monthlyBudget=Math.round(N.budget/10000)*10000;if(!db.budgetSince)db.budgetSince=month()}}
  save();
  try{localStorage.setItem('cmoneytracker-tips-seen-v39','1');localStorage.setItem('cmoneytracker-whatsnew-v43','1')}catch(e){}
  $('#onboard').classList.add('hidden');
  const name=db.profile.name;OB=null;
  render();
  ensurePlanSnap(true);
  requestPersist(false);
  if(first){try{fireConfetti()}catch(e){}toast('Siap, '+name+'! Catat transaksi pertamamu lewat tombol +.')}
  else toast('Rencana & tujuan disimpan.');
}
$('#obNext').onclick=()=>{
  if(!obCollect())return;
  if(OB.step===OB_STEPS-1){obFinish(!!($('#obUseBudget')&&$('#obUseBudget').checked));return}
  obGo(OB.step+1);
};
$('#obBack').onclick=()=>{
  if(OB.step===0){if(!OB.first){$('#onboard').classList.add('hidden');OB=null}return}
  obGo(OB.step-1);
};
$('#obSkip').onclick=()=>{
  if(OB.first){obCollect();obFinish(false)}
  else{$('#onboard').classList.add('hidden');OB=null}
};
$('#obName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#obNext').click()}});
$('#onboard').addEventListener('click',e=>{if(e.target===$('#onboard')&&OB&&!OB.first){$('#onboard').classList.add('hidden');OB=null}});
$('#menuPlan').onclick=()=>openOnboarding(false,0);

// ---------- Tujuan keuangan ----------
function avgSurplus(A){
  const h=A.hist.slice(0,3);
  if(h.length)return h.reduce((s,x)=>s+((x.income||0)-(x.spent||0)),0)/h.length;
  return (A.refIncome>0?A.refIncome:A.expectedIncome)-A.baseMonthlySpend;
}
function goalStatus(A){
  const g=db.profile&&db.profile.goal;if(!g||!GOALS[g.type])return null;
  const G=GOALS[g.type],I=A.refIncome>0?A.refIncome:A.expectedIncome,B=A.baseMonthlySpend,sur=avgSurplus(A);
  const r={type:g.type,em:G.em,title:G.t,pct:0,big:'',lines:[],action:'',tab:'hemat'};
  if(g.type==='darurat'){
    const m=g.months||3,target=B*m,have=Math.max(0,A.reserve);
    r.title='Dana darurat '+m+' bulan';r.tab='darurat';
    if(!(target>0)){r.action='Catat pengeluaran dulu beberapa hari supaya targetnya bisa dihitung.';return r}
    r.pct=Math.min(1,have/target);r.big=fmtShort(have)+' / '+fmtShort(target);
    r.lines.push('Target = '+m+' × pengeluaran bulanan ± '+fmt(B)+'. Terkumpul = sisa saldo setelah kebutuhan bulan ini'+(A.DS.iOwe?' dikurangi utang':'')+'.');
    if(r.pct>=1){r.done=true;r.action=m<6?'Tercapai 🎉 Naikkan target ke 6 bulan, atau mulai sisihkan untuk investasi.':'Tercapai 🎉 Kelebihannya bisa mulai dialokasikan ke investasi sesuai profil risikomu.'}
    else if(sur>0){const eta=Math.ceil((target-have)/sur);r.action='Kurang '+fmt(target-have)+'. Dengan surplus ± '+fmt(sur)+'/bulan, tercapai ± '+eta+' bulan lagi ('+monthLabelAdd(eta)+'). Sisihkan di awal bulan — jangan menunggu sisa.'}
    else r.action='Belum ada surplus, jadi dana darurat belum bisa bertambah. Mulai dari memangkas pos keinginan — cek di simulasi.';
  }else if(g.type==='utang'){
    r.tab='utang';
    const borrow=(db.debts||[]).filter(d=>d.dir==='borrow');
    const left=borrow.reduce((s,d)=>s+debtLeft(d),0),paid=borrow.reduce((s,d)=>s+Math.min(Number(d.amount||0),debtPaid(d)),0);
    if(borrow.length&&left+paid>0){
      r.pct=paid/(paid+left);r.big=left?fmtShort(left)+' tersisa':'Lunas';
      r.lines.push(borrow.filter(d=>debtLeft(d)>0).length+' utang aktif tercatat · sudah dibayar '+fmt(paid)+'.');
      if(!left){r.done=true;r.action='Semua utang tercatat sudah lunas 🎉 Alihkan uang cicilan lama ke dana darurat.';return r}
    }else if(g.debtTotal){
      const P=payoff(g.debtTotal,g.debtRate||0,g.debtPay||0);
      r.big=fmtShort(g.debtTotal);
      r.lines.push(P?'Dengan cicilan '+fmt(g.debtPay)+' → lunas ± '+P.months+' bulan'+(P.interest?', total bunga '+fmt(P.interest):'')+'.':'Cicilan belum diisi atau belum menutup bunga.');
      r.lines.push('Catat utangnya di Utang & piutang supaya progres pembayarannya terpantau.');
    }else r.lines.push('Belum ada utang tercatat. Tambahkan di Lainnya → Utang & piutang.');
    r.action=sur>0?'Arahkan sebagian surplus (± '+fmt(Math.max(50000,Math.round(sur*0.5/50000)*50000))+'/bulan) untuk pelunasan ekstra — dahulukan yang bunganya paling tinggi. Hindari paylater/pinjaman baru.':'Belum ada surplus. Stop dulu belanja keinginan yang pakai paylater, lalu cek simulasi bayar tambahan.';
  }else if(g.type==='beli'){
    r.tab='target';
    const P=wishPlan(),p=P.plans.find(x=>x.w.id===g.wishId);
    if(!p){
      const w=db.wishes.find(x=>x.id===g.wishId);
      if(w&&w.done){r.done=true;r.pct=1;r.title=w.name;r.big='Tercapai';r.action='Tercapai 🎉 Pilih tujuan berikutnya di Rencana & tujuan.'}
      else r.action='Barang tujuan tidak ditemukan. Atur ulang di Rencana & tujuan.';
      return r;
    }
    r.title=p.w.name;r.em=p.w.emoji||'🎯';r.pct=p.pct;r.big=fmtShort(p.have)+' / '+fmtShort(p.w.price);
    r.lines.push('Terkumpul = uang di atas cadangan 3 bulan ('+fmt(P.buffer)+'), supaya dana darurat tidak ikut terpakai.');
    const mLeft=g.deadline?Math.max(1,monthsBetween(month(),g.deadline)):null;
    if(p.need<=0)r.action='Uangnya sudah cukup dan cadangan tetap aman. Kalau masih butuh, beli — tapi tunggu 3 hari dulu untuk menghindari beli impulsif.';
    else if(mLeft){
      const per=Math.ceil(p.need/mLeft/10000)*10000;
      r.action='Butuh '+fmt(per)+'/bulan supaya tercapai '+monthName(g.deadline)+'. '+(sur>=per?'Surplusmu ± '+fmt(sur)+' cukup — sisihkan di awal bulan.':'Surplusmu ± '+fmt(Math.max(0,sur))+', kurang '+fmt(per-Math.max(0,sur))+'/bulan. Pangkas keinginan'+(sur>0?' atau mundurkan target ke '+monthLabelAdd(Math.ceil(p.need/sur)):'')+'.');
    }else r.action=p.eta?'Dengan surplus sekarang, tercapai sekitar '+p.eta+'.':'Belum ada surplus untuk menabung.';
  }else if(g.type==='hemat'){
    r.tab='hemat';r.title='Keinginan ≤ 30% pemasukan';r.inverse=true;
    if(!(I>0)){r.action='Isi pemasukan rutin di Rencana & tujuan supaya batasnya bisa dihitung.';return r}
    const cap=I*0.3,w=A.wantsProj,top=A.wantCats[0];
    r.pct=Math.min(1,w/cap);r.big=fmtShort(w)+' / maks '+fmtShort(cap);
    r.lines.push('Proyeksi pengeluaran keinginan bulan ini '+fmt(w)+' ('+fmtPct(A.wantPct)+' dari pemasukan).');
    r.action=w>cap?'Lewat '+fmt(w-cap)+'. '+(top?'Paling besar: '+top[0]+' '+fmt(top[1])+'. ':'')+'Tahan belanja keinginan sampai bulan depan.':'Masih aman, sisa ruang '+fmt(cap-w)+(A.remaining?' (± '+fmt((cap-w)/A.remaining)+'/hari)':'')+'.'+(top?' Pantau '+top[0]+'.':'');
  }else if(g.type==='investasi'){
    r.title='Siap investasi';
    const checks=[
      ['Dana darurat ≥ 3 bulan',A.coverage!==null&&A.coverage>=3,A.coverage===null?'belum ada data':fmtMonths(A.coverage)],
      ['Tanpa utang konsumtif',A.DS.iOwe<=0,A.DS.iOwe>0?'sisa '+fmt(A.DS.iOwe):'aman'],
      ['Menabung ≥ 10% pemasukan',A.savingsRate!==null&&A.savingsRate>=10,fmtPct(A.savingsRate)]
    ];
    const ok=checks.filter(c=>c[1]).length;
    r.pct=ok/3;r.big=ok+'/3 siap';r.checks=checks;r.tab=checks[0][1]?'hemat':'darurat';
    r.action=ok===3?'Pondasi siap. Mulai rutin dari ± '+fmt(Math.max(50000,Math.round(Math.max(0,sur)*0.5/50000)*50000))+'/bulan di instrumen berisiko rendah dulu sambil belajar. Pilih produk yang terdaftar & diawasi OJK, dan waspadai janji imbal hasil "pasti tinggi".':'Lengkapi dulu ceklis yang belum terpenuhi — investasi tanpa dana darurat berisiko terpaksa dicairkan saat nilainya sedang turun.';
  }
  return r;
}
function goalSummaryLine(){
  const p=db.profile||{},A=lastAnalysis,L=[];
  if(p.incomeType)L.push('Jenis pemasukan: '+({gaji:'gaji tetap',saku:'uang saku/kiriman',tidak:'tidak tetap',belum:'belum ada pemasukan'}[p.incomeType]||p.incomeType)+(p.incomeMonthly?' ± '+fmt(p.incomeMonthly)+'/bulan':'')+(db.payday?', diterima tgl '+db.payday:''));
  const S=A&&goalStatus(A);
  if(S)L.push('Tujuan utama saya: '+S.title+(S.big?' ('+S.big+')':'')+'. Status: '+S.action);
  return L.length?'PROFIL & TUJUAN:\n- '+L.join('\n- '):'';
}
function renderGoal(A){
  const S=goalStatus(A);
  $('#menuPlanMeta').textContent=S?S.title.slice(0,18):'Belum diatur';
  const card=$('#goalCard');
  card.classList.remove('hidden');
  if(!S){
    card.innerHTML='<div class="goal-empty"><span class="og-em">🎯</span><div><b>Tentukan tujuan keuanganmu</b><small>Saran jadi lebih terarah: dana darurat, lunas utang, nabung, atau kontrol jajan.</small></div></div><button class="btn btn-primary btn-block" data-plan-open="4" style="margin-top:12px">Pilih tujuan</button>';
    $('#homeGoal').classList.add('hidden');
    return;
  }
  const tone=S.inverse?(S.pct>=1?'over':S.pct>=0.8?'':'green'):(S.done?'green':'');
  card.innerHTML='<div class="goal-head"><span class="og-em">'+esc(S.em)+'</span><div style="min-width:0;flex:1"><small>Tujuan utama</small><b>'+esc(S.title)+'</b></div></div>'
    +'<div class="bar-track" style="margin:12px 0 6px"><div class="bar-fill '+tone+'" style="width:'+Math.max(3,Math.round(S.pct*100))+'%"></div></div>'
    +'<div class="goal-prog"><b class="num">'+esc(S.big||'')+'</b><span class="num">'+Math.round(S.pct*100)+'%</span></div>'
    +(S.checks?'<div class="goal-checks">'+S.checks.map(c=>'<div class="'+(c[1]?'ok':'no')+'"><span>'+(c[1]?'✓':'○')+'</span>'+esc(c[0])+'<small>'+esc(c[2])+'</small></div>').join('')+'</div>':'')
    +S.lines.map(l=>'<p class="goal-line">'+esc(l)+'</p>').join('')
    +(S.action?'<div class="act"><b>Langkah</b>'+esc(S.action)+'</div>':'')
    +'<div class="btn-row" style="margin-top:12px"><button class="btn btn-soft" data-sim-open="'+S.tab+'">🧮 Simulasikan</button><button class="btn btn-soft" data-plan-open="4" style="flex:0 0 auto">Ubah</button></div>';
  const hg=$('#homeGoal');
  hg.classList.toggle('hidden',S.type==='beli');
  hg.innerHTML='<span class="og-em">'+esc(S.em)+'</span><div style="flex:1;min-width:0"><small>Tujuan · '+esc(S.title)+'</small><div class="bar-track"><div class="bar-fill '+tone+'" style="width:'+Math.max(3,Math.round(S.pct*100))+'%"></div></div></div><b class="num">'+esc(S.big||Math.round(S.pct*100)+'%')+'</b>';
}
document.addEventListener('click',e=>{
  const p=e.target.closest('[data-plan-open]');
  if(p){openOnboarding(false,Number(p.dataset.planOpen)||0);return}
  const s=e.target.closest('[data-sim-open]');
  if(s){setSimTab(s.dataset.simOpen);goToPanel('sim');renderSim();return}
  if(e.target.closest('[data-goto="sim"]'))setTimeout(renderSim,0);
});

// ---------- Simulasi "kalau…" ----------
let simTab='hemat',simCuts={},simPrefilled=false,simText='';
function catBaseRows(A){
  const rows=[];
  Object.values(A.CM).forEach(m=>{
    let base=m.validMonths?(m.pattern==='lump'?(m.paidMonths/m.validMonths>=0.75?m.avgWhenPaid:m.histAvg):m.histAvg):m.proj;
    const t=(db.recurringTemplates||[]).filter(t=>t.category===m.c).reduce((s,t)=>s+tplMonthly(t),0);
    base=Math.max(base,t);
    if(base>0)rows.push({c:m.c,cls:classOf(m.c),base});
  });
  (db.recurringTemplates||[]).forEach(t=>{if(!rows.some(r=>r.c===t.category))rows.push({c:t.category,cls:classOf(t.category),base:tplMonthly(t)})});
  const merged={};rows.forEach(r=>{if(merged[r.c])merged[r.c].base+=r.base;else merged[r.c]=r});
  return Object.values(merged).sort((a,b)=>(a.cls===b.cls?0:a.cls==='want'?-1:1)||b.base-a.base);
}
function simBase(){
  const A=lastAnalysis||analyzeFinance();
  const rows=catBaseRows(A);
  const rowSum=rows.reduce((s,r)=>s+r.base,0);
  const S=A.baseMonthlySpend>0?A.baseMonthlySpend:rowSum;
  const I=A.refIncome>0?A.refIncome:A.expectedIncome;
  const needs=rows.filter(r=>r.cls==='need').reduce((s,r)=>s+r.base,0);
  const wants=rowSum-needs;
  const sur=I>0?I-S:avgSurplus(A);
  const debtPay=(db.recurringTemplates||[]).filter(t=>DEBT_CAT_RE.test(t.category)||DEBT_CAT_RE.test(t.note||'')).reduce((s,t)=>s+tplMonthly(t),0);
  return {A,rows,S,I,needs,wants,needShare:rowSum>0?needs/rowSum:1,sur,reserve:Math.max(0,A.reserve),saldo:A.saldo,iOwe:A.DS.iOwe,debtPay};
}
const V_ICON={good:'✅',warn:'⚠️',bad:'⛔',info:'ℹ️'};
function simCard(v,title,stats,bullets){
  return '<div class="sim-verdict '+v+'"><span>'+V_ICON[v]+'</span><b>'+title+'</b></div>'
    +(stats.length?'<div class="sim-stats">'+stats.map(([l,val,sub,tone])=>'<div><small>'+l+'</small><b class="num"'+(tone?' style="color:var(--'+tone+')"':'')+'>'+val+'</b>'+(sub?'<i>'+sub+'</i>':'')+'</div>').join('')+'</div>':'')
    +'<ul class="cat-insight">'+bullets.filter(Boolean).map(b=>'<li>'+b+'</li>').join('')+'</ul>';
}
const stripTags=h=>h.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
function setSimTab(t){
  simTab=t;
  $$('#simTabs [data-sim]').forEach(b=>b.classList.toggle('on',b.dataset.sim===t));
  $$('#sim .sim-pane').forEach(p=>p.classList.toggle('hidden',p.dataset.pane!==t));
}
function prefillSim(B){
  if(simPrefilled)return;simPrefilled=true;
  const g=(db.profile||{}).goal||{};
  const tot=B.iOwe||g.debtTotal||0,pay=g.debtPay||B.debtPay||0;
  if(tot)$('#suTotal').value=plainAmount(tot);
  if(pay)$('#suPay').value=plainAmount(pay);
  if(g.debtRate!=null&&g.debtRate!=='')$('#suRate').value=g.debtRate;
  if(g.type==='beli'&&g.wishId){
    const w=db.wishes.find(x=>x.id===g.wishId);
    if(w){$('#stName').value=w.name;$('#stTarget').value=plainAmount(w.price);if(g.deadline)$('#stMonths').value=Math.max(1,monthsBetween(month(),g.deadline));const p=wishPlan().plans.find(x=>x.w.id===w.id);if(p&&p.have)$('#stHave').value=plainAmount(Math.round(p.have))}
  }
}
function renderSim(){
  if(!$('#sim').classList.contains('active'))return;
  const B=simBase();
  prefillSim(B);
  setSimTab(simTab);
  $('#simBaseTxt').innerHTML='Dasar hitungan: pemasukan ± <b class="num">'+(B.I>0?fmt(B.I):'belum ada')+'</b>/bln, pengeluaran ± <b class="num">'+fmt(B.S)+'</b>/bln, surplus <b class="num" style="color:var(--'+(B.sur<0?'red':'green')+')">'+fmtSigned(B.sur)+'</b>/bln, cadangan <b class="num">'+fmt(B.reserve)+'</b>'+(B.S>0?' ('+fmtMonths(B.reserve/B.S)+')':'')+'.';
  let html='';
  if(simTab==='hemat')html=simHemat(B);
  else if(simTab==='beli')html=simBeli(B);
  else if(simTab==='target')html=simTarget(B);
  else if(simTab==='darurat')html=simDarurat(B);
  else if(simTab==='utang')html=simUtang(B);
  $('#simResult').innerHTML=html;
}
// 1. Kalau hemat
function simHemat(B){
  const wrap=$('#simCutRows');
  const rows=B.rows.filter(r=>r.base>=5000);
  const sig=rows.map(r=>r.c+Math.round(r.base)).join('|');
  if(wrap.dataset.sig!==sig){
    wrap.dataset.sig=sig;
    wrap.innerHTML=rows.length?rows.map(r=>{const max=r.cls==='need'?50:100;const v=Math.min(max,simCuts[r.c]||0);return '<div class="cut-row" data-cut-row="'+esc(r.c)+'"><div class="cut-top"><span>'+catTag(r.c)+'<small>'+(r.cls==='need'?'kebutuhan':'keinginan')+' · ± '+fmtShort(r.base)+'/bln</small></span><b class="num" data-cut-val>'+(v?'−'+v+'%':'0%')+'</b></div><input type="range" min="0" max="'+max+'" step="10" value="'+v+'" data-cut="'+esc(r.c)+'"></div>'}).join('')
      :'<p class="sub" style="margin:0">Belum ada data pengeluaran untuk disimulasikan.</p>';
  }
  if(!rows.length){simText='';return simCard('info','Catat pengeluaran dulu',[],['Simulasi butuh data pengeluaran minimal beberapa hari.'])}
  let save=0;const cuts=[];
  rows.forEach(r=>{const p=simCuts[r.c]||0;if(p){const s=r.base*p/100;save+=s;cuts.push({r,p,s})}});
  const newSur=B.sur+save,S2=B.S-save;
  const rate=v=>B.I>0?fmtPct(v/B.I*100):'-';
  const eta=(sur,S)=>{const need=Math.max(0,S*3-B.reserve);return need<=0?'sudah':sur>0?Math.ceil(need/sur)+' bln':'—'};
  const topWant=rows.filter(r=>r.cls==='want')[0];
  let v,title;
  if(!save){v='info';title='Geser slider untuk melihat dampaknya'}
  else if(newSur<0){v='bad';title='Masih defisit '+fmt(-newSur)+'/bulan'}
  else if(B.I>0&&newSur/B.I>=0.2){v='good';title='Hemat '+fmt(save)+'/bulan — menabung jadi '+rate(newSur)}
  else{v='warn';title='Hemat '+fmt(save)+'/bulan, tapi menabung baru '+rate(newSur)}
  const u=save>0?funUnits(save*12,1)[0]:null;
  const g=(db.profile||{}).goal||{};
  let goalLine='';
  if(save&&g.type==='beli'){const p=wishPlan().plans.find(x=>x.w.id===g.wishId);if(p&&p.need>0)goalLine='🎯 '+esc(p.w.name)+': '+(B.sur>0?Math.ceil(p.need/B.sur)+' bulan':'belum bisa')+' → <b>'+(newSur>0?Math.ceil(p.need/newSur)+' bulan':'belum bisa')+'</b>.'}
  const bullets=save?[
    'Setahun terkumpul <b>'+fmt(save*12)+'</b>'+(u?' ≈ '+u.q.toLocaleString('id-ID')+' '+esc(u.n):'')+'.',
    'Dana darurat 3 bulan tercapai: '+eta(B.sur,B.S)+' → <b>'+eta(newSur,S2)+'</b>.',
    goalLine,
    cuts.some(c=>c.p>50)?'<span class="warn-t">Potongan di atas 50% sulit bertahan lama.</span> Lebih realistis bertahap 20–30% per bulan, lalu naikkan.':'',
    cuts.some(c=>c.r.cls==='need')?'Memangkas kebutuhan (mis. makan) lebih berisiko — cari versi lebih murah (masak sendiri, bawa bekal), bukan menghilangkannya.':'',
    'Supaya benar-benar tersimpan, pindahkan '+fmt(save)+' ke rekening terpisah di awal bulan — hemat yang tidak dipindah biasanya habis terpakai.'
  ]:[
    topWant?'Pos keinginan terbesar: <b>'+esc(topWant.c)+'</b> ± '+fmt(topWant.base)+'/bln. Memotong 30% = '+fmt(topWant.base*0.3)+'/bln.':'Semua pengeluaranmu tergolong kebutuhan. Cari versi lebih murah dari pos terbesar.',
    B.I>0?'Menabung sekarang '+rate(B.sur)+' (acuan ≥ 20%).':''
  ];
  simText='Simulasi pengurangan pengeluaran: '+(cuts.length?cuts.map(c=>c.r.c+' −'+c.p+'% (dari '+fmt(c.r.base)+'/bln)').join(', '):'belum ada potongan')+'. Hasil: hemat '+fmt(save)+'/bulan, surplus '+fmtSigned(B.sur)+' → '+fmtSigned(newSur)+'.';
  return simCard(v,title,[
    ['Hemat / bulan',fmt(save),fmt(save*12)+'/thn','green'],
    ['Surplus',fmtSigned(newSur),'tadinya '+fmtSigned(B.sur),newSur<0?'red':''],
    ['Menabung',rate(newSur),'acuan ≥ 20%'],
    ['Pengeluaran',fmt(S2),'tadinya '+fmt(B.S)]
  ],bullets);
}
// 2. Mampu beli?
let sbMode='tunai';
function simBeli(B){
  const name=$('#sbName').value.trim()||'barang ini',price=parseAmount($('#sbPrice').value);
  $('#sbCicil').classList.toggle('hidden',sbMode!=='cicil');
  if(!price){simText='';return simCard('info','Isi harga barangnya',[],['Pilih tunai atau cicilan untuk melihat dampaknya ke saldo, dana darurat, dan arus kas bulananmu.'])}
  const S=B.S||1,pctI=B.I>0?price/B.I*100:null;
  const waitLine=pctI!==null&&pctI>=50?'Harga ini '+Math.round(pctI)+'% dari pemasukan bulanan — terapkan <b>aturan tunggu 30 hari</b> sebelum membeli.':pctI!==null&&pctI>=15?'Tunggu 3–7 hari dulu; kalau masih butuh, baru beli.':'';
  if(sbMode==='tunai'){
    const after=B.reserve-price,cov=after/S;
    let v,title;
    if(B.saldo<price){v='bad';title='Uangnya belum cukup'}
    else if(after>=S*3){v='good';title='Mampu — dana darurat tetap aman'}
    else if(after>=S){v='warn';title='Bisa, tapi cadangan jadi tipis'}
    else{v='bad';title='Sebaiknya tunda dulu'}
    const monthsSave=B.sur>0?Math.ceil(Math.max(0,price-Math.max(0,B.reserve-S*3))/B.sur):null;
    simText='Simulasi beli tunai: '+name+' '+fmt(price)+'. Cadangan '+fmt(B.reserve)+' → '+fmtSigned(after)+' ('+fmtMonths(Math.max(0,cov))+' pengeluaran).';
    return simCard(v,title,[
      ['Cadangan sesudah',fmtSigned(after),fmtMonths(Math.max(0,cov))+' pengeluaran',after<S?'red':after<S*3?'amber':'green'],
      ['Harga',fmt(price),pctI!==null?Math.round(pctI)+'% pemasukan':'']
    ],[
      v==='good'?'Setelah beli, cadangan masih ≥ 3 bulan pengeluaran.':'Setelah beli, cadangan tinggal '+fmtMonths(Math.max(0,cov))+' — di bawah acuan minimal 3 bulan. Kalau ada kejadian darurat, kamu terpaksa berutang.',
      v!=='good'&&monthsSave?'Alternatif: nabung dulu ± <b>'+monthsSave+' bulan</b> (surplus '+fmt(B.sur)+'/bln) supaya bisa beli tanpa mengganggu cadangan.':'',
      v!=='good'&&!monthsSave&&B.sur<=0?'Surplusmu belum positif, jadi menabung untuk ini belum memungkinkan — perbaiki arus kas dulu.':'',
      waitLine
    ]);
  }
  const tenor=Math.max(1,Number($('#sbTenor').value)||1),rate=Math.max(0,Number($('#sbRate').value)||0),dp=Math.min(price,parseAmount($('#sbDp').value));
  const P=price-dp,monthly=P/tenor+P*rate/100,total=monthly*tenor+dp,interest=total-price;
  const dsr=B.I>0?(B.debtPay+monthly)/B.I:null,surAfter=B.sur-monthly;
  let v,title;
  if(!(B.I>0)){v='bad';title='Tanpa pemasukan rutin, hindari cicilan'}
  else if(dsr>0.3||surAfter<0){v='bad';title='Terlalu berat — sebaiknya jangan'}
  else if(dsr>0.2||surAfter<B.I*0.1){v='warn';title='Bisa, tapi arus kas jadi ketat'}
  else{v='good';title='Masih dalam batas aman'}
  const saveMonths=B.sur>0?Math.ceil(price/B.sur):null;
  simText='Simulasi beli cicilan: '+name+' '+fmt(price)+', DP '+fmt(dp)+', tenor '+tenor+' bln, bunga flat '+rate+'%/bln → cicilan '+fmt(monthly)+'/bln, total bayar '+fmt(total)+' (bunga '+fmt(interest)+'). Cicilan lain yang sudah ada: '+fmt(B.debtPay)+'/bln.';
  return simCard(v,title,[
    ['Cicilan / bulan',fmt(monthly),tenor+' bulan'],
    ['Total bayar',fmt(total),interest>0?'bunga '+fmt(interest):'tanpa bunga',interest>price*0.2?'red':''],
    ['Rasio cicilan',dsr===null?'-':Math.round(dsr*100)+'%','dari pemasukan (maks 30%)',dsr!==null&&dsr>0.3?'red':dsr!==null&&dsr>0.2?'amber':'green'],
    ['Surplus sesudah',fmtSigned(surAfter),'tadinya '+fmtSigned(B.sur),surAfter<0?'red':'']
  ],[
    rate>0?'Bunga flat '+String(rate).replace('.',',')+'%/bln ≈ '+Math.round(rate*12)+'%/tahun flat — bunga efektifnya hampir 2× lebih tinggi karena dihitung dari pokok awal.':'Cicilan 0% tetap cek biaya admin, asuransi, dan denda keterlambatan — sering jadi "bunga tersembunyi".',
    B.debtPay?'Termasuk cicilan yang sudah ada '+fmt(B.debtPay)+'/bln.':'',
    dp>B.reserve?'<span class="bad-t">DP lebih besar dari cadanganmu.</span>':'',
    saveMonths&&interest>0?'Kalau nabung dulu ± <b>'+saveMonths+' bulan</b>, kamu hemat bunga '+fmt(interest)+'.':'',
    v==='bad'&&B.I>0?'Acuan umum: total cicilan maksimal 30% pemasukan, dan idealnya hanya untuk kebutuhan/aset, bukan gaya hidup.':'',
    waitLine
  ]);
}
// 3. Target nabung
function simTarget(B){
  const name=$('#stName').value.trim()||'target',target=parseAmount($('#stTarget').value),months=Math.max(1,Number($('#stMonths').value)||1),have=parseAmount($('#stHave').value);
  if(!target){simText='';return simCard('info','Isi target & waktunya',[],['Contoh: liburan Rp5.000.000 dalam 6 bulan.'])}
  const need=Math.max(0,target-have),per=need/months,sur=B.sur;
  const covOk=B.S>0&&B.reserve>=B.S*3;
  let v,title;
  if(need<=0){v='good';title='Sudah terkumpul 🎉'}
  else if(sur>0&&per<=sur*0.8){v='good';title='Realistis — sisihkan '+fmt(per)+'/bulan'}
  else if(sur>0&&per<=sur){v='warn';title='Bisa, tapi hampir seluruh surplus terpakai'}
  else{v='bad';title='Belum realistis dengan kondisi sekarang'}
  const gap=Math.max(0,per-Math.max(0,sur));
  const plan=[];let left=gap;
  B.rows.filter(r=>r.cls==='want').forEach(r=>{if(left<=0)return;const cut=Math.min(r.base*0.3,left);if(cut>=5000){plan.push(esc(r.c)+' −'+Math.round(cut/r.base*100)+'% ('+fmt(cut)+')');left-=cut}});
  const alt=sur>0?Math.ceil(need/sur):null;
  simText='Simulasi target nabung: '+name+' '+fmt(target)+' dalam '+months+' bulan, sudah ada '+fmt(have)+' → perlu '+fmt(per)+'/bulan. Surplus rata-rata '+fmtSigned(sur)+'/bulan.';
  return simCard(v,title,[
    ['Per bulan',fmt(per),'≈ '+fmt(per/4.33)+'/minggu'],
    ['Per hari',fmt(per/30),'kalau dicicil harian'],
    ['Surplusmu',fmtSigned(sur),sur>0?Math.round(per/sur*100)+'% terpakai':'',sur<per?'red':'green'],
    ['Tercapai',need<=0?'Sekarang':monthLabelAdd(months),months+' bulan lagi']
  ],[
    gap>0&&plan.length?'Tutup kekurangan '+fmt(gap)+'/bln dengan: '+plan.join(', ')+(left>0?' — masih kurang '+fmt(left)+'.':'.'):'',
    gap>0&&alt?'Atau mundurkan target jadi <b>'+alt+' bulan</b> ('+monthLabelAdd(alt)+') dengan surplus sekarang.':'',
    gap>0&&!alt?'Surplusmu belum positif — perbaiki arus kas dulu (lihat tab "Kalau hemat").':'',
    !covOk&&B.S>0?'<span class="warn-t">Dana daruratmu belum 3 bulan.</span> Pertimbangkan bagi dua: sebagian untuk dana darurat, sebagian untuk target ini.':'',
    need>0?'Tips: buat rekening/kantong terpisah khusus '+esc(name)+' dan atur transfer otomatis di hari gajian.':''
  ])+(need>0?'<button class="btn btn-primary btn-block" id="simSaveTarget" style="margin-top:12px">🎯 Jadikan tujuan utama</button>':'');
}
// 4. Kalau tanpa pemasukan
function simDarurat(B){
  const drop=Number($('#sdDrop').value)||0,survive=$('#sdSurvive').checked;
  $('#sdDropTxt').textContent=drop+'%';
  if(!(B.S>0)){simText='';return simCard('info','Catat pengeluaran dulu',[],['Ketahanan dihitung dari rata-rata pengeluaran bulanan.'])}
  const inc=Math.max(0,B.I)*(1-drop/100);
  const spend=survive?B.S*B.needShare:B.S;
  const deficit=spend-inc,usable=Math.max(0,B.saldo-B.iOwe);
  const months=deficit>0?usable/deficit:Infinity;
  let v,title;
  if(deficit<=0){v='good';title='Tetap aman — pengeluaran masih tertutup'}
  else if(months>=6){v='good';title='Bertahan ± '+Math.floor(months)+' bulan'}
  else if(months>=3){v='warn';title='Bertahan ± '+Math.floor(months)+' bulan'}
  else{v='bad';title=months<1?'Uang habis dalam '+Math.max(1,Math.floor(months*30))+' hari':'Hanya bertahan ± '+Math.floor(months)+' bulan'}
  const ideal=B.I>0&&(db.profile||{}).incomeType!=='tidak'?3:6;
  simText='Simulasi ketahanan: pemasukan turun '+drop+'%'+(survive?', mode bertahan (hanya kebutuhan)':'')+'. Pengeluaran '+fmt(spend)+'/bln, pemasukan tersisa '+fmt(inc)+'/bln, uang yang bisa dipakai '+fmt(usable)+' → '+(deficit<=0?'tetap tertutup':'bertahan '+(Math.round(months*10)/10)+' bulan')+'.';
  return simCard(v,title,[
    ['Pengeluaran / bln',fmt(spend),survive?'kebutuhan saja':'seperti biasa'],
    ['Pemasukan tersisa',fmt(inc),drop?'turun '+drop+'%':'tidak berubah'],
    ['Uang tersedia',fmt(usable),B.iOwe?'setelah dikurangi utang':'saldo sekarang'],
    ['Habis sekitar',deficit<=0?'—':months>=24?'> 2 tahun':new Date(Date.now()+months*30.4*864e5).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),'',deficit>0&&months<3?'red':'']
  ],[
    survive&&B.S*(1-B.needShare)>0?'Mode bertahan memangkas keinginan ± '+fmt(B.S*(1-B.needShare))+'/bln — ini tuas tercepat saat darurat.':'',
    'Dana darurat ideal untukmu: <b>'+ideal+'–'+(ideal*2)+' bulan</b> kebutuhan ≈ '+fmt(B.S*B.needShare*ideal)+'–'+fmt(B.S*B.needShare*ideal*2)+'.',
    deficit>0&&months<ideal?'Kurang ± '+fmt(Math.max(0,B.S*B.needShare*ideal-usable))+' untuk mencapai '+ideal+' bulan.':'',
    'Urutan prioritas saat darurat: tempat tinggal → makan → transport kerja → cicilan (hubungi pemberi pinjaman lebih awal untuk minta keringanan) → sisanya ditunda.'
  ]);
}
// 5. Lunasi utang
function simUtang(B){
  const tot=parseAmount($('#suTotal').value),rate=Math.max(0,Number($('#suRate').value)||0),pay=parseAmount($('#suPay').value);
  const exMax=Math.max(500000,Math.ceil(Math.max(0,B.sur)/50000)*50000);
  if(Number($('#suExtra').max)!==exMax)$('#suExtra').max=exMax;
  const extra=Number($('#suExtra').value)||0;
  $('#suExtraTxt').textContent=fmt(extra);
  if(!tot){simText='';return simCard('info','Isi sisa utang & cicilannya',[],['Kalau punya beberapa utang, jumlahkan dulu atau simulasikan satu per satu (mulai dari bunga tertinggi).'])}
  const base=payoff(tot,rate,pay),fast=extra?payoff(tot,rate,pay+extra):base;
  const yearly=rate*12;
  let v,title;
  if(!pay){v='info';title='Isi cicilan per bulan'}
  else if(!base&&!fast){v='bad';title='Cicilan belum menutup bunga — utang tidak akan lunas'}
  else if((fast||base).months<=12){v='good';title='Lunas ± '+(fast||base).months+' bulan'}
  else{v='warn';title='Lunas ± '+(fast||base).months+' bulan'}
  const bl=[];
  if(base)bl.push('Tanpa tambahan: lunas '+monthLabelAdd(base.months)+', total bunga <b>'+fmt(base.interest)+'</b>.');
  else if(pay)bl.push('<span class="bad-t">Bunga bulanan ± '+fmt(tot*rate/100)+' ≥ cicilan '+fmt(pay)+'.</span> Naikkan cicilan atau negosiasi ulang.');
  if(extra&&fast)bl.push('Tambah '+fmt(extra)+'/bln → lunas <b>'+monthLabelAdd(fast.months)+'</b>'+(base?', <b>'+(base.months-fast.months)+' bulan lebih cepat</b>, hemat bunga <b>'+fmt(base.interest-fast.interest)+'</b>':'')+'.');
  if(extra&&B.sur>0)bl.push('Tambahan ini = '+Math.round(extra/B.sur*100)+'% dari surplusmu'+(extra>B.sur?' — <span class="warn-t">melebihi surplus</span>, perlu memangkas pengeluaran':'')+'.');
  if(!extra&&B.sur>0&&base)bl.push('Coba geser "bayar tambahan" — surplusmu ± '+fmt(B.sur)+'/bln bisa mempercepat pelunasan.');
  if(rate>=3)bl.push('<span class="warn-t">Bunga '+String(rate).replace('.',',')+'%/bln ≈ '+Math.round(yearly)+'%/tahun — sangat tinggi.</span> Pertimbangkan take-over ke pinjaman berbunga lebih rendah dari lembaga resmi (terdaftar OJK); hindari pinjol ilegal dan gali lubang tutup lubang.');
  bl.push('Punya beberapa utang? Bayar minimum semuanya, lalu arahkan tambahan ke yang <b>bunganya paling tinggi</b> dulu (metode avalanche).');
  simText='Simulasi pelunasan utang: sisa '+fmt(tot)+', bunga '+rate+'%/bln, cicilan '+fmt(pay)+'/bln'+(extra?' + tambahan '+fmt(extra)+'/bln':'')+' → '+(fast?'lunas '+fast.months+' bulan, total bunga '+fmt(fast.interest):'tidak lunas')+(base&&extra?' (tanpa tambahan: '+base.months+' bulan, bunga '+fmt(base.interest)+')':'')+'.';
  return simCard(v,title,[
    ['Lunas dalam',fast?fast.months+' bln':base?base.months+' bln':'—',fast?monthLabelAdd(fast.months):'',!fast?'red':''],
    ['Total bunga',fast?fmt(fast.interest):'—',base&&extra&&fast?'hemat '+fmt(base.interest-fast.interest):'',base&&extra&&fast?'green':''],
    ['Bayar / bulan',fmt(pay+extra),B.I>0?Math.round((pay+extra)/B.I*100)+'% pemasukan':''],
    ['Bunga / tahun',rate?'≈ '+Math.round(yearly)+'%':'0%','',rate>=3?'red':'']
  ],bl);
}
$('#simTabs').addEventListener('click',e=>{const b=e.target.closest('[data-sim]');if(!b)return;setSimTab(b.dataset.sim);renderSim()});
$('#sim').addEventListener('input',e=>{
  const c=e.target.closest('[data-cut]');
  if(c){simCuts[c.dataset.cut]=Number(c.value);const row=c.closest('[data-cut-row]');row.querySelector('[data-cut-val]').textContent=Number(c.value)?'−'+c.value+'%':'0%'}
  if(e.target.closest('.sim-pane'))renderSim();
});
$('#sim').addEventListener('change',e=>{if(e.target.closest('.sim-pane'))renderSim()});
['#sbPrice','#sbDp','#stTarget','#stHave','#suTotal','#suPay'].forEach(amountInput);
$('#sbMode').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;sbMode=b.dataset.mode;$$('#sbMode button').forEach(x=>x.classList.toggle('on',x===b));renderSim()});
$('#simResult').addEventListener('click',e=>{
  if(!e.target.closest('#simSaveTarget'))return;
  const name=$('#stName').value.trim(),target=parseAmount($('#stTarget').value),months=Math.max(1,Number($('#stMonths').value)||1);
  if(!name){toast('Isi dulu nama targetnya.');$('#stName').focus();return}
  db=load();
  const w={id:newId(),name,price:target,emoji:'🎯',img:'',created:day(),done:false};
  db.wishes=[w,...db.wishes];
  db.profile.goal={type:'beli',since:day(),wishId:w.id,deadline:monthAdd(month(),months)};
  save();render();
  toast(name+' jadi tujuan utama & masuk wishlist.');
});
$('#simAskClaude').onclick=async()=>{
  const A=lastAnalysis||analyzeFinance();
  if(!simText){toast('Isi simulasinya dulu.');return}
  const text=['Bertindaklah sebagai perencana keuangan pribadi yang independen dan berpengalaman di Indonesia. Saya baru menjalankan simulasi di aplikasi pencatat keuangan. Periksa hitungannya, tunjukkan risiko atau asumsi yang terlewat, bandingkan dengan alternatif lain, dan beri rekomendasi tegas beserta langkah konkret. Jawab kritis dan berbasis angka dalam Bahasa Indonesia.','','SIMULASI:',simText,'','---',buildFinanceSummary(A)].join('\n');
  const win=window.open('about:blank','_blank');
  const copied=await copyText(text);
  const url=text.length<=6000?'https://claude.ai/new?q='+encodeURIComponent(text):'https://claude.ai/new';
  if(win){try{win.opener=null}catch(e){}win.location.href=url}else location.href=url;
  toast(copied?'Teks disalin. Kalau kolom chat Claude kosong, tempel saja.':'Membuka Claude…');
};

function renderPlanV44(){
  const A=lastAnalysis;if(!A)return;
  renderGoal(A);
  renderSim();
}
