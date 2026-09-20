// ================= v41: fitur anak muda =================
const addDays=(dstr,n)=>{const d=new Date(dstr+'T12:00');d.setDate(d.getDate()+n);return ymd(d)};
const fmtK=n=>Math.abs(n)>=1e6?fmtShort(n):fmt(n);
function fireConfetti(){
  const c=document.createElement('canvas');
  c.style.cssText='position:fixed;inset:0;z-index:90;pointer-events:none;width:100vw;height:100vh';
  c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);
  const ctx=c.getContext('2d'),cs=['#9b7cff','#6c4ef8','#34D399','#FBBF24','#F472B6','#60A5FA'];
  const ps=Array.from({length:90},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.3,r:4+Math.random()*4,c:cs[Math.random()*cs.length|0],vy:2+Math.random()*3,vx:(Math.random()-.5)*2,a:Math.random()*6,va:(Math.random()-.5)*.3}));
  const t0=performance.now();
  (function f(now){ctx.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.a+=p.va;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);ctx.restore()});if(now-t0<2600)requestAnimationFrame(f);else c.remove()})(t0);
  buzz([20,40,20]);
}
function openSheetEl(id){$(id).classList.remove('hidden');$(id+' .sheet')&&($(id+' .sheet').scrollTop=0)}
function closeSheetEl(id){$(id).classList.add('hidden')}
['#paydaySheet','#subSheet','#wishSheet','#eventSheet','#newsSheet'].forEach(id=>{
  $(id).addEventListener('click',e=>{if(e.target===$(id)||e.target.closest('[data-close]'))closeSheetEl(id)});
});
function amountInput(sel){$(sel).addEventListener('input',e=>{const n=parseAmount(e.target.value);e.target.value=n?n.toLocaleString('id-ID'):''})}

// ---------- 1. Gajian ----------
function renderPaydaySetting(){
  $('#paydayMeta').textContent=db.payday?'Tiap tgl '+db.payday:'Belum diatur';
}
$('#paydayOpen').onclick=()=>{
  $('#paydayInput').value=db.payday||'';
  openSheetEl('#paydaySheet');
};
$('#paydaySave').onclick=()=>{
  const v=Math.round(Number($('#paydayInput').value)||0);
  if(v&&(v<1||v>31)){toast('Tanggal harus 1–31.');return}
  db=load();db.payday=v;save();closeSheetEl('#paydaySheet');render();
  toast(v?'Tanggal gajian: tiap tgl '+v+'.':'Hitung mundur gajian dimatikan.');
};
$('#paydayOff').onclick=()=>{$('#paydayInput').value='';$('#paydaySave').click()};

// ---------- 2. Langganan ----------
const SUB_PRESETS=[['Netflix','🎬'],['Spotify','🎧'],['YouTube Premium','▶️'],['Disney+','✨'],['Prime Video','📦'],['Vidio','📺'],['iCloud','☁️'],['Google One','☁️'],['Canva','🎨'],['Game Pass','🎮'],['Langganan AI','🤖'],['Gym','🏋️']];
let subForm={cycle:'monthly',emoji:'📺'};
function renderSubs(){
  const subs=(db.recurringTemplates||[]).filter(t=>t.kind==='sub');
  const perMonth=subs.reduce((s,t)=>s+tplMonthly(t),0),rare=subs.filter(t=>t.rare);
  $('#subPerMonth').textContent=fmt(perMonth);
  $('#subPerYear').textContent=fmt(perMonth*12);
  $('#subRareNote').innerHTML=rare.length?'Kalau '+rare.length+' langganan yang <b>jarang dipakai</b> dihentikan, kamu hemat <b>'+fmt(rare.reduce((s,t)=>s+tplMonthly(t),0)*12)+'/tahun</b>.':'Tandai langganan yang jarang dipakai untuk melihat potensi hemat.';
  $('#menuSubsMeta').textContent=subs.length?fmtK(perMonth)+'/bln':'';
  $('#subList').innerHTML=subs.length?subs.map(t=>{
    const y=tplYearly(t),posted=tplPosted(t);
    const when=y?'tiap '+new Date(2026,Number(t.month)-1,Math.min(t.dayOfMonth,28)).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'tiap tgl '+t.dayOfMonth;
    return '<div class="sub-row'+(t.rare?' rare':'')+'"><span class="tx-ico t-'+toneOf(t.name)+'">'+esc(t.emoji||'📺')+'</span>'
      +'<div class="tx-main"><span class="tx-title">'+esc(t.name)+'</span><span class="tx-sub">'+when+(posted?' · ✓ tercatat':'')+'</span></div>'
      +'<span class="tx-amt num">'+fmt(t.amount)+'<small>'+(y?'per tahun':'per bulan')+'</small></span>'
      +'<div class="sub-actions"><button class="chip mini'+(t.rare?' on':'')+'" data-sub-rare="'+esc(t.id)+'">'+(t.rare?'Jarang dipakai ✓':'Jarang dipakai?')+'</button><button class="chip mini dashed" data-sub-del="'+esc(t.id)+'">Hapus</button></div></div>';
  }).join(''):emptyBox('📺','Belum ada langganan. Tambahkan Netflix, Spotify, dll supaya kelihatan totalnya.');
}
function syncSubForm(){
  $$('#subCycleSeg button').forEach(b=>b.classList.toggle('on',b.dataset.cycle===subForm.cycle));
  $('#subMonthWrap').classList.toggle('hidden',subForm.cycle!=='yearly');
  $('#subEmoji').textContent=subForm.emoji;
}
function openSubForm(name,emoji){
  subForm={cycle:'monthly',emoji:emoji||'📺'};
  $('#subName').value=name||'';$('#subAmount').value='';$('#subDay').value=String(Number(day().slice(8,10))>28?28:Number(day().slice(8,10)));
  $('#subMonth').value=day().slice(5,7).replace(/^0/,'');$('#subErr').textContent='';
  syncSubForm();openSheetEl('#subSheet');
  setTimeout(()=>{try{(name?$('#subAmount'):$('#subName')).focus({preventScroll:true})}catch(e){}},280);
}
$('#subPresets').innerHTML=SUB_PRESETS.map(([n,e])=>'<button class="chip" data-sub-preset="'+esc(n)+'" data-emoji="'+e+'"><span class="em">'+e+'</span>'+esc(n)+'</button>').join('')+'<button class="chip dashed" data-sub-preset="">+ Lainnya</button>';
$('#subPresets').addEventListener('click',e=>{const b=e.target.closest('[data-sub-preset]');if(b)openSubForm(b.dataset.subPreset,b.dataset.emoji)});
$('#subCycleSeg').addEventListener('click',e=>{const b=e.target.closest('[data-cycle]');if(b){subForm.cycle=b.dataset.cycle;syncSubForm()}});
amountInput('#subAmount');
$('#subSave').onclick=()=>{
  const name=$('#subName').value.trim(),amount=parseAmount($('#subAmount').value),dom=Math.round(Number($('#subDay').value)||0),mon=Math.round(Number($('#subMonth').value)||0);
  if(!name){$('#subErr').textContent='Isi nama langganan.';return}
  if(amount<=0){$('#subErr').textContent='Isi harganya.';return}
  if(dom<1||dom>28){$('#subErr').textContent='Tanggal tagihan 1–28.';return}
  if(subForm.cycle==='yearly'&&(mon<1||mon>12)){$('#subErr').textContent='Pilih bulan tagihan.';return}
  db=load();
  const t={id:newId(),kind:'sub',name,emoji:subForm.emoji,category:'Langganan',amount,dayOfMonth:dom,note:name,cycle:subForm.cycle,rare:false};
  if(subForm.cycle==='yearly')t.month=mon;
  db.recurringTemplates.push(t);save();closeSheetEl('#subSheet');render();
  toast(name+' ditambahkan · tercatat otomatis tiap jatuh tempo',()=>{db=load();db.recurringTemplates=db.recurringTemplates.filter(x=>x.id!==t.id);save()});
};
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-sub-rare]');
  if(r){db=load();const t=db.recurringTemplates.find(x=>x.id===r.dataset.subRare);if(t){t.rare=!t.rare;save();render()}return}
  const d=e.target.closest('[data-sub-del]');
  if(d){db=load();const t=db.recurringTemplates.find(x=>x.id===d.dataset.subDel);if(!t)return;
    db.recurringTemplates=db.recurringTemplates.filter(x=>x.id!==t.id);save();render();
    toast(t.name+' dihapus. Jangan lupa berhenti langganan di aplikasinya juga.',()=>{db=load();db.recurringTemplates.push(t);save()})}
});

// ---------- 3. Setara berapa? ----------
const FUN_UNITS=[{n:'gelas kopi susu',p:25000,e:'☕'},{n:'tiket bioskop',p:50000,e:'🎬'},{n:'porsi nasi padang',p:20000,e:'🍛'},{n:'bungkus mi instan',p:3500,e:'🍜'},{n:'liter bensin',p:10000,e:'⛽'},{n:'bulan kuota internet',p:100000,e:'📶'}];
function funUnits(amount,max=3){
  return FUN_UNITS.map(u=>({...u,q:Math.floor(amount/u.p)})).filter(u=>u.q>=1&&u.q<=5000).sort((a,b)=>Math.abs(Math.log10(a.q)-1.2)-Math.abs(Math.log10(b.q)-1.2)).slice(0,max);
}

// ---------- 4. Wishlist ----------
const WISH_EMOJI=['🎁','📱','💻','🎧','👟','🎮','📷','⌚','🏍️','✈️','🎸','👜'];
let wishForm={emoji:'🎁',img:'',editId:null};
function wishPlan(){
  const A=lastAnalysis||analyzeFinance();
  const hist=db.history.slice(0,3);
  const surplus=hist.length?hist.reduce((s,h)=>s+((h.income||0)-(h.spent||0)),0)/hist.length:Math.max(0,A.projNet);
  const buffer=Math.max(0,(A.baseMonthlySpend||0)*3);
  let pool=Math.max(0,A.reserve-buffer);
  const now=new Date();
  const plans=db.wishes.filter(w=>!w.done).map(w=>{
    const have=Math.min(w.price,pool);pool-=have;
    const need=w.price-have;
    const months=need<=0?0:surplus>0?Math.ceil(need/surplus):null;
    const eta=months===null?null:months===0?'now':new Date(now.getFullYear(),now.getMonth()+months,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    return {w,have,need,months,eta,pct:w.price?have/w.price:0};
  });
  return {plans,surplus,coverage:A.coverage,buffer};
}
function renderWishes(){
  const P=wishPlan();
  $('#wishSurplus').textContent=P.surplus>0?fmt(P.surplus)+'/bulan':'belum ada surplus';
  $('#wishBuffer').textContent=fmt(P.buffer);
  $('#wishWarn').classList.toggle('hidden',!(P.coverage!==null&&P.coverage<1&&P.plans.length));
  const card=p=>{
    const w=p.w,units=funUnits(w.price,1)[0];
    const etaTxt=p.eta==='now'?'<b style="color:var(--green)">Uangnya sudah cukup</b>':p.eta?'Kebeli sekitar <b>'+p.eta+'</b>':'<span style="color:var(--amber)">Belum bisa diperkirakan — belum ada surplus</span>';
    return '<button class="wish" data-wish="'+esc(w.id)+'">'+(w.img?'<img src="'+w.img+'" alt="">':'<span class="wish-em">'+esc(w.emoji||'🎁')+'</span>')
      +'<div class="wish-main"><b>'+esc(w.name)+'</b><span class="num">'+fmt(w.price)+(units?' · ≈ '+units.q.toLocaleString('id-ID')+' '+units.n:'')+'</span>'
      +'<div class="bar-track"><div class="bar-fill" style="width:'+Math.max(3,Math.round(p.pct*100))+'%"></div></div><small>'+etaTxt+'</small></div></button>';
  };
  $('#wishList').innerHTML=P.plans.length?P.plans.map(card).join(''):emptyBox('🎁','Belum ada wishlist. Tambahkan barang impianmu!');
  const done=db.wishes.filter(w=>w.done);
  $('#wishDone').innerHTML=done.length?'<div class="group-label">Sudah kebeli</div><div class="tx-list">'+done.map(w=>'<button class="tx" data-wish="'+esc(w.id)+'"><span class="tx-ico t-green">'+(w.img?'<img src="'+w.img+'" style="width:100%;height:100%;object-fit:cover;border-radius:15px">':esc(w.emoji||'🎁'))+'</span><span class="tx-main"><span class="tx-title">'+esc(w.name)+'</span><span class="tx-sub">Tercapai '+(w.doneAt?shortDate(w.doneAt):'')+'</span></span><span class="tx-amt num">'+fmt(w.price)+'</span></button>').join('')+'</div>':'';
  // widget beranda
  const top=P.plans[0];
  $('#homeWish').classList.toggle('hidden',!top);
  if(top){
    $('#homeWish').innerHTML=(top.w.img?'<img src="'+top.w.img+'" alt="">':'<span class="wish-em">'+esc(top.w.emoji||'🎁')+'</span>')
      +'<div class="wish-main"><small>Wishlist utama</small><b>'+esc(top.w.name)+'</b><div class="bar-track"><div class="bar-fill" style="width:'+Math.max(3,Math.round(top.pct*100))+'%"></div></div><small>'+(top.eta==='now'?'Uangnya sudah cukup 🎉':top.eta?'Kebeli sekitar '+top.eta:'Belum ada surplus untuk ditabung')+'</small></div>';
  }
  $('#menuWishMeta').textContent=P.plans.length?P.plans.length+' impian':'';
}
function syncWishForm(){
  $('#wishEmojis').innerHTML=WISH_EMOJI.map(e=>'<button type="button" class="chip'+(e===wishForm.emoji&&!wishForm.img?' on':'')+'" data-wish-emoji="'+e+'"><span class="em">'+e+'</span></button>').join('');
  $('#wishImgPrev').innerHTML=wishForm.img?'<img src="'+wishForm.img+'" alt=""><button type="button" class="chip mini" id="wishImgDel">Hapus foto</button>':'';
  const del=$('#wishImgDel');if(del)del.onclick=()=>{wishForm.img='';syncWishForm()};
}
function openWish(id){
  const w=id?db.wishes.find(x=>x.id===id):null;
  wishForm={emoji:w?w.emoji||'🎁':'🎁',img:w?w.img||'':'',editId:id||null};
  $('#wishTitle').textContent=w?(w.done?'Impian tercapai':'Ubah wishlist'):'Tambah wishlist';
  $('#wishName').value=w?w.name:'';$('#wishPrice').value=w?plainAmount(w.price):'';$('#wishErr').textContent='';
  $('#wishEditActions').classList.toggle('hidden',!w);
  $('#wishBoughtWrap').classList.toggle('hidden',!w||w.done);
  $('#wishTopBtn').classList.toggle('hidden',!w||w.done||db.wishes.filter(x=>!x.done)[0]===w);
  const cats=[...recurringCats,...(db.customCategories.recurring||[]),...dailyCats,...(db.customCategories.daily||[])];
  $('#wishCat').innerHTML=cats.map(c=>'<option>'+esc(c)+'</option>').join('');
  $('#wishCat').value='Belanja kebutuhan pribadi';
  const P=w&&!w.done?wishPlan().plans.find(p=>p.w.id===w.id):null;
  $('#wishPlanTxt').innerHTML=P?'Sudah teralokasi <b>'+fmt(P.have)+'</b> dari sisa uangmu. '+(P.need>0?(P.months?'Kurang '+fmt(P.need)+' → sekitar '+P.months+' bulan lagi dengan surplus rata-rata.':'Kurang '+fmt(P.need)+'.'):'Uangnya cukup — pastikan dana darurat tetap aman sebelum membeli.'):'';
  syncWishForm();openSheetEl('#wishSheet');
}
amountInput('#wishPrice');
$('#wishEmojis').addEventListener('click',e=>{const b=e.target.closest('[data-wish-emoji]');if(b){wishForm.emoji=b.dataset.wishEmoji;wishForm.img='';syncWishForm()}});
$('#wishPhoto').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=()=>{
    const s=160,c=document.createElement('canvas');c.width=s;c.height=s;
    const k=Math.max(s/img.width,s/img.height),w=img.width*k,h=img.height*k;
    c.getContext('2d').drawImage(img,(s-w)/2,(s-h)/2,w,h);
    wishForm.img=c.toDataURL('image/jpeg',0.72);URL.revokeObjectURL(url);syncWishForm();
  };
  img.onerror=()=>toast('Foto tidak bisa dibaca.');
  img.src=url;e.target.value='';
});
$('#wishSave').onclick=()=>{
  const name=$('#wishName').value.trim(),price=parseAmount($('#wishPrice').value);
  if(!name){$('#wishErr').textContent='Isi nama barangnya.';return}
  if(price<=0){$('#wishErr').textContent='Isi harganya.';return}
  db=load();
  if(wishForm.editId){const w=db.wishes.find(x=>x.id===wishForm.editId);if(w)Object.assign(w,{name,price,emoji:wishForm.emoji,img:wishForm.img})}
  else db.wishes.push({id:newId(),name,price,emoji:wishForm.emoji,img:wishForm.img,created:day(),done:false});
  if(!save()){toast('Penyimpanan penuh — coba tanpa foto.');return}
  closeSheetEl('#wishSheet');render();toast(wishForm.editId?'Wishlist diperbarui.':'Masuk wishlist! Semangat ✨');
};
$('#wishTopBtn').onclick=()=>{db=load();const i=db.wishes.findIndex(x=>x.id===wishForm.editId);if(i>0){const [w]=db.wishes.splice(i,1);db.wishes.unshift(w);save();closeSheetEl('#wishSheet');render();toast('Jadi prioritas utama.')}};
$('#wishDelBtn').onclick=()=>{db=load();const w=db.wishes.find(x=>x.id===wishForm.editId);if(!w)return;db.wishes=db.wishes.filter(x=>x!==w);save();closeSheetEl('#wishSheet');render();toast('Wishlist dihapus.',()=>{db=load();db.wishes.push(w);save()})};
$('#wishBoughtBtn').onclick=()=>{
  db=load();const w=db.wishes.find(x=>x.id===wishForm.editId);if(!w)return;
  const cat=$('#wishCat').value,type=dailyCats.includes(cat)||(db.customCategories.daily||[]).includes(cat)?'daily':'recurring';
  const expId=newId();
  w.done=true;w.doneAt=day();
  if($('#wishRecord').checked)db.expenses.push({id:expId,date:day(),type,category:cat,note:w.name+' (wishlist)',amount:w.price});
  save();closeSheetEl('#wishSheet');render();fireConfetti();
  toast('Selamat! '+w.name+' tercapai 🎉',()=>{db=load();const x=db.wishes.find(v=>v.id===w.id);if(x){x.done=false;delete x.doneAt}db.expenses=db.expenses.filter(v=>v.id!==expId);save()});
};
$('#addWishBtn').onclick=()=>openWish(null);
document.addEventListener('click',e=>{
  const w=e.target.closest('[data-wish]');if(w){openWish(w.dataset.wish);return}
  if(e.target.closest('#homeWish'))goToPanel('wishlist');
});

// ---------- 5. Tantangan, lencana, level ----------
const COFFEE_RE=/\b(kopi|coffee|latte|americano|cappuccino|boba|starbucks|janji jiwa|kopi kenangan|fore|chatime|mixue|es teh)\b/i;
function nextSaturday(){const d=new Date(),w=d.getDay();if(w===6)return day();if(w===0)return day();d.setDate(d.getDate()+(6-w));return ymd(d)}
const CHALLENGES={
  weekend:{emoji:'🛋️',name:'Weekend tanpa jajan',desc:'Sabtu & Minggu tanpa pengeluaran kategori keinginan.',make:()=>{const s=nextSaturday();return {start:s,end:new Date(s+'T12:00').getDay()===0?s:addDays(s,1)}},
    fail:c=>db.expenses.some(x=>x.date>=c.start&&x.date<=c.end&&classOf(x.category)==='want')},
  nokopi:{emoji:'☕',name:'7 hari tanpa kopi beli',desc:'Tidak ada catatan kopi, boba, atau es teh kekinian selama 7 hari.',make:()=>({start:day(),end:addDays(day(),6)}),
    fail:c=>db.expenses.some(x=>x.date>=c.start&&x.date<=c.end&&(COFFEE_RE.test(x.note||'')||COFFEE_RE.test(x.category)))},
  masak:{emoji:'🍳',name:'Masak sendiri 5×',desc:'Check-in 5 kali masak sendiri dalam 7 hari.',target:5,make:()=>({start:day(),end:addDays(day(),6)})},
  hemat:{emoji:'📉',name:'Seminggu hemat 20%',desc:'Belanja harian 7 hari ke depan maksimal 80% dari biasanya.',make:()=>{
      const from=addDays(day(),-30),sum=sumAmt(db.expenses.filter(x=>x.type==='daily'&&x.date>=from&&x.date<day()));
      return {start:day(),end:addDays(day(),6),limit:Math.max(10000,Math.round(sum/30*7*0.8/1000)*1000)}},
    spent:c=>sumAmt(db.expenses.filter(x=>x.type==='daily'&&x.date>=c.start&&x.date<=c.end)),
    fail:c=>CHALLENGES.hemat.spent(c)>c.limit},
  catat:{emoji:'📝',name:'Catat 14 hari berturut-turut',desc:'Minimal satu catatan setiap hari selama 14 hari.',make:()=>({start:day(),end:addDays(day(),13)}),
    fail:c=>{const ds=new Set([...db.expenses,...db.incomes].map(x=>x.date));for(let d=c.start;d<day()&&d<=c.end;d=addDays(d,1))if(!ds.has(d))return true;return false}}
};
const BADGES=[
  {id:'first',e:'🌱',n:'Langkah pertama',d:'Catat transaksi pertama'},
  {id:'streak7',e:'🔥',n:'Seminggu rajin',d:'Mencatat 7 hari berturut-turut'},
  {id:'streak30',e:'⚡',n:'Sebulan konsisten',d:'Mencatat 30 hari berturut-turut'},
  {id:'nojajan7',e:'🧘',n:'Anti jajan',d:'7 hari tanpa jajan'},
  {id:'tx100',e:'💯',n:'100 catatan',d:'Mencatat 100 transaksi'},
  {id:'surplus',e:'💚',n:'Bulan surplus',d:'Satu bulan penuh dengan surplus'},
  {id:'budget',e:'🎯',n:'Anggaran aman',d:'Bulan selesai di bawah anggaran'},
  {id:'analyst',e:'🧠',n:'Melek finansial',d:'Skor analisis 80 ke atas'},
  {id:'debtfree',e:'🕊️',n:'Bebas utang',d:'Melunasi semua utang'},
  {id:'wish',e:'🎁',n:'Impian tercapai',d:'Menyelesaikan satu wishlist'},
  {id:'ch1',e:'🏅',n:'Penantang',d:'Menyelesaikan 1 tantangan'},
  {id:'ch3',e:'🏆',n:'Juara hemat',d:'Menyelesaikan 3 tantangan'}
];
const LEVELS=[[0,'Pemula'],[100,'Pencatat'],[250,'Rajin'],[500,'Teratur'],[900,'Pengatur'],[1500,'Ahli Budget'],[2500,'Master Hemat'],[4000,'Legenda Finansial']];
function evalChallenges(){
  let changed=false,won=[];
  const today=day();
  db.challenges.filter(c=>c.status==='active').forEach(c=>{
    const def=CHALLENGES[c.type];if(!def)return;
    if(c.start>today)return;
    if(def.fail&&def.fail(c)){c.status='failed';c.finished=today;changed=true;return}
    if(def.target){
      if((c.checkins||[]).length>=def.target){c.status='done';c.finished=today;changed=true;won.push(def)}
      else if(today>c.end){c.status='failed';c.finished=today;changed=true}
      return;
    }
    if(today>c.end){c.status='done';c.finished=today;changed=true;won.push(def)}
  });
  return {changed,won};
}
function badgeEarned(id,ctx){
  switch(id){
    case 'first':return ctx.count>=1;
    case 'streak7':return ctx.st.rec>=7;
    case 'streak30':return ctx.st.rec>=30;
    case 'nojajan7':return ctx.st.nw>=7&&ctx.count>=7;
    case 'tx100':return ctx.count>=100;
    case 'surplus':return db.history.some(h=>(h.income||0)>(h.spent||0));
    case 'budget':return db.monthlyBudget>0&&db.history.some(h=>h.month>=(db.budgetSince||'0000')&&(h.spent||0)<=db.monthlyBudget);
    case 'analyst':return !!(lastAnalysis&&lastAnalysis.hasData&&lastAnalysis.score>=80&&ctx.count>=20);
    case 'debtfree':return db.debts.some(d=>d.dir==='borrow')&&db.debts.filter(d=>d.dir==='borrow').every(d=>debtLeft(d)<=0);
    case 'wish':return db.wishes.some(w=>w.done);
    case 'ch1':return ctx.done>=1;
    case 'ch3':return ctx.done>=3;
  }
  return false;
}
function gameState(){
  const count=db.expenses.length+db.incomes.length;
  const done=db.challenges.filter(c=>c.status==='done').length;
  const nb=Object.keys(db.badges).length;
  const xp=Math.min(count,2000)+nb*40+done*80;
  let li=0;LEVELS.forEach((l,i)=>{if(xp>=l[0])li=i});
  const next=LEVELS[li+1];
  return {count,done,nb,xp,level:li+1,title:LEVELS[li][1],next,pct:next?(xp-LEVELS[li][0])/(next[0]-LEVELS[li][0]):1};
}
let gameBooted=false;
function runGame(){
  const ev=evalChallenges();
  const ctx={count:db.expenses.length+db.incomes.length,st:computeStreaks(),done:db.challenges.filter(c=>c.status==='done').length};
  const fresh=BADGES.filter(b=>!db.badges[b.id]&&badgeEarned(b.id,ctx));
  fresh.forEach(b=>db.badges[b.id]=day());
  if(ev.changed||fresh.length)save();
  if(ev.won.length){fireConfetti();toast('Tantangan selesai: '+ev.won.map(d=>d.name).join(', ')+' 🏆')}
  else if(fresh.length){
    if(gameBooted||fresh.length<=2)fireConfetti();
    toast(fresh.length===1?'Lencana baru: '+fresh[0].e+' '+fresh[0].n:fresh.length+' lencana baru terbuka!');
  }
  gameBooted=true;
}
function renderGame(){
  const G=gameState();
  $('#lvlNum').textContent=G.level;
  $('#lvlTitle').textContent=G.title;
  $('#lvlXp').textContent=G.xp.toLocaleString('id-ID')+' XP'+(G.next?' · '+(G.next[0]-G.xp).toLocaleString('id-ID')+' XP lagi ke '+G.next[1]:' · level tertinggi');
  $('#lvlBar').style.width=Math.round(G.pct*100)+'%';
  $('#menuGameMeta').textContent='Lv '+G.level;
  const active=db.challenges.filter(c=>c.status==='active');
  $('#chActive').innerHTML=active.length?active.map(c=>{
    const def=CHALLENGES[c.type],total=daysBetween(c.start,c.end)+1,upcoming=c.start>day();
    const elapsed=upcoming?0:Math.min(total,daysBetween(c.start,day())+1);
    let prog,label;
    if(def.target){const n=(c.checkins||[]).length;prog=n/def.target;label=n+' / '+def.target+' check-in'}
    else if(c.type==='hemat'){const sp=def.spent(c);prog=sp/c.limit;label=fmt(sp)+' / '+fmt(c.limit)}
    else{prog=elapsed/total;label=upcoming?'Mulai '+shortDate(c.start):'Hari '+elapsed+' dari '+total}
    const canCheck=def.target&&!upcoming&&!(c.checkins||[]).includes(day());
    return '<div class="ch-card"><span class="ch-em">'+def.emoji+'</span><div class="wish-main"><b>'+def.name+'</b><small>'+label+' · sampai '+shortDate(c.end)+'</small><div class="bar-track"><div class="bar-fill'+(c.type==='hemat'&&prog>0.9?' over':'')+'" style="width:'+Math.max(3,Math.min(100,Math.round(prog*100)))+'%"></div></div>'
      +'<div class="sub-actions">'+(canCheck?'<button class="chip mini on" data-ch-check="'+c.id+'">Hari ini masak ✓</button>':def.target&&!upcoming?'<span class="chip mini">Sudah check-in hari ini</span>':'')+'<button class="chip mini dashed" data-ch-quit="'+c.id+'">Menyerah</button></div></div></div>';
  }).join(''):'<p class="sub" style="margin:0 4px 6px">Belum ada tantangan aktif. Pilih satu di bawah!</p>';
  const activeTypes=new Set(active.map(c=>c.type));
  $('#chAvail').innerHTML=Object.entries(CHALLENGES).filter(([k])=>!activeTypes.has(k)).map(([k,d])=>{
    const wins=db.challenges.filter(c=>c.type===k&&c.status==='done').length;
    return '<button class="ch-card avail" data-ch-start="'+k+'"><span class="ch-em">'+d.emoji+'</span><div class="wish-main"><b>'+d.name+'</b><small>'+d.desc+(wins?' · selesai '+wins+'×':'')+'</small></div><span class="chip mini on">Mulai</span></button>';
  }).join('');
  $('#badgeGrid').innerHTML=BADGES.map(b=>{const got=db.badges[b.id];return '<div class="badge'+(got?' got':'')+'" title="'+esc(b.d)+'"><span>'+b.e+'</span><b>'+b.n+'</b><small>'+(got?shortDate(got):b.d)+'</small></div>'}).join('');
  $('#badgeCount').textContent=G.nb+' / '+BADGES.length;
  const hist=db.challenges.filter(c=>c.status!=='active').slice(-5).reverse();
  $('#chHistory').innerHTML=hist.length?'<div class="tx-list">'+hist.map(c=>{const d=CHALLENGES[c.type]||{emoji:'🎯',name:c.type};return '<div class="tx" style="cursor:default"><span class="tx-ico t-'+(c.status==='done'?'green':'red')+'">'+d.emoji+'</span><span class="tx-main"><span class="tx-title">'+d.name+'</span><span class="tx-sub">'+shortDate(c.start)+' – '+shortDate(c.end)+'</span></span><span class="tx-amt'+(c.status==='done'?' in':'')+'">'+(c.status==='done'?'Berhasil':'Gagal')+'</span></div>'}).join('')+'</div>':'';
  // chip beranda
  const chip=$('#homeLevel');
  chip.innerHTML='<span>🏆</span><b>Lv '+G.level+'</b> '+G.title+(active.length?' · '+active.length+' tantangan':'');
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-ch-start]');
  if(s){db=load();const k=s.dataset.chStart,def=CHALLENGES[k];const c=Object.assign({id:newId(),type:k,status:'active',checkins:[]},def.make());db.challenges.push(c);save();render();toast('Tantangan dimulai: '+def.name+' 💪');return}
  const ck=e.target.closest('[data-ch-check]');
  if(ck){db=load();const c=db.challenges.find(x=>x.id===ck.dataset.chCheck);if(c&&!c.checkins.includes(day())){c.checkins.push(day());save();render();toast('Check-in tercatat!')}return}
  const q=e.target.closest('[data-ch-quit]');
  if(q){if(!confirm('Menyerah dari tantangan ini?'))return;db=load();const c=db.challenges.find(x=>x.id===q.dataset.chQuit);if(c){c.status='failed';c.finished=day();save();render()}return}
  if(e.target.closest('#homeLevel'))goToPanel('game');
});

// ---------- 6. Trip / acara ----------
const EVENT_EMOJI=['✈️','🏖️','⛰️','🎉','🎤','🍜','⛺','🎓','💍','🏕️'];
let eventForm={emoji:'✈️'},openEventId=null;
const activeEvent=()=>(db.events||[]).find(e=>!e.settled&&e.start<=day()&&day()<=e.end)||null;
const eventExps=ev=>db.expenses.filter(x=>x.eventId===ev.id);
function renderEvents(){
  const list=(db.events||[]).slice().sort((a,b)=>b.start.localeCompare(a.start));
  $('#eventList').innerHTML=list.length?list.map(ev=>{
    const sp=sumAmt(eventExps(ev)),st=ev.settled?'Selesai':day()<ev.start?'Mulai '+shortDate(ev.start):day()>ev.end?'Sudah lewat':'Sedang berjalan';
    return '<button class="wish" data-event="'+esc(ev.id)+'"><span class="wish-em">'+esc(ev.emoji)+'</span><div class="wish-main"><b>'+esc(ev.name)+'</b><span>'+shortDate(ev.start)+' – '+shortDate(ev.end)+' · '+st+'</span>'
      +(ev.budget?'<div class="bar-track"><div class="bar-fill'+(sp>ev.budget?' over':'')+'" style="width:'+Math.max(3,Math.min(100,Math.round(sp/ev.budget*100)))+'%"></div></div><small class="num">'+fmt(sp)+' / '+fmt(ev.budget)+'</small>':'<small class="num">Terpakai '+fmt(sp)+'</small>')+'</div></button>';
  }).join(''):emptyBox('✈️','Belum ada trip atau acara. Buat satu sebelum berangkat!');
  const act=activeEvent();
  $('#eventBanner').classList.toggle('hidden',!act);
  if(act){const sp=sumAmt(eventExps(act));$('#eventBanner').dataset.event=act.id;$('#eventBannerText').innerHTML='<b>'+esc(act.emoji+' '+act.name)+'</b> aktif · '+fmtK(sp)+(act.budget?' / '+fmtK(act.budget):'')+'<small>Transaksi baru otomatis masuk ke trip ini</small>'}
  $('#menuEventMeta').textContent=act?'Aktif':'';
  const chip=$('#sheetEventChip');
  if(chip){
    const ev=sheet.eventId&&db.events.find(e=>e.id===sheet.eventId);
    const cand=ev||activeEvent();
    $('#sheetEventRow').classList.toggle('hidden',!cand||sheet.kind==='income');
    if(cand){chip.classList.toggle('on',!!ev);chip.innerHTML='<span class="em">'+esc(cand.emoji)+'</span>'+(ev?'Masuk ke '+esc(cand.name)+' ✓':'Masukkan ke '+esc(cand.name));chip.dataset.ev=cand.id}
  }
}
function openEventForm(){
  eventForm={emoji:'✈️'};
  $('#eventFormView').classList.remove('hidden');$('#eventDetailView').classList.add('hidden');
  $('#eventSheetTitle').textContent='Buat trip / acara';
  $('#evName').value='';$('#evBudget').value='';$('#evMembers').value='';$('#evStart').value=day();$('#evEnd').value=addDays(day(),2);$('#evErr').textContent='';
  syncEventForm();openSheetEl('#eventSheet');
}
function syncEventForm(){$('#evEmojis').innerHTML=EVENT_EMOJI.map(e=>'<button type="button" class="chip'+(e===eventForm.emoji?' on':'')+'" data-ev-emoji="'+e+'"><span class="em">'+e+'</span></button>').join('')}
$('#evEmojis').addEventListener('click',e=>{const b=e.target.closest('[data-ev-emoji]');if(b){eventForm.emoji=b.dataset.evEmoji;syncEventForm()}});
amountInput('#evBudget');
$('#evSave').onclick=()=>{
  const name=$('#evName').value.trim(),start=$('#evStart').value,end=$('#evEnd').value;
  if(!name){$('#evErr').textContent='Isi nama trip/acara.';return}
  if(!start||!end||end<start){$('#evErr').textContent='Periksa tanggal mulai & selesai.';return}
  db=load();
  const ev={id:newId(),name,emoji:eventForm.emoji,budget:parseAmount($('#evBudget').value),start,end,members:$('#evMembers').value.split(',').map(s=>s.trim()).filter(Boolean),settled:false};
  db.events.push(ev);save();closeSheetEl('#eventSheet');render();
  toast(ev.emoji+' '+name+' dibuat'+(start<=day()&&day()<=end?' — transaksi baru otomatis masuk':''));
};
function openEventDetail(id){
  db=load();const ev=db.events.find(e=>e.id===id);if(!ev)return;openEventId=id;
  $('#eventFormView').classList.add('hidden');$('#eventDetailView').classList.remove('hidden');
  $('#eventSheetTitle').textContent=ev.emoji+' '+ev.name;
  const xs=eventExps(ev),sp=sumAmt(xs);
  $('#evDetailSpent').textContent=fmt(sp);
  $('#evDetailSub').textContent=shortDate(ev.start)+' – '+shortDate(ev.end)+' · '+xs.length+' transaksi'+(ev.budget?' · anggaran '+fmt(ev.budget):'');
  $('#evDetailBar').style.width=ev.budget?Math.max(3,Math.min(100,Math.round(sp/ev.budget*100)))+'%':'0';
  $('#evDetailBar').className='bar-fill'+(ev.budget&&sp>ev.budget?' over':'');
  $('#evDetailBarWrap').classList.toggle('hidden',!ev.budget);
  const cat={};xs.forEach(x=>cat[x.category]=(cat[x.category]||0)+Number(x.amount||0));
  $('#evDetailCats').innerHTML=Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>'<div class="line"><span>'+catTag(c)+'</span><span class="num">'+fmt(v)+'</span></div>').join('')||'<p class="sub" style="margin:8px 0">Belum ada transaksi di acara ini.</p>';
  const people=(ev.members||[]).length+1,per=people>1?Math.ceil(sp/people/100)*100:0;
  $('#evSplitInfo').innerHTML=ev.members&&ev.members.length?(ev.settled?'Sudah dibagi rata ke '+ev.members.map(esc).join(', ')+'.':'Dibagi '+people+' orang (kamu + '+ev.members.map(esc).join(', ')+') → <b>'+fmt(per)+'/orang</b>. Piutang dicatat untuk tiap teman; saldo bertambah saat mereka bayar.'):'Tidak ada teman yang dicatat, jadi tidak ada pembagian.';
  $('#evSplitBtn').classList.toggle('hidden',!(ev.members&&ev.members.length)||ev.settled||sp<=0);
  $('#evFinishBtn').classList.toggle('hidden',ev.settled);
  openSheetEl('#eventSheet');
}
$('#evSplitBtn').onclick=()=>{
  db=load();const ev=db.events.find(e=>e.id===openEventId);if(!ev)return;
  const sp=sumAmt(eventExps(ev)),per=Math.ceil(sp/(ev.members.length+1)/100)*100,ids=[];
  ev.members.forEach(n=>{const id=newId();ids.push(id);db.debts.push({id,dir:'lend',person:n,amount:per,note:ev.name,date:day(),due:'',payments:[],moves:'repay'})});
  ev.settled=true;save();closeSheetEl('#eventSheet');render();
  toast('Dibagi rata: '+fmt(per)+'/orang dicatat sebagai piutang',()=>{db=load();db.debts=db.debts.filter(d=>!ids.includes(d.id));const e2=db.events.find(e=>e.id===ev.id);if(e2)e2.settled=false;save()});
};
$('#evFinishBtn').onclick=()=>{db=load();const ev=db.events.find(e=>e.id===openEventId);if(!ev)return;ev.settled=true;if(ev.end>day())ev.end=day();save();closeSheetEl('#eventSheet');render();toast('Acara ditutup. Transaksi baru tidak lagi masuk ke sini.')};
$('#evDeleteBtn').onclick=()=>{
  db=load();const ev=db.events.find(e=>e.id===openEventId);if(!ev)return;
  const tagged=db.expenses.filter(x=>x.eventId===ev.id).map(x=>x.id);
  db.events=db.events.filter(e=>e!==ev);db.expenses.forEach(x=>{if(x.eventId===ev.id)delete x.eventId});
  save();closeSheetEl('#eventSheet');render();
  toast('Acara dihapus (transaksinya tetap ada).',()=>{db=load();db.events.push(ev);db.expenses.forEach(x=>{if(tagged.includes(x.id))x.eventId=ev.id});save()});
};
$('#addEventBtn').onclick=openEventForm;
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-event]');if(b)openEventDetail(b.dataset.event);
  const c=e.target.closest('#sheetEventChip');
  if(c){sheet.eventId=sheet.eventId?null:c.dataset.ev;renderEvents()}
});

// ---------- 7. Kartu pamer tanpa angka ----------
function buildBragCard(m){
  const R=computeRecap(m),G=gameState(),st=computeStreaks();
  const lines=[];
  if(R.change!==null)lines.push([R.change<=0?'📉':'📈',R.change<=0?'Hemat '+Math.abs(Math.round(R.change))+'% dari bulan lalu':'Pengeluaran naik '+Math.round(R.change)+'%']);
  if(R.income>0)lines.push([R.net>=0?'💚':'🫠',R.net>=0?'Surplus '+Math.round(R.net/R.income*100)+'% dari pemasukan':'Bulan ini defisit']);
  lines.push(['🗓️',R.zero+' hari tanpa pengeluaran']);
  if(R.cats[0])lines.push([emojiOf(R.cats[0][0]),'Paling banyak ke '+R.cats[0][0]+' ('+Math.round(R.cats[0][1]/Math.max(1,R.spent)*100)+'%)']);
  if(st.rec>=2)lines.push(['🔥',st.rec+' hari rutin mencatat']);
  lines.push(['🏆','Level '+G.level+' · '+G.title+' · '+G.nb+' lencana']);
  return '<div class="rc rc-brag" style="flex:none;margin:0;width:360px;height:640px">'
    +'<div class="rc-brand"><img src="icons/logo-ring.png" alt=""><span>CMoney</span></div>'
    +'<div class="rc-body"><small>'+(R.isCur?'Sejauh ini':'Rekap')+'</small><h2>'+monthName(m)+'</h2>'
    +lines.map(([e,t])=>'<div class="rc-row" style="justify-content:flex-start"><span style="font-size:22px">'+e+'</span><b style="font-weight:700">'+esc(t)+'</b></div>').join('')
    +'</div><div class="rc-foot">tanpa nominal · dibuat dengan CMoney Tracker</div></div>';
}
$('#recapBrag').onclick=async()=>{
  toast('Menyiapkan kartu…');
  try{
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:0';
    holder.innerHTML=buildBragCard(recapMonth);document.body.appendChild(holder);
    const canvas=await html2canvas(holder.firstElementChild,{backgroundColor:null,scale:2});holder.remove();
    canvas.toBlob(blob=>{
      const file=new File([blob],'cmoney-'+recapMonth+'.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file]}).catch(()=>{});
      else downloadBlob(blob,'cmoney-'+recapMonth+'-tanpa-angka.png');
      toast('Kartu siap.');
    },'image/png');
  }catch(err){toast('Gagal membuat gambar, cek koneksi internet.')}
};

// ---------- 8. Mode roast (konsultasi) ----------
$('#claudeModeSeg').addEventListener('click',e=>{
  const b=e.target.closest('[data-cmode]');if(!b)return;
  claudeMode=b.dataset.cmode;
  $$('#claudeModeSeg button').forEach(x=>x.classList.toggle('on',x===b));
  $('#claudeCard').classList.toggle('roast',claudeMode==='roast');
  $('#askClaudeBtn').textContent=claudeMode==='roast'?'Roast aku di Claude 🔥':'Buka di Claude';
  updateClaudePreview();
});

// ---------- 9. Geser untuk hapus ----------
(function swipeDelete(){
  let row=null,x0=0,y0=0,dx=0,locked=null;
  document.addEventListener('touchstart',e=>{
    const r=e.target.closest('.tx[data-open]');if(!r||e.touches.length>1)return;
    row=r;x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0;locked=null;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!row)return;
    const mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;
    if(locked===null&&(Math.abs(mx)>8||Math.abs(my)>8))locked=Math.abs(mx)>Math.abs(my)*1.3&&mx<0?'x':'y';
    if(locked!=='x')return;
    dx=Math.min(0,mx);
    row.classList.add('swiping');row.style.transform='translateX('+dx+'px)';
    row.classList.toggle('armed',dx<-90);
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(!row)return;
    const r=row;row=null;
    if(locked!=='x'){return}
    r.style.transform='';
    setTimeout(()=>r.classList.remove('swiping','armed'),200);
    if(dx<-90){
      r.dataset.swiped='1';setTimeout(()=>delete r.dataset.swiped,400);
      const kind=r.dataset.open,id=r.dataset.id;
      db=load();
      const arr=kind==='income'?db.incomes:db.expenses,x=arr.find(v=>v.id===id);if(!x)return;
      if(kind==='income')db.incomes=db.incomes.filter(v=>v.id!==id);else db.expenses=db.expenses.filter(v=>v.id!==id);
      save();render();
      toast('"'+(kind==='income'?x.source:x.category)+'" '+fmt(x.amount)+' dihapus.',()=>{db=load();(kind==='income'?db.incomes:db.expenses).push(x);save()});
    }
  });
  // cegah tap tak sengaja membuka edit setelah geser
  document.addEventListener('click',e=>{const r=e.target.closest('.tx[data-swiped]');if(r){e.stopPropagation();e.preventDefault()}},true);
})();

// ---------- 10. Warna aksen ----------
const ACCENTS=[['violet','#9b7cff'],['green','#34d399'],['pink','#f472b6'],['orange','#fb923c'],['blue','#60a5fa']];
function applyAccent(a){
  if(a&&a!=='violet')document.documentElement.setAttribute('data-accent',a);else document.documentElement.removeAttribute('data-accent');
  $$('[data-accent-pick]').forEach(b=>b.classList.toggle('on',b.dataset.accentPick===(a||'violet')));
}
$('#accentPicker').innerHTML=ACCENTS.map(([k,c])=>'<button class="accent-dot" data-accent-pick="'+k+'" style="background:'+c+'" aria-label="Aksen '+k+'"></button>').join('');
$('#accentPicker').addEventListener('click',e=>{
  const b=e.target.closest('[data-accent-pick]');if(!b)return;
  try{localStorage.setItem('cmoneytracker-accent',b.dataset.accentPick)}catch(err){}
  applyAccent(b.dataset.accentPick);renderCharts();buzz();
});
try{applyAccent(localStorage.getItem('cmoneytracker-accent'))}catch(e){}

// ---------- 11. Pintasan ikon aplikasi (?action=) ----------
function handleShortcut(){
  const p=new URLSearchParams(location.search),a=p.get('action');
  if(!a)return;
  try{history.replaceState(history.state,'',location.pathname)}catch(e){}
  const go=()=>{
    if(!db.profile)return;
    if(a==='add')openSheet({});
    else if(a==='voice'){goToPanel('home');setTimeout(()=>{try{$('#micBtn').click()}catch(e){}},200)}
    else if(a==='safe')goToPanel('home');
  };
  if(!$('#lockScreen').classList.contains('hidden')){
    const obs=new MutationObserver(()=>{if($('#lockScreen').classList.contains('hidden')){obs.disconnect();setTimeout(go,150)}});
    obs.observe($('#lockScreen'),{attributes:true,attributeFilter:['class']});
  }else setTimeout(go,700);
}

// ---------- Apa yang baru ----------
const NEWS_KEY='cmoneytracker-whatsnew-v43';
function maybeShowNews(){
  try{
    if(localStorage.getItem(NEWS_KEY))return;
    if(!localStorage.getItem('cmoneytracker-tips-seen-v39')){localStorage.setItem(NEWS_KEY,'1');return}
    if(!db.profile||!$('#tipsModal').classList.contains('hidden'))return;
    localStorage.setItem(NEWS_KEY,'1');
    setTimeout(()=>openSheetEl('#newsSheet'),900);
  }catch(e){}
}

function renderV41(){
  runGame();
  renderPaydaySetting();
  renderSubs();
  renderWishes();
  renderEvents();
  renderGame();
}
