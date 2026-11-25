# STITCH-DESIGN.md — Sumber Visual Frontend (Google Stitch)

> Status: sumber visual resmi frontend (keputusan founder 20 Nov 2026 — LESSONS #11).
> Komposisi & tampilan layar mengikuti design Stitch di `design/stitch/`; token warna/
> font, bahasa UI, aksesibilitas, dan aturan kit tetap mengikuti `docs/UI-UX.md` §1–2
> dan `rules/`. Bila Stitch diam tentang sesuatu (layar belum didesain), lanjutkan
> dengan pola gaya Stitch + panduan `docs/UI-UX.md` §4.

## Apa ini

10 layar hasil Google Stitch (HTML Tailwind + screenshot PNG) untuk alur inti Gerailo,
dibuat dari design system kit sendiri: teal `#0F766E`, mint `#CCFBF1`, bg `#F7F8FA`,
teks `#17212B`/`#667085`, border `#E6E9ED`, status `#15803D/#D97706/#DC2626/#2563EB`,
font Inter dengan tabular-nums, radius 8–16px, tombol ≥48px, bottom nav 64px — token
identik dengan `docs/UI-UX.md` §2. Audit 20 Nov 2026: SESUAI, diadopsi sebagai acuan
visual frontend. Aset asli tersimpan di `design/stitch/<layar>/` (code.html + screen.png)
plus `design/stitch/ringkas_operasional_umkm/DESIGN.md` (design brief sumber).

## Workflow frontend (keputusan founder)

Per modul: backend/data/RPC + golden test hijau DULU → wiring UI mengikuti design
Stitch layar terkait (komposisi, komponen, microcopy) → polish: token `docs/UI-UX.md`
menang di atas Stitch, bahasa UI Indonesia sehari-hari, tanpa istilah teknis, angka
tabular via `money.ts`, target sentuh ≥44px. Layar tanpa design Stitch dibangun
dengan pola gaya Stitch. Tidak ada perubahan skema/tabel/RPC karena Stitch — Stitch
hanya menyentuh lapisan presentasi.

## Peta layar Stitch → modul kit

| Layar (design/stitch/) | Modul / layar kit | Catatan audit |
|---|---|---|
| beranda_operasional | Beranda (UI-UX §4) | CTA Smart Paste menonjol; "Perlu Ditangani"; aktivitas terkini |
| kelola_pesanan | Pesanan (§4 + §4.1) | 4 work lane seller; aksi berbeda per status; penanda DP/sisa; enum internal tidak ditampilkan |
| smart_paste_whatsapp | Smart Paste (§4 + M3) | Teks sumber dipertahankan; chip Cocok/Periksa; ongkir diminta konfirmasi — sesuai rules/02 |
| detail_order_pembayaran | Pembayaran & Pengiriman (§4 + M4) | Konfirmasi pembayaran + tagih via WA; histori |
| keuangan_sederhana | Keuangan (M7) | Saldo, uang masuk/keluar, tagihan pelanggan (UMP), ekspor PDF/CSV |
| catat_uang_keluar | Pengeluaran (P1) | Form singkat beban operasional |
| produk_stok | Produk & Stok (M2/M5) | Daftar + stok + status teks |
| pengaturan_usaha | Pengaturan + profil usaha (M1) | — |
| pelacakan_pesanan_pembeli | M8 halaman pembeli (§8) | Timeline subset sesuai status; masking PII (0813-****-9988); salin rekening; CTA WA |
| katalog_produk_publik | M9 Fase 1 katalog (§9) | Header toko, kategori chips, harga promo dicoret, share/salin link |

## Divergensi & keputusan (mengikat)

| Temuan di Stitch | Keputusan |
|---|---|
| Bottom nav: Beranda, Pesanan, aksi tengah "Paste" (teal menonjol), Produk, Keuangan | Ikuti Stitch — nav lama diganti; Pengaturan/Lainnya pindah ke ikon profil di header (UI-UX §3 diperbarui) |
| Filter chip status DB pada `kelola_pesanan`/`detail_order_pembayaran` | UI-only 25 Nov: 4 work lane (Pesanan Baru · Diproses · Siap Dikirim · Selesai); `DP_DITERIMA` jadi badge pembayaran, bukan langkah fulfillment; satu Next Best Action per order |
| Katalog menampilkan angka stok ("Ready Stock: 48 pcs", "Sisa 8") | TOLAK — rules/00 §14 menang: hanya chip status Tersedia/Menipis/Habis, tanpa angka |
| Keranjang ringan di katalog (bottom bar "0 Item dipilih" + "Pesan via WA") | BOLEH di Fase 1 sebagai keranjang lokal → SATU teks pesan WhatsApp multi-item → masuk via Smart Paste. Tetap TANPA tulis publik; Fase 2 tetap order_leads |
| Rating "4.9 (120+ terjual)" pada produk katalog | Rating TOLAK (tidak ada sumber data ulasan di kit). "terjual" boleh tampil saat agregat order tersedia (P2 analitik katalog) |
| Gradasi teal halus pada kartu hero (Beranda/Keuangan) | Boleh sebagai satu-satunya pengecualian aturan "tanpa gradasi" §2 — hanya kartu hero; sisanya flat |
| Ikon Material Symbols | Implement tetap Lucide (stack §2); bentuk/posisi ikut Stitch |
| Timeline buyer 5 langkah (subset) | Kit tetap 9 langkah §8.3 — Stitch hanya menampilkan langkah yang relevan dengan status saat ini; konsisten, bukan konflik |
| Logo mockup "Ringkas WhatsApp Business" | Placeholder nama produk; footer halaman publik tetap "diterbitkan melalui Gerailo" sampai keputusan merek final |

## Gap — layar belum didesain Stitch (tiru pola gaya Stitch)

Onboarding 3 langkah (M1) · form pesanan manual (M4) · pelanggan (M6) · laporan
lengkap laba rugi/arus kas/piutang (M7) · inbox order_leads + konversi (M9 Fase 2) ·
landing + harga + trial · layar katalog seller (share + QR + toggle katalog aktif) ·
lapor bukti bayar di halaman pembeli (M8 P1). Saat membuatnya: token §2, mobile-first
390px, kartu radius 14–16px dengan border #E6E9ED, chip status konsisten, CTA teal
≥48px, satu aksi utama per layar.
