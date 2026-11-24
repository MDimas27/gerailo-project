---
name: m8-transaction
description: >
  SOP membangun modul M8 Smart Transaction Page / Buyer Order Tracking (halaman
  transaksi pembeli ber-token: detail pesanan, instruksi bayar, status yang
  diperbarui seller, laporan bayar buyer, bukti/kuitansi; share WhatsApp; endpoint
  publik aman). Gunakan saat founder minta M8/halaman pembeli/tracking/invoice/share link.
---

# Skill: M8 — Smart Transaction Page (Buyer Order Tracking)

## Konteks wajib dibaca dulu
`AGENTS.md` → `docs/MODULES/M8-SMART-TRANSACTION-PAGE.md` → `docs/UI-UX.md` §8
(timeline 9 langkah + 3 kondisi) → `docs/API-CONTRACTS.md` §E → `docs/DATA-MODEL.md`
(nomor/token/trigger/RPC publik) → `rules/00` §13 → `rules/02` §7 (privacy).

## Urutan build (test-first)
1. Migrasi 0004: `store_profiles`, `bank_accounts`, `payment_reports` (+RLS); kolom
   `orders.nomor`, `share_token`, `kurir_nama`, `nomor_resi`, `due_date`; nilai enum
   `SIAP_DIKIRIM` (opsional, tanpa jurnal); trigger BEFORE INSERT (nomor
   ORD-YYYYMMDD-### per usaha + token `gen_random_bytes(16)`); RPC `get_public_order`
   (SECURITY DEFINER, hanya kolom aman + masking), `rotate_share_token`, `set_shipping`,
   `mark_ready`, `add_payment_report` (publik by token → DILAPORKAN),
    `resolve_payment_report`; `ship_order` + params kurir/resi + guard
    SIAP_DIKIRIM; `receive_order` (DIKIRIM lunas → SELESAI, tanpa payment/jurnal,
    guard owner). `supabase gen types` + commit types.
2. Test dulu (Supabase lokal, MERAH): nomor & token unik; token salah → 404; masking
   telepon/alamat; lintas usaha bocor = gagal; rotasi mematikan token lama;
   `add_payment_report` TIDAK menulis payments/jurnal/orders.status; `mark_ready`
    tanpa jurnal; `ship_order` dari SIAP_DIKIRIM jalan; `receive_order` lunas jalan,
    sisa > 0/COD belum bayar/SIAP_DIKIRIM/lintas usaha/dobel ditolak; cancel di
    DIKIRIM ditolak; SELESAI→DIKIRIM tetap ditolak.
3. Worker: `GET /api/public/order/:token` + (P1) `POST .../payment-report` —
   rate-limited, tanpa JWT, panggil RPC; respons hanya kolom publik; token tidak
   di-log penuh.
4. UI buyer `/t/:token`: header identitas toko, timeline 9 langkah (docs/UI-UX.md
   §8.3), 3 kondisi utama + panel DP (total/DP dibayar/sisa/jatuh tempo), tombol salin
   rekening, badge "aman · tanpa login"; (P1) form lapor pembayaran + resi = link
   tracking kurir; footer powered-by; exclude `/t/*` dari cache service worker.
5. UI seller `/orders/:id`: preview halaman, Share WhatsApp per status (3 template:
   dibuat/dikonfirmasi/dikirim), salin link, rotasi link, Tandai siap dikirim,
   konfirmasi laporan bayar (record_payment + resolve).
6. `pnpm build` + test hijau → deploy staging → verify manual HP: share link → buka
   di browser lain → status berubah di LINK YANG SAMA (min. 4 tahap) → lapor bayar →
   konfirmasi seller → kirim + resi → rotasi → link lama 404.

## Review check khusus M8
- Halaman buyer tanpa telepon/alamat penuh, tanpa HPP/harga beli, tanpa data usaha lain.
- "Terkonfirmasi" muncul HANYA setelah `record_payment` (test negatif hijau);
  `add_payment_report` hanya insert `payment_reports`.
- Token tidak pernah di-log penuh; endpoint publik rate-limited; SW tidak cache `/t/*`.
- Nomor & token dari trigger DB; `mark_ready`/`set_shipping` tanpa jurnal.
- Footer powered-by ada; identitas toko dari store_profiles (bukan hardcode).

## DoD ringkas
Status ter-update di link yang sama (≥4 tahap) di HP; lapor bayar → konfirmasi jalan;
security tests hijau; rotasi/404 jalan; status diperbarui (ecc-remember).

## Jangan lakukan
- Jangan buat akun buyer atau login ringan — token cukup untuk MVP.
- Jangan buat generator PDF terpisah (P1 = print CSS dari halaman yang sama).
- Jangan tambah nilai enum orders di luar `SIAP_DIKIRIM` yang sudah disepakati;
  jurnal tetap hanya pada event DIKIRIM/SELESAI/BATAL.
- Jangan izinkan halaman publik mengubah transaksi — satu-satunya tulis publik =
  lapor pembayaran (status DILAPORKAN, tidak pernah mengubah status).
