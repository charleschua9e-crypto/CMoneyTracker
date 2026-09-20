// ================= v39: fitur baru =================
const dayShift=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);

// ---------- Streak ----------
function computeStreaks(){
  const dates=new Set([...db.expenses.map(x=>x.date),...db.incomes.map(x=>x.date)]);
  let rec=0,i=dates.has(day())?0:-1;
  while(dates.has(dayShift(i))&&rec<3650){rec++;i--}
  const wantDates=new Set(db.expenses.filter(x=>classOf(x.category)==='want').map(x=>x.date));
  const first=[...dates].sort()[0];
  let nw=0;
  if(first&&!wantDates.has(day())){
    while(nw<365){const dd=dayShift(-nw);if(dd<first||wantDates.has(dd))break;nw++}
  }
  return {rec,nw};
}
function renderStreaks(){
  const s=computeStreaks(),chips=[];
  if(s.rec>=2)chips.push('<span class="streak"><span>🔥</span><b class="num">'+s.rec+' hari</b> rutin mencatat</span>');
  if(s.nw>=2)chips.push('<span class="streak"><span>🌱</span><b class="num">'+s.nw+' hari</b> tanpa jajan</span>');
  $('#streakRow').innerHTML=chips.join('');
  $('#streakRow').classList.toggle('hidden',!chips.length);
}

// ---------- Aman dibelanjakan hari ini ----------
function paydayOn(y,m0){return ymd(new Date(y,m0,Math.min(db.payday,new Date(y,m0+1,0).getDate())))}
function nextPayday(){
  if(!db.payday)return null;
  const t=new Date(),today=day();
  let d=paydayOn(t.getFullYear(),t.getMonth());
  const isToday=d===today;
  if(d<=today)d=paydayOn(t.getFullYear(),t.getMonth()+1);
  return {date:d,days:daysBetween(today,d),isToday};
}
function computeSafeSpend(){
  const now=day(),mon=month(),dim=daysInMonthOf(mon),de=Number(now.slice(8,10)),leftMonth=dim-de+1;
  const pd=nextPayday();
  const left=pd?Math.max(1,pd.days):leftMonth;
  const exps=db.expenses.filter(x=>x.date.startsWith(mon));
  const CMs=categoryModel();
  const isFlexCat=x=>!x.templateId&&(CMs[x.category]?CMs[x.category].pattern==='spread':x.type==='daily');
  const isFlex=x=>isFlexCat(x)&&!x.spread; // pengeluaran "sesekali" disebar ke sisa hari, tidak memotong jatah hari ini
  const flexToday=sumAmt(exps.filter(x=>x.date===now&&isFlex(x)));
  const spreadToday=exps.filter(x=>x.date===now&&isFlexCat(x)&&x.spread);
  const spreadMonth=sumAmt(exps.filter(x=>isFlexCat(x)&&x.spread));
  const monthEnd=mon+'-'+String(dim).padStart(2,'0');
  const lumpReserve=(!pd||pd.date>monthEnd)?Object.values(CMs).filter(m=>m.regular).reduce((t,m)=>t+m.left,0):0;
  const spendMonth=sumAmt(exps);
  const monthPending=sumAmt(pendingTemplates());
  const pendingSum=pd?(db.recurringTemplates||[]).reduce((s,t)=>s+tplUpcoming(t,pd.date).length*Number(t.amount||0),0):monthPending;
  const saldo=getSaldo();
  const perDaySaldo=(saldo+flexToday-pendingSum-lumpReserve)/left;
  const budget=Number(db.monthlyBudget||0);
  let perDayBudget=null;
  if(budget>0)perDayBudget=(budget-(spendMonth-flexToday)-monthPending-Object.values(CMs).filter(m=>m.regular).reduce((t,m)=>t+m.left,0))/leftMonth;
  const byBudget=perDayBudget!==null&&perDayBudget<perDaySaldo;
  const limit=Math.max(0,byBudget?perDayBudget:perDaySaldo);
  return {pd,lumpReserve,flexToday,spreadToday,spreadMonth,todayFlexTx:exps.filter(x=>x.date===now&&isFlex(x)),limit,safe:limit-flexToday,left,budget,budgetLeft:budget>0?budget-spendMonth:null,spendMonth,pendingSum,saldo,byBudget};
}
function renderSafeSpend(){
  const S=computeSafeSpend();
  const hasAny=db.expenses.length||db.incomes.length||S.saldo!==0||S.budget>0;
  $('#safeCard').classList.toggle('hidden',!hasAny);
  const used=S.limit>0?S.flexToday/S.limit:(S.flexToday>0?1.5:0);
  const state=S.safe<0?'over':used>=0.7?'near':'ok';
  $('#safeCard').className='safe-card '+state+(hasAny?'':' hidden');
  $('#safeLabel').textContent=S.safe<0?'Lewat dari batas hari ini':'Aman dibelanjakan hari ini';
  $('#safeToday').textContent=(S.safe<0?'−':'')+fmt(S.safe);
  $('#safeBar').style.width=Math.min(100,Math.round(used*100))+'%';
  $('#safeRing').style.setProperty('--p',Math.min(100,Math.round(used*100)));
  $('#safeRingTxt').textContent=Math.min(999,Math.round(used*100))+'%';
  $('#safeMeta1').textContent='Batas harian '+fmt(S.limit)+' · keluar '+fmt(S.flexToday);
  $('#safeMeta2').innerHTML=S.budget>0
    ?'Sisa anggaran bulan <b class="num">'+fmtSigned(S.budgetLeft)+'</b>'
    :'<button class="link" data-goto="budgets" style="padding:0;font-size:12px">Atur anggaran bulanan</button>';
  $('#safeHint').textContent=S.limit<=0
    ?(S.saldo<=0?'Saldo habis — catat pemasukan atau koreksi saldo dulu.':'Anggaran bulan ini sudah habis.')
    :'Dihitung dari '+(S.byBudget?'sisa anggaran, dibagi sisa hari bulan ini':'saldo'+(S.pendingSum+S.lumpReserve?' dikurangi tagihan & pengeluaran bulanan yang belum dibayar '+fmt(S.pendingSum+S.lumpReserve):'')+', dibagi '+S.left+' hari '+(S.pd?'sampai gajian':'tersisa'))+'. Pengeluaran bulanan (kos, tagihan) dan yang ditandai sesekali tidak memotong jatah hari itu — dibagi rata ke sisa hari.';
  renderOneOff(S);
  const pdEl=$('#safePayday');
  if(S.pd){pdEl.classList.remove('hidden');pdEl.innerHTML=S.pd.isToday?'🎉 <b>Hari ini gajian!</b> Jangan lupa catat pemasukannya.':'💸 Gajian <b>'+S.pd.days+' hari lagi</b> · '+new Date(S.pd.date+'T12:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'})}
  else pdEl.classList.add('hidden');
  // tile anggaran
  const t=$('#tileBudget');
  if(S.budget>0){const pct=Math.round(S.spendMonth/S.budget*100);t.textContent=pct+'%';t.style.color=pct>100?'var(--red)':''}
  else{t.textContent='Atur';t.style.color='var(--faint)'}
}
function renderBudgetCard(){
  if(document.activeElement!==$('#monthlyBudgetInput'))$('#monthlyBudgetInput').value=db.monthlyBudget||'';
  const h=db.history.slice(0,3);
  const avgInc=h.length?h.reduce((s,x)=>s+(x.income||0),0)/h.length:0;
  const avgSp=h.length?h.reduce((s,x)=>s+(x.spent||0),0)/h.length:0;
  const sug=[];
  if(avgInc>0)sug.push(['80% rata-rata pemasukan',Math.round(avgInc*0.8/50000)*50000]);
  if(avgSp>0)sug.push(['rata-rata pengeluaran',Math.round(avgSp/50000)*50000]);
  if(avgSp>0)sug.push(['hemat 10%',Math.round(avgSp*0.9/50000)*50000]);
  $('#budgetSuggest').innerHTML=sug.filter(x=>x[1]>0).map(([l,v])=>'<button type="button" class="chip" data-budget-sug="'+v+'"><b class="num">'+fmt(v)+'</b><small style="color:var(--muted);font-weight:500">'+l+'</small></button>').join('');
}
$('#budgetSuggest').addEventListener('click',e=>{const b=e.target.closest('[data-budget-sug]');if(b)$('#monthlyBudgetInput').value=b.dataset.budgetSug});
$('#saveMonthlyBudget').onclick=()=>{
  db=load();
  const v=Number($('#monthlyBudgetInput').value)||0;
  db.monthlyBudget=v>0?v:0;
  if(v>0&&!db.budgetSince)db.budgetSince=month();
  $('#monthlyBudgetInput').blur();
  save();render();
  toast(v>0?'Anggaran bulanan '+fmt(v)+' disimpan.':'Anggaran bulanan dimatikan.');
};

// ---------- Input suara ----------
const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
const NUMW={nol:0,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8,sembilan:9};
function parseNumToken(t){
  t=t.replace(/^rp\.?/i,'');
  if(/^\d{1,3}(\.\d{3})+$/.test(t))return Number(t.replace(/\./g,''));
  if(/^\d+([.,]\d+)?$/.test(t))return parseFloat(t.replace(',','.'));
  return null;
}
function wordsToNumbers(text){
  const toks=String(text).toLowerCase().replace(/[?!]/g,'').split(/\s+/).filter(Boolean);
  const out=[];let total=0,cur=0,pend=null,act=false;
  const flush=()=>{if(act){out.push(String(Math.round(total+cur+(pend||0))));total=0;cur=0;pend=null;act=false}};
  const mult=m=>{const base=cur+(pend||0);total+=(base||1)*m;cur=0;pend=null;act=true};
  for(const t of toks){
    const n=parseNumToken(t);
    if(n!==null){if(pend!==null)flush();pend=n;act=true;continue}
    if(Object.prototype.hasOwnProperty.call(NUMW,t)){if(pend!==null)flush();pend=NUMW[t];act=true;continue}
    if(t==='sepuluh'){cur+=10;act=true;continue}
    if(t==='sebelas'){cur+=11;act=true;continue}
    if(t==='seratus'){cur+=100;act=true;continue}
    if(t==='seribu'){total+=(cur+(pend||0))*1000+1000;cur=0;pend=null;act=true;continue}
    if(t==='sejuta'){total+=1e6;act=true;continue}
    if(t==='setengah'){pend=(pend||0)+0.5;act=true;continue}
    if(act&&t==='belas'){cur+=(pend===null?1:pend)+10;pend=null;continue}
    if(act&&t==='puluh'){cur+=(pend===null?1:pend)*10;pend=null;continue}
    if(act&&t==='ratus'){cur+=(pend===null?1:pend)*100;pend=null;continue}
    if(act&&(t==='ribu'||t==='rb')){mult(1000);continue}
    if(act&&(t==='juta'||t==='jt')){mult(1e6);continue}
    if(act&&(t==='rupiah'||t==='perak'))continue;
    flush();out.push(t);
  }
  flush();
  return out.join(' ');
}
let recog=null;
function stopVoice(){try{recog&&recog.stop()}catch(e){}}
if(!SpeechRec)$('#micBtn').classList.add('hidden');
$('#micBtn').onclick=()=>{
  if(!SpeechRec)return;
  if(recog){stopVoice();return}
  recog=new SpeechRec();
  recog.lang='id-ID';recog.interimResults=true;recog.maxAlternatives=1;
  const inp=$('#smartQuickInput');
  let finalText='';
  $('#smartForm').classList.add('listening');
  inp.placeholder='Mendengarkan… mis. "kopi lima belas ribu"';
  recog.onresult=e=>{
    let txt='';
    for(let i=0;i<e.results.length;i++){txt+=e.results[i][0].transcript;if(e.results[i].isFinal)finalText=txt}
    inp.value=txt;
  };
  recog.onerror=e=>{
    toast(e.error==='not-allowed'||e.error==='service-not-allowed'?'Izin mikrofon ditolak. Aktifkan di pengaturan browser.':e.error==='no-speech'?'Tidak terdengar suara, coba lagi.':'Input suara gagal ('+e.error+').');
  };
  recog.onend=()=>{
    $('#smartForm').classList.remove('listening');
    inp.placeholder='Ketik cepat: kopi 15rb';
    recog=null;
    const t=(finalText||inp.value).trim();
    if(t){inp.value=wordsToNumbers(t);setTimeout(()=>{const f=$('#smartForm');f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}))},250)}
  };
  try{recog.start()}catch(e){recog=null;$('#smartForm').classList.remove('listening');toast('Input suara tidak bisa dimulai.')}
};

// ---------- Utang & piutang ----------
const debtPaid=d=>sumAmt(d.payments||[]);
const debtLeft=d=>Math.max(0,Number(d.amount||0)-debtPaid(d));
function debtCashEffect(){
  return (db.debts||[]).filter(d=>d.moves!==false).reduce((t,d)=>{
    const a=Number(d.amount||0),p=debtPaid(d);
    if(d.moves==='repay')return t+(d.dir==='lend'?p:-p);
    return t+(d.dir==='lend'?-a+p:a-p);
  },0);
}
function debtSummary(){
  const act=(db.debts||[]).filter(d=>debtLeft(d)>0);
  const lend=act.filter(d=>d.dir==='lend'),borrow=act.filter(d=>d.dir==='borrow');
  const today=day();
  const overdue=act.filter(d=>d.due&&d.due<today);
  const soon=act.filter(d=>d.due&&d.due>=today&&daysBetween(today,d.due)<=3);
  return {act,lend,borrow,owedToMe:lend.reduce((s,d)=>s+debtLeft(d),0),iOwe:borrow.reduce((s,d)=>s+debtLeft(d),0),overdue,soon};
}
function dueText(d){
  if(!d.due)return '';
  const n=daysBetween(day(),d.due);
  if(debtLeft(d)<=0)return 'jatuh tempo '+shortDate(d.due);
  if(n<0)return '<span style="color:var(--red)">terlambat '+(-n)+' hari</span>';
  if(n===0)return '<span style="color:var(--amber)">jatuh tempo hari ini</span>';
  if(n<=3)return '<span style="color:var(--amber)">jatuh tempo '+n+' hari lagi</span>';
  return 'jatuh tempo '+shortDate(d.due);
}
let debtTab='active';
function renderDebts(){
  const S=debtSummary();
  $('#debtOwedToMe').textContent=fmt(S.owedToMe);
  $('#debtOwedToMeSub').textContent=S.lend.length?S.lend.length+' orang':'tidak ada';
  $('#debtIOwe').textContent=fmt(S.iOwe);
  $('#debtIOweSub').textContent=S.borrow.length?S.borrow.length+' orang':'tidak ada';
  $('#menuDebtsMeta').textContent=S.act.length?S.act.length+' aktif':'';
  $('#debtPeople').innerHTML=[...new Set((db.debts||[]).map(d=>d.person))].map(n=>'<option value="'+esc(n)+'">').join('');
  const list=(db.debts||[]).filter(d=>debtTab==='active'?debtLeft(d)>0:debtLeft(d)<=0)
    .sort((a,b)=>debtTab==='active'?((a.due||'9999').localeCompare(b.due||'9999')||b.date.localeCompare(a.date)):b.date.localeCompare(a.date));
  $('#debtList').innerHTML=list.length?'<div class="tx-list">'+list.map(d=>{
    const lend=d.dir==='lend',left=debtLeft(d);
    const sub=[dueText(d),lend?'Kamu pinjamkan '+shortDate(d.date):'Kamu pinjam '+shortDate(d.date),d.note?esc(d.note):''].filter(Boolean).join(' · ');
    return '<button class="tx" data-debt="'+esc(d.id)+'"><span class="tx-ico t-'+(lend?'green':'red')+'" style="font-size:17px;font-weight:800">'+esc((d.person||'?').trim().charAt(0).toUpperCase())+'</span>'
      +'<span class="tx-main"><span class="tx-title">'+esc(d.person)+'</span><span class="tx-sub">'+sub+'</span></span>'
      +'<span class="tx-amt num'+(lend?' in':'')+'">'+(left>0?fmt(left):'Lunas')+'<small>'+(left>0&&debtPaid(d)>0?'dari '+fmt(d.amount):lend?'piutang':'utang')+'</small></span></button>';
  }).join('')+'</div>':'<div class="tx-list">'+emptyBox(debtTab==='active'?'🤝':'✅',debtTab==='active'?'Tidak ada utang atau piutang aktif.':'Belum ada yang lunas.')+'</div>';
}
$('#debtSeg').addEventListener('click',e=>{
  const b=e.target.closest('[data-dseg]');if(!b)return;
  debtTab=b.dataset.dseg;
  $$('#debtSeg button').forEach(x=>x.classList.toggle('on',x===b));
  renderDebts();
});

let debtForm={dir:'lend',editId:null};
function openDebtForm(){
  debtForm={dir:'lend'};
  $('#debtFormView').classList.remove('hidden');$('#debtDetailView').classList.add('hidden');
  $('#debtSheetTitle').textContent='Catat utang / piutang';
  $('#debtAmount').value='';$('#debtPerson').value='';$('#debtNote').value='';
  $('#debtDate').value=day();$('#debtDate').max=day();$('#debtDue').value='';$('#debtMoves').checked=true;
  $('#debtErr').textContent='';
  syncDebtDir();
  $('#debtSheet').classList.remove('hidden');
  setTimeout(()=>{try{$('#debtAmount').focus({preventScroll:true})}catch(e){}},280);
}
function syncDebtDir(){
  $$('#debtDirSeg button').forEach(b=>b.classList.toggle('on',b.dataset.dir===debtForm.dir));
  $('#debtPersonLabel').textContent=debtForm.dir==='lend'?'Dipinjamkan ke siapa?':'Pinjam dari siapa?';
  $('#debtMovesText').textContent=debtForm.dir==='lend'?'Uangnya keluar dari saldo saya':'Uangnya masuk ke saldo saya';
}
$('#debtDirSeg').addEventListener('click',e=>{const b=e.target.closest('[data-dir]');if(b){debtForm.dir=b.dataset.dir;syncDebtDir()}});
$('#debtAmount').addEventListener('input',e=>{const n=parseAmount(e.target.value);e.target.value=n?n.toLocaleString('id-ID'):''});
$('#payAmount').addEventListener('input',e=>{const n=parseAmount(e.target.value);e.target.value=n?n.toLocaleString('id-ID'):''});
$('#saveDebtBtn').onclick=()=>{
  const amount=parseAmount($('#debtAmount').value),person=$('#debtPerson').value.trim();
  if(amount<=0){$('#debtErr').textContent='Isi nominalnya dulu.';return}
  if(!person){$('#debtErr').textContent='Isi nama orangnya.';return}
  const date=$('#debtDate').value||day(),due=$('#debtDue').value||'';
  if(due&&due<date){$('#debtErr').textContent='Jatuh tempo tidak boleh sebelum tanggal pinjam.';return}
  db=load();
  const d={id:newId(),dir:debtForm.dir,person,amount,note:$('#debtNote').value.trim(),date,due,payments:[],moves:$('#debtMoves').checked};
  db.debts.push(d);save();
  $('#debtSheet').classList.add('hidden');
  render();
  toast((d.dir==='lend'?'Piutang ':'Utang ')+fmt(amount)+' · '+person+' dicatat',()=>{db=load();db.debts=db.debts.filter(x=>x.id!==d.id);save()});
};
let openDebtId=null;
function openDebtDetail(id){
  db=load();
  const d=db.debts.find(x=>x.id===id);if(!d)return;
  openDebtId=id;
  const lend=d.dir==='lend',left=debtLeft(d),paid=debtPaid(d);
  $('#debtFormView').classList.add('hidden');$('#debtDetailView').classList.remove('hidden');
  $('#debtSheetTitle').textContent=d.person;
  $('#debtDetailKind').innerHTML=(lend?'Piutang — '+esc(d.person)+' berutang ke kamu':'Utang — kamu berutang ke '+esc(d.person))+(d.moves===false?' · tidak mengubah saldo':'');
  $('#debtDetailLeft').textContent=left>0?fmt(left):'Lunas';
  $('#debtDetailLeft').style.color=left<=0?'var(--green)':'';
  $('#debtDetailBar').style.width=Math.round(Math.min(1,paid/Math.max(1,d.amount))*100)+'%';
  $('#debtDetailInfo').innerHTML='Terbayar '+fmt(paid)+' dari '+fmt(d.amount)+' · dicatat '+shortDate(d.date)+(d.due?' · '+dueText(d):'')+(d.note?'<br>Catatan: '+esc(d.note):'');
  $('#debtPayments').innerHTML=(d.payments||[]).length?(d.payments.slice().reverse().map(p=>'<div class="line"><span>'+dateLabel(p.date)+'</span><span class="num">'+fmt(p.amount)+'</span></div>').join('')):'';
  $('#debtPayWrap').classList.toggle('hidden',left<=0);
  $('#payAmount').value='';
  $('#payLabel').textContent=lend?'Terima cicilan':'Bayar cicilan';
  $('#waRemindBtn').classList.toggle('hidden',!(lend&&left>0));
  $('#settleBtn').textContent=lend?'Tandai sudah dibayar lunas':'Tandai sudah saya lunasi';
  $('#settleBtn').classList.toggle('hidden',left<=0);
  $('#debtErr2').textContent='';
  $('#debtSheet').classList.remove('hidden');
}
function addDebtPayment(amount){
  db=load();
  const d=db.debts.find(x=>x.id===openDebtId);if(!d)return;
  const left=debtLeft(d);
  if(amount<=0){$('#debtErr2').textContent='Isi nominal pembayaran.';return}
  if(amount>left){$('#debtErr2').textContent='Melebihi sisa '+fmt(left)+'.';return}
  const p={id:newId(),date:day(),amount};
  d.payments=d.payments||[];d.payments.push(p);save();
  const id=d.id;
  render();openDebtDetail(id);
  toast((debtLeft(d)<=0?'Lunas! ':'Pembayaran ')+fmt(amount)+' dicatat',()=>{db=load();const x=db.debts.find(v=>v.id===id);if(x)x.payments=x.payments.filter(v=>v.id!==p.id);save();if(!$('#debtSheet').classList.contains('hidden'))openDebtDetail(id)});
}
$('#payBtn').onclick=()=>addDebtPayment(parseAmount($('#payAmount').value));
$('#settleBtn').onclick=()=>{const d=load().debts.find(x=>x.id===openDebtId);if(d)addDebtPayment(debtLeft(d))};
$('#deleteDebtBtn').onclick=()=>{
  db=load();
  const d=db.debts.find(x=>x.id===openDebtId);if(!d)return;
  db.debts=db.debts.filter(x=>x.id!==d.id);save();
  $('#debtSheet').classList.add('hidden');render();
  toast('Catatan '+d.person+' dihapus.',()=>{db=load();db.debts.push(d);save()});
};
$('#waRemindBtn').onclick=()=>{
  const d=load().debts.find(x=>x.id===openDebtId);if(!d)return;
  const msg='Halo '+d.person+', sekadar mengingatkan soal pinjaman '+fmt(debtLeft(d))+(d.note?' ('+d.note+')':'')+(d.due?' yang jatuh tempo '+new Date(d.due+'T12:00').toLocaleDateString('id-ID',{day:'numeric',month:'long'}):'')+'. Terima kasih 🙏';
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
};
$('#addDebtBtn').onclick=openDebtForm;
$('#debtSheet').addEventListener('click',e=>{if(e.target===$('#debtSheet'))$('#debtSheet').classList.add('hidden')});
$('#debtClose').onclick=()=>$('#debtSheet').classList.add('hidden');

// ---------- Patungan ----------
function splitCalc(){
  const total=parseAmount($('#splitTotal').value);
  const names=$('#splitNames').value.split(',').map(s=>s.trim()).filter(Boolean);
  const people=names.length+1;
  const per=total>0?Math.ceil(total/people/100)*100:0;
  const mine=Math.max(0,total-per*names.length);
  return {total,names,people,per,mine,paidByMe:$('#splitPaidByMe').checked,payer:$('#splitPayer').value.trim()};
}
function renderSplit(){
  const c=splitCalc();
  $('#splitPayerWrap').classList.toggle('hidden',c.paidByMe);
  $('#splitResult').innerHTML=c.total>0&&c.names.length
    ?'<div class="line"><span>Per orang ('+c.people+' orang)</span><span class="num">'+fmt(c.per)+'</span></div><div class="line"><span>Bagian kamu</span><span class="num">'+fmt(c.mine)+'</span></div>'
      +(c.paidByMe?'<div class="line"><span>Piutang yang dicatat</span><span class="num">'+c.names.length+' × '+fmt(c.per)+'</span></div>':'<div class="line"><span>Utang ke '+esc(c.payer||'pembayar')+'</span><span class="num">'+fmt(c.mine)+'</span></div>')
    :'<p class="sub" style="margin:0">Isi total tagihan dan nama teman (pisahkan dengan koma).</p>';
}
function openSplit(){
  $('#splitTotal').value='';$('#splitNames').value='';$('#splitNote').value='';$('#splitPaidByMe').checked=true;$('#splitPayer').value='';$('#splitErr').textContent='';
  const cats=[...dailyCats,...(db.customCategories.daily||[]),...recurringCats,...(db.customCategories.recurring||[])];
  $('#splitCategory').innerHTML=cats.map(c=>'<option>'+esc(c)+'</option>').join('');
  renderSplit();
  $('#splitSheet').classList.remove('hidden');
  setTimeout(()=>{try{$('#splitTotal').focus({preventScroll:true})}catch(e){}},280);
}
['splitTotal','splitNames','splitPayer'].forEach(id=>$('#'+id).addEventListener('input',e=>{
  if(id==='splitTotal'){const n=parseAmount(e.target.value);e.target.value=n?n.toLocaleString('id-ID'):''}
  renderSplit();
}));
$('#splitPaidByMe').addEventListener('change',renderSplit);
$('#splitBillBtn').onclick=openSplit;
$('#splitClose').onclick=()=>$('#splitSheet').classList.add('hidden');
$('#splitSheet').addEventListener('click',e=>{if(e.target===$('#splitSheet'))$('#splitSheet').classList.add('hidden')});
$('#saveSplitBtn').onclick=()=>{
  const c=splitCalc();
  if(c.total<=0){$('#splitErr').textContent='Isi total tagihan.';return}
  if(!c.names.length){$('#splitErr').textContent='Isi minimal satu nama teman.';return}
  if(!c.paidByMe&&!c.payer){$('#splitErr').textContent='Isi siapa yang membayar.';return}
  db=load();
  const cat=$('#splitCategory').value,label=$('#splitNote').value.trim()||'Patungan';
  const type=dailyCats.includes(cat)||(db.customCategories.daily||[]).includes(cat)?'daily':'recurring';
  const expId=newId(),debtIds=[];
  if(c.mine>0)db.expenses.push({id:expId,date:day(),type,category:cat,note:label+' (bagian saya)',amount:c.mine});
  if(c.paidByMe){
    c.names.forEach(n=>{const id=newId();debtIds.push(id);db.debts.push({id,dir:'lend',person:n,amount:c.per,note:label,date:day(),due:'',payments:[],moves:true})});
  }else{
    const id=newId();debtIds.push(id);
    db.debts.push({id,dir:'borrow',person:c.payer,amount:c.mine,note:label,date:day(),due:'',payments:[],moves:true});
  }
  save();
  $('#splitSheet').classList.add('hidden');
  render();
  toast('Patungan dicatat: '+fmt(c.per)+'/orang',()=>{db=load();db.expenses=db.expenses.filter(x=>x.id!==expId);db.debts=db.debts.filter(x=>!debtIds.includes(x.id));save()});
};

// ---------- Rekap bulanan ----------
function computeRecap(m){
  const exps=db.expenses.filter(x=>x.date.startsWith(m)),incs=db.incomes.filter(x=>x.date.startsWith(m));
  const spent=sumAmt(exps),income=sumAmt(incs);
  const cat={};exps.forEach(x=>cat[x.category]=(cat[x.category]||0)+Number(x.amount||0));
  const cats=Object.entries(cat).sort((a,b)=>b[1]-a[1]);
  const cnt={};exps.forEach(x=>cnt[x.category]=(cnt[x.category]||0)+1);
  const freq=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]||null;
  const dim=daysInMonthOf(m),isCur=m===month(),span=isCur?Number(day().slice(8,10)):dim;
  const perDay={};exps.forEach(x=>perDay[x.date]=(perDay[x.date]||0)+Number(x.amount||0));
  const busiest=Object.entries(perDay).sort((a,b)=>b[1]-a[1])[0]||null;
  let zero=0;for(let d=1;d<=span;d++){if(!perDay[m+'-'+String(d).padStart(2,'0')])zero++}
  const biggest=exps.slice().sort((a,b)=>b.amount-a.amount)[0]||null;
  const [y,mo]=m.split('-').map(Number),pd=new Date(y,mo-2,1),prev=pd.getFullYear()+'-'+String(pd.getMonth()+1).padStart(2,'0');
  const prevSpent=sumAmt(db.expenses.filter(x=>x.date.startsWith(prev)));
  const wants=cats.filter(([c])=>classOf(c)==='want').reduce((s,[,v])=>s+v,0);
  return {m,isCur,span,spent,income,net:income-spent,cats,freq,busiest,zero,biggest,prev,prevSpent,
    change:prevSpent>0?(spent-prevSpent)/prevSpent*100:null,wants,count:exps.length+incs.length,avg:span?spent/span:0,topWant:cats.find(([c])=>classOf(c)==='want')||null};
}
function recapCards(R){
  const mn=monthName(R.m),short=new Date(R.m+'-01T12:00').toLocaleDateString('id-ID',{month:'long'});
  const logo='<div class="rc-brand"><img src="icons/logo-ring.png" alt=""><span>CMoney</span></div>';
  const cards=[];
  cards.push('<div class="rc rc-1">'+logo+'<div class="rc-body"><small>Rekap '+(R.isCur?'sejauh ini':'bulanan')+'</small><h2>'+mn+'</h2><p>Ini cerita uangmu bulan '+short+'.</p><div class="rc-big num">'+R.count+'</div><p>transaksi tercatat</p></div><div class="rc-foot">Geser untuk lanjut →</div></div>');
  cards.push('<div class="rc rc-2">'+logo+'<div class="rc-body"><small>Uang masuk & keluar</small>'
    +'<div class="rc-row"><span>Masuk</span><b class="num">'+fmt(R.income)+'</b></div>'
    +'<div class="rc-row"><span>Keluar</span><b class="num">'+fmt(R.spent)+'</b></div>'
    +'<div class="rc-money num" style="margin-top:18px">'+(R.net<0?'−':'+')+fmt(R.net)+'</div>'
    +'<p>'+(R.income===0?'Belum ada pemasukan tercatat bulan ini.':R.net>=0?'Surplus '+Math.round(R.net/R.income*100)+'% dari pemasukan. Mantap! 🎉':'Defisit — pengeluaran melebihi pemasukan. 😬')+'</p></div></div>');
  if(R.cats.length){
    const [c,v]=R.cats[0];
    cards.push('<div class="rc rc-3">'+logo+'<div class="rc-body"><small>Uangmu paling banyak ke…</small><div class="rc-emoji">'+emojiOf(c)+'</div><h2>'+esc(c)+'</h2><div class="rc-money num">'+fmt(v)+'</div><p>'+Math.round(v/Math.max(1,R.spent)*100)+'% dari semua pengeluaran</p>'
      +R.cats.slice(1,4).map(([k,x],i)=>'<div class="rc-row"><span>'+(i+2)+'. '+emojiOf(k)+' '+esc(k)+'</span><b class="num">'+fmt(x)+'</b></div>').join('')+'</div></div>');
  }
  cards.push('<div class="rc rc-4">'+logo+'<div class="rc-body"><small>Kebiasaan harian</small>'
    +(R.busiest?'<p>Hari paling boros</p><h2>'+new Date(R.busiest[0]+'T12:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short'})+'</h2><div class="rc-money num">'+fmt(R.busiest[1])+'</div>':'')
    +'<div class="rc-row"><span>Hari tanpa pengeluaran</span><b class="num">'+R.zero+' hari</b></div>'
    +'<div class="rc-row"><span>Rata-rata per hari</span><b class="num">'+fmt(R.avg)+'</b></div>'
    +(R.freq?'<div class="rc-row"><span>Paling sering</span><b>'+emojiOf(R.freq[0])+' '+esc(R.freq[0])+' ×'+R.freq[1]+'</b></div>':'')+'</div></div>');
  if(R.wants>0){
    const us=funUnits(R.wants,3);
    if(us.length)cards.push('<div class="rc rc-6">'+logo+'<div class="rc-body"><small>Kalau jajanmu dikonversi…</small><div class="rc-money num">'+fmt(R.wants)+'</div><p>habis untuk keinginan bulan ini, setara dengan:</p>'
      +us.map(u=>'<div class="rc-row"><span style="font-size:26px">'+u.e+'</span><b class="num">'+u.q.toLocaleString('id-ID')+' '+u.n+'</b></div>').join('')
      +'<p style="font-size:12px;opacity:.75;margin-top:12px">*Harga perkiraan: kopi susu 25rb, bioskop 50rb, nasi padang 20rb, mi instan 3,5rb, bensin 10rb/l.</p></div></div>');
  }
  const tip=R.topWant&&R.topWant[1]>0?'Bulan depan, coba batasi '+R.topWant[0]+' maksimal '+fmt(Math.round(R.topWant[1]*0.8/5000)*5000)+' (hemat ± '+fmt(R.topWant[1]*0.2)+').':'Pertahankan pola ini dan sisihkan surplus di awal bulan.';
  cards.push('<div class="rc rc-5">'+logo+'<div class="rc-body"><small>Dibanding bulan lalu</small>'
    +(R.change!==null?'<div class="rc-big num">'+(R.change>0?'▲ ':'▼ ')+Math.abs(Math.round(R.change))+'%</div><p>pengeluaran '+(R.change>0?'naik':'turun')+' dari '+fmt(R.prevSpent)+(R.isCur?' (bulan ini belum selesai)':'')+'</p>':'<p>Belum ada data bulan sebelumnya untuk dibandingkan.</p>')
    +(R.biggest?'<div class="rc-row"><span>Transaksi terbesar</span><b class="num">'+fmt(R.biggest.amount)+'</b></div><div class="rc-row" style="border:0;padding-top:0"><span>'+emojiOf(R.biggest.category)+' '+esc(R.biggest.category)+(R.biggest.note?' · '+esc(R.biggest.note):'')+'</span></div>':'')
    +'<div class="rc-tip"><b>Target berikutnya</b>'+esc(tip)+'</div></div></div>');
  return cards;
}
let recapIdx=0,recapMonth=null;
function openRecap(m){
  db=load();
  recapMonth=m;recapIdx=0;
  const cards=recapCards(computeRecap(m));
  $('#recapTrack').innerHTML=cards.join('');
  $('#recapBars').innerHTML=cards.map(()=>'<i></i>').join('');
  $('#recapTitle').textContent='Rekap '+monthName(m);
  $('#recapSheet').classList.remove('hidden');
  $('#recapTrack').scrollLeft=0;
  syncRecapBars();
  try{localStorage.setItem('cmoneytracker-recap-seen-'+m,'1')}catch(e){}
  renderRecapBanner();
}
function syncRecapBars(){
  const tr=$('#recapTrack');
  recapIdx=Math.round(tr.scrollLeft/Math.max(1,tr.clientWidth));
  $$('#recapBars i').forEach((b,i)=>b.classList.toggle('on',i<=recapIdx));
}
$('#recapTrack').addEventListener('scroll',()=>requestAnimationFrame(syncRecapBars));
$('#recapTrack').addEventListener('click',e=>{
  const tr=$('#recapTrack'),r=tr.getBoundingClientRect(),n=tr.children.length;
  const next=e.clientX>r.left+r.width*0.35?Math.min(n-1,recapIdx+1):Math.max(0,recapIdx-1);
  tr.scrollTo({left:next*tr.clientWidth,behavior:'smooth'});
});
$('#recapClose').onclick=()=>$('#recapSheet').classList.add('hidden');
$('#recapShare').onclick=async()=>{
  const card=$('#recapTrack').children[recapIdx];if(!card)return;
  toast('Menyiapkan gambar…');
  try{
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas=await html2canvas(card,{backgroundColor:null,scale:2});
    canvas.toBlob(blob=>{
      const file=new File([blob],'rekap-'+recapMonth+'.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file],title:'Rekap '+monthName(recapMonth)}).catch(()=>{});
      else downloadBlob(blob,'rekap-'+recapMonth+'-'+(recapIdx+1)+'.png');
      toast('Gambar siap.');
    },'image/png');
  }catch(err){toast('Gagal membuat gambar, cek koneksi internet.')}
};
function lastMonthKey(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return ymd(d).slice(0,7)}
function renderRecapBanner(){
  const lm=lastMonthKey();
  let seen=false;try{seen=!!localStorage.getItem('cmoneytracker-recap-seen-'+lm)}catch(e){}
  const has=db.expenses.some(x=>x.date.startsWith(lm))||db.incomes.some(x=>x.date.startsWith(lm));
  const show=has&&!seen&&Number(day().slice(8,10))<=10;
  $('#recapBanner').classList.toggle('hidden',!show);
  if(show)$('#recapBannerText').textContent='Rekap '+monthName(lm)+' sudah siap';
}
$('#recapBanner').onclick=()=>openRecap(lastMonthKey());
$('#menuRecap').onclick=()=>{
  const lm=lastMonthKey();
  openRecap(db.expenses.some(x=>x.date.startsWith(lm))?lm:month());
};
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-recap]');if(r){e.preventDefault();openRecap(r.dataset.recap==='current'?month():r.dataset.recap);return}
  const dbt=e.target.closest('[data-debt]');if(dbt)openDebtDetail(dbt.dataset.debt);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')['#debtSheet','#splitSheet','#recapSheet'].forEach(s=>$(s).classList.add('hidden'))});

function renderV39(){
  renderSafeSpend();
  renderStreaks();
  renderDebts();
  renderBudgetCard();
  renderRecapBanner();
}
