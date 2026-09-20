// ================= Sentuhan desain =================
function renderBalSpark(){
  const el=$('#balSpark');if(!el)return;
  const days=[];for(let i=13;i>=0;i--)days.push(addDays(day(),-i));
  const v=days.map(d=>sumAmt(db.expenses.filter(x=>x.date===d)));
  if(!v.some(Boolean)){el.innerHTML='';return}
  const max=Math.max(1,...v);
  el.innerHTML=v.map((x,i)=>'<i class="'+(i===13?'now':'')+'" style="height:'+Math.max(10,Math.round(x/max*100))+'%" title="'+shortDate(days[i])+': '+fmt(x)+'"></i>').join('');
}
$('#safeHint').addEventListener('click',()=>$('#safeHint').classList.toggle('open'));
// Topbar jadi "kaca" saat halaman digulir
let scrollTick=false;
window.addEventListener('scroll',()=>{
  if(scrollTick)return;scrollTick=true;
  requestAnimationFrame(()=>{scrollTick=false;const on=window.scrollY>8;$('#topbar').classList.toggle('scrolled',on);document.querySelectorAll('.page-head').forEach(h=>h.classList.toggle('scrolled',on))});
},{passive:true});
function renderDesignV43(){renderBalSpark()}
