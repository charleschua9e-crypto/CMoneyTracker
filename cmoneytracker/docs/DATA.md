# Struktur data & rumus

Semua data satu objek JSON di `localStorage`, kunci **`kantong-bersama-v1`** (nama lama, dipertahankan
supaya data pemakai lama tidak hilang). Berkas backup = objek ini apa adanya.

## Bentuk data

| Field | Isi |
|---|---|
| `profile` | `{name, total, incomeType, incomeMonthly, saveTarget, planAt, goal}` |
| `expenses[]` | `{id, date, type:'daily'\|'recurring', category, note, amount, templateId?, eventId?, spread?}` |
| `incomes[]` | `{id, date, source, note, amount}` |
| `history[]` | ringkasan bulan yang sudah lewat `{month, spent, income, net, detail{kategori:total}}` |
| `methodBalances` | `{Utama: saldo awal}` — dipakai untuk koreksi saldo |
| `recurringTemplates[]` | tagihan & langganan `{id, category, amount, dayOfMonth, note, kind?, cycle?, month?, skip?}` |
| `categoryBudgets` | batas per kategori |
| `categoryClass` | `need` / `want` per kategori (default di `NEED_DEFAULT`) |
| `categoryPattern` | `spread` (sering) / `lump` (sekali sebulan), kalau pemakai menimpa deteksi otomatis |
| `monthlyBudget`, `budgetSince` | anggaran bulanan |
| `planSnap` | snapshot rencana per bulan, dipakai Evaluasi bulanan |
| `debts[]`, `wishes[]`, `events[]`, `challenges[]`, `badges` | fitur pendukung |
| `homeLayout` | urutan & bagian Beranda yang ditampilkan |
| `logicDismiss` | saran/pengingat yang ditutup pemakai |

Kunci `localStorage` lain (di luar objek utama): `cmoneytracker-pin-hash`, `cmoneytracker-bio`,
`kantong-theme`, `cmoneytracker-accent`, `cmoneytracker-last-backup`, `cmoneytracker-persist-asked`,
`cmoneytracker-tips-seen-v39`, `cmoneytracker-whatsnew-vNN`, `cmoneytracker-hide-balance`.

`id` transaksi berawalan milidetik (`Date.now()`), dipakai untuk deteksi transaksi dobel.

## Rumus penting

**Pola kategori** (`categoryModel` di `3-app.js`) — tiap kategori dinilai `spread` atau `lump`:
riwayat 3 bulan, rata-rata ≤ 1,5 transaksi/bulan → `lump`. `spread` diproyeksikan
`spent + laju × sisa hari` (laju = campuran laju bulan ini dan rata-rata riwayat);
`lump` tidak diproyeksikan harian sehingga tidak memicu peringatan "mepet".

**Aman dibelanjakan hari ini** (`computeSafeSpend` di `4-features.js`):
`(saldo + pengeluaran fleksibel hari ini − tagihan belum jatuh tempo − cadangan pengeluaran bulanan) ÷ sisa hari`,
sisa hari = sampai gajian bila diatur. Kalau anggaran bulanan lebih ketat, angka itu yang dipakai.
Transaksi bertanda `spread:true` ("sesekali") tidak memotong jatah hari itu.

**Skor kesehatan 0–100** (`analyzeFinance`): tingkat menabung 25, dana cadangan 25,
proyeksi akhir bulan 20, kebutuhan vs keinginan 15, disiplin anggaran 15, dikurangi penalti
(hari tanpa catatan, utang telat, defisit beruntun). Cadangan = saldo proyeksi akhir bulan − utang,
dibagi rata-rata pengeluaran bulanan.

**Nilai evaluasi bulanan A–D** (`evaluateMonth` di `10-review.js`): sisihan vs target 40,
anggaran 25, batas kategori 20, porsi keinginan 15. A hanya bila target sisihan tercapai
dan tidak ada batas yang jebol.

## Migrasi data

Semua dilakukan di `load()` (`3-app.js`), aman dijalankan berkali-kali:

- **v36** — dompet ganda & fitur Tabungan dihapus; saldo digabung, transaksi setor/tarik dibuang
  dan efek bersihnya masuk ke saldo awal (cadangan lama disimpan di `cmoneytracker-backup-pre-v36`).
- **v43** — kategori `Jajan` dipindah dari Harian ke Berkala.
