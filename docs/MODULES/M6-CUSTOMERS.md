# M6 — Pelanggan (ringkas, tanpa CRM penuh)

## Tujuan & nilai
Pilih pelanggan lama dalam 2 ketukan saat buat order; histori belanja terbentuk otomatis;
tiga statistik ringkas: total belanja, tanggal terakhir, frekuensi. Segmentasi/kampanye
= fase ekspansi (SSoT Bab 6.2) — TIDAK di MVP.

## Entitas & relasi
`customers` (nama, telepon unique per usaha bentuk 628…, alamat ringkas, catatan) ←
`orders` (histori = query, bukan duplikasi). Pelanggan baru otomatis dari konfirmasi
Smart Paste.

## Halaman & data
- Routes: `/customers` (list + cari), `/customers/:id` (profil + histori order +
  3 statistik).
- Data via supabase-js (RLS): CRUD `customers` (insert via upsert dedup telepon);
  autocomplete = query ilike nama/telepon; histori = query `orders` by customer_id;
  statistik = SUM orders di klien dari data query (bukan angka terpisah).

## Alur user
Saat order manual: ketik nama/telepon → autocomplete → pilih atau buat baru →
alamat & catatan terisi. Di profil: daftar order mundur + statistik.

## Aturan khusus
- PDP: telepon/alamat fungsional untuk order; tidak untuk profil marketing; hak
  hapus/akses disediakan (link di profil); retensi pasca-berhenti 90 hari.
- Normalisasi nomor Indonesia (08… dan +62 8… → 628…) di helper satu file
  `packages/shared`; unique index telepon per usaha menjamin dedup di DB.
- "Pelanggan lama tidak belanja ≥60 hari" = query sederhana (jembatan ke AI Assistant
  bulan ke-3; BUKAN fitur MVP terpisah).

## Golden tests
- Nomor "+62 812-3456-7890" dan "081234567890" → dedup jadi satu (unique index bekerja).
- Statistik cocok dengan SUM orders.
- RLS: pelanggan usaha A tak terlihat usaha B.

## DoD
Autocomplete cepat; histori & statistik benar; dedup jalan; RLS; status diperbarui.

## Urutan build
W3 setelah M5. Dependensi: M1, M4.
