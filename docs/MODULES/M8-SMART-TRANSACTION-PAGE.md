# M8 — Smart Transaction Page (halaman transaksi & tracking pesanan pembeli)

Alias usulan founder: **Buyer Order Tracking Page** — fitur yang sama: satu halaman
ber-token untuk melihat DAN memantau pesanan.

## Tujuan & nilai
Setiap order menghasilkan halaman transaksi digital ber-token yang dibagikan via
WhatsApp: buyer mendapat pengalaman seperti marketplace (detail, rincian, instruksi
bayar, bukti, STATUS YANG SELALU DIPERBARUI), seller terlihat profesional tanpa kerja
ekstra. Seller memperbarui status dari aplikasi → halaman buyer di LINK YANG SAMA ikut
berubah (tanpa link baru per status). Halaman juga = saluran distribusi organik
("Diterbitkan melalui Gerailo" — setiap link dilihat buyer).
**Prioritas: link + status dinamis + update otomatis = P0; lapor bukti bayar, kuitansi
PDF, resi klik-tracking, template update WA = P1; portal riwayat, pembayaran online,
pemesanan ulang = P2 (backlog).**

## Entitas & relasi
`store_profiles` (identitas toko: nama tampil, logo, kontak) + `bank_accounts`
(rekening tampil di instruksi) ← `businesses`. `orders` tambah kolom: `nomor`
(ORD-YYYYMMDD-###, unik per usaha, dari trigger), `share_token` (hex 32, unik),
`kurir_nama`, `nomor_resi`, `due_date` (batas pelunasan DP, opsional, diisi seller).
Tabel `payment_reports` (P1) — laporan pembayaran dari buyer: id, order_id, jumlah
BIGINT, tanggal, catatan, url_bukti?, status (DILAPORKAN/KONFIRMASI/DITOLAK); insert
HANYA via RPC publik by token; TIDAK PERNAH menulis payments/jurnal/orders.status.
SATU nomor pesanan untuk semua tampilan (docs/UI-UX.md §8.2).

## Halaman & data
- Seller (di `/orders/:id`, milik M4): "Lihat halaman pembeli" (preview), "Share
  WhatsApp" (wa.me + template per status), "Bagikan update" (bayar dikonfirmasi /
  dikirim + resi), "Salin link", "Tandai siap dikirim" (RPC `mark_ready`),
  "Konfirmasi laporan bayar" (`record_payment` + `resolve_payment_report`),
  "Rotasi/cabut link" (`rotate_share_token`), (P1) PDF.
- Buyer: route publik SPA `/t/:token` (TANPA login, badge "aman") → fetch
  `GET /api/public/order/:token` (Worker, rate-limited) → RPC `get_public_order(p_token)`
  — SECURITY DEFINER, hanya kolom aman + masking; tombol "Salin nomor rekening";
  (P1) form "Laporkan pembayaran" → `POST /api/public/order/:token/payment-report` →
  RPC `add_payment_report` → status buyer "Menunggu konfirmasi". Service worker TIDAK
  cache `/t/*`.
- Identitas toko & rekening: wizard M1 langkah opsional + diubah di Pengaturan (W4).

## Alur user
Seller simpan/konfirmasi order → Share WA (link + template) → buyer buka link → lihat
detail + instruksi + status → seller memperbarui status dari app → buyer membuka LINK
YANG SAMA dan melihat timeline terbaru → (P1) buyer lapor pembayaran di halaman →
"Menunggu konfirmasi" → seller cek dana → `record_payment` + resolve → halaman
"Pembayaran dikonfirmasi" (+ sisa/jatuh tempo jika DP) → "Tandai siap dikirim" →
kirim (kurir + resi) → selesai (seller menandai; konfirmasi penerimaan via WA).

## Mapping status buyer (TURUNAN dari status internal + laporan; SATU nilai enum
opsional SIAP_DIKIRIM ditambahkan — TANPA jurnal/stok, mesin jurnal tetap beku)

| Internal | Tampil buyer | Pemicu |
|---|---|---|
| DRAFT/DIKONFIRMASI, tanpa payment | 1 Pesanan dibuat + 2 Menunggu pembayaran | insert order |
| (P1) ada payment_reports DILAPORKAN | Menunggu konfirmasi — seller memeriksa | `add_payment_report` |
| DP_DITERIMA / lunas | 3 Pembayaran dikonfirmasi; DP → panel sisa + jatuh tempo ("Menunggu pelunasan") | `record_payment` |
| DIKONFIRMASI/DP_DITERIMA (sudah bayar) | Sedang diproses — barang disiapkan | — |
| SIAP_DIKIRIM | Siap dikirim — diserahkan ke kurir | `mark_ready` |
| DIKIRIM (+kurir/resi) | Dalam pengiriman — kurir & resi (P1: resi = link tracking) | `complete_order`/`set_shipping` |
| SELESAI | Terkirim · Pesanan selesai | kebijakan operasional |
| BATAL | Pesanan dibatalkan | `cancel_order` |

## Aturan khusus
- `nomor` & `share_token` dibuat trigger BEFORE INSERT pada `orders` (di DB, bukan app).
- Halaman buyer TIDAK PERNAH menampilkan telepon/alamat penuh, HPP/harga beli, data
  usaha lain (rules/00 §13).
- "Pembayaran terkonfirmasi/terverifikasi" HANYA setelah `record_payment`; laporan
  buyer = DILAPORKAN dan tidak pernah mengubah status transaksi; write transaksi dari
  link = DILARANG.
- `mark_ready` hanya dari DIKONFIRMASI/DP_DITERIMA → SIAP_DIKIRIM (tanpa jurnal/stok);
  `complete_order` menerima dari DIKONFIRMASI/DP_DITERIMA/SIAP_DIKIRIM.
- Rotasi token → link lama mati (404).
- Footer "Halaman transaksi diterbitkan melalui Gerailo." konstan (nama final menunggu
  keputusan merek).
- PDF/kuitansi (P1) = `window.print` + CSS cetak dari halaman yang sama — satu sumber data.
- (P1) resi = link tracking ke situs kurir — mapping URL di `packages/shared` (kurir.ts).

## Golden tests
- Dua order baru di hari yang sama → nomor berurutan unik; token unik & tidak berpola.
- Token salah / sudah dirotasi → 404; token usaha A tidak pernah menampilkan data usaha B.
- Kondisi 1: rekening aktif + total benar (BIGINT via money.ts); salin rekening jalan.
- DP tercatat → sisa + due_date tampil; label terkonfirmasi HANYA setelah `record_payment`
  (test negatif: `add_payment_report` TIDAK pernah menulis payments/jurnal/orders.status).
- Laporan ditolak → "Menunggu konfirmasi" hilang; dikonfirmasi → tampil terkonfirmasi.
- `mark_ready` tanpa jurnal (jumlah journal_entries tetap); SELESAI→DIKIRIM tetap ditolak.
- DIKIRIM dengan kurir/resi → tampil + link tracking; masking telepon/alamat teruji.
- Halaman buyer buka <2s di 3G; tanpa cache SW `/t/*`.

## DoD
Alur penuh di HP: order → share WA → buyer buka link → status ikut berubah di link yang
sama (min. 4 tahap dites) → (P1) lapor bayar → konfirmasi seller → kirim + resi →
security tests hijau; 404/rotasi jalan; status AGENTS.md + LESSONS-LEARNED diperbarui.

## Urutan build
W4 PERTAMA (data order sudah siap dari M4). Dependensi: M4 (wajib), M1 (identitas toko
opsional). Tidak bergantung M5–M7. Urutan: P0 (link, share, status dinamis) → P1 (lapor
bukti, kuitansi, resi klik, template update) → P2 backlog (portal riwayat, pembayaran
online — terikat ADR-6, pemesanan ulang).
