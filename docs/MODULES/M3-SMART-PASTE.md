# M3 — Smart Paste (fitur paling strategis)

## Tujuan & nilai
Pengguna menyalin/membagikan chat WhatsApp → draft pesanan terisi → tinggal periksa &
konfirmasi ≤60 detik. Target kualitas: **pemeriksa, bukan pengetik ulang**.
Akurasi final ≥90%; hit-rate parser pola ≥70% (format pilot).

## Entitas & relasi
Input teks → log `ai_usage_logs` (via RPC) → draft `orders`+`order_items` (status
DRAFT) + `customers` dedup, semuanya SATU transaksi via RPC `confirm_draft_order`
(setelah konfirmasi). Matching ke `products`; klien tidak mengirim harga/total.

## Halaman & API
- Routes: `/share` (target Web Share Target PWA), `/paste` (textarea + tombol tempel),
  `/paste/confirm` (tiap kolom menampilkan sumber & penanda).
- Worker (Hono): `POST /api/smart-paste` (parser pola + matching — TIDAK menyimpan);
  `POST /api/smart-paste/ai` (fallback AI — key & kuota di Worker, rules/02 §6);
  `GET /api/admin/parser-metrics` (JWT + allowlist `ADMIN_EMAILS`, tanpa `teks_asli`).
- Fixture parser: `apps/worker/tests/parser/`.

## Alur user
1. Tempel/share teks → hasil + badge akurasi (tinggi/sedang/rendah; field `confidence`).
2. Kolom menandai: dari katalog (hijau), tebakan/kosong (kuning, wajib diisi).
3. Pengguna mengoreksi/pilih dari katalog → total & sisa dihitung ulang di Worker
   (zod dari `packages/shared`) → konfirmasi.
4. Konfirmasi → RPC `confirm_draft_order` menyimpan customer + order DRAFT + items
   satu transaksi (harga dari katalog di server) → lanjut alur M4.
Pipeline & keamanan: `rules/02-parser-safety.md` (WAJIB dibaca sebelum coding).

## Aturan khusus
- Harga dari katalog atau kosong; perhitungan uang server-side dengan BIGINT.
- Fallback AI hanya jika parser pola gagal/keyakinan rendah; output JSON schema ketat;
  kuota per paket dihitung SERVER via RPC `claim_ai_quota` dengan JWT user + RLS
  (TANPA `service_role`); teks asli hanya disimpan bila ada consent PDP usaha.
- Matching: persis → alias → trigram ≥0,8; dua kandidat mirip → tampilkan pilihan.
- Fallback AI boleh memilih `product_id` dari katalog untuk typo yang gagal dicocokkan
  pola (mis. `sosisss` → Sosis). Bila semua item AI punya `product_id`, flag
  `PRODUK_TIDAK_DITEMUKAN` dihapus dan keyakinan dinaikkan menjadi `SEDANG` — bukan
  `TINGGI`, karena tetap butuh konfirmasi pengguna. Harga tetap dari katalog.
- Format angka Indonesia: "75.000", "75rb", "75k"; qty "3 pcs", "x3", "3x".

## Golden tests
1. Chat Siti lengkap (SSoT Lampiran A) → semua kolom benar, keyakinan tinggi.
2. Chat COD singkat ("COD 2 sosis 25rb") → produk cocok, COD terdeteksi.
3. Angka varian ("75rb", "75k", "75.000") → BIGINT sama.
4. Qty varian ("x3", "3 pcs", "3x").
5. Ongkir di baris terakhir.
6. Teks acak tanpa produk → keyakinan RENDAH, nol tebakan.
7. Produk luar katalog → kolom kosong + penanda, harga kosong.
8. Dua produk dalam satu pesan → 2 order_items.
9. AI fallback: matikan parser (unit test) → hasil benar + terlog + kuota terpakai.
10. Kuota habis → pesan jelas, parser pola tetap jalan, tidak ada crash.
11. Format pesan dari katalog (M9 Fase 1: produk/varian/qty terstruktur) → parse
    benar TANPA AI (fixture baru, MERAH dulu).
12. AI menyelesaikan typo (`sosisss`) → flag `PRODUK_TIDAK_DITEMUKAN` hilang,
    keyakinan `SEDANG`, harga dari katalog, total dihitung server.

## DoD
12 fixture lulus di CI; uji manual di HP dengan Web Share Target dari WhatsApp
(WebAPK + ikon 192/512 any + maskable); clipboard/iOS path; hit-rate & akurasi tampil
di admin internal; log aktif; RLS; status diperbarui.

## Status final & verifikasi (23 Nov 2026)
- **SELESAI `[x]`**. Parser pola, alias/fuzzy, AI fallback berkuota, konfirmasi RPC,
  admin parser, PWA share target, branding, dan UX `/paste` blank sudah hidup di staging.
- **Gate**: pgTAP 98, Vitest 57, lint 0 error / 1 warning lama, typecheck & build hijau,
  CI 4/4 (`quality`, `db-tests`, `db-migrate-staging`, `deploy-staging`).
- **Staging**: bundle `index-DraCKu0H.js`, manifest ikon any/maskable + splash +
  `share_target`; `Page.getInstallabilityErrors` `[]`.
- **UX**: `/paste` biasa dan `/tes-smart-paste` menghasilkan textarea kosong; teks dari
  share/clipboard tetap masuk lewat navigation state, bukan `sessionStorage`.
- **Android**: WebAPK staging `org.chromium.webapk.a31e5d83e0e7d8c17_v2` terpasang lewat
  Chrome 157 ⋮ → "Install and create shortcut" → Install; CDP `standalone: true`.
- **Rincian lengkap**: `plans/W2-M3-SMART-PASTE.md` §Laporan penutup dan
  `LESSONS-LEARNED.md` #28–#34.

## Urutan build
W2 (utama). Dependensi: M1, M2. Prasyarat M4.
