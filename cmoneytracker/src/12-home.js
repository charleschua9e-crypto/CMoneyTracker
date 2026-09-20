// ================= Atur Beranda, bantuan & pengingat backup =================

// ---------- Susunan Beranda ----------
const HB_DEFS={
  safe:['Aman dibelanjakan hari ini','Batas belanja harian & sisa anggaran'],
  quick:['Ketik cepat','Catat cepat + nominal yang sering dicatat'],
  alerts:['Info & saran','Peringatan, saran pintar, rekap & trip'],
  goal:['Tujuan & wishlist','Progres tujuan utama dan barang impian'],
  recent:['Transaksi terbaru','6 transaksi terakhir'],
  tiles:['Ringkasan bulan ini','Anggaran, rata-rata harian, saldo bertahan, akhir bulan'],
  streaks:['Level & streak','Level, lencana, dan hari rutin mencatat']
};
const HB_DEFAULT=['safe','quick','alerts','goal','recent','tiles','streaks'];
function homeLayout(){
  const L=db.homeLayout||{};
  const order=(Array.isArray(L.order)?L.order:[]).filter(k=>HB_DEFAULT.includes(k));
  HB_DEFAULT.forEach(k=>{if(!order.includes(k))order.push(k)});
  return {order,hidden:Object.assign({},L.hidden||{})};
}
function applyHomeLayout(){
  const home=$('#home'),L=homeLayout(),foot=home.querySelector('.home-foot');
  const cur=[...home.querySelectorAll('.hblock')].map(b=>b.dataset.hb).filter(k=>k!=='balance');
  // pindahkan hanya kalau urutannya berubah (supaya animasi tidak berulang tiap render)
  if(cur.join()!==L.order.join())L.order.forEach(k=>{const b=home.querySelector('[data-hb="'+k+'"]');if(b)home.insertBefore(b,foot)});
  home.querySelectorAll('.hblock').forEach(b=>b.classList.toggle('hb-off',!!L.hidden[b.dataset.hb]));
  const hasAlert=!!($('#homeInsight').innerHTML.trim()||$('#smartNudges').innerHTML.trim());
  $('#alertsHead').classList.toggle('hidden',!hasAlert);
  // penjelasan ketik cepat cukup untuk pengguna baru
  $('#smartHint').classList.toggle('hidden',db.expenses.length+db.incomes.length>=15);
}
function saveHomeLayout(L){
  db=load();db.homeLayout={order:L.order,hidden:L.hidden};save();
  applyHomeLayout();renderHomeLayoutList();
}
function renderHomeLayoutList(){
  const L=homeLayout();
  $('#homeLayoutList').innerHTML='<div class="hl-row fixed"><span class="hl-lock">'+icon('lock')+'</span><div class="hl-txt"><b>Kartu saldo</b><small>Selalu tampil di atas</small></div></div>'
    +L.order.map((k,i)=>{
      const d=HB_DEFS[k],on=!L.hidden[k];
      return '<div class="hl-row'+(on?'':' off')+'"><label class="switch"><input type="checkbox" data-hl-toggle="'+k+'"'+(on?' checked':'')+'><span></span></label>'
        +'<div class="hl-txt"><b>'+d[0]+'</b><small>'+d[1]+'</small></div>'
        +'<div class="hl-move"><button type="button" class="icon-btn sm" data-hl-move="'+k+'" data-dir="-1"'+(i===0?' disabled':'')+' aria-label="Naikkan"><svg class="i rot-up"><use href="#i-left"/></svg></button>'
        +'<button type="button" class="icon-btn sm" data-hl-move="'+k+'" data-dir="1"'+(i===L.order.length-1?' disabled':'')+' aria-label="Turunkan"><svg class="i rot-down"><use href="#i-right"/></svg></button></div></div>';
    }).join('');
}
function openHomeSheet(){renderHomeLayoutList();$('#homeSheet').classList.remove('hidden');$('#homeSheet .sheet').scrollTop=0}
$('#homeCustomize').onclick=openHomeSheet;
$('#menuCustomize').onclick=openHomeSheet;
$('#homeSheet').addEventListener('click',e=>{
  if(e.target===$('#homeSheet')||e.target.closest('[data-close]')){$('#homeSheet').classList.add('hidden');return}
  const m=e.target.closest('[data-hl-move]');
  if(m){
    const L=homeLayout(),k=m.dataset.hlMove,i=L.order.indexOf(k),j=i+Number(m.dataset.dir);
    if(j<0||j>=L.order.length)return;
    [L.order[i],L.order[j]]=[L.order[j],L.order[i]];
    saveHomeLayout(L);buzz();
  }
});
$('#homeSheet').addEventListener('change',e=>{
  const t=e.target.closest('[data-hl-toggle]');if(!t)return;
  const L=homeLayout();
  if(t.checked)delete L.hidden[t.dataset.hlToggle];else L.hidden[t.dataset.hlToggle]=true;
  saveHomeLayout(L);
});
$('#homeLayoutReset').onclick=()=>{saveHomeLayout({order:HB_DEFAULT.slice(),hidden:{}});toast('Susunan Beranda dikembalikan.')};

// ---------- Bantuan & tanya-jawab ----------
const HELP=[
  ['Dasar','catat','Cara mencatat paling cepat?','Di Beranda, ketik di kolom <b>Ketik cepat</b>, mis. <i>kopi 15rb</i> atau <i>parkir 2</i> (angka tanpa satuan dibaca ribuan). Awali dengan <b>+</b> untuk pemasukan, mis. <i>+gaji 5jt</i>. Ketuk mikrofon untuk bicara. Kategori ditebak dari kata kunci dan kebiasaanmu. Tombol di bawah kolom itu berisi nominal yang sering kamu catat — sekali ketuk langsung terisi.'],
  ['Dasar','harian','Apa bedanya Harian dan Berkala?','<b>Harian</b> untuk pengeluaran yang keluar hampir setiap hari — bawaannya Makan & minum dan Parkir. Angka <b>“Makan & parkir / hari”</b> hanya menghitung jenis ini, dibagi jumlah hari yang sudah lewat bulan ini.<br><b>Berkala</b> untuk yang tidak tiap hari: jajan mingguan, bensin, hiburan, kos, internet, tagihan. Kategori buatan sendiri bisa dimasukkan ke salah satunya.'],
  ['Dasar','hapus','Salah catat, bagaimana memperbaikinya?','Ketuk transaksinya untuk mengubah atau menghapus. Di daftar transaksi, geser ke kiri untuk menghapus cepat. Setelah menyimpan atau menghapus ada tombol <b>Urungkan</b> selama beberapa detik. Aplikasi juga memberi tahu kalau ada catatan yang kelihatan dobel.'],
  ['Dasar','koreksi','Saldo di aplikasi beda dengan uang asli?','Buka <b>Lainnya → Koreksi saldo</b>, isi jumlah uang yang benar-benar ada (tunai + rekening + e-wallet digabung). Riwayat transaksi tidak berubah; selisihnya disesuaikan di saldo awal. Kalau selisihnya besar, kemungkinan ada transaksi yang lupa dicatat.'],
  ['Angka di Beranda','aman','Dari mana angka “Aman dibelanjakan hari ini”?','Rumusnya: <b>(saldo − tagihan & pengeluaran bulanan yang belum dibayar) ÷ sisa hari</b>. Sisa hari dihitung sampai gajian kalau tanggal gajian diatur, atau sampai akhir bulan. Kalau kamu punya anggaran bulanan dan angkanya lebih ketat, yang dipakai anggaran.<br>Yang memotong jatah hari ini hanya pengeluaran yang sering (makan, jajan, bensin). Kos, tagihan, dan pengeluaran yang ditandai <b>Sesekali</b> tidak memotong jatah hari itu — dampaknya dibagi rata ke sisa hari.'],
  ['Angka di Beranda','sesekali','Apa itu “Sesekali — sebar ke sisa hari”?','Untuk pengeluaran yang jarang, mis. nonton. Tanpa tanda ini, nonton Rp35rb langsung memotong jatah hari ini (Rp70rb jadi Rp35rb). Dengan tanda ini, Rp35rb dibagi ke sisa hari — mis. 14 hari ≈ Rp2.500/hari — jadi hari ini tetap bisa makan dengan tenang. Aktifkan di form catat, atau ketuk <b>Sebar</b> di kartu Aman hari ini. Kategori Hiburan otomatis dianggap sesekali.'],
  ['Angka di Beranda','bertahan','Apa arti “Saldo bertahan”?','Perkiraan berapa hari saldomu cukup <b>kalau tidak ada pemasukan baru</b>. Dihitung per hari: laju pengeluaran yang sering + tagihan otomatis dan pengeluaran bulanan (kos dll) pada tanggalnya. Warnanya merah kalau habis sebelum gajian.'],
  ['Angka di Beranda','akhir','Apa arti “Akhir bulan”?','Perkiraan saldo di akhir bulan: saldo sekarang dikurangi proyeksi sisa pengeluaran (laju pengeluaran yang sering × sisa hari + tagihan yang belum dibayar). Belum termasuk pemasukan baru.'],
  ['Kategori & anggaran','pola','Pola “Sering” vs “Sekali sebulan”?','<b>Sering</b>: keluar beberapa kali sebulan (makan, jajan, bensin). Diproyeksikan dari laju harian dan kebiasaan bulan-bulan sebelumnya, dan bisa memicu peringatan “laju terlalu cepat”.<br><b>Sekali sebulan</b>: dibayar sekali (kos, internet). Tidak diproyeksikan per hari, jadi tidak dibilang “mepet” padahal sudah dibayar. Pola ditebak otomatis (tanda ✦) dan bisa diganti dengan mengetuk labelnya.'],
  ['Kategori & anggaran','kebutuhan','Kebutuhan vs Keinginan?','Dipakai untuk acuan 50/30/20: kebutuhan maks. 50% pemasukan, keinginan maks. 30%, dan minimal 20% disisihkan. Ketuk label Kebutuhan/Keinginan di halaman Anggaran atau detail kategori untuk mengganti.'],
  ['Kategori & anggaran','tagihan','Bagaimana tagihan otomatis bekerja?','Tagihan (kos, internet, cicilan) tercatat sendiri pada tanggalnya setiap bulan. Tagihan yang dibuat setelah tanggalnya lewat dianggap sudah dibayar bulan ini supaya tidak terpotong dua kali. Pengeluaran yang muncul tiap bulan dengan nominal mirip akan disarankan jadi tagihan otomatis.'],
  ['Kategori & anggaran','batas','Batas kategori dan anggaran bulanan, apa bedanya?','<b>Anggaran bulanan</b> membatasi total semua pengeluaran sebulan dan ikut menentukan “aman hari ini”. <b>Batas kategori</b> membatasi satu kategori, mis. Jajan Rp300rb. Keduanya opsional; halaman Anggaran punya saran angka dari kebiasaanmu.'],
  ['Analisis & saran','skor','Skor 0–100 dihitung dari apa?','Lima bagian: tingkat menabung (25), dana cadangan (25), proyeksi akhir bulan (20), kebutuhan vs keinginan (15), disiplin anggaran (15). Lalu dikurangi penalti, mis. banyak hari tanpa catatan, utang lewat jatuh tempo, atau defisit berbulan-bulan. 80+ Sehat, 60+ Cukup, 40+ Waspada, di bawahnya Kritis.'],
  ['Analisis & saran','darurat','Dana darurat/cadangan dihitung bagaimana?','Cadangan = saldo setelah dikurangi sisa kebutuhan bulan ini dan utang. Lalu dibagi rata-rata pengeluaran bulanan. Acuan: minimal 3 bulan (gaji tetap), 6–12 bulan kalau pemasukan tidak tetap.'],
  ['Analisis & saran','evaluasi','Bagaimana nilai A–D di Evaluasi bulanan?','Rencana tiap bulan tersimpan otomatis, lalu dibandingkan dengan kenyataan: sisihan vs target (40), anggaran (25), batas kategori (20), porsi keinginan (15). Nilai A hanya kalau target sisihan tercapai dan tidak ada batas yang jebol. Bulan berjalan dinilai sementara dari proyeksi.'],
  ['Analisis & saran','simulasi','Seberapa akurat simulasi “kalau…”?','Simulasi memakai rata-rata 3 bulan terakhir (atau rencana & anggaran di bulan pertama) dan asumsi sederhana — cocok untuk membandingkan pilihan, bukan kepastian. Untuk kredit atau investasi, cek syarat resmi dari lembaga yang terdaftar OJK.'],
  ['Analisis & saran','claude','Data apa yang dikirim saat tanya Claude?','Hanya yang terlihat di pratinjau: pertanyaanmu dan (kalau dicentang) ringkasan angka — total per kategori, saldo, tagihan, riwayat bulanan, tujuan. Nama panggilan dan catatan transaksi tidak ikut. Teks dibuka di claude.ai (perlu akun Claude) dan juga disalin, jadi bisa ditempel kalau kolomnya kosong.'],
  ['Data & keamanan','data','Data saya disimpan di mana?','Hanya di HP/browser ini. Tidak ada server dan tidak ada akun — orang lain tidak bisa melihat datamu. Konsekuensinya: kalau data browser dihapus atau HP ganti, data ikut hilang kalau belum di-backup.'],
  ['Data & keamanan','backup','Cara backup & pindah HP?','<b>Lainnya → Backup & ekspor → Unduh backup</b> menghasilkan file .json. Simpan di Google Drive atau kirim ke WhatsApp sendiri. Di HP baru, buka aplikasi lalu ketuk <b>Pulihkan</b> dan pilih file itu. Aplikasi mengingatkan kalau sudah 2 minggu belum backup.'],
  ['Data & keamanan','permanen','Apa itu penyimpanan permanen?','Izin supaya browser tidak menghapus data aplikasi otomatis saat memori HP penuh. Aktifkan di Backup & ekspor — paling mudah diberikan setelah aplikasi di-install ke layar utama. Ini tidak menggantikan backup.'],
  ['Data & keamanan','kunci','PIN & sidik jari','<b>Lainnya → Keamanan</b>. PIN mengunci aplikasi; sidik jari/Face ID memakai fitur bawaan HP (data biometrik tidak pernah dibaca aplikasi). Aplikasi terkunci lagi setelah ditinggal lebih dari 1 menit.'],
  ['Data & keamanan','install','Cara install seperti aplikasi biasa?','<b>Android (Chrome)</b>: menu ⋮ → <i>Instal aplikasi</i> / <i>Tambahkan ke layar utama</i>, atau tombol Install di Lainnya. <b>iPhone (Safari)</b>: tombol Bagikan → <i>Tambah ke Layar Utama</i>. Setelah di-install, aplikasi bisa dibuka tanpa internet.'],
  ['Data & keamanan','beranda','Bisa mengatur isi Beranda?','Bisa. Ketuk <b>Atur Beranda</b> di bagian bawah Beranda (atau Lainnya → Atur Beranda) untuk menyembunyikan bagian yang tidak perlu dan mengubah urutannya.']
];
let helpOpen=null;
function renderHelp(){
  const q=($('#helpSearch').value||'').toLowerCase().trim();
  const strip=h=>h.replace(/<[^>]+>/g,'');
  const items=HELP.filter(([g,k,t,a])=>!q||(t+' '+strip(a)+' '+g).toLowerCase().includes(q));
  const groups=[...new Set(items.map(x=>x[0]))];
  $('#helpList').innerHTML=items.length?groups.map(g=>'<div class="group-label">'+g+'</div><div class="menu help-group">'
    +items.filter(x=>x[0]===g).map(([,k,t,a])=>'<details class="help-item" data-help-key="'+k+'"'+(helpOpen===k?' open':'')+'><summary><span>'+t+'</span><svg class="i chev"><use href="#i-right"/></svg></summary><div class="help-a">'+a+'</div></details>').join('')+'</div>').join('')
    :emptyBox('🔎','Tidak ada yang cocok. Coba kata lain, atau tanya Claude di bawah.');
}
function openHelp(key){
  helpOpen=key||null;$('#helpSearch').value='';
  goToPanel('help');renderHelp();
  if(key)setTimeout(()=>{const el=$('#helpList').querySelector('[data-help-key="'+key+'"]');if(el){el.open=true;el.classList.add('flash');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('flash'),1600)}},120);
}
$('#helpSearch').addEventListener('input',()=>{helpOpen=null;renderHelp()});
document.addEventListener('click',e=>{
  const h=e.target.closest('[data-help]');
  if(h){e.preventDefault();e.stopPropagation();openHelp(h.dataset.help);return}
  if(e.target.closest('[data-goto="help"]'))setTimeout(()=>{helpOpen=null;renderHelp()},0);
},true);
$('#helpTour').onclick=()=>openOnboarding(false,0);

// ---------- Pengingat backup ----------
const BACKUP_KEY='cmoneytracker-last-backup';
function lastBackup(){try{return localStorage.getItem(BACKUP_KEY)}catch(e){return null}}
$('#exportBtn').addEventListener('click',()=>{try{localStorage.setItem(BACKUP_KEY,day())}catch(e){}setTimeout(render,50)});
function backupNudge(){
  const n=db.expenses.length+db.incomes.length;if(n<10)return null;
  const lb=lastBackup();
  const first=[...db.expenses,...db.incomes].reduce((m,x)=>!m||x.date<m?x.date:m,null);
  const since=lb?daysBetween(lb,day()):(first?daysBetween(first,day()):0);
  if(since<14)return null;
  return {key:'backup:'+(lb||'none')+':'+Math.floor(since/7),em:'💾',t:lb?'Sudah '+since+' hari belum backup':'Datamu belum pernah di-backup',s:n+' catatan hanya tersimpan di HP ini. Unduh backup, lalu simpan di Drive/WA.',btn:'Backup',act:'backup',tone:since>=30||!lb?'amber':''};
}
function renderBackupInfo(){
  const lb=lastBackup(),el=$('#lastBackupTxt');if(!el)return;
  if(!lb){el.innerHTML='<span style="color:var(--amber)">Belum pernah backup dari HP ini.</span>';return}
  const d=daysBetween(lb,day());
  el.innerHTML='Backup terakhir: <b>'+(d===0?'hari ini':d===1?'kemarin':d+' hari lalu')+'</b>'+(d>=14?' · <span style="color:var(--amber)">saatnya backup lagi</span>':'');
}

function renderHomeV43(){
  applyHomeLayout();
  renderBackupInfo();
  if($('#help').classList.contains('active')&&!$('#helpList').innerHTML)renderHelp();
}
