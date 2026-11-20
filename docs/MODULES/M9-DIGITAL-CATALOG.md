# M9 — Digital Catalog & Product Showcase (katalog publik + pesanan dari katalog)

## Tujuan & nilai
Satu halaman katalog publik per toko `/toko/:slug` (tanpa login buyer): logo, nama toko,
deskripsi, grid produk (foto, varian, harga, status stok), tombol "Pesan via WhatsApp".
Katalog = pilar pertama produk: **Digital Catalog (M9) → Order & Transaction (M4/M8) →
Business Management (M2–M7)** — satu sumber data. Bukan marketplace; showcase ringan
yang mudah dibagi via WA, bekerja untuk seller WA biasa maupun WA Business (katalog WA
Business tetap boleh dipakai berdampingan — TANPA janji sinkronisasi dua arah).
**Prioritas: data foundation di M2 = P0 (W1); Fase 1 katalog publik + share + QR +
pesan via WA = P1 W4 (bila sisa waktu); Fase 2 form pemesanan (order_leads) = P1
bulan ke-2 pasca-launch.** (ADR-12, keputusan founder 20 Nov 2026.)

## Fase 1 — katalog publik read-only (W4 P1)
- Data foundation (M2, W1): `products` + `foto_paths` (text[], max 3, Storage),
  `deskripsi_singkat`, `kategori` (teks bebas), `harga_promo BIGINT?`, `tampil_katalog
  boolean` (default false — seller memilih produk mana yang tampil); `store_profiles` +
  `slug` (unik, dari nama_toko) + `katalog_aktif boolean`.
- Halaman buyer `/toko/:slug`: header toko (logo, nama, deskripsi, kontak resmi) →
  grid produk (foto, nama, jumlah varian, harga / harga promo dicoret, chip
  ketersediaan) → tombol "Pesan via WhatsApp" per produk (wa.me seller + teks
  TERSTRUKTUR: produk, varian, qty, sumber katalog) → teks masuk ke seller →
  **Smart Paste (M3)** → draft order. TANPA jalur tulis publik baru di Fase 1.
- Share: tombol "Share WhatsApp" + "Salin link" + QR code di layar katalog seller;
  kasus uji parser baru: "format pesan dari katalog" (fixture M3).
- Ketersediaan stok = STATUS SAJA (Tersedia / Menipis ≤ stok_min / Habis saldo 0) dari
  saldo M5 (MASUK−KELUAR) — TANPA angka stok di halaman publik.

## Fase 2 — form pemesanan publik (bulan ke-2, P1)
- Buyer pilih produk/varian/qty → isi nama, nomor WA, alamat → `POST
  /api/public/catalog/:slug/order-lead` (rate limit ketat) → RPC `add_order_lead` →
  tabel `order_leads` (id, business_id, slug, items jsonb, nama, telepon, alamat?,
  catatan?, status BARU/DIKONVERSI/DITOLAK).
- **`order_leads` TIDAK PERNAH otomatis menjadi orders** — pola staging yang sama
  dengan `payment_reports` (M8): tulis publik hanya ke tabel staging; seller melihat
  daftar lead di app → "Buat order" → RPC `convert_order_lead(p_lead_id)` — satu
  transaksi: dedup/buat customer by telepon + order DRAFT + order_items → seller
  konfirmasi di M4 → kirim link transaksi M8.
- Anti-spam: rate limit per IP+slug, batas item, honeypot; lead >7 hari tanpa aksi =
  DITOLAK otomatis (cron W4 atau saat dibaca).

## Aturan khusus (rules/00 §14)
- Katalog HANYA menampilkan produk `aktif=true AND tampil_katalog=true`; TANPA
  HPP/harga beli, stok_min, alias internal, atau data usaha lain.
- `katalog_aktif=false` atau slug salah → halaman mati (404) — seller bisa mencabut
  katalog kapan pun.
- Foto: Storage, kompresi + resize sisi klien sebelum upload, max 3/produk; TANPA
  metadata pribadi di foto.
- Sumber data utama = aplikasi (M2); katalog WA Business = kanal terpisah, TIDAK
  disinkronkan di MVP (Cloud API resmi bulan ke-3 — evaluasi, ADR-7/ADR-12).

## Golden tests
- Slug unik per usaha; slug salah / katalog_aktif=false → 404.
- Produk `tampil_katalog=false` / `aktif=false` / HPP / stok_min TIDAK pernah muncul
  di respons `get_public_catalog` (test negatif).
- Chip stok: saldo 0 → Habis; ≤ stok_min → Menipis; tanpa movement → tanpa chip.
- Fase 2: `add_order_lead` TIDAK pernah membuat orders/payments/jurnal (test negatif);
  `convert_order_lead` → customer dedup by telepon + order DRAFT + items benar, TANPA
  jurnal (jurnal baru hanya di event M4); rate limit lead aktif.
- Format pesan katalog diparse M3 dengan akurasi ≥ fixture (kasus uji baru).
- Halaman katalog buka <2s di 3G dengan 100 produk (lazy load foto); TANPA cache SW
  untuk data katalog, foto boleh cache.

## DoD
Fase 1: katalog publik tayang di HP, share WA + QR jalan, pesan via WA → Smart Paste →
order terkonfirmasi ujung-ke-ujung; test negatif privasi hijau. Fase 2: lead → konversi
→ order → link transaksi M8 tanpa mengetik ulang; anti-spam teruji; status diperbarui
(AGENTS.md + LESSONS-LEARNED).

## Urutan build
Fase 1: setelah M8 P0 selesai (W4, P1 bila sisa waktu) — dependensi: M2 (data
foundation, W1), M5 (saldo stok), M8 (pola halaman publik + Worker rate limit). Fase 2:
bulan ke-2 pasca-launch, setelah stabilisasi; tidak boleh menggeser tanggal launch
19 Des.
