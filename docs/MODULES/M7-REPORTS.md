# M7 — Laporan & Export

## Tujuan & nilai
Lima laporan yang BISA DIPERCAYA karena semuanya SQL views atas journal_lines —
tidak ada angka paralel. Export CSV/PDF untuk akuntan/pembeli potensial.

## Laporan MVP (tepat 5)
1. **Rekap harian**: penjualan, kas masuk, estimasi laba kotor hari itu.
2. **Laba rugi bulanan** (akrual sederhana): pendapatan (4-40xx) − HPP (5-5010) − beban (6-60xx).
3. **Arus kas metode langsung**: masuk/keluar per kategori kas (1-1010/1-1020).
4. **Piutang & UMP**: daftar order belum lunas + saldo uang muka menggantung.
5. **Dashboard beranda**: 4 angka — penjualan bulan ini, laba kotor bulan ini,
   kas tersedia, pesanan belum lunas.

## Halaman & data
- Routes: `/` (dashboard), `/reports/daily`, `/reports/pnl`, `/reports/cashflow`,
  `/reports/receivables`; tombol export di tiap laporan.
- Data: query views `v_rekap_harian`, `v_pnl_bulan`, `v_arus_kas`, `v_piutang_ump`
  via supabase-js (views `security_invoker` → RLS otomatis; `docs/DATA-MODEL.md` §Views).
- Export CSV: route Worker `GET /api/export/:jenis?periode=...` (streaming, RFC-4180
  + BOM UTF-8, auth JWT). PDF: cetak dari browser (window.print + CSS cetak) untuk
  MVP — render PDF server = ADR terpisah jika benar-benar dibutuhkan.

## Aturan khusus
- NERACA & CaLK BUKAN MVP (bulan ke-2, SSoT 6.2) — jangan tampilkan setengah jadi.
- Laba rugi akrual sederhana: pendapatan saat DIKIRIM (bukan kas); beban saat dibuat.
- Arus kas = metode langsung dari jurnal kas; posisi keuangan menunggu bulan ke-2.
- Label copywriting: "mengacu SAK EMKM" (rules/01 §11).
- Performa: index journal_lines (business_id, account_id, tanggal); BIGINT → string
  di klien diformat via `money.ts`.

## Golden tests
- Laba rugi dari fixture Siti (bulan penuh) = pendapatan 240.000, HPP 165.000, laba 75.000.
- Arus kas = kas masuk 240.000; tidak ada item non-kas di arus kas.
- Piutang: order dikirim belum lunas muncul; setelah pelunasan hilang.
- Export CSV dibuka di Excel tanpa angka rusak (BOM + kutip); RLS: laporan A ≠ data
  usaha B.

## DoD
5 laporan + export jalan di HP; cocok dengan fixture; performa oke; RLS; status
diperbarui.

## Urutan build
W3 terakhir (butuh M4+M5). Rekap harian boleh mulai saat M4 selesai.
