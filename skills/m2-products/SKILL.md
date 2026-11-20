---
name: m2-products
description: >
  SOP membangun modul M2 Master Produk & Harga (CRUD supabase-js + RLS, varian,
  alias untuk parser, stok awal via RPC record_stock_move). Gunakan saat founder
  minta mengerjakan M2/katalog/produk.
---

# Skill: M2 — Master Produk

## Konteks wajib dibaca dulu
`AGENTS.md` → `docs/MODULES/M2-PRODUCTS.md` → `docs/DATA-MODEL.md` (products,
product_variants, stock_movements) → `docs/TECH-STACK.md` §Trade-off (BIGINT=string).

## Urutan build (test-first)
1. Migrasi: `products, product_variants` (unique index alias per usaha, index
   trigram cari) + `stock_movements` + RLS + policy + fungsi DB kuota paket
   (FREE 100 / STARTER 500). `supabase gen types` + commit types.
2. Test dulu: alias duplikat ditolak; harga BIGINT >0; produk ke-101 FREE ditolak;
   stok awal via RPC `record_stock_move` MASUK (alasan "stok awal") menulis movement.
3. Implement UI (shadcn + TanStack Query): `/products` list + cari instan (ilike/
   trigram), `/products/new`, edit; soft-delete `aktif=false`; varian.
4. Tampilan harga via `packages/shared/src/money.ts` (BIGINT → string → format).
5. `pnpm build` + test hijau → deploy staging → verify manual di HP.

## Review check khusus M2
- Tidak ada kolom `stok` yang diedit langsung (semua lewat movements/RPC).
- Tidak ada `Number()` langsung ke kolom uang di komponen — hanya money.ts.
- Delete = soft; order lama tetap menampilkan nama produk.
- Alias unik per usaha; siap dipakai matching M3 (persis → alias → fuzzy).

## DoD ringkas
CRUD + varian + stok awal + cari instan jalan di HP; RLS negatif hijau; test hijau;
status diperbarui (ecc-remember).

## Catatan integrasi
- M3 akan cocokkan `alias` — sertakan contoh alias realistis di seed demo
  ("Daster Jumbo" → alias "daster jmb", "DJ motif").
- Import CSV = W4 jika sisa waktu; jangan dikerjakan sekarang (scope freeze).
