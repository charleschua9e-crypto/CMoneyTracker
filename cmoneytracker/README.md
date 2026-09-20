# CMoney Tracker

Pencatat keuangan pribadi berbentuk **PWA satu berkas**: tanpa server, tanpa akun, semua data
tersimpan di perangkat pemakai. Dibuat untuk dipakai sehari-hari di HP, lengkap dengan analisis
keuangan, simulasi "kalau…", dan evaluasi bulanan.

- **Produksi:** hasil `npm run build` ada di `dist/` — seret ke [Netlify Drop](https://app.netlify.com/drop) atau deploy otomatis dari repo ini.
- **Versi:** lihat `CHANGELOG.md`. Versi saat ini tertulis di `package.json` dan `public/sw.js`.

## Mulai cepat

```bash
npm install
npm run dev     # build + server di http://localhost:8000
npm run build   # tulis dist/
npm test        # 15 berkas tes Playwright (butuh Python, lihat tests/README.md)
npm run lint
```

## Prinsip

1. **Tanpa server.** Tidak ada backend, akun, atau analitik. Data hanya di `localStorage`
   perangkat pemakai; backup berupa berkas JSON yang diunduh sendiri.
2. **Satu berkas.** Hasil build adalah `index.html` tunggal (± 480 KB) berisi HTML, CSS, dan JS.
   Tidak ada bundler, tidak ada framework, tidak ada dependensi runtime.
   Pustaka ekspor (PDF/Excel/gambar) diambil dari CDN hanya saat dipakai.
3. **Offline dulu.** `public/sw.js` menyimpan aplikasi di cache; semua perhitungan jalan di perangkat.
4. **Jujur soal angka.** Setiap angka yang ditampilkan bisa ditelusuri asal rumusnya
   (lihat halaman Bantuan di aplikasi dan `docs/DATA.md`).

## Struktur

```
src/                 potongan sumber, digabung oleh scripts/build.mjs
  1-head.html        <head> + seluruh CSS (token warna, komponen, poles v43)
  2-body.html        seluruh markup: sprite ikon, halaman, sheet/modal, navigasi
  3-app.js           inti: data & migrasi, util, render(), transaksi, analisis, Claude
  4-features.js      batas harian "aman dibelanjakan", gajian, suara, utang, rekap
  5-security.js      PIN, sidik jari (WebAuthn), kunci otomatis
  6-fun.js           langganan, wishlist, tantangan/lencana, trip, warna aksen
  7-detail.js        detail kategori, kartu proyeksi, filter transaksi
  8-logic.js         "logika pintar": tebak kategori, dobel, pola, saran, sesekali
  9-plan.js          panduan awal, tujuan keuangan, simulasi "kalau…"
  10-review.js       penyimpanan permanen, snapshot rencana, evaluasi bulanan
  11-design.js       sentuhan tampilan (sparkline saldo, header kaca)
  12-home.js         susunan Beranda, Bantuan & tanya-jawab, pengingat backup
  13-native.js       penyesuaian saat dijalankan sebagai APK (Capacitor WebView)
public/              disalin apa adanya ke dist/: sw.js, manifest, ikon
scripts/             build.mjs, serve.mjs, test.mjs, version.mjs
tests/               tes Playwright (Python) + fixtures
docs/                DATA.md (struktur data & rumus)
```

### Cara build bekerja

`src/3-app.js` berisi penanda seperti `/*__LOGIC__*/`. `scripts/build.mjs` mengganti tiap penanda
dengan isi berkas modulnya, membungkusnya dengan `<script>`, lalu menggabungkan
`1-head.html + 2-body.html + JS` menjadi `dist/index.html`. Urutan penanda = urutan eksekusi.

Karena semuanya berakhir dalam **satu IIFE**, modul bebas memakai fungsi milik modul lain tanpa
import — konsekuensinya ESLint tidak bisa melihat pemakaian lintas berkas (`no-undef` dimatikan,
lihat `eslint.config.js`).

Build juga memeriksa sintaks tiap blok `<script>` dan gagal kalau ada penanda yang belum terisi.

### Alur render

Satu fungsi `render()` di `3-app.js` menggambar ulang seluruh layar dari `db` (objek data),
lalu memanggil render lanjutan tiap modul: `renderV39 → renderV41 → renderDetailV42 →
renderLogicV43 → renderPlanV44 → renderReviewV45 → renderDesignV43 → renderHomeV43`.
Perhitungan berat (model kategori, deteksi rutin, statistik kebiasaan) di-cache per render
lewat `memo()` yang dikosongkan tiap `save()`.

## Rilis versi baru

```bash
npm run release -- 44   # naikkan versi di sw.js, halaman Lainnya, kunci "Yang baru"
```
Lalu isi daftar fitur di `#newsSheet` (`src/2-body.html`), tulis catatan di `CHANGELOG.md`,
jalankan `npm test`, dan deploy `dist/`.

## Deploy

- **Netlify (otomatis):** hubungkan repo ini; `netlify.toml` sudah mengatur
  `command = "npm run build"` dan `publish = "dist"` beserta header keamanan.
- **Manual:** `npm run build`, lalu seret isi `dist/` ke Netlify Drop.

## Versi aplikasi Android (opsional)

`src/13-native.js` membuat aplikasi tahu saat dijalankan di dalam WebView Capacitor: backup
disimpan lewat plugin Filesystem, tautan keluar dibuka di browser, dan tombol kembali Android
ditangani. Kode ini tidak aktif sama sekali di browser biasa.
