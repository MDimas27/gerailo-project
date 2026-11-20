# PRODUCT.md — Kondensat SSoT untuk Agent

> Sumber asli: `docs/SSOT/Gerailo_Blueprint_SSoT_v1.0.docx` (Bab 1–7, 12–14).
> File ini adalah versi kerja. Bila ragu, SSoT menang.

## Masalah & solusi

Penjual UMKM mencatat order WhatsApp secara manual → order tercecer, stok tidak
akurat, laporan tidak bisa dipercaya. Gerailo mengambil teks chat, mengubahnya jadi
draft order (Smart Paste), lalu memutar setiap transaksi menjadi stok, pembayaran,
jurnal double-entry, dan laporan. Tagline: **dari chat menjadi transaksi, dari
transaksi menjadi laporan**.

## ICP & beachhead

ICP: penjual dengan pesanan WhatsApp harian berulang, stok barang fisik, transfer/COD,
kewalahan mencatat manual. Beachhead pilot: produsen makanan/frozen food + reseller
fashion di Bekasi–Cikarang. Bukan target: pedagang sesekali tanpa stok.

## Positioning (jangan bergeser di UI/copy)

- WhatsApp-first Commerce & Business Management Platform, bukan aplikasi akuntansi
  biasa — tiga pilar satu sumber data: **Digital Catalog (M9) → Order & Transaction
  (M4/M8) → Business Management (M2–M7)**.
- Lima prinsip produk: (1) tidak melawan kebiasaan WA; (2) konfirmasi, bukan menebak;
  (3) double-entry sejak hari pertama; (4) laporan yang bisa dipercaya; (5) tanpa
  scraping / integrasi WhatsApp tidak resmi.

## Scope MVP (beku) — 8 modul

M1 onboarding usaha · M2 master produk · M3 Smart Paste · M4 order & pembayaran ·
M5 stok sederhana · M6 pelanggan · M7 laporan & export · **M8 Smart Transaction Page**
(halaman transaksi pembeli ber-token via WhatsApp: order confirmation, bukti bayar,
status pengiriman — ADR-11; link P0, PDF P1) · **M9 Digital Catalog & Product
Showcase** (ADR-12): data foundation di M2 (P0), katalog publik /toko/:slug + share WA
+ QR + pesan via WA (Fase 1, W4-P1), form pemesanan → order_leads (Fase 2, bulan ke-2).
Kriteria selesai tiap modul: lihat `docs/MODULES/`.

## Di luar MVP (TOLAK sampai bulan ke-2+)

Neraca penuh + wizard saldo awal & CaLK (bulan 2) · multi-user (bulan 2) ·
paket BUSINESS (bulan 2) · AI Business Assistant (bulan 3) · WhatsApp Business
Cloud API resmi (bulan 3, berbayar) · buyer portal multi-order per pembeli, pemesanan
ulang & pembayaran online di halaman transaksi (P2) ·
sinkronisasi katalog WhatsApp Business (bulan ke-3, evaluasi via Cloud API — ADR-12) ·
analitik kunjungan & konversi katalog (P2) · domain toko sendiri (P2, PRO) ·
integrasi marketplace/kurir (ekspansi) ·
multi-cabang/multi-gudang (PRO, tanpa tanggal). Ide baru → backlog `LESSONS-LEARNED.md`.

## Metrik launch (target 30 hari pertama, diukur mingguan)

| Metrik | Target |
|---|---|
| Aktivasi (order pertama ≤24 jam) | ≥60% |
| Waktu ke order pertama | ≤10 menit (median) |
| Order pilot diproses via app (minggu ke-2 pilot) | ≥60% |
| Akurasi Smart Paste setelah konfirmasi | ≥90% |
| Retensi minggu ke-4 | ≥40% |
| Konversi trial 14 hari | ≥15% |
| Churn bulanan awal | ≤7% |
| Link transaksi dibagikan per order (minggu ke-2 pilot) | ≥60% |
| MRR akhir Jan 2027 | Rp1–2 juta (15–30 pelanggan) |

## Paket & trial (harga eksperimen, bukan final)

- FREE Rp0: 30 order/bln, 100 produk, Smart Paste pola, laporan kas.
- STARTER Rp49.000/bln (trial 14 hari, tanpa kartu): 500 order, AI 300x, stok +
  pelanggan, laba rugi & arus kas, export CSV/PDF.
- BUSINESS Rp99.000: rilis bulan ke-2 (butuh multi-user + neraca).
- PRO Rp199.000: DITUNDA sampai fiturnya nyata.
- Kuota AI = ekstraksi fallback berbayar per bulan; parser pola TIDAK dibatasi.

## Unit ekonomi (asumsi kasar — hitung ulang via kode sebelum harga final)

- Biaya tetap infra ≈ **Rp528.000/bln** (Supabase Pro US$25 + Workers berbayar US$5 +
  domain US$2 × kurs Rp16.500 — ASUMSI kurs; Sentry/PostHog free tier).
- Kontribusi per pelanggan STARTER ≈ **Rp46.700/bln** (harga 49.000 − MDR QRIS ±0,7%
  = 343 − LLM fallback ±2.000; MDR & pemakaian AI = ASUMSI, cek rate card gateway).
- **BEP ≈ 11–12 pelanggan STARTER** menutup biaya tetap.
- MRR target akhir Jan 2027 (15–30 pelanggan campuran) = Rp735rb–1,47jt — konsisten
  dengan target metrik di atas; margin kas lebih penting daripada MRR di 90 hari awal.
- Saluran distribusi organik (M8): setiap seller membagikan link transaksi ber-brand
  "Diterbitkan melalui Gerailo" ke buyer (potensi ±100rb tampilan/bln pada
  1.000 seller × 100 order/bln); buyer yang juga berjualan = calon seller baru —
  ukur konversi buyer→registrasi minggu ke-2 pilot.
