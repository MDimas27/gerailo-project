---
name: m9-catalog
description: >
  SOP membangun modul M9 Digital Catalog & Product Showcase (katalog publik per toko
  /toko/:slug: grid produk, status stok, share WhatsApp + QR, pesan via WhatsApp →
  Smart Paste; Fase 2: form pemesanan → order_leads). Gunakan saat founder minta
  M9/katalog/toko online/showcase/form pemesanan.
---

# Skill: M9 — Digital Catalog & Product Showcase

## Konteks wajib dibaca dulu
`AGENTS.md` → `docs/MODULES/M9-DIGITAL-CATALOG.md` → `docs/UI-UX.md` §9 →
`docs/API-CONTRACTS.md` §F → `docs/DATA-MODEL.md` (products/store_profiles/order_leads)
→ `rules/00` §14 → `docs/MODULES/M2-PRODUCTS.md` (data foundation).

## Urutan build (test-first)
1. Migrasi 0005 (data foundation, boleh maju ke W1 bersama M2): kolom `products`
   `foto_paths text[]`, `deskripsi_singkat`, `kategori`, `harga_promo BIGINT?`,
   `tampil_katalog boolean default false`; `store_profiles` + `slug` (unique) +
   `katalog_aktif`; RLS tetap deny-by-default. `supabase gen types` + commit.
2. Test dulu (Supabase lokal, MERAH): slug unik; `get_public_catalog(p_slug)` hanya
   produk aktif+tampil_katalog, TANPA HPP/stok_min/alias; chip stok dari saldo
   movements; katalog_aktif=false → kosong/404.
3. Worker: `GET /api/public/catalog/:slug` — rate-limited, tanpa JWT, respons hanya
   kolom publik; (Fase 2) `POST /api/public/catalog/:slug/order-lead` — rate limit
   ketat + honeypot → RPC `add_order_lead`.
4. UI buyer `/toko/:slug`: header toko, grid produk (foto lazy, chip Tersedia/Menipis/
   Habis), tombol "Pesan via WhatsApp" (wa.me + teks terstruktur produk/varian/qty);
   Fase 2: form pemesanan (nama, WA, alamat, catatan).
5. UI seller: di `/products` — toggle "Tampil di katalog", kelola foto/deskripsi/
   kategori/harga promo; layar katalog seller — preview, Share WhatsApp, salin link,
   QR, toggle "Katalog aktif"; Fase 2: inbox `order_leads` + tombol "Buat order"
   (`convert_order_lead`).
6. Parser M3: tambah fixture "format pesan dari katalog" (MERAH dulu) → hijau.
7. `pnpm build` + test hijau → deploy staging → verify manual HP: buka katalog → pesan
   via WA → teks masuk → Smart Paste → order → (Fase 2) lead → buat order → link M8.

## Review check khusus M9
- Tidak ada HPP/harga beli/stok_min/alias internal di respons katalog (test negatif).
- `add_order_lead` TIDAK pernah menulis orders/payments/journal_*; konversi hanya via
  `convert_order_lead` oleh seller.
- Slug tidak di-log penuh; endpoint publik rate-limited; foto dikompres sisi klien.
- Katalog hanya produk aktif + tampil_katalog; katalog_aktif=false mematikan halaman.
- Share/QR + pesan via WA jalan tanpa login seller.

## DoD ringkas
Fase 1: katalog tayang + alur pesan-via-WA→Smart Paste→order di HP; Fase 2: lead→order
→link M8; test negatif hijau; status diperbarui (ecc-remember).

## Jangan lakukan
- Jangan buat marketplace/keranjang kompleks — showcase + pesan via WA cukup (Fase 1).
- Jangan pernah membuat order langsung dari publik — selalu lewat `order_leads` +
  konfirmasi seller (pola staging, rules/00 §14).
- Jangan menjanjikan sinkronisasi katalog WhatsApp Business (ADR-7; evaluasi bulan 3).
- Jangan menampilkan angka stok publik — hanya status Tersedia/Menipis/Habis.
