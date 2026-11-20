---
name: m5-stock
description: >
  SOP membangun modul M5 Stok Sederhana (RPC record_stock_move, saldo via view,
  HPP rata-rata bergerak di dalam RPC, warning stok minimum). AREA SUCI
  (terkait HPP/jurnal). Gunakan saat founder minta mengerjakan M5/stok/inventori.
---

# Skill: M5 — Stok

## Konteks wajib dibaca dulu
`AGENTS.md` → `rules/01-accounting-safety.md` §6–8 → `docs/MODULES/M5-STOCK.md` →
`docs/DATA-MODEL.md` §RPC (record_stock_move) → `docs/ACCOUNTING-RULES.md` (T3, T8).

## Urutan build (test-first)
1. Tulis test rata-rata bergerak dulu (RPC di Supabase lokal): 10@10.000 +
   10@12.000 → rata 11.000; kirim 5 → HPP 55.000 (MERAH).
2. Migrasi: RPC `record_stock_move` — MASUK+harga+bayar/utang → T8 + rata-rata
   baru (satu transaksi); PENYESUAIAN wajib alasan; KELUAR dari klien DITOLAK.
   View `v_stock_balance` (saldo = SUM movements). `supabase gen types`.
3. Implement form pembelian stok (produk, qty, harga beli, bayar/utang) via RPC.
4. Implement penyesuaian + riwayat per produk (audit) + view saldo.
5. Warning stok < stok_min di dashboard/list (mencolok, bukan blokir minus).
6. `pnpm build` + test hijau → deploy staging → verify manual: beli→kirim→saldo
   & HPP benar.

## Review check khusus M5
- Tidak ada jalur edit saldo langsung (grep diff UI/API/RPC).
- PENYESUAIAN tanpa alasan ditolak RPC; KELUAR hanya dari complete_order.
- Batal setelah kirim → movement MASUK otomatis (test T11 + stok).
- Pembulatan rata-rata integer terdokumentasi di `packages/shared/src/money.ts`.

## DoD ringkas
Alur beli→kirim→saldo/HPP benar di HP; warning jalan; fixture hijau; RLS;
status diperbarui (ecc-remember).
