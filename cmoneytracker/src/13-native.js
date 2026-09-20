// ================= Mode aplikasi Android (WebView sendiri / APK) =================
const CAP=window.Capacitor,NATIVE=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform());
if(NATIVE){
  document.documentElement.classList.add('is-native');
  const P=(CAP.Plugins)||{};
  const blobToBase64=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(b)});
  // Unduhan biasa tidak jalan di WebView: file disimpan ke folder Dokumen lalu ditawarkan untuk dibagikan.
  downloadBlob=async (blob,name)=>{
    if(!P.Filesystem){toast('Simpan file belum didukung di versi aplikasi ini.');return}
    try{
      const data=await blobToBase64(blob);
      const r=await P.Filesystem.writeFile({path:name,data,directory:'DOCUMENTS',recursive:true});
      toast('Tersimpan di Dokumen/'+name);
      if(P.Share&&r&&r.uri){try{await P.Share.share({title:name,url:r.uri})}catch(e){}}
    }catch(e){toast('Gagal menyimpan file: '+(e&&e.message||e))}
  };
  // Tautan keluar (Claude, WhatsApp) dibuka di browser luar, bukan menimpa aplikasi
  const openExt=window.open;
  const goOut=url=>{try{if(P.Browser&&P.Browser.open){P.Browser.open({url});return}}catch(e){}try{openExt.call(window,url,'_blank')}catch(e){}};
  const fakeWin=()=>({opener:null,closed:false,focus(){},close(){},location:{set href(v){goOut(v)},assign:goOut,replace:goOut}});
  window.open=(u,t,f)=>{if(!u||u==='about:blank')return fakeWin();goOut(u);return fakeWin()};
  // Penyimpanan di aplikasi: tidak ikut terhapus saat data Chrome dibersihkan
  persistState='native';
  checkPersist=async()=>{persistState='native';return 'native'};
  renderPersist=async()=>{
    $('#persistState').className='persist-state on';
    $('#persistState').innerHTML='<span>📱</span><div><b>Aman di aplikasi</b><small>Versi aplikasi (APK) menyimpan data di dalam aplikasinya sendiri — tidak ikut terhapus saat kamu membersihkan data Chrome. Data baru hilang kalau aplikasi di-uninstall atau datanya dihapus lewat Setelan HP.</small></div>';
    $('#persistBtn').classList.add('hidden');
    $('#menuExportMeta').textContent='Di aplikasi ✓';$('#menuExportMeta').style.color='var(--green)';
    try{$('#persistUsage').textContent='Backup tersimpan ke folder Dokumen lalu bisa langsung dibagikan ke Drive/WhatsApp. Tetap backup berkala supaya aman kalau HP hilang atau aplikasi dihapus.'}catch(e){}
  };
  $('#installBtn').classList.add('hidden');
  const ver=document.querySelector('.version');if(ver)ver.textContent=ver.textContent.replace('data tersimpan lokal di perangkat ini','aplikasi Android · data tersimpan di dalam aplikasi');
  // Tombol kembali Android: tutup sheet dulu, lalu mundur halaman
  if(P.App&&P.App.addListener)P.App.addListener('backButton',()=>{
    const open=[...document.querySelectorAll('.sheet-wrap:not(.hidden)')].filter(s=>s.id!=='profileModal'||!db.profile);
    if(open.length){open[open.length-1].classList.add('hidden');return}
    if(history.state&&history.state.sub){history.back();return}
    if(!$('#home').classList.contains('active')){goToPanel('home');return}
    if(P.App.exitApp)P.App.exitApp();
  });
}
