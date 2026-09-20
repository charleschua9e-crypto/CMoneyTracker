# Catatan perubahan

Format: versi aplikasi = angka bulat (v34, v35, …), dipakai juga untuk nama cache service worker.

## v43 — tampilan & kenyamanan
- Desain dipoles: 29 ikon kategori garis yang seragam, kartu saldo + grafik mini 14 hari,
  navigasi bawah mengambang, header kaca, animasi masuk bertahap, mode terang ikut dirapikan
- Beranda disusun ulang + **Atur Beranda** (sembunyikan/urutkan tiap bagian)
- **Bantuan & tanya-jawab** (23 pertanyaan, pencarian, tanda `?` kontekstual)
- **Pengeluaran sesekali**: disebar ke sisa hari; kategori **Hiburan** baru
- **Pengingat backup** tiap 2 minggu + info "Backup terakhir"
- Kinerja: simpan transaksi ± 2× lebih cepat pada 4.500 transaksi (memo per render,
  arsip bulanan satu lintasan, median kategori di-cache)

## v42 — saran keuangan lebih tepat
- Panduan awal, tujuan keuangan, simulasi "kalau…", evaluasi bulanan
- Analisis sadar pola (Sering vs Sekali sebulan), detail kategori, pola kebiasaan
- Logika pintar: tebak kategori dari kebiasaan, nominal tanpa satuan, deteksi dobel & rutin
- Penyimpanan permanen (`navigator.storage.persist`)

## v41 — fitur harian
Hitung mundur gajian, langganan, wishlist, tantangan & lencana, trip & acara, mode roast,
geser untuk hapus, warna aksen, pintasan ikon aplikasi.

## v40 — keamanan
Buka dengan sidik jari/Face ID (WebAuthn), kunci otomatis.

## v39 — dasar harian
"Aman dibelanjakan hari ini", input suara, utang & patungan, rekap bulanan, streak.

## v34–v38
Tampilan fintech gelap + navigasi bawah (v34), konsultasi Claude (v35), satu saldo &
fitur Tabungan dihapus (v36), catatan lebih bersih (v37), logo Cincin Terbuka (v38).
