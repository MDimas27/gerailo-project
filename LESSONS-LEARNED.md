# LESSONS-LEARNED.md — Memori Proyek Gerailo

> Aturan isi: lihat `skills/ecc-remember/SKILL.md`. Entri bernomor, fakta, ≤10 baris.
> Ide fitur = BACKLOG. Sesi berikutnya mulai dari file ini.

## Pelajaran

#1 · 19 Nov 2026 · arsitektur · Fixture golden ditulis SEBELUM implementasi (parser
& jurnal) mencegah 90% bug keuangan; skrip verifikasi blueprint menangkap 1 jurnal
tidak seimbang (piutang 155rb vs 140rb) sebelum masuk dokumen. · Tindakan: disiplin
test-first di rules/00 §5.

#2 · 19 Nov 2026 · parser · Format angka Indonesia bervariasi ("75.000", "75rb",
"75k", "150K") — normalisasi harus di langkah pertama pipeline, bukan saat matching. ·
Tindakan: fixture #3–#4 di M3.

#3 · 19 Nov 2026 · akuntansi · DP yang dianggap pendapatan adalah kesalahan klasik;
kunci: pengakuan HANYA di event DIKIRIM; DP = UMP (liabilitas). · Tindakan: template
T1–T6 di docs/ACCOUNTING-RULES.md.

#4 · 19 Nov 2026 · proses · KYC payment gateway bisa >1 minggu — non-teknis paling
lama; mulai hari ke-0 paralel dengan coding. · Tindakan: ENV-SETUP §1 + fallback
transfer manual terdokumentasi.

#5 · 19 Nov 2026 · proses · Sesi agent panjang menurunkan kualitas; satu modul per
sesi + /prep awal + /remember akhir menjaga konteks tetap tajam. · Tindakan: rules/00 §10.

#6 · 19 Nov 2026 · arsitektur · Founder memutuskan hosting di Cloudflare (infra, DNS &
domain sudah disetup di sana), bukan Vercel → ADR-9: Workers + secrets wrangler,
rollback per deployment, dump backup ke R2. (Akses DB saat itu direncanakan
Prisma+Hyperdrive — diganti hari yang sama, lihat #7.) · Tindakan: seluruh kit
diupdate; PoC deploy = task 2 hari pertama W1.

#7 · 19 Nov 2026 · arsitektur · Stack pindah dari Next.js ke React+Vite SPA + Hono
Worker (ADR-10) — alasan utama: akurasi agent CLI (data latih React terbesar, tanpa
RSC/use-client). TANPA ORM: supabase-js + RPC Postgres; uang BIGINT + invariant
trigger DB; AI hanya di Worker; service_role tidak pernah di browser; satu Worker
menyajikan `/api/*` + aset statis (tanpa CORS). · Tindakan: kit v2 ditulis ulang
(TECH-STACK, API-CONTRACTS baru; ARCHITECTURE/DATA-MODEL/modul/skills/plans diupdate);
Hyperdrive tidak diperlukan lagi.

#8 · 20 Nov 2026 · produk · Founder menaikkan Smart Transaction Page ke MVP → modul
M8 (ADR-11): halaman transaksi pembeli ber-token (tanpa login), share WhatsApp,
timeline 6 langkah TURUNAN dari status internal (TANPA enum baru), PDF P1 print CSS;
panduan UI/UX v1.0 diunggah founder → docs/UI-UX-PANDUAN-LENGKAP.md + docs/UI-UX.md
(§8 baru). · Tindakan: M8 spec + skill baru; DATA-MODEL (nomor/token/kurir,
store_profiles, bank_accounts, RPC publik), API-CONTRACTS §E, ARCHITECTURE ADR-11,
ROADMAP W4, rules/00 §13 diupdate; scope kini M1–M8; W3 jurnal + M8 W4.

#9 · 20 Nov 2026 · produk · Proposal "Buyer Order Tracking Page" ditinjau vs kit: inti
(buyer memantau status dari link yang di-update seller, tanpa link baru per status)
SUDAH ada di M8; delta yang ditambahkan: `payment_reports` (lapor bayar buyer → status
"Menunggu konfirmasi"; uang tetap hanya via record_payment), enum opsional SIAP_DIKIRIM
+ `mark_ready` (tanpa jurnal), `due_date` DP, template update WA per status, resi =
link tracking, salin rekening, badge tanpa login. · Tindakan: M8/UI-UX §8.3 (9 langkah)/
DATA-MODEL/API-CONTRACTS/M4/rules §13 diupdate; P2: pemesanan ulang + pembayaran online
di halaman.

#10 · 20 Nov 2026 · produk · Proposal "Digital Catalog & Product Showcase": master
katalog SUDAH ada (M2) tetapi katalog publik buyer BELUM → modul M9 (ADR-12), dua
fase: Fase 1 katalog publik /toko/:slug read-only + share WA + QR + "Pesan via
WhatsApp"→Smart Paste (tanpa tulis publik baru); Fase 2 form pemesanan → tabel
staging order_leads → convert_order_lead (tidak pernah membuat order langsung — pola
sama dengan payment_reports). Sinkronisasi katalog WA Business TIDAK di MVP. ·
Tindakan: M9 spec + skill; M2/DATA-MODEL/API-CONTRACTS §F/UI-UX §9/rules §14/ROADMAP/
PRODUCT/README diupdate; positioning = "WhatsApp-first Commerce & Business Management
Platform" (3 pilar).

#11 · 20 Nov 2026 · desain · Founder mengirim 10 layar Google Stitch (design/stitch/)
untuk alur inti + halaman pembeli M8 + katalog M9; audit: token identik dengan
UI-UX.md §2 (teal #0F766E, Inter, tabular-nums) → dijadikan SUMBER VISUAL frontend:
per modul backend/test dulu → wiring UI mengikuti design Stitch → polish token &
aturan kit. Divergensi diputuskan: nav baru dengan aksi tengah "Paste" (§3 diupdate),
angka stok di katalog DITOLAK (rules §14 menang), keranjang katalog = satu teks WA
multi-item via Smart Paste (bukan order publik), rating tanpa sumber data DITOLAK,
ikon tetap Lucide. · Tindakan: docs/STITCH-DESIGN.md + UI-UX §3/§10 + execute.md +
AGENTS/README diupdate; aset 10 layar + DESIGN.md di design/stitch/.

#12 · 21 Nov 2026 · tooling · Dua jebakan saat menutup W1a: (a) `git` lokal
menggantung pada semua perintah karena menunggu stdin shell agent — `git ... < nul`
langsung normal; (b) `supabase config push` mengirim seluruh config auth, dan free
tier menolak perubahan template email (`entitlement_required`) sehingga push harus
tanpa blok `auth.email.template.*`; (c) host `db.<ref>.supabase.co` hanya punya
AAAA (IPv6) dan runner GitHub IPv4-only → migrasi CI harus lewat session pooler
(`aws-0-ap-southeast-2.pooler.supabase.com:5432`, user `postgres.<ref>`).
Email staging jadi tautan masuk default (bukan
kode 6 digit), jadi UI auth wajib mendukung klik tautan; kode 6 digit baru aktif
setelah SMTP kustom/upgrade. · Tindakan: ENV-SETUP §4.1 ditambahkan, copy auth
diperbarui, smoke test cloud PASS (OTP → onboarding → beranda), status AGENTS
diperbarui.

#13 · 21 Nov 2026 · auth · Batas template free tier Supabase ternyata bisa
  dibuka dengan **SMTP kustom**, tanpa upgrade. Setelah `gerailo.com` verified di
  Resend, isi SMTP staging (`smtp.resend.com:465`, user `resend`, sender
  `noreply@gerailo.com`), lalu `config push` template `{{ .Token }}` berhasil.
  Kode 6 digit teruji end-to-end (kirim → verifikasi → onboarding → beranda);
  magic link tetap jadi fallback ke `/auth/callback`. · Tindakan: ENV-SETUP §4.1,
  copy auth jadi code-first, plan/AGENTS diperbarui.

#14 · 22 Nov 2026 · produk · W1b Tasks 6–10 selesai: migrasi 0002 (products,
  product_variants, product_aliases, stock_movements) + RPC `create_product`
  atomik + `record_stock_move` + trigger kuota paket (FREE 100/STARTER 500) + RLS
  deny-by-default + 24 pgTAP test hijau; UI produk (list + create/edit) mengikuti
  Stitch `produk_stok`; onboarding wizard 3 langkah (profil → produk pertama +
  stok awal via RPC → demo Smart Paste chat Siti hardcoded) selesai; ESLint +
  vitest + pgTAP hijau; commit per task. Deviasi sadar: `create_product` pakai
  RPC atomik (bukan N query klien) sesuai konvensi kit. · Tindakan: AGENTS.md
  M1/M2 `[x]`, LESSONS #14, commit per task.

#15 · 22 Nov 2026 · proses · Review W1b menutup: (a) Task 8 (UI produk) + Task 9
  (onboarding wizard) digabung 1 commit `8cff38d` karena file saling ketergantungan
  (hooks, schemas, routes dibuat bersama) — acceptable, dicatat di sini; (b) Task 10
  (deploy + verify) tidak menghasilkan commit — verifikasi manual bukan kode, wajar
  sebagai klarifikasi bukan deviasi. · Tindakan: AGENTS.md M1 jadi `[~] parsial`,
  backlog 3 item M1 ditambah, LESSONS #15, push 3 commit sekaligus agar CI jalan 1x.

## Backlog (ide yang datang, TIDAK dikerjakan di MVP)

- Buyer order portal multi-order per pembeli (P2 — satu link untuk banyak transaksi;
  MVP = satu halaman per order)
- Pemesanan ulang (reorder) dari halaman transaksi + pembayaran online di halaman
  (P2 — pembayaran online terikat gateway, ADR-6)
- Sinkronisasi katalog WhatsApp Business (bulan ke-3, evaluasi via Cloud API — ADR-12)
- Analitik kunjungan & konversi katalog (P2); domain toko sendiri (P2, PRO)
- Import CSV produk (W4 bila sisa waktu)
- Notifikasi WhatsApp otomatis ke buyer saat status berubah (bulan ke-3 via Cloud API
  resmi — sebelum itu: template "Bagikan update" manual)
- Demo video onboarding
- **Edit profil usaha** (ubah nama, jenis, metode_bayar) — M1 sisa
- **Edit pengaturan usaha** (paket, notifikasi, dsb) — M1 sisa
- **Persist consent PDP** (`pdpr_consent_at` kolom, label compliance — gabung migrasi
  berikutnya yg menyentuh schema, mis. edit pengaturan / M3)

## Status deploy production

- (belum ada — pertama di W4/release)

## PERLU SSoT v1.x

- Modul M8 Smart Transaction Page (ADR-11, 20 Nov 2026): scope MVP, arsitektur halaman
  publik ber-token, mapping status buyer — perlu masuk SSoT v1.1 (Bab 6 scope, Bab 9/10
  tabel & RPC baru, Bab 11 roadmap W4).
- Modul M9 Digital Catalog (ADR-12, 20 Nov 2026): dua fase, order_leads, kolom katalog
  M2, RPC publik katalog — masuk SSoT v1.1 (Bab 6, 9/10, 11).