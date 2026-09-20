// ================= Detail kategori & proyeksi =================
const PATTERN_LABEL={spread:'Sering',lump:'Sekali sebulan'};
function patternChip(c,m){
  const p=(m&&m.pattern)||((db.categoryPattern||{})[c])||(LUMP_DEFAULT.includes(c)?'lump':'spread');
  return '<button type="button" class="pat-chip '+p+(m&&m.auto?' auto':'')+'" data-pattern-toggle="'+esc(c)+'" title="'+(m&&m.auto?'Dideteksi otomatis · ':'')+'Ketuk untuk ganti pola">'+PATTERN_LABEL[p]+'</button>';
}
function setPattern(c,p){
  db=load();
  if($('#budgets').classList.contains('active'))persistBudgetForm();
  db.categoryPattern=db.categoryPattern||{};
  db.categoryPattern[c]=p;
  save();
}
function setClass(c,v){
  db=load();
  const def=NEED_DEFAULT.includes(c)?'need':'want';
  if(v===def)delete db.categoryClass[c];else db.categoryClass[c]=v;
  save();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-pattern-toggle]');
  if(b){
    e.stopPropagation();
    const c=b.dataset.patternToggle,A=lastAnalysis;
    const cur=(A&&A.CM[c]&&A.CM[c].pattern)||((db.categoryPattern||{})[c])||'spread';
    const next=cur==='lump'?'spread':'lump';
    setPattern(c,next);render();
    if(!$('#catSheet').classList.contains('hidden'))openCatDetail(c);
    toast(c+' dianggap '+(next==='lump'?'pengeluaran sekali sebulan':'pengeluaran yang sering')+'.');
    return;
  }
  const d=e.target.closest('[data-cat-detail]');
  if(d){openCatDetail(d.dataset.catDetail);return}
},true);

let catOpen=null;
function openCatDetail(c){
  db=load();
  const A=analyzeFinance();lastAnalysis=A;
  catOpen=c;
  const m=A.CM[c]||{pattern:LUMP_DEFAULT.includes(c)?'lump':'spread',auto:true,spent:0,count:0,histAvg:0,avgWhenPaid:0,proj:0,left:0,rate:0,note:'belum ada data',hm:[]};
  const tplPending=sumAmt(A.pendingBills.filter(t=>t.category===c));
  const proj=m.proj+tplPending;
  const cls=classOf(c),cap=(db.categoryBudgets||{})[c]||0;
  $('#catTitle').innerHTML='<span class="cat-ttl-ic t-'+toneOf(c)+'">'+catIcon(c)+'</span>'+esc(c);
  $('#catChips').innerHTML=patternChip(c,m)+'<button type="button" class="class-chip '+cls+'" data-cat-class="'+esc(c)+'">'+(cls==='need'?'Kebutuhan':'Keinginan')+'</button>';
  $('#catSpent').textContent=fmt(m.spent);
  $('#catProj').textContent=fmt(proj);
  $('#catAvg').textContent=m.validMonths?fmt(m.histAvg):'-';
  $('#catProjNote').textContent=tplPending?'termasuk tagihan otomatis':m.note;
  // batas
  const pct=cap?Math.round(m.spent/cap*100):0;
  $('#catCapBar').style.width=cap?Math.min(100,Math.max(3,pct))+'%':'0';
  $('#catCapBar').className='bar-fill'+(cap&&m.spent>cap?' over':'');
  $('#catCapProj').style.left=cap?Math.min(100,Math.round(proj/cap*100))+'%':'0';
  $('#catCapProj').classList.toggle('hidden',!cap||m.pattern==='lump'||proj<=m.spent);
  $('#catCapTrack').classList.toggle('hidden',!cap);
  $('#catCapText').innerHTML=cap?(m.spent>cap?'<span style="color:var(--red)">Lewat '+fmt(m.spent-cap)+'</span> dari batas '+fmt(cap)
    :pct+'% dari batas '+fmt(cap)+(m.pattern==='spread'&&proj>cap?' · <span style="color:var(--amber)">proyeksi tembus '+fmt(proj-cap)+'</span>':m.pattern==='lump'&&m.spent>0?' · sudah dibayar bulan ini':''))
    :'Belum ada batas untuk kategori ini.';
  if(document.activeElement!==$('#catCapInput'))$('#catCapInput').value=cap||'';
  const sug=m.pattern==='lump'?m.avgWhenPaid:m.histAvg;
  $('#catCapSug').innerHTML=sug>0?'Saran: <button class="link" data-cap-sug="'+Math.ceil(sug*1.05/10000)*10000+'" style="padding:0;font-size:12px">'+fmt(Math.ceil(sug*1.05/10000)*10000)+'</button> (rata-rata + 5%)':'';
  // grafik 6 bulan
  const months=[...pastMonths(5).reverse(),month()];
  const data=months.map(mm=>({m:mm,v:sumAmt(db.expenses.filter(x=>x.category===c&&x.date.startsWith(mm)))}));
  const max=Math.max(1,...data.map(d=>d.v),proj,cap||0);
  const ab=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  $('#catBars').innerHTML=data.map((d,i)=>{
    const last=i===data.length-1,h=Math.round(d.v/max*100),ph=last?Math.round(Math.max(0,proj-d.v)/max*100):0;
    return '<div class="mb"><div class="mb-col">'+(ph?'<i class="mb-proj" style="height:'+ph+'%"></i>':'')+'<i class="mb-bar'+(last?' cur':'')+'" style="height:'+Math.max(d.v?3:0,h)+'%"></i></div><small>'+ab[Number(d.m.slice(5,7))-1]+'</small><b class="num">'+(d.v?fmtShort(d.v).replace('Rp',''):'–')+'</b></div>';
  }).join('')+(cap?'<i class="mb-cap" style="bottom:calc(36px + '+Math.round(cap/max*100)+'px)"><span>batas</span></i>':'');
  // insight
  const xs=db.expenses.filter(x=>x.category===c&&x.date.startsWith(month())).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)));
  const allHist=db.expenses.filter(x=>x.category===c);
  const avgTx=allHist.length?sumAmt(allHist)/allHist.length:0;
  const notes={};allHist.forEach(x=>{const n=(x.note||'').toLowerCase().replace(/\(.*?\)/g,'').trim();if(n)notes[n]=(notes[n]||0)+1});
  const topNote=Object.entries(notes).sort((a,b)=>b[1]-a[1])[0];
  const lines=[];
  lines.push(m.pattern==='lump'?'Dianggap <b>pengeluaran sekali sebulan</b> — tidak diproyeksikan per hari, jadi tidak memicu peringatan "laju terlalu cepat".':'Dianggap <b>pengeluaran yang sering</b> (beberapa kali sebulan) — diproyeksikan dari laju sekarang ('+fmt(m.rate)+'/hari) dan kebiasaan bulan-bulan sebelumnya.');
  if(allHist.length)lines.push('Rata-rata per transaksi '+fmt(avgTx)+' dari '+allHist.length+' catatan'+(m.avgCount?' · biasanya '+(Math.round(m.avgCount*10)/10).toLocaleString('id-ID')+'× per bulan':'')+'.');
  if(m.histAvg>0&&proj>0){const diff=(proj-m.histAvg)/m.histAvg*100;if(Math.abs(diff)>=15)lines.push('Proyeksi bulan ini '+(diff>0?'<b style="color:var(--amber)">'+Math.round(diff)+'% lebih tinggi</b>':'<b style="color:var(--green)">'+Math.round(-diff)+'% lebih rendah</b>')+' dari rata-rata 3 bulan.')}
  if(topNote&&topNote[1]>=2)lines.push('Paling sering: “'+esc(topNote[0])+'” ('+topNote[1]+'×).');
  if(cls==='want'&&m.histAvg>0)lines.push('Kalau dikurangi 20%, hemat ± '+fmt(m.histAvg*0.2*12)+' per tahun.');
  $('#catInsight').innerHTML=lines.map(l=>'<li>'+l+'</li>').join('');
  $('#catTx').innerHTML=xs.length?xs.map(x=>txRow({...x,kind:'expense'},true)).join(''):emptyBox('🧾','Belum ada transaksi bulan ini.');
  $('#catSheet').classList.remove('hidden');
}
$('#catSheet').addEventListener('click',e=>{
  if(e.target===$('#catSheet')||e.target.closest('[data-close]')){$('#catSheet').classList.add('hidden');return}
  const k=e.target.closest('[data-cat-class]');
  if(k){const c=k.dataset.catClass;setClass(c,classOf(c)==='need'?'want':'need');render();openCatDetail(c);return}
  const sg=e.target.closest('[data-cap-sug]');
  if(sg){$('#catCapInput').value=sg.dataset.capSug;return}
  if(e.target.closest('[data-open]'))$('#catSheet').classList.add('hidden');
});
$('#catCapSave').onclick=()=>{
  if(!catOpen)return;
  db=load();
  const v=Number($('#catCapInput').value)||0;
  if(v>0)db.categoryBudgets[catOpen]=v;else delete db.categoryBudgets[catOpen];
  $('#catCapInput').blur();
  save();render();openCatDetail(catOpen);
  toast(v>0?'Batas '+catOpen+' '+fmt(v)+' disimpan.':'Batas '+catOpen+' dihapus.');
};

function renderProjection(){
  const A=lastAnalysis;if(!A)return;
  const rows=Object.values(A.CM).filter(m=>m.spent>0||m.proj>0).sort((a,b)=>b.proj-a.proj);
  const tpl={};A.pendingBills.forEach(t=>{tpl[t.category]=(tpl[t.category]||0)+Number(t.amount||0)});
  const all=rows.map(m=>({c:m.c,p:m.pattern,s:m.spent,j:m.proj+(tpl[m.c]||0),note:tpl[m.c]?'tagihan otomatis':m.note}));
  Object.keys(tpl).filter(c=>!A.CM[c]).forEach(c=>all.push({c,p:'lump',s:0,j:tpl[c],note:'tagihan otomatis'}));
  all.sort((a,b)=>b.j-a.j);
  $('#projTable').innerHTML=all.length?all.map(r=>'<button class="proj-row" data-cat-detail="'+esc(r.c)+'"><span class="pr-name"><b>'+catTag(r.c)+'</b><small><i class="pat-dot '+r.p+'"></i>'+PATTERN_LABEL[r.p]+' · '+esc(r.note)+'</small></span><span class="pr-num num"><b>'+fmt(r.j)+'</b><small>sudah '+fmt(r.s)+'</small></span></button>').join('')
    :emptyBox('📊','Belum ada data untuk diproyeksikan.');
  const budget=A.budget;
  $('#projTotal').innerHTML='<div class="line"><span>Sudah keluar</span><span class="num">'+fmt(A.spend)+'</span></div>'
    +'<div class="line"><span>Proyeksi akhir bulan</span><span class="num">'+fmt(A.projSpend)+'</span></div>'
    +(budget?'<div class="line"><span>Anggaran</span><span class="num" style="color:'+(A.projSpend>budget?'var(--red)':'var(--green)')+'">'+fmt(budget)+(A.projSpend>budget?' (lewat '+fmt(A.projSpend-budget)+')':' (aman)')+'</span></div>':'');
}

let txType='all';
$('#txTypeSeg').addEventListener('click',e=>{
  const b=e.target.closest('[data-txtype]');if(!b)return;
  txType=b.dataset.txtype;
  $$('#txTypeSeg button').forEach(x=>x.classList.toggle('on',x===b));
  render();
});

function renderDetailV42(){
  renderProjection();
}
