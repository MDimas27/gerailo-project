# M4 — Order & Pembayaran

## Tujuan & nilai
Order = objek sentral: status jelas, DP/COD/pelunasan tertangani benar, jurnal otomatis
per kejadian. Inilah yang membuat "chat" menjadi "transaksi".

## Entitas & relasi
`orders` (status enum, ongkir BIGINT, metode_bayar) → `order_items` → `payments`
(DP/PELUNASAN/COD) → `journal_entries` via RPC (`post_journal` internal,
template T0–T12 di `docs/ACCOUNTING-RULES.md`) + `stock_movements` saat DIKIRIM.

## Halaman & data
- Routes: `/orders` (list per status), `/orders/:id` (detail + riwayat pembayaran +
  tombol aksi), `/orders/new` (form manual; pilih pelanggan cepat — M6).
- Data: insert order DRAFT + order_items via supabase-js (RLS; harga manual boleh
  beda dari katalog HANYA di form ini); aksi status/pembayaran/batal WAJIB via RPC:
  `record_payment` (T1/T4), `complete_order` (DIKIRIM: T2+T3+stok+kurir/resi opsional;
  COD T5/T6), `set_shipping` (update resi), `cancel_order` (reversi). UPDATE langsung
  `orders`/`payments` di-REVOKE di DB.
- Aksi share (M8): "Lihat halaman pembeli", "Share WhatsApp" (wa.me + template terisi),
  "Salin link", "Rotasi/cabut link" — kontrak penuh di
  `docs/MODULES/M8-SMART-TRANSACTION-PAGE.md`.
- Laporan bayar buyer (M8 P1): daftar `payment_reports` DILAPORKAN di detail order →
  seller cek dana → `record_payment` (uang benar) + `resolve_payment_report`; laporan
  tidak pernah otomatis mengubah status. `due_date` (batas pelunasan DP) diisi di form
  order & tampil di halaman pembeli.

## Status & aksi (perpindahan via aksi eksplisit)
DRAFT → DIKONFIRMASI → (DP diterima: T1) → [opsional: SIAP_DIKIRIM via `mark_ready` —
tanpa jurnal/stok] → DIKIRIM (T2+T3, stok keluar) → SELESAI (lunas/COD: T4/T5/T6) ·
BATAL (reversi, stok kembali).
COD dengan DP = T6. Ongkir ditagih = pendapatan ongkir; ditanggung penjual = T7.

## Aturan khusus
- Pembayaran melebihi sisa → RPC menolak dengan pesan (bukan silently).
- Batal sebelum kirim = reversi pembayaran saja; setelah kirim = reversi T2+T3+stok
  (rules/01 §4–6).
- Tanpa ORM: kontrak RPC = `docs/API-CONTRACTS.md` §B; perubahan RPC = migrasi baru
  + gen types + golden test.

## Golden tests (test RPC di Supabase lokal)
- Seluruh fixture T1–T6 + batal sebelum/sesudah kirim (docs/ACCOUNTING-RULES.md §Fixture).
- Pembayaran ganda/berlebih ditolak; dua DP parsial → UMP akumulasi benar.
- DIKIRIM tanpa pembayaran → piutang penuh; pelunasan menutup.
- Status ilegal (SELESAI→DIKIRIM) ditolak; insert jurnal timpang langsung ke DB
  ditolak trigger (rules/01 §2).
- `set_shipping` mengubah kurir/resi TANPA menyentuh jurnal; nomor pesanan
  ORD-YYYYMMDD-### & share_token unik dari trigger (docs/UI-UX.md §8.3).
- `mark_ready` TANPA jurnal; `complete_order` dari SIAP_DIKIRIM jalan;
  `add_payment_report` tidak pernah menulis payments/jurnal/orders.status.

## DoD
Alur chat→order→DP→kirim→lunas di HP dengan jurnal benar; rekap harian (M7 parsial)
cocok; semua fixture hijau; RLS; status diperbarui.

## Urutan build
W3 PERTAMA (sebelum M5/M6/M7). Dependensi: M1–M3. Prasyarat M5, M7, M8.
