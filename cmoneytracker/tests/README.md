# Tes

Tes memakai **Playwright (Python)** dan menguji `dist/` hasil build sungguhan — bukan modul terpisah.
Tiap berkas menyiapkan `localStorage`, memuat aplikasi, mengeklik seperti pemakai, lalu mencetak
hasil penting dan diakhiri baris `ERRORS: [...]`. Runner (`npm test`) menganggap gagal bila ada
galat halaman atau proses keluar dengan error. Galat jaringan sandbox (font/CDN) diabaikan.

```bash
pip install playwright && playwright install chromium
npm test                 # semua
node scripts/test.mjs test7.py test12.py   # sebagian
```

Keluaran (screenshot, unduhan) masuk ke `.test-out/` dan tidak ikut di-commit.

| Berkas | Cakupan |
|---|---|
| `test.py` | alur umum: catat, ubah, hapus & urungkan, pencarian, ganti bulan, mode terang, pengguna baru |
| `test2.py` | analisis & skor pada 6 skenario keuangan (defisit, surplus, tanpa data, dll.) |
| `test3.py` | ekspor CSV/JSON, pulihkan backup, pengguna baru dari nol |
| `test4.py` | rekap bulanan & kartu cerita |
| `test5.py` | PIN, sidik jari (authenticator virtual), kunci otomatis |
| `test6.py` | wishlist (termasuk unggah foto), langganan, tantangan, pintasan aplikasi |
| `test7.py` | pola kategori (Sering/Sekali sebulan), detail kategori, batas, filter transaksi |
| `test8.py` | logika pintar: tebak kategori, nominal tanpa satuan, dobel, saran rutin, saran anggaran |
| `test9.py` | Jajan sebagai Berkala & rata-rata harian hanya kategori Harian |
| `test10.py` | panduan awal lengkap + tujuan + semua tab simulasi |
| `test11.py` | ubah rencana untuk pengguna lama, semua jenis tujuan |
| `test12.py` | evaluasi bulanan, nilai A–D, penyesuaian sekali ketuk, penyimpanan permanen |
| `test13.py` | pengeluaran "sesekali" (sebar ke sisa hari) |
| `test14.py` | Atur Beranda, halaman Bantuan, pengingat backup |
| `test15.py` | mode aplikasi Android (Capacitor disimulasikan): simpan backup, tombol kembali, tautan keluar |

`perf.py` (`npm run perf`) mengukur kecepatan pada 4.500 transaksi dengan CPU dilambatkan 4×;
`prof.py` menampilkan fungsi paling berat. Keduanya alat bantu, bukan bagian dari `npm test`.
