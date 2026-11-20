# M5 — Stok Sederhana (+ HPP Rata-rata Bergerak)

## Tujuan & nilai
Stok yang dipercaya: berkurang tepat saat barang dikirim, masuk saat pembelian,
HPP akurat untuk laba kotor per produk. Stok minus diberi peringatan mencolok
(tidak diblokir keras — kenyataan UMKM kadang jual sebelum restock).

## Entitas & relasi
`stock_movements` (MASUK/KELUAR/PENYESUAIAN, qty, harga_beli BIGINT?, alasan,
order_id?) per `products`/`product_variants`. Saldo stok = agregasi movements
(view `v_stock_balance`, bukan kolom mutabel). Rata-rata bergerak diperbarui tiap
MASUK berharga (T8) DI DALAM RPC.

## Halaman & data
- Routes: `/stock` (list produk + saldo + rata-rata HPP + flag < stok_min),
  `/stock/adjust` (penyesuaian wajib alasan), `/stock/history/:productId`.
- Data: pembelian & penyesuaian & stok awal via RPC `record_stock_move`
  (MASUK + harga + bayar/utang → T8 + rata-rata baru, satu transaksi); KELUAR
  ditolak dari klien — hanya `complete_order` (M4); riwayat & saldo = query
  view/movements (RLS).

## Alur user
Pembelian stok (form: produk, qty, harga beli, bayar/utang) → RPC T8 + rata-rata
terbarui → dashboard menandai produk di bawah stok_min sebagai sinyal pembelian →
opname → penyesuaian dengan alasan.

## Aturan khusus
- Tidak ada kolom `stok` yang diedit langsung; semua lewat movements + RPC.
- Rata-rata bergerak: (stok_lama×hpp_lama + qty_beli×harga_beli) / (stok_lama+qty_beli),
  pembulatan integer rupiah terdokumentasi di `packages/shared/src/money.ts`.
- Stok minus: izinkan + peringatan + catat di LESSONS jika pola sering (sinyal restock).
- Penyesuaian tanpa alasan ditolak RPC (audit).

## Golden tests (RPC)
- Pembelian mengubah rata-rata: 10 pcs @10.000 + 10 pcs @12.000 → rata 11.000;
  kirim 5 → HPP 55.000.
- Kirim 3 pcs (via complete_order) → movement KELUAR + HPP sesuai rata-rata saat itu.
- Batal setelah kirim → movement MASUK otomatis.
- Penyesuaian tanpa alasan ditolak; saldo konsisten = SUM(movements).

## DoD
Alur beli→kirim→saldo & HPP benar di HP; warning stok min jalan; fixture hijau; RLS;
status diperbarui.

## Urutan build
W3 setelah M4. Dependensi: M2, M4 (T3/T8).
