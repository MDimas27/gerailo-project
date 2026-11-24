---
name: m4-orders
description: >
  SOP membangun modul M4 Order & Pembayaran (status, DP, COD, pelunasan via RPC
  Postgres; jurnal otomatis T0–T12; reversi). AREA SUCI akuntansi: test-first
  wajib. Gunakan saat founder minta mengerjakan M4/order/pembayaran/jurnal.
---

# Skill: M4 — Order & Pembayaran

## Konteks wajib dibaca dulu
`AGENTS.md` → `rules/01-accounting-safety.md` (WAJIB) → `docs/ACCOUNTING-RULES.md`
(template T0–T12 + fixture Siti) → `docs/DATA-MODEL.md` §RPC & §Invariant →
`docs/API-CONTRACTS.md` §B → `docs/MODULES/M4-ORDERS-PAYMENTS.md`.

## Urutan build (GOLDEN TEST DULU)
1. Migrasi: `orders, order_items, payments, journal_entries, journal_lines`
   (+ index laporan) + REVOKE INSERT/UPDATE langsung pada orders/payments/journal_*
   dari anon/authenticated + constraint trigger DEFERRED debit=kredit +
   RPC `post_journal` (internal, REVOKE eksekusi dari klien) + RPC
   `record_payment`, `ship_order`, `cancel_order`. `supabase gen types`.
2. Tulis fixture golden accounting (test RPC di Supabase lokal): T1–T4 (Siti),
   T5 COD, T6 COD+DP, T7 ongkir penjual, T11 batal-kirim, T12 fee, T10 prive,
   insert jurnal timpang langsung ke DB DITOLAK trigger. Jalankan: MERAH.
3. Implement RPC: satu transaksi per aksi (header+lines+assertion); status mesin
   DRAFT→DIKONFIRMASI→DP_DITERIMA→DIKIRIM→SELESAI/BATAL; perpindahan ilegal ditolak.
4. UI (TanStack Query): `/orders` list per status, `/orders/:id` detail + riwayat
   pembayaran + tombol aksi (panggil RPC), `/orders/new` form manual (insert DRAFT
   via supabase-js; harga beda katalog HANYA di sini).
5. Validasi: pembayaran melebihi sisa ditolak; dua DP parsial → UMP akumulasi.
6. `pnpm build` + test hijau → deploy staging → verify manual di HP: alur Siti
   penuh + cek rekap harian cocok.

## Review check khusus M4
- TIDAK ADA tulis journal_*/orders status dari klien di luar RPC (grep diff + REVOKE
  teruji).
- Pengakuan pendapatan = DIKIRIM, bukan DP/bayar (test T1 tidak menghasilkan
  pendapatan).
- Uang BIGINT; parse/format hanya via money.ts.
- RLS: order usaha A tak terlihat usaha B (test negatif).

## DoD ringkas
Semua fixture T1–T12 hijau di CI; alur penuh Siti di HP; rekap harian cocok;
status diperbarui (ecc-remember).
