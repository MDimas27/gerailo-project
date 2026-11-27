# M5 — Stok Sederhana (+ HPP Rata-rata Bergerak)

## Status
- **SELESAI STAGING 27 Nov 2026** (promosi produksi menunggu ACC): pgTAP `Files=14, Tests=458`
  (plan(24) MERAH 4 gagal sebelum migrasi `0014_m5_stock.sql`), Vitest 128, lint/typecheck/build
  hijau. CI `45931832498` 4/4, staging `index-UaU8g1fa.js`; smoke HP `e8c955c3` CEK1–CEK5b 8/8;
  evidence `docs/evidence/m5/`.
- **Slice**: W3 M5 (rencana: `plans/W3-M5-STOCK.md`, ACC GATE PLAN 27 Nov 2026).
- **Basis existing**: `stock_movements`, view `v_stock_balance`, `products.hpp_rata_rata`,
  `record_stock_move` (MASUK/PENYESUAIAN), `ship_order` (KELUAR + cek stok),
  `gagal_kirim` (MASUK retur dengan snapshot HPP KELUAR).

## Tujuan & nilai
Stok yang dipercaya: berkurang tepat saat barang dikirim, masuk saat pembelian,
HPP akurat untuk laba kotor per produk. **Stok minus DIBLOKIR** — bukan diizinkan —
lewat `STOK_TIDAK_CUKUP` baik di `ship_order` maupun di penyesuaian negatif
(`PENYESUAIAN`) yang melebihi saldo tersedia (Gate #3/#52 + Gate PREP Q1).
Produk yang menipis diberi **peringatan UI** saat `saldo <= stok_min`.

## Entitas & relasi
`stock_movements` (MASUK/KELUAR/PENYESUAIAN, qty, harga_beli BIGINT?, alasan,
order_id?) per `products`/`product_variants`. Saldo stok = agregasi movements
(view `v_stock_balance` dengan `security_invoker = true`, bukan kolom mutabel).
Rata-rata bergerak diperbarui tiap MASUK berharga **di dalam RPC**
`record_stock_move`; `ship_order` membaca `products.hpp_rata_rata` saat kirim.

## Halaman & data
- Routes: `/stock` (list produk + saldo dari `v_stock_balance` + `hpp_rata_rata`
  + warning `Habis`/`Menipis`/`Tersedia` saat `saldo <= stok_min` + panel prefill
  T8 dari movement MASUK terakhir), `/stock/adjust` (form MASUK pembelian stok &
  form PENYESUAIAN/opname wajib alasan).
- Riwayat pergerakan stok = **drawer reusable** `StockHistoryDrawer` (Q3), bukan
  route terpisah di slice ini; komponen dipisah agar siap dipakai route mandiri
  kelak.
- Data: pembelian & penyesuaian & stok awal via RPC `record_stock_move` (MASUK +
  harga → rata-rata baru, satu transaksi); KELUAR ditolak dari klien — hanya
  `ship_order` (M4); riwayat & saldo = query view/movements (RLS).

## Alur user
Buka `/stock` → lihat saldo, HPP rata-rata, dan badge stok → catat pembelian stok
di `/stock/adjust` (produk, qty, harga beli, alasan) → RPC memperbarui saldo +
rata-rata → panel prefill T8 menampilkan qty/harga/total pembelian terakhir +
peringatan divergensi ledger-vs-stok → opname lewat PENYESUAIAN wajib alasan →
kirim order via M4 (`ship_order`) → saldo berkurang & HPP tercatat.

## Aturan khusus
- Tidak ada kolom `stok` yang diedit langsung; semua lewat movements + RPC.
- `record_stock_move` **TETAP LEAN**: signature `(p_product_id, p_type, p_qty,
  p_unit_price, p_reason, p_order_id)` — **dilarang menambah parameter kas/utang**
  atau logika jurnal. Jurnal pembelian (T8) dicatat terpisah (red line posting
  core tunggal, `sop/HARD-RULES.md` §1 + Gate PREP Q4).
- Rata-rata bergerak: `(stok_lama×hpp_lama + qty_beli×harga_beli) / (stok_lama+qty_beli)`,
  pembulatan **half-up** ke integer rupiah (`round()` di SQL, helper integer aman
  di `packages/shared/src/money.ts`). Contoh batas `.5`: `1@10.000 + 1@11.001 →
  round(21001/2) = 10.501`.
- Stok minus DITOLAK: `ship_order` menolak `STOK_TIDAK_CUKUP: <nama> — tersedia X,
  butuh Y` sebelum jurnal/movement; `record_stock_move` menolak PENYESUAIAN
  negatif yang membuat saldo < 0 dengan pesan yang sama. Penyesuaian tepat ke 0
  tetap sah.
- PENYESUAIAN tanpa alasan ditolak RPC (`ALASAN_WAJIB`, errcode `22023`).
- MASUK dengan `p_unit_price = null` saat saldo 0 (atau tanpa harga) menambah
  saldo **tanpa** mengubah `hpp_rata_rata` (tetap 0); UI menampilkan
  "HPP belum di-set".
- T8 tidak otomatis: template manual, prefill dari MASUK terakhir + risiko
  divergensi ledger-vs-stok (Gate #3/#52, Q2).
- Retur `gagal_kirim` memakai snapshot `harga_beli` dari movement KELUAR asli
  (bukan moving average saat itu), lalu memperbarui `hpp_rata_rata` kembali ke
  pool melalui `record_stock_move` MASUK. Contoh: pool `30 @15.500` + retur
  `5 @11.000` → `round(520.000/35) = 14.857`.

## Golden tests (RPC)
- Pembelian mengubah rata-rata: 10 pcs @10.000 + 10 pcs @12.000 → rata 11.000;
  kirim 5 → HPP 55.000; batas `.5`: 1@10.000 + 1@11.001 → 10.501.
- Blokir stok minus: `PENYESUAIAN` −20 saat saldo 15 → `STOK_TIDAK_CUKUP`;
  kirim 3 saat saldo 2 → `STOK_TIDAK_CUKUP`, tanpa movement/jurnal.
- `record_stock_move` menolak `KELUAR` (`42501`, `KELUAR_HANYA_VIA_ORDER`).
- `PENYESUAIAN` tanpa alasan ditolak `22023`; penyesuaian valid tidak mengubah HPP.
- `MASUK` tanpa harga saat saldo 0 → saldo naik, `hpp_rata_rata` tetap 0.
- Retur `gagal_kirim`: MASUK memakai snapshot HPP KELUAR; pool HPP diperbarui
  (14857); saldo round-trip benar (35).
- Saldo konsisten = SUM(movements).

## DoD
Alur beli→sesuaikan→kirim→saldo & HPP benar di HP; warning stok min jalan; fixture
hijau (pgTAP kanonik = CI hijau terakhir, dicatat di LESSONS); RLS negatif;
evidence `docs/evidence/m5/`; status diperbarui.

## Urutan build
W3 setelah M4. Dependensi: M2, M4 (T3/T8/T11 snapshot HPP).
