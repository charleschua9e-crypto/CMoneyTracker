// ---------- Kunci PIN & sidik jari (WebAuthn, tanpa server) ----------
const PIN_KEY='cmoneytracker-pin-hash',BIO_KEY='cmoneytracker-bio',LOCK_AFTER_MS=60000;
const getPin=()=>{try{return localStorage.getItem(PIN_KEY)}catch(e){return null}};
const getBio=()=>{try{return JSON.parse(localStorage.getItem(BIO_KEY)||'null')}catch(e){return null}};
const b64u={
  enc:buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec:s=>{s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))}
};
async function sha256(str){
  if(!(window.crypto&&crypto.subtle))throw new Error('no-subtle-crypto');
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
let bioSupported=false;
async function checkBioSupport(){
  try{bioSupported=!!(window.isSecureContext&&window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}
  catch(e){bioSupported=false}
  updatePinUI();
  return bioSupported;
}
function derToRaw(der){
  let i=2;if(der[1]&0x80)i=2+(der[1]&0x7f);
  const read=()=>{i++;const len=der[i++];let v=der.slice(i,i+len);i+=len;while(v.length>32&&v[0]===0)v=v.slice(1);const out=new Uint8Array(32);out.set(v,32-v.length);return out};
  const r=read(),s=read(),raw=new Uint8Array(64);raw.set(r);raw.set(s,32);return raw;
}
async function enableBio(){
  const name=(db.profile&&db.profile.name)||'Pengguna';
  const cred=await navigator.credentials.create({publicKey:{
    challenge:crypto.getRandomValues(new Uint8Array(32)),
    rp:{name:'CMoney Tracker'},
    user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'cmoney-'+name.toLowerCase().replace(/\s+/g,''),displayName:'CMoney Tracker · '+name},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged',requireResidentKey:false},
    timeout:60000,attestation:'none'
  }});
  if(!cred)throw new Error('no-credential');
  let pk=null,alg=null;
  try{if(cred.response.getPublicKey){const k=cred.response.getPublicKey();if(k){pk=b64u.enc(k);alg=cred.response.getPublicKeyAlgorithm()}}}catch(e){}
  localStorage.setItem(BIO_KEY,JSON.stringify({id:b64u.enc(cred.rawId),pk,alg,created:day()}));
}
async function verifyBio(){
  const bio=getBio();if(!bio)return false;
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const a=await navigator.credentials.get({publicKey:{challenge,allowCredentials:[{type:'public-key',id:b64u.dec(bio.id),transports:['internal']}],userVerification:'required',timeout:60000}});
  if(!a||b64u.enc(a.rawId)!==bio.id)return false;
  const cd=JSON.parse(new TextDecoder().decode(a.response.clientDataJSON));
  if(cd.type!=='webauthn.get'||cd.challenge!==b64u.enc(challenge)||cd.origin!==location.origin)return false;
  const ad=new Uint8Array(a.response.authenticatorData);
  if(!(ad[32]&0x04))return false; // pengguna harus terverifikasi (sidik jari/wajah/PIN HP)
  if(bio.pk&&(bio.alg===-7||bio.alg===-257)){
    const ec=bio.alg===-7;
    const key=await crypto.subtle.importKey('spki',b64u.dec(bio.pk),ec?{name:'ECDSA',namedCurve:'P-256'}:{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const h=new Uint8Array(await crypto.subtle.digest('SHA-256',a.response.clientDataJSON));
    const data=new Uint8Array(ad.length+32);data.set(ad);data.set(h,ad.length);
    let sig=new Uint8Array(a.response.signature);
    if(ec)sig=derToRaw(sig);
    if(!await crypto.subtle.verify(ec?{name:'ECDSA',hash:'SHA-256'}:{name:'RSASSA-PKCS1-v1_5'},key,sig,data))return false;
  }
  return true;
}
function updatePinUI(){
  const hasPin=!!getPin(),bio=!!getBio();
  const changing=$('#pinSetupForm').dataset.changing==='1';
  $('#pinStatusText').textContent=hasPin?'Kunci PIN aktif. Aplikasi terkunci saat dibuka dan saat ditinggal lebih dari 1 menit.':'Kunci PIN belum aktif. Data keuanganmu terbuka begitu saja kalau HP dipinjam orang.';
  $('#pinSetupForm').style.display=(!hasPin||changing)?'block':'none';
  $('#cancelPinChange').classList.toggle('hidden',!changing);
  $('#setPinBtn').textContent=changing?'Simpan PIN baru':'Aktifkan kunci PIN';
  $('#pinActiveActions').style.display=hasPin&&!changing?'flex':'none';
  $('#menuPinMeta').textContent=hasPin?(bio&&bioSupported?'PIN + sidik jari':'Aktif'):'Mati';
  const sw=$('#bioSwitch');
  sw.checked=bio&&hasPin;
  sw.disabled=!hasPin||(!bioSupported&&!bio);
  $('#bioCard').classList.toggle('dim',sw.disabled);
  $('#bioStatus').textContent=!hasPin?'Aktifkan PIN dulu — PIN dipakai sebagai cadangan.'
    :!bioSupported?(bio?'Tidak tersedia di perangkat ini sekarang. Pakai PIN.':'Perangkat/browser ini belum mendukung.')
    :bio?'Aktif — buka aplikasi cukup dengan sidik jari atau wajah.':'Buka aplikasi tanpa mengetik PIN.';
}
function unlockApp(){
  $('#lockScreen').classList.add('hidden');
  $('#lockPinInput').value='';$('#lockError').textContent='';
}
let bioBusy=false;
async function tryBioUnlock(){
  if(bioBusy||!getBio())return;
  bioBusy=true;$('#lockError').textContent='';
  try{
    if(await verifyBio())unlockApp();
    else $('#lockError').textContent='Verifikasi gagal. Coba lagi atau pakai PIN.';
  }catch(e){
    if(!e||e.name!=='NotAllowedError')$('#lockError').textContent='Sidik jari tidak bisa dipakai sekarang. Pakai PIN.';
  }finally{bioBusy=false}
}
function showLock(auto){
  if(!getPin())return;
  $$('.sheet-wrap,.recap').forEach(s=>{if(s.id!=='profileModal'&&!(s.id==='onboard'&&!db.profile))s.classList.add('hidden')});
  $('#lockScreen').classList.remove('hidden');
  const useBio=!!getBio()&&bioSupported;
  $('#bioUnlockBtn').classList.toggle('hidden',!useBio);
  $('#pinOr').classList.toggle('hidden',!useBio);
  $('#pinPrompt').classList.toggle('hidden',useBio);
  if(useBio){if(auto)setTimeout(tryBioUnlock,300)}
  else setTimeout(()=>$('#lockPinInput').focus(),50);
}
$('#bioUnlockBtn').onclick=tryBioUnlock;
$('#bioSwitch').onchange=async()=>{
  const sw=$('#bioSwitch');
  if(sw.checked){
    sw.disabled=true;
    try{await enableBio();toast('Sidik jari aktif. Tes dengan tombol “Kunci sekarang”.')}
    catch(e){
      localStorage.removeItem(BIO_KEY);
      toast(e&&e.name==='NotAllowedError'?'Dibatalkan.':e&&e.name==='SecurityError'?'Butuh HTTPS — coba setelah di-deploy ke Netlify.':'Gagal mengaktifkan sidik jari.');
    }
  }else{
    localStorage.removeItem(BIO_KEY);
    toast('Sidik jari dimatikan.');
  }
  updatePinUI();
};
$('#testLockBtn').onclick=()=>showLock(true);
$('#setPinBtn').onclick=async()=>{
  let pin=$('#newPinInput').value,confirmPin=$('#confirmPinInput').value;
  if(!/^\d{4,6}$/.test(pin)){flash('#pinStatus','PIN harus 4-6 digit angka.');return}
  if(pin!==confirmPin){flash('#pinStatus','PIN tidak sama, coba lagi.');return}
  try{
    const wasChanging=$('#pinSetupForm').dataset.changing==='1';
    localStorage.setItem(PIN_KEY,await sha256(pin));
    $('#newPinInput').value='';$('#confirmPinInput').value='';
    $('#pinSetupForm').dataset.changing='';
    updatePinUI();
    toast(wasChanging?'PIN diganti.':'Kunci PIN aktif.'+(bioSupported?' Sekarang kamu bisa mengaktifkan sidik jari.':''));
  }catch(err){
    flash('#pinStatus','Gagal: fitur ini butuh koneksi aman (HTTPS). Coba lagi setelah di-deploy ke Netlify.',4000);
  }
};
$('#removePinBtn').onclick=()=>{
  if(!confirm('Matikan kunci PIN? Sidik jari juga ikut mati, dan data kamu tidak terkunci lagi.'))return;
  localStorage.removeItem(PIN_KEY);localStorage.removeItem(BIO_KEY);
  updatePinUI();
  toast('Kunci PIN & sidik jari dimatikan.');
};
$('#changePinBtn').onclick=()=>{$('#pinSetupForm').dataset.changing='1';updatePinUI();$('#newPinInput').focus()};
$('#cancelPinChange').onclick=()=>{$('#pinSetupForm').dataset.changing='';$('#newPinInput').value='';$('#confirmPinInput').value='';updatePinUI()};
$('#lockUnlockBtn').onclick=async()=>{
  let entered=$('#lockPinInput').value;
  try{
    if(await sha256(entered)===getPin())unlockApp();
    else{
      $('#lockError').textContent='PIN salah, coba lagi.';
      $('#lockPinInput').value='';
      $('#lockPinInput').focus();
    }
  }catch(err){
    $('#lockError').textContent='Gagal verifikasi PIN (butuh koneksi aman/HTTPS).';
  }
};
$('#lockPinInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#lockUnlockBtn').click()}});
$('#lockPinInput').addEventListener('input',e=>{
  let v=e.target.value;
  if(v.length>=4&&getPin())sha256(v).then(h=>{if(h===getPin())unlockApp()}).catch(()=>{});
});
// Kunci otomatis saat aplikasi ditinggal
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();return}
  if(getPin()&&hiddenAt&&Date.now()-hiddenAt>LOCK_AFTER_MS&&$('#lockScreen').classList.contains('hidden'))showLock(true);
  hiddenAt=0;
});
updatePinUI();
if(getPin())showLock(false);
checkBioSupport().then(ok=>{
  if(getPin()&&!$('#lockScreen').classList.contains('hidden')&&getBio()&&ok){
    $('#bioUnlockBtn').classList.remove('hidden');$('#pinOr').classList.remove('hidden');$('#pinPrompt').classList.add('hidden');
    $('#lockPinInput').blur();
    tryBioUnlock();
  }
});
