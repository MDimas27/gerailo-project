# M4 — Order & Pembayaran

> Status implementasi 25 Nov 2026: **SUB-SLICE 1 + UX seller + fix COD di-production**;
> **SUB-SLICE 2 Midtrans per-seller RESCOPED/DITUNDA** (kode lama = arsip template
> billing). **SUB-SLICE 3 jurnal/HPP/stok KELUAR**: kode + pgTAP `0010`–`0013` hijau
> lokal (`Files=13, Tests=434`), belum di-commit/deploy/review founder #3. Baris di bawah adalah kontrak akhir
> modul; bagian "Status sub-slice 3" memuat batas yang benar-benar aktif.

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
- Data: order manual DRAFT + order_items WAJIB via RPC `create_manual_order` (harga
  manual boleh beda dari katalog HANYA di form ini); Smart Paste tetap via
  `confirm_draft_order`; aksi status/pembayaran/batal WAJIB via RPC:
  `record_payment` (T1/T4), `ship_order` (DIKIRIM: T2+T3+stok+kurir/resi opsional;
  COD T5/T6), `receive_order` (DIKIRIM lunas → SELESAI; tanpa uang baru),
  `set_shipping` (update resi), `cancel_order` (reversi). UPDATE langsung
  `orders`/`payments` di-REVOKE di DB.
- UI seller 25 Nov 2026 (UI-only): label humanis + 4 work lane + satu Next Best Action
  di `/orders` dan `/orders/:id`; badge pembayaran terpisah dari fulfillment; cohort
  konfirmasi/pembayaran/pengiriman tidak disatukan. Tidak ada perubahan schema, RPC,
  RLS, kalkulasi uang, atau transisi status; backend tetap authoritative. Detail dan
  regresi Fase A–D: `plans/W3-M4-ORDERS-PAYMENTS.md` §"Penyempurnaan UX seller".
- Aksi share (M8 — target, belum terpasang): "Lihat halaman pembeli", "Share WhatsApp"
  (wa.me + template terisi), "Salin link", "Rotasi/cabut link" — kontrak penuh di
  `docs/MODULES/M8-SMART-TRANSACTION-PAGE.md`.
- Laporan bayar buyer (M8 P1): daftar `payment_reports` DILAPORKAN di detail order →
  seller cek dana → `record_payment` (uang benar) + `resolve_payment_report`; laporan
  tidak pernah otomatis mengubah status. `due_date` (batas pelunasan DP) diisi di form
  order & tampil di halaman pembeli.

## Status sub-slice 3 (lokal, belum rilis)
- `confirm_order`, `mark_ready`, `set_shipping` tetap tanpa jurnal/stok.
- `ship_order` mengecek stok dulu; kurang = `STOK_TIDAK_CUKUP` tanpa jurnal/movement
  parsial. Lalu menulis T2/T5/T6 + T3 HPP + T7 opsional + `stock_movements` KELUAR
  unik per order/produk dalam satu transaksi.
- `receive_order` HANYA DIKIRIM + lunas; sisa > 0 ditolak, tanpa payment/jurnal baru.
- Auto-SELESAI saat pelunasan HANYA untuk COD; pelunasan transfer/QRIS saat `DIKIRIM`
  tetap `DIKIRIM` sampai `receive_order`.
- `cancel_order` DITOLAK di DIKIRIM/SELESAI/BATAL; jurnal order T1/T4/T7/T12 dibatalkan
  lewat `_reverse_journal` T11. `record_payment` menulis T1/T4/T12.
- `gagal_kirim` menutup `DIKIRIM→BATAL`: reversi T2/T3 (+T4/T5/T6/T7) dan MASUK
  pengembalian memakai snapshot `harga_beli` KELUAR asli; UMP T1 tidak direversi sampai
  refund/manual. Tombol UI: "Lapor gagal kirim".
- `products.hpp_rata_rata` diperbarui `record_stock_move` MASUK; jual KELUAR dari klien
  tetap ditolak (hanya `ship_order` yang boleh). Jurnal T8 belum otomatis dipost dari
  MASUK (akun lawan belum menjadi input RPC).
- `v_rekap_harian` tersedia untuk pendapatan/HPP/laba kotor/kas/piutang/UMP/beban.
- Bukti pembayaran masuk bucket privat `bukti-pembayaran` dengan prefix `business_id/`;
  detail order wajib menampilkan tautan/pratinjau lewat signed URL 10 menit (RLS owner),
  bukan `bukti_path` mentah.
- Label UI detail di produksi masih "Status belum memposting jurnal sampai sub-slice 3
  selesai." — di working tree sudah diganti menjadi "Jurnal otomatis aktif; kiriman gagal
  dibatalkan lewat reversi." dan akan ikut deploy bersama slice 3.
- Pembayaran buyer→seller = MANUAL/COD via rekening atau QRIS seller, lalu seller
  mencatat dengan `record_payment`; bukti opsional privat. Ini jalur aktif satu-satunya.
- Midtrans per-seller DITUNDA. Kode Snap/webhook lama tetap di repo sebagai arsip
  template untuk slice billing; tidak aktif, tidak memakai secret produksi, dan bukan
  blocker rilis. Redirect browser tidak pernah dijadikan bukti pembayaran.
- Platform TIDAK PERNAH memegang dana buyer. Midtrans/Xendit kelak hanya untuk tagihan
  langganan seller→Gerailo dengan merchant account Gerailo (KYC sekali saat slice billing).

## Strategi pembayaran (keputusan founder 25 Nov 2026)
- Buyer membayar langsung ke rekening/QRIS milik seller; seller mencatat penerimaan di
  aplikasi. Gerailo hanya mencatat, bukan menahan atau menyalurkan dana buyer.
- Slice 2 lama (Snap + webhook per order seller) diubah menjadi arsip template slice
  billing. Lima kondisi keras Midtrans dipertahankan sebagai referensi implementasi
  langganan, bukan untuk M4.
- KYC seller tidak relevan. KYC Gerailo baru dibutuhkan saat tagihan langganan dibangun.

## Status & aksi (perpindahan via aksi eksplisit)
DRAFT → DIKONFIRMASI → (DP diterima: T1) → [opsional: SIAP_DIKIRIM via `mark_ready` —
tanpa jurnal/stok] → DIKIRIM (T2+T3, stok keluar) → SELESAI (via `receive_order` bila
sudah lunas tanpa uang baru; otomatis saat COD T5/T6 lunas; pelunasan non-COD T4 tetap
DIKIRIM) · BATAL pra-kirim via `cancel_order` (jurnal T1/T4/T7/T12 direversi T11, tanpa
stok KELUAR) · BATAL setelah kirim via `gagal_kirim` (reversi T2/T3/T4/T5/T6/T7 + stok
MASUK; UMP T1 tetap). COD dengan DP = T6. Ongkir ditagih = pendapatan ongkir; ditanggung
penjual = T7.

## Aturan khusus
- Pembayaran melebihi sisa → RPC menolak dengan pesan (bukan silently).
- `cancel_order` hanya DRAFT–SIAP_DIKIRIM; di DIKIRIM/SELESAI/BATAL ditolak DB dan UI.
  Untuk DIKIRIM yang gagal, pakai `gagal_kirim` (bukan status/error path baru).
  Reversi T11 hanya untuk jurnal order yang sudah dibatalkan (rules/01 §4–6).
- Tanpa ORM: kontrak RPC = `docs/API-CONTRACTS.md` §B; perubahan RPC = migrasi baru
  + gen types + golden test.

## Golden tests (test RPC di Supabase lokal)
- `packages/supabase/tests/0010_m4_journal_core_test.sql`: invariant, trigger, RLS,
  `post_journal` internal, authenticated dilarang update/delete.
- `packages/supabase/tests/0011_m4_journal_integration_test.sql`: T1–T8/T12, T9/T10,
  T11, HPP rata-rata, stok KELUAR, `v_rekap_harian`, transisi ilegal, lintas tenant.
- `packages/supabase/tests/0012_m4_failed_shipment_test.sql`: gagal kirim prepaid/COD,
  round-trip jurnal non-UMP, stok MASUK, pelunasan tetap DIKIRIM, stok kurang, owner guard.
- `packages/supabase/tests/0013_m4_cod_only_completion_test.sql`: non-COD lunas tetap
  DIKIRIM + T4, COD lunas auto-SELESAI + T5.
- Seluruh fixture T1–T6 + batal sebelum/sesudah kirim (docs/ACCOUNTING-RULES.md §Fixture).
- Pembayaran ganda/berlebih ditolak; dua DP parsial → UMP akumulasi benar.
- DIKIRIM tanpa pembayaran → piutang penuh; pelunasan menutup.
- Status ilegal (SELESAI→DIKIRIM) ditolak; insert jurnal timpang langsung ke DB
  ditolak trigger (rules/01 §2).
- `set_shipping` mengubah kurir/resi TANPA menyentuh jurnal; nomor pesanan
  ORD-YYYYMMDD-### & share_token unik dari trigger (docs/UI-UX.md §8.3).
- `mark_ready` TANPA jurnal; `ship_order` dari SIAP_DIKIRIM jalan;
  `receive_order` 0009: lunas→SELESAI, SIAP_DIKIRIM/sisa>0/COD belum bayar/
  lintas tenant/dobel ditolak, `cancel_order` di DIKIRIM ditolak (pakai `gagal_kirim`);
  tanpa payment/jurnal baru. `add_payment_report` tidak pernah menulis
  payments/jurnal/orders.status.

## DoD
Alur chat→order→DP→kirim→lunas di HP dengan jurnal benar; rekap harian (M7 parsial)
cocok; semua fixture hijau; RLS; status diperbarui.

## Urutan build
W3 PERTAMA (sebelum M5/M6/M7). Dependensi: M1–M3. Prasyarat M5, M7, M8.
