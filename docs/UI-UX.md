# UI-UX.md — Design System & Spesifikasi Layar Gerailo

> Sumber: `docs/UI-UX-PANDUAN-LENGKAP.md` (Panduan UI/UX Produk v1.0, diunggah founder).
> File ini = versi kerja untuk agent saat membangun UI; jika ragu, panduan lengkap menang.
> §8 (Smart Transaction Page / halaman pembeli) = tambahan keputusan founder (ADR-11)
> yang BELUM ada di panduan v1.0.
> §9 (Digital Catalog / katalog publik toko, M9) = tambahan keputusan founder (ADR-12)
> yang BELUM ada di panduan v1.0.
> §10 (sumber visual frontend = Google Stitch) = keputusan founder 20 Nov 2026; peta
> layar, divergensi, dan gap: `docs/STITCH-DESIGN.md`.

## 1. Prinsip desain

> "Terlihat sederhana seperti aplikasi sehari-hari, bekerja sekuat sistem operasional bisnis."

- Modern, elegan, profesional — TIDAK terlihat seperti software akuntansi.
- Tanpa istilah teknis di UI utama (debit/kredit/jurnal/rekonsiliasi); mesin akuntansi
  bekerja di belakang layar.
- Satu tindakan utama jelas per layar; bahasa Indonesia sehari-hari; mobile-first.
- Omzet ≠ uang diterima ≠ laba — selalu dibedakan, jangan ditampilkan sebagai satu metrik.

## 2. Design system inti (implement: Tailwind + shadcn/ui)

| Peran | Nilai |
|---|---|
| Primary | Teal gelap `#0F766E` — tombol utama, tautan aktif, identitas |
| Primary soft | `#CCFBF1` — latar status/sorotan ringan |
| Background / Surface | `#F7F8FA` / `#FFFFFF` |
| Text primary / secondary | `#17212B` / `#667085` |
| Border | `#E6E9ED` |
| Success / Warning / Danger / Info | `#15803D` / `#D97706` / `#DC2626` / `#2563EB` |

- Warna status konsisten di seluruh app; jangan andalkan warna saja (sertakan label/ikon);
  tanpa gradasi mencolok, bayangan berat, efek kaca.
- Tipografi: Inter; judul halaman 24–28px semibold; isi 14–16px; label 12–13px; angka
  penting 24–32px; **angka tabular** untuk uang & stok (format via `money.ts`).
- Bentuk & jarak: grid 4/8px; radius kartu 12–16px, tombol 10–12px; tombol utama mobile
  ≥48px; area sentuh ≥44×44px; bayangan ringan hanya untuk elemen mengambang.
- Ikon: Lucide outline, konsisten, beri label di navigasi utama; emoji hanya di template
  pesan WhatsApp, bukan sebagai ikon sistem.
- Komponen reusable (via shadcn): button, input (text/number/currency/phone/search),
  select + autocomplete produk/pelanggan, status badge, card + metric card, bottom nav +
  sidebar, modal/bottom-sheet/confirmation, toast, tabs + filter chips, data table +
  list item, empty/error/skeleton, **timeline status pesanan**, payment summary,
  product selector, date range picker.

## 3. Navigasi

- Mobile: bottom nav 5 tujuan mengikuti design Stitch (keputusan founder 20 Nov 2026 —
  docs/STITCH-DESIGN.md) — **Beranda, Pesanan, aksi tengah "Paste" (teal menonjol),
  Produk, Keuangan**; Pengaturan/Lainnya via ikon profil di header; tombol
  "Tambah Pesanan" menonjol di Beranda & Pesanan.
- Desktop: sidebar kiri collapsible (Beranda, Pesanan, Produk & Stok, Pelanggan,
  Keuangan, Laporan, Pengaturan) + header halaman (judul, deskripsi singkat, filter, satu CTA).

## 4. Spesifikasi layar seller (ringkas — detail penuh: panduan lengkap §5)

| Layar | Aturan kunci |
|---|---|
| Onboarding | satu keputusan per langkah; indikator progres; "Lewati dulu" untuk opsional; empty state mengarahkan, bukan dashboard kosong |
| Beranda | omzet tercatat, pesanan masuk, menunggu pembayaran; daftar "Perlu ditangani"; periode & waktu pembaruan selalu tampil |
| Pesanan | cari nomor/nama/produk; filter status; timeline per pesanan; tindakan sesuai status (bukan semua sekaligus) |
| Smart Paste | textarea besar + "Baca pesanan"; penanda Cocok/Periksa/Belum ditemukan; total dihitung server; TIDAK final sebelum konfirmasi; teks sumber dipertahankan |
| Pesanan manual | pelanggan → produk (autocomplete + stok tersedia) → diskon/ongkir → metode bayar → tinjau → simpan; peringatan stok kurang dengan pilihan jelas |
| Pembayaran | bedakan total / sudah dibayar / sisa; **bukti transfer via WA ≠ terverifikasi otomatis — seller wajib konfirmasi penerimaan uang**; tombol konfirmasi tampilkan ringkasan nominal; histori audit |
| Pengiriman | penerima + alamat, catatan packing, kurir + resi; "Tandai dikirim" → konfirmasi + minta resi; **dikirim ≠ diterima** |
| Produk & stok | foto opsional, harga, stok, status teks (Tersedia/Menipis/Habis); detail: varian, HPP, riwayat pergerakan |
| Pelanggan | nama, telepon, jumlah transaksi, total, terakhir; tanpa pesan massal tanpa consent |
| Keuangan | bahasa awam: uang masuk/keluar, tagihan pelanggan/pemasok, saldo kas & bank; saldo app ≠ saldo rekening sampai direkonsiliasi |
| Laporan | penjualan, laba kotor, beban, laba bersih, arus kas, persediaan, piutang/utang; filter periode; tooltip istilah; label hanya "mengacu SAK EMKM" |
| AI Assistant (bulan ke-3) | jawaban menyebut periode & sumber angka; tidak mengarang; tautan ke data pendukung |

Microcopy: "Tambah transaksi" bukan "Create transaction"; "Simpan" bukan "Submit";
"Data belum lengkap" bukan "Invalid payload"; satu tombol utama per layar; notifikasi:
"Pesanan #ORD-1042 berhasil disimpan." / "Pembayaran Rp100.000 berhasil dicatat.
Sisa tagihan Rp140.000."

### 4.1 Alur kerja seller M4 (UI-only, 25 Nov 2026)

Seller tidak perlu memahami enum. Tiga konteks dipisah: **pembuatan order**
(`/orders/new`, hanya mencatat kesepakatan), **konfirmasi order** (periksa lalu
terima/tolak), dan **eksekusi order** (pembayaran → persiapan → pengiriman →
penerimaan). `/orders` dikelompokkan per pekerjaan: **Pesanan Baru**, **Diproses**,
**Siap Dikirim**, **Selesai**; BATAL masuk terminal "Selesai" dengan sublabel
"Dibatalkan".

Status pembayaran dan pemenuhan ditampilkan sebagai dua badge terpisah. Badge
pembayaran diturunkan dari `sudah_dibayar`/`sisa` (Belum bayar · DP diterima ·
Lunas); badge utama adalah tahap pekerjaan. `DP_DITERIMA` tidak dipakai sebagai
langkah pemenuhan. Satu **Next Best Action** tampil sebagai CTA utama; aksi legal
lainnya tetap tersedia sebagai secondary — "Batalkan" sengaja tetap terlihat di
DRAFT–SIAP_DIKIRIM untuk verifikasi smoke Fase A.

Tidak ada perubahan schema/RPC/RLS/business logic: semua CTA memanggil handler dan
RPC yang sudah ada; backend tetap authoritative. Keterbatasan yang masih ada:
prepaid belum lunas masih boleh dikirim (UI memberi peringatan, bukan memblokir
kirim), COD lunas di DIKIRIM tetap auto-SELESAI, halaman buyer/katalog belum ada.

## 5. Responsif & aksesibilitas

- Mobile satu kolom + bottom nav; sticky ringkasan total tanpa menutupi input; tabel
  kompleks → daftar kartu. Tablet dua kolom. Desktop sidebar + panel samping detail.
- WCAG 2.2 AA sebagai target; status tidak hanya via warna; label input terlihat;
  fokus keyboard jelas; target sentuh ≥44px.
- Masking data sensitif per peran; audit untuk perubahan transaksi/pembayaran/stok;
  ekspor data; consent PDP dijelaskan.

## 6. Metrik UX & uji (tetapkan target setelah baseline)

- Aktivasi: selesai setup; waktu ke produk pertama; waktu ke order pertama.
- Efisiensi: median paste→order tersimpan; edit manual per order; % hasil paste yang
  perlu koreksi.
- Retensi: aktif mingguan; order/usaha/minggu; retensi W4 & bulan ke-3.
- Kepercayaan data: koreksi pasca-simpan; selisih stok; penyesuaian jurnal manual.
- Prototipe 5 alur diuji ke 5–8 pemilik UMKM: setup+produk, paste→draft, DP→sisa bayar,
  proses→kirim, ringkasan penjualan/pengeluaran.

## 7. Prioritas desain MVP (panduan §10 + ADR-11)

- **P0**: onboarding, beranda, Smart Paste, konfirmasi draft, daftar+detail pesanan,
  produk/stok, catat pembayaran, **halaman transaksi pembeli (M8)**.
- **P1**: pengeluaran, ringkasan penjualan, pelanggan, **invoice/kuitansi PDF (print)**,
  **lapor bukti pembayaran + status "Menunggu konfirmasi"**, **resi = link tracking
  kurir**, **template update WhatsApp per status**, **katalog publik M9 Fase 1: share
  WA + QR + pesan via WA**.
- **P2**: laporan akuntansi lengkap, AI Assistant, multi-gudang/cabang,
  **buyer portal multi-order**, **pembayaran online di halaman transaksi**,
  **pemesanan ulang**, **katalog M9 Fase 2: form pemesanan → order_leads**, **harga
  grosir/promo lanjutan**, **analitik kunjungan katalog**.

## 8. SMART TRANSACTION PAGE — halaman transaksi pembeli (M8, ADR-11)

### 8.1 Konsep
Satu halaman transaksi digital per order, diterbitkan otomatis, dibagikan via WhatsApp
dengan URL ber-token (tanpa login buyer). TIGA tampilan memakai SATU nomor pesanan
konsisten; status halaman mengikuti progres order — buyer membuka link yang sama untuk
melihat pembaruan. Manfaat ganda: seller terlihat profesional & transaksi terstruktur;
buyer percaya (detail, rincian harga, instruksi bayar, bukti). Prioritas: **link +
status dinamis P0; lapor bukti/kuitansi PDF/resi-klik/template update P1** (buyer lebih
sering buka link di WhatsApp daripada mengunduh PDF); portal riwayat, pembayaran online,
pemesanan ulang P2.

### 8.2 Tiga tampilan (pemicu & isi wajib)

| Tampilan | Pemicu | Isi wajib |
|---|---|---|
| A. Order Confirmation | order disimpan | nomor pesanan, detail barang, alamat pengiriman (ter-masked), total, instruksi transfer, status "menunggu pembayaran" |
| B. Payment Receipt | seller konfirmasi pembayaran | nomor transaksi, nominal diterima, tanggal, metode, sisa tagihan jika DP, status |
| C. Order Completion / Shipping | barang dikirim & selesai | status pengiriman, kurir, resi, penerima (ter-masked), timeline transaksi, ringkasan produk |

### 8.3 Timeline buyer (9 langkah tampilan — TURUNAN dari status internal + laporan bayar)

1. **Pesanan dibuat** ← order tersimpan (DRAFT/DIKONFIRMASI)
2. **Menunggu pembayaran** ← belum ada payment terkonfirmasi (instruksi transfer tampil)
3. **Menunggu konfirmasi** ← (P1) buyer melaporkan pembayaran (`payment_reports`
   DILAPORKAN) — "seller sedang memeriksa"; hilang jika laporan ditolak
4. **Pembayaran dikonfirmasi** ← `record_payment` HANYA oleh seller (DP → panel sisa)
5. **Sedang diproses** ← sudah dibayar, barang disiapkan (DIKONFIRMASI/DP_DITERIMA)
6. **Siap dikirim** ← (opsional) `mark_ready` → SIAP_DIKIRIM (tanpa jurnal)
7. **Dalam pengiriman** ← DIKIRIM + kurir & resi (P1: resi = link tracking kurir)
8. **Terkirim · Selesai** ← SELESAI (seller menandai setelah penerimaan; dikirim ≠ diterima)
9. **Pesanan dibatalkan** ← BATAL · DP belum lunas → chip "Menunggu pelunasan" + sisa +
   jatuh tempo (`due_date`)
Status diperbarui di LINK YANG SAMA — buyer tidak pernah bisa mengubah status.

### 8.4 Layout halaman buyer (3 kondisi utama — satu layout, bagian yang berubah saja)

- **Header (tetap)**: logo + nama toko (`store_profiles`) + kontak resmi + badge
  "Halaman transaksi aman · Tidak perlu login".
- **Kondisi 1 — Menunggu pembayaran**: banner "Pesanan berhasil dibuat! Silakan periksa
  detail pesanan dan lakukan pembayaran." → kartu nomor pesanan (ORD-YYYYMMDD-###) +
  chip status "Menunggu pembayaran" → detail produk (nama, qty × harga, jumlah) →
  rincian pembayaran (subtotal, ongkir, total) → informasi pembayaran (bank, nomor
  rekening, atas nama, total transfer — dari `bank_accounts` aktif) + tombol "Salin
  nomor rekening" → kotak keamanan
  "Pastikan nama penerima rekening sesuai dengan informasi toko sebelum melakukan
  transfer." → CTA "Konfirmasi via WhatsApp" (wa.me seller, teks berisi nomor pesanan) →
  footer "Halaman transaksi diterbitkan melalui Gerailo." (nama final menunggu keputusan merek).
- **Kondisi 2 — Pembayaran terkonfirmasi**: kartu bukti (nomor transaksi, nominal
  diterima, tanggal, metode) + panel DP jika ada (total tagihan, DP dibayar, sisa,
  jatuh tempo `due_date` — chip "Menunggu pelunasan") + timeline berjalan + CTA hubungi
  toko; (P1) status "Menunggu konfirmasi" = kartu laporan buyer sedang diperiksa seller
  + form "Laporkan pembayaran".
- **Kondisi 3 — Pesanan dikirim**: kartu pengiriman (kurir, resi — (P1) resi = link
  tracking kurir, penerima ter-masked) + timeline lengkap + ringkasan produk + CTA
  konfirmasi diterima via WhatsApp.
- Semua kondisi: timeline di atas; identitas toko konsisten; TANPA HPP/harga beli/
  telepon-alamat penuh.

### 8.5 Sisi seller (di `/orders/:id` — M4)

> Kontrak M8 di bawah masih target roadmap dan belum terpasang. Implementasi M4
> sekarang memakai **Next Best Action** di `apps/web/src/routes/orders-detail.tsx`:
> konfirmasi / catat pembayaran (DP, pelunasan, COD) / siap dikirim / kirim + resi /
> terima-selesai; "Batalkan" tetap secondary pra-kirim; riwayat pembayaran dan bukti
> privat tetap terlihat. Tidak ada tombol yang hanya dekoratif.

- Tindakan (target M8): **"Lihat halaman pembeli"** (preview), **"Share WhatsApp"** (wa.me +
  template per status), **"Bagikan update"** (bayar dikonfirmasi / dikirim + resi),
  **"Tandai siap dikirim"** (RPC `mark_ready`), **"Konfirmasi laporan bayar"**
  (`record_payment` + `resolve_payment_report`), **"Salin link"**, **"Rotasi/cabut
  link"** (RPC `rotate_share_token`), (P1) **"Download PDF"** (print CSS dari halaman
  yang sama).
- Template pesan otomatis (dinamis): DIBUAT — "Halo Kak Siti 👋 Terima kasih sudah
  melakukan pemesanan di toko kami. Berikut detail pesanan dan informasi
  pembayarannya: {link} Silakan periksa kembali detail produk dan total pembayaran
  melalui link tersebut. Terima kasih 😊" · DIKONFIRMASI — "Pembayaran untuk pesanan
  {nomor} sudah kami terima. Pesanan Kakak sedang kami proses, pantau statusnya di
  sini: {link}" · DIKIRIM — "Pesanan {nomor} sudah dikirim via {kurir}. Nomor resi:
  {resi} — lacak di sini: {link}"
- Setelah Share → WhatsApp terbuka dengan pesan + link terisi; seller tinggal pilih
  penerima & kirim. Satu CTA utama per status pesanan.

### 8.6 Keamanan & privasi halaman publik (WAJIB — rules/00 §13)

- Akses via token acak ≥128-bit (`gen_random_bytes`), BUKAN nomor order — URL tidak
  bisa ditebak; tanpa akun buyer.
- Rotasi token → link lama mati; seller bisa mencabut akses kapan pun.
- Masking: telepon → `+62 81••••7890`; alamat hanya kota/kecamatan + nama depan penerima.
- Status "Pembayaran terverifikasi" HANYA setelah seller konfirmasi (bukan dari
  unggahan buyer).
- Satu-satunya jalur TULIS publik = lapor pembayaran (P1) → `payment_reports` status
  DILAPORKAN; orang dengan link TIDAK bisa mengubah status/transaksi (test negatif).
- TANPA HPP/harga beli/data usaha lain; rate limit endpoint publik; service worker
  TIDAK menyimpan cache `/t/*`.
- Footer powered-by konstan (saluran distribusi organik — PRODUCT §Unit ekonomi).
- PDF (P1): `window.print` + CSS cetak dari halaman yang sama — satu sumber data,
  tanpa generator PDF terpisah.

## 9. DIGITAL CATALOG — katalog publik toko (M9, ADR-12)

### 9.1 Konsep
Satu halaman showcase per toko `/toko/:slug` (tanpa login buyer), dibagikan via
WhatsApp (link + QR). Bukan marketplace: pilar pertama dari tiga pilar produk —
**Digital Catalog (M9) → Order & Transaction (M4/M8) → Business Management (M2–M7)**,
semua dari satu sumber data. Seller WA biasa maupun WA Business bisa memakainya;
katalog WA Business tetap boleh dipakai berdampingan tanpa sinkronisasi.
Prioritas: **data foundation P0 di M2; Fase 1 (katalog + share + QR + pesan via WA)
P1 W4 bila sisa waktu; Fase 2 (form pemesanan → order_leads) P1 bulan ke-2**.

### 9.2 Layout halaman katalog buyer
- **Header toko (tetap)**: logo + nama toko + deskripsi singkat + kontak resmi;
  slug salah / katalog dimatikan seller → 404.
- **Grid produk (2 kolom mobile, 3–4 desktop)**: foto (lazy load), nama, jumlah
  varian, harga (`harga_promo` → harga lama dicoret), chip ketersediaan **TANPA angka
  stok**: Tersedia / Menipis (≤ stok_min) / Habis (saldo 0) — dari saldo M5; produk
  tanpa data stok → tanpa chip.
- **Tombol per produk**: "Pesan via WhatsApp" → wa.me seller + teks terstruktur
  ("Halo {toko}, saya mau pesan dari katalog: • {produk} ({varian}) ×{qty} · {link}")
  → seller terima di WA → Smart Paste → order. Fase 2: tombol "Pesan sekarang" membuka
  form (nama, nomor WA, alamat, catatan) → `order_leads` (BARU, menunggu seller).
- **Footer**: "Katalog diterbitkan melalui Gerailo." + CTA hubungi toko via WhatsApp.

### 9.3 Sisi seller
- Di `/products` (M2): toggle **"Tampil di katalog"** per produk, kelola foto (max 3,
  kompres sisi klien), deskripsi singkat, kategori, harga promo; produk nonaktif
  otomatis tidak tampil.
- Layar katalog seller: preview halaman, **Share WhatsApp**, **Salin link**, **QR
  code** (unduh PNG), toggle **"Katalog aktif"** (mematikan halaman publik = 404).
- Fase 2: inbox **order_leads** (BARU/DIKONVERSI/DITOLAK) → tombol **"Buat order"** →
  draft order terisi otomatis (customer dedup by telepon) → konfirmasi di M4 → kirim
  link transaksi M8.

### 9.4 Keamanan & privasi katalog publik (WAJIB — rules/00 §14)
- Hanya produk `aktif=true AND tampil_katalog=true` yang pernah muncul; TANPA
  HPP/harga beli, stok_min, alias internal, atau angka stok.
- `order_leads` = tabel staging: publik TIDAK pernah membuat order langsung; konversi
  hanya oleh seller (`convert_order_lead`); rate limit ketat + honeypot + batas item.
- Foto tanpa metadata pribadi; data katalog tanpa cache service worker; endpoint
  publik rate-limited.

## 10. Sumber visual frontend — Google Stitch (design/stitch)

Komposisi dan tampilan layar frontend MENGIKUTI design Google Stitch di
`design/stitch/` — 10 layar: beranda, kelola pesanan, smart paste, detail order &
pembayaran, keuangan, catat uang keluar, produk/stok, pengaturan usaha, halaman
pembeli M8, dan katalog publik M9. Peta layar → modul, keputusan divergensi yang
sudah mengikat (nav tengah "Paste", angka stok katalog ditolak, keranjang katalog =
teks WA multi-item, rating ditolak, ikon tetap Lucide), dan daftar layar yang belum
didengarkan Stitch ada di `docs/STITCH-DESIGN.md`.

Workflow per modul (keputusan founder): backend/data/RPC + golden test hijau dulu →
wiring UI mengikuti design Stitch → polish: token §2 tetap menang di atas Stitch,
bahasa UI Indonesia, tanpa istilah teknis, angka tabular via `money.ts`. Layar yang
belum ada di Stitch dibangun dengan pola gaya Stitch + panduan §4; tidak ada
perubahan skema/RPC yang dipicu Stitch (lapisan presentasi saja).
