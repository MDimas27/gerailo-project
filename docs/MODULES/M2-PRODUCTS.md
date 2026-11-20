# M2 — Master Produk & Harga

## Tujuan & nilai
Katalog = dasar Smart Paste (matching) dan stok. Pengguna bisa mengelola produk
cepat, termasuk varian teks sederhana dan alias nama untuk parser. Sejak M9 (ADR-12),
produk juga membawa data katalog publik: foto, deskripsi, kategori, harga promo, dan
tanda "tampil di katalog" — tetap satu master data.

## Entitas & relasi
`products` (nama, alias[], harga_jual BIGINT, stok_min, aktif; + M9: foto_paths
text[] max 3 via Storage, deskripsi_singkat, kategori, harga_promo BIGINT?,
tampil_katalog default false) → `product_variants` (nama varian, selisih_harga
BIGINT). Stok awal via RPC `record_stock_move` MASUK + alasan "stok awal" (bukan
kolom stok langsung — jejak jelas).

## Halaman & data
- Routes: `/products` (list + cari instan), `/products/new`, `/products/:id/edit`.
- Data via supabase-js langsung (RLS aktif): CRUD `products`/`product_variants`
  (soft-delete = UPDATE `aktif=false`); stok awal = `supabase.rpc('record_stock_move',
  { p_type: 'MASUK', p_reason: 'stok awal', ... })`; cari instan = query ilike/trigram
  (index di migrasi).
- Kuota paket (FREE 100 / STARTER 500) = fungsi DB yang menolak insert kelebihan
  (bukan hanya cek di UI).

## Alur user
Tambah produk (nama, harga, stok awal opsional, alias opsional) → daftar terurut
relevansi → cari instan (nama/alias) → edit/arsipkan (soft-delete; histori order lama
tetap menampilkan nama).
Untuk katalog (M9): kelola foto (max 3, dikompres sisi klien), deskripsi singkat,
kategori, harga promo, dan centang "Tampil di katalog" per produk.

## Aturan khusus
- Harga BIGINT rupiah; `>0` untuk produk aktif; BIGINT dari supabase-js = string →
  tampil via `money.ts` (TECH-STACK §Trade-off).
- Alias unik per usaha (unique index); dipakai M3 matching (rules/02 §1).
- Field katalog M9 (`tampil_katalog`, foto, deskripsi, kategori, harga_promo) = UPDATE
  langsung via RLS; katalog publik membaca HANYA via `get_public_catalog` (rules/00 §14).
- Import CSV sederhana boleh W4 jika sisa waktu; bukan prasyarat.

## Golden tests
- Alias duplikat ditolak; produk ke-101 paket FREE ditolak dengan pesan upgrade.
- Stok awal membentuk `stock_movements` MASUK; saldo stok = SUM(movements) benar.
- Soft-delete menyembunyikan dari list; query lintas business_id ditolak RLS.
- Produk `tampil_katalog=false` / `aktif=false` tidak pernah ada di respons
  `get_public_catalog`; foto ≤3 & terkompres sisi klien.

## DoD
CRUD + varian + stok awal + cari instan (<100ms @100 produk) jalan di HP; test + RLS
negatif hijau; status diperbarui (ecc-remember).

## Urutan build
W1 (termasuk kolom katalog M9 — data foundation Fase 1). Dependensi: M1 (usaha ada).
Prasyarat M3, M5, M9 Fase 1.
