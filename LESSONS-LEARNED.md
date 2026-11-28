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

#16 · 22 Nov 2026 · ci · W1b CI **hijau sempurna** setelah fix lint/build errors:
  - Lint: `useEffect` unused dihapus, `businessTypes`/`paymentTypes` import type-only,
    `rows` numeric, `readOnly` camelCase, undefined checks di `businesses.data`.
  - Build: `tsc --noEmit` + `vite build` lolos (hanya warning chunk >500 kB).
  - Quality: ESLint + Vitest + pgTAP (24 tes) hijau.
  - DB: migrasi 0002 diterapkan staging via `db-migrate-staging` job.
  - Deploy: Cloudflare Workers SPA deploy berhasil.
  Semua 4 job CI (quality, db-tests, db-migrate-staging, deploy-staging) **sukses**.
  · Tindakan: AGENTS.md status diupdate, LESSONS #16, sesi W1b **resmi selesai**.
  Next: PREP M3 Smart Paste (parser pola + fallback AI + konfirmasi).

#17 · 22 Nov 2026 · m3 · M3 Smart Paste kode-complete: parser+AI via Worker, RPC `confirm_draft_order`/kuota, UI `/share`→`/paste`→`/paste/confirm`, `/admin/parser`; golden 11 + pgTAP 93 + Vitest 56 + lint/typecheck/build hijau, drift types & grep bundle bersih.
· Keputusan: tanpa `service_role`; kuota diklaim sebelum `complete()`; AI hanya memilih `product_id` kandidat; klien kirim BIGINT string, harga/total dari server; `/track/{token}` masuk backlog (bukan M3).
· Deploy: staging parser pola OK (`1aef692d`), lalu config NIM `8dca929a`; AI masih 503 `AI_NOT_CONFIGURED`, admin 401 tanpa JWT.
· Tindakan: LLM staging = NVIDIA NIM (`LLM_BASE_URL`/`LLM_MODEL` wrangler vars, `LLM_API_KEY` secret `nvapi-...`); jangan tandai `[x]` sebelum secret `LLM_API_KEY`/`ADMIN_EMAILS`, `VITE_WORKER_URL` GitHub Variable terisi dan verify HP Android/iOS lolos.

#18 · 22 Nov 2026 · onboarding · Form produk onboarding gagal dengan `expected array, received undefined` karena `productFormSchema` mewajibkan `variants` sementara form tidak mengirimnya; field stok `number` juga membuat `0` awal sulit diganti. · Tindakan: `variants.default([])` di schema bersama + stok sebagai string dengan placeholder `0`, pesan zod Inggris difallback ke bahasa Indonesia.

#19 · 22 Nov 2026 · ci · GitHub Variable `VITE_WORKER_URL` saja tidak cukup: job `deploy-staging` belum meneruskannya ke env build, sehingga bundle tidak memuat URL Worker. · Tindakan: tambahkan `VITE_WORKER_URL: ${{ vars.VITE_WORKER_URL }}` di `.github/workflows/ci.yml`; CI `45082835989` hijau, health OK, bundle terbukti memuat URL staging.

#20 · 22 Nov 2026 · ux · Label "Alias untuk Smart Paste" kurang dipahami founder/user saat onboarding. · Tindakan: ganti di onboarding & form produk jadi "Nama lain yang sering dipakai pembeli (opsional)" + contoh `daster jmb, DJ bunga`; teks bantuan menegaskan cukup yang paling sering muncul, tidak semua harus diisi.

#21 · 23 Nov 2026 · deploy · Semua endpoint Worker yang memakai Supabase balas 500 `SUPABASE_URL_BELUM_DISET` karena `SUPABASE_URL`/`SUPABASE_ANON_KEY` belum jadi wrangler secret; gejalanya tampak sebagai "Baca pesanan gagal" di HP. · Tindakan: daftarkan keduanya di staging via `wrangler secret put ... --env staging` dari GitHub Variables; parser pola langsung 200 dan UI menampilkan hasil deteksi. Jangan terkecoh `VITE_*` yang hanya untuk bundle web.

#22 · 23 Nov 2026 · deploy · Build lokal tanpa `VITE_*` menghasilkan bundle yang memanggil Supabase lokal `127.0.0.1:54321`; PWA service worker lalu menyimpan bundle itu, sehingga login staging gagal `ERR_CONNECTION_REFUSED` walau endpoint Supabase sehat. · Tindakan: selalu set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL` dari GitHub Variables sebelum build/deploy manual; setelah deploy, unregister SW + hapus cache Workbox di device bila ada bundle lama.

#23 · 23 Nov 2026 · smoke · Plan/kuota dan hasil order staging bisa diverifikasi tanpa service role: baca `businesses`, `ai_usage_logs`, `orders`, `order_items`, `customers` lewat Supabase REST dengan JWT user + anon key; RLS membatasi pada `business_id` sendiri. · Tindakan lanjutan: AI kini menghapus flag `PRODUK_TIDAK_DITEMUKAN` bila semua item punya `product_id` katalog dan membatasi akurasi UI ke `SEDANG` (golden #12), bukan ikut flag parser pola.

#24 · 23 Nov 2026 · model · Review founder: metode bayar order tidak boleh radio tunggal karena pembeli bisa membayar dengan lebih dari satu cara. · Tindakan: migrasi 0004 mengubah `orders.metode_bayar` jadi `text[]` unik 1–4 nilai, RPC `confirm_draft_order` menerima array, UI konfirmasi pakai checkbox; `businesses.metode_bayar` sengaja tetap tunggal sebagai metode utama onboarding.

#25 · 23 Nov 2026 · UI · Label badge hasil deteksi "Keyakinan" dianggap ambigu oleh founder; field internal `confidence` tetap, tetapi badge cukup dibaca "Akurasi". · Tindakan: ganti label di `apps/web/src/routes/paste.tsx` dan sebutan alur user di `docs/MODULES/M3-SMART-PASTE.md`, lalu rebuild/deploy staging.

#26 · 23 Nov 2026 · admin · Ekspektasi test `/admin/parser` tidak terpenuhi oleh UI lama: metrik Parser/AI/Koreksi hanya jadi satu baris teks dan `model` tidak dirender, padahal API sudah mengirim `terbaru[].model`. · Tindakan: enam kartu metrik ditampilkan eksplisit dan baris AI menampilkan model; verifikasi langsung dengan JWT admin: 200, total 12 (parser 8, AI 4, koreksi 1, token 595), 4 baris AI semua `nvidia/nemotron-3-ultra-550b-a55b` dengan token 169/142/142/142; tanpa token 401 `AUTH_REQUIRED`. Service worker lama perlu di-unregister sebelum bundle baru tampil.

#27 · 23 Nov 2026 · smoke · Alur AI → konfirmasi → simpan terverifikasi di device: dropdown produk berisi UUID katalog (bukan teks bebas), qty 2, ongkir 15000, DP 50000, subtotal 150000, total 165000, sisa 115000; nomor tampil ternormalisasi `6281299998888` dari `0812-9999-8888`. · Order `9b9a5140-eb0e-4e13-a5ca-d65d260fb3c9` DRAFT, `harga_satuan=75000` dari katalog via RPC; diverifikasi lewat Supabase REST + JWT (RLS), bukan service role.

#28 · 23 Nov 2026 · closing · M3 ditandai `[x]`. Manifest PWA awal tanpa `icons` membuat Chrome menolak install ("This app cannot be installed"); tambahkan `icon-192.png`/`icon-512.png` + deklarasi `vite.config.ts`, lalu WebAPK `org.chromium.webapk.ac1862ef08b021335_v2` berhasil di-install dan `ShareActivity`-nya menerima SEND intent → `/share?text=...` → order `f65b34da-0d89-4125-ad03-122134c8bdfc`. Jalur clipboard → `/share` → AI → konfirmasi menghasilkan `9a0d6661-1b1e-4a63-bde5-7239a58500a5`; Safari/iOS fisik tidak tersedia, dicatat sebagai catatan founder.

#29 · 23 Nov 2026 · brand · Founder menyerahkan aset final di `design/stitch/logo _splash_screen_icon_favicon/`. · Tindakan: source 200×200 (favicon & PWA) dan 1200×1024 (splash) di-generated ke `favicon.png` 64, `favicon-32.png`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-192/512.png` (padding 10% di background `#F7F8FA`), `icons/apple-touch-icon.png` 180, dan `branding/splash.png`; manifest memisahkan purpose `any` vs `maskable`, `index.html` memuat favicon/apple touch/startup image, workbox precache 13 entri tanpa duplikat. Gate hijau: lint 0 error (1 warning lama), typecheck, Vitest 57, build.

#30 · 23 Nov 2026 · UX · Founder melaporkan /paste selalu terisi teks lama "Halo kak, pesan 2 sosiss". · Akar: `SharePage` menyimpan teks ke `sessionStorage` lalu `PastePage` membacanya terus-menerus, jadi bukan konsumsi sekali jalan. · Tindakan: hapus jalur `sessionStorage` untuk teks; `SharePage` mengirim teks via `navigate("/paste", { state: { teks } })`, `PastePage` menginisialisasi dari `location.state` atau `?teks=` (test route) dan langsung kosong untuk bukaan biasa. Kunci lama tetap dibersihkan oleh `hapusDraftSmartPaste`. Catatan install: Chrome Android tidak menampilkan popup otomatis; install lewat menu ⋮ → "Install app"/"Add to Home screen", iOS lewat Share → "Add to Home Screen".

#31 · 23 Nov 2026 · device · Cek langsung via USB/CDP: tab Gerailo masih membuka `/paste?teks=Halo%20kak...`, jadi teks lama berasal dari query param route tes `/tes-smart-paste`, BUKAN sessionStorage. `sessionStorage` sudah kosong dan bundle baru aktif. `Page.getInstallabilityErrors` mengembalikan `[]` (manifest + SW valid), jadi PWA installable; Chrome 157 Android tidak memunculkan popup otomatis. · Tindakan: `/tes-smart-paste` kini redirect ke `/paste` tanpa query, dukungan `?teks=` dihapus dari `PastePage`; bukaan normal pasti blank, share/clipboard tetap mengisi via navigation state.

#32 · 23 Nov 2026 · verifikasi · Commit `e6b7f38`, CI `45217644347` hijau 4/4, staging bundle `index-DraCKu0H.js`. Di device USB, setelah SW di-update dan hard reload, `/paste` dan `/tes-smart-paste` keduanya mendarat di `/paste` dengan textarea `""`; `Page.getInstallabilityErrors` tetap `[]`. Catatan: SW lama menyajikan bundle lama sampai `registration.update()` + reload, jadi verifikasi UI harus hard reload setelah deploy.

#33 · 23 Nov 2026 · install · Founder tidak melihat menu install di Chrome. Menu ternyata di ⋮ kanan atas browser, bukan di halaman web; label Chrome 157 adalah "Install and create shortcut", bukan selalu "Install app". Setelah uninstall WebAPK lama `org.chromium.webapk.a3555e66445317b31_v2` (authority `gerailo.com`) dan force-stop/restart Chrome, menu muncul. Pilih Install → konfirmasi "Gerailo / gerailo-staging..." → WebAPK baru `org.chromium.webapk.a31e5d83e0e7d8c17_v2` terpasang; CDP target `standalone: true`, SW aktif.

#34 · 23 Nov 2026 · closing · Laporan penutup final disinkronkan ke `plans/W2-M3-SMART-PASTE.md` (status SELESAI, 12 task [x]) dan `docs/MODULES/M3-SMART-PASTE.md` (Status final & verifikasi). Gate akhir: pgTAP 98, Vitest 57, lint 0 error / 1 warning lama, typecheck + build hijau, CI 4/4 hijau pada seluruh run closing. Staging bundle `index-DraCKu0H.js`; `/paste` blank; WebAPK staging `a31e5d83e0e7d8c17_v2` standalone. Backlog tetap M8, sisa M1, KYC, PWA hardening.

#35 · 24 Nov 2026 · arsitektur · Gate PLAN M4 1–1–1: Midtrans Snap server-side + webhook SHA512 memakai `MIDTRANS_SIGNATURE_SECRET_KEY` (terpisah dari Server Key sejak 28 Okt 2026; Server Key hanya untuk API), transfer/COD manual tetap didukung, `payment_events` gateway-agnostic. Eksekusi dipecah 3 sub-slice dengan gate CI + review founder. · Exception scoped: `SUPABASE_SERVICE_ROLE_KEY` HANYA di Worker webhook, hanya RPC allowlist `log_payment_event`/`apply_payment_event`, bukan query bebas, bundle web di-assert bebas secret. Tindakan: exception ini TIDAK otomatis dipakai milestone berikutnya; butuh approval gate baru. · HPP = rata-rata bergerak, jurnal immutable via reversing entry, semua BIGINT.

#36 · 24 Nov 2026 · M4 · `/orders/new` tidak boleh INSERT langsung ke `orders`/`order_items`: 0003 sudah REVOKE dari `authenticated`. Tambah RPC `create_manual_order` (0006) dengan `harga_satuan` hanya dari form manual; `confirm_draft_order` tetap harga katalog server. · Tindakan: penomoran slice 2/3 migrasi bergeser ke 0007/0008–0009; jangan pakai cast `Number()` untuk argumen BIGINT, pakai `toRpcAmount` + cast tipe supabase-js.

#37 · 24 Nov 2026 · arsitektur · Satu core posting `_post_payment` (0005) dipakai `record_payment` (manual) DAN wajib dipakai `apply_payment_event` (webhook Midtrans). Ini mencegah dua aturan status/jurnal saat slice 3. · Tindakan: webhook hanya menulis `payment_events` raw → verifikasi → idempotency → panggil core yang sama; jangan pernah membuat jalur posting kedua di Worker.

#38 · 24 Nov 2026 · M4 · Raw webhook Midtrans wajib tetap append-only: `log_payment_event(...,'UNVERIFIED')` terjadi paling awal, hasil verifikasi ditulis terpisah di `payment_event_verifications` (0008), lalu `apply_payment_event` memakai status verifikasi terakhir. · Tindakan: jangan UPDATE payload `payment_events`; urutan Worker `log → verify → mark → apply`; replay duplikat tetap 200; verifikasi sandbox belum possible tanpa kredensial/KYC — jika formula beda, stop & lapor.

#39 · 24 Nov 2026 · M4 · Smoke test founder: bukti transfer tersimpan, tetapi detail order hanya menampilkan `bukti_path` (terlihat seperti id) dan tidak bisa dibuka. Bucket `bukti-pembayaran` sengaja privat, jadi jangan pakai public URL / jangan simpan URL publik. · Tindakan: detail order wajib membuat signed URL 10 menit via `supabase.storage.from(...).createSignedUrl(...)` dengan RLS owner; tampilkan tautan "Lihat bukti" + thumbnail gambar; status saja tidak cukup untuk DoD smoke test.

#40 · 24 Nov 2026 · deploy · Service worker PWA bisa menyajikan bundle lama setelah deploy staging, sehingga UI verifikasi device tampak belum berubah walau HTML/JS server sudah baru. · Tindakan: cache-bust `?v=<stamp>` pada URL halaman TIDAK cukup karena SW tetap melayani asset lama; unregister SW / clear site data sebelum menilai UI, dan verifikasi hash bundle lewat HTML + cek string di asset (mis. HTML → `index-BB2ga9MK.js`, aset mengandung `receive_order` + "Tandai diterima"), jangan hanya percaya tampilan device.

#41 · 24 Nov 2026 · M4 · Nama RPC yang bohong mahal: `complete_order` ternyata hanya "kirim", menyesatkan founder saat smoke test. · Tindakan: rename ke `ship_order` (migrasi 0009, nama lama di-drop) sebelum production; transisi akhir `DIKIRIM→SELESAI` punya RPC eksplisit `receive_order`, wajib owner + lunas (sisa > 0 ditolak "MASIH ADA SISA — catat pelunasan dulu"), tanpa payment/jurnal baru; cancel diblokir di DIKIRIM oleh DB dan UI; M8 nanti memanggil RPC yang sama. Melengkapi #38/#39.

#42 · 25 Nov 2026 · M4 · Founder melihat array JSON error Zod sebagai teks merah saat lupa mengisi nominal pembayaran; pesan teknis seperti itu merusak kepercayaan UI. · Tindakan: jangan pernah render `error.message` mentah di halaman order; pakai `safeParse` + `fieldErrorsFrom()` untuk error per field dan `pesanAksi()` untuk menerjemahkan kode RPC/Postgrest ke instruksi perbaikan, dengan fallback generik. Golden test helper di `apps/web/src/lib/form-error.test.ts`.

#43 · 25 Nov → 26 Nov 2026 · M4 · Celah kiriman gagal DITUTUP: `cancel_order` tetap dikunci di `DIKIRIM`, tetapi `gagal_kirim(p_order_id)` (`0012_m4_failed_shipment.sql:136-207`) memindahkan `DIKIRIM→BATAL`, mereversi T2/T3/T4/T5/T6/T7 via `_reverse_journal`, dan membuat `stock_movements` MASUK pengembalian; pgTAP `0012` merah-dulu dengan round-trip, owner guard, stok kurang. · Tindakan: DP T1 sengaja tidak direversi — UMP `100000` tetap sebagai liabilitas sampai refund/manual; jangan klaim "net-zero semua akun non-kas" tanpa mengecualikan `2-2010`. UI tombol "Lapor gagal kirim" hanya muncul di `DIKIRIM`.

#44 · 25 Nov → 26 Nov 2026 · M4 · Auto-`SELESAI` DIPERKETAT: `_post_payment` `0005_m4_manual_payments.sql:200-202` dulu menyamakan "pembayaran dicatat saat `DIKIRIM`" dengan serah terima untuk semua metode. · Tindakan: `0013_m4_cod_only_completion.sql` sekarang meng-auto-SELESAI hanya bila `v_jenis='COD'`; pelunasan transfer/QRIS saat `DIKIRIM` tetap `DIKIRIM`, lalu seller/buyer memakai `receive_order`. `0011` diubah: Siti lunas tetap DIKIRIM sebelum `receive_order`; pgTAP `0013` merah-dulu.

#45 · 25 Nov 2026 · UX · Review founder: seller awam tidak boleh perlu tahu enum `DRAFT`/`DP_DITERIMA`/`SIAP_DIKIRIM`. · Keputusan: UI-only — 4 work lane, label humanis, badge pembayaran terpisah dari fulfillment, satu Next Best Action; `metode_bayar` hanya ditambahkan ke read model. · Tindakan: jangan pernah menambah status/error path atau "allowed actions" RPC hanya untuk kosmetik UI; semua CTA tetap memanggil RPC yang ada, backend authoritative. "Batalkan" sengaja tetap secondary pra-kirim agar smoke Fase A terbaca; jangan disembunyikan ke menu tersembunyi.

#46 · 25 Nov 2026 · testing · Port CDP 9222 di mesin ini ternyata milik Chrome headless Windows (`User-Agent HeadlessChrome`, tanpa `Android-Package`), sehingga Playwright "4 passed" tapi layar HP tidak berubah. · Tindakan: WAJIB verifikasi `curl /json/version` mengandung `Android-Package` sebelum smoke; bila 9222 dipakai, `adb forward tcp:9223 localabstract:chrome_devtools_remote` dan pakai `CDP_URL=http://127.0.0.1:9223`. Jangan percaya "CDP tersambung" tanpa memeriksa target/browser.

#47 · 25 Nov 2026 · M4 · Smoke COD menemukan `metode_bayar` Supabase berbentuk `text[]` (`["COD"]`), tetapi read model/UI membandingkannya dengan string `"COD"`, sehingga order COD di `DIKONFIRMASI` salah meminta bayar dan tidak bisa auto-selesai. · Tindakan: read model menerima `string | string[]`, deteksi COD lewat helper `adalahCod()` yang mengecek `includes("COD")`, lalu golden test array COD. Type Supabase jangan dianggap string hanya karena supabase-js mengembalikan BIGINT sebagai string. Deploy ulang staging CI `45598889915` bundle `index-DTeG_QNY.js`; CEK5/CEK6 PASS di `ORD-20261125-008` setelah SW/cache dibersihkan.

#48 · 25 Nov 2026 · strategi · Founder mengubah arah slice 2: **TIDAK ADA Midtrans per-seller**. Buyer→seller tetap manual (no. rekening/QRIS seller + `record_payment`); platform tidak pernah memegang dana buyer (risiko lisensi PJP). Snap/webhook lama RESCOPED/DITUNDA dan diarsipkan sebagai template slice billing langganan dengan merchant account Gerailo; KYC seller bukan blocker. · Tindakan: jangan aktifkan Midtrans per order seller tanpa keputusan baru; KYC Gerailo hanya saat tagihan langganan dibangun.

#49 · 25 Nov 2026 · deploy · Produksi dipromosikan dalam satu deploy membawa UX seller 4 lane, state SELESAI, dan fix COD: Worker `gerailo-production`, bundle `index-BRLaIdz4.js`, version `57a2c302-032a-4a37-bddf-44d9544b84cf`, health OK. Migrasi 0001–0009 ter-apply, auth redirect + OTP 6 production di-push, secret Worker hanya `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LLM_API_KEY`, `ADMIN_EMAILS`. Tidak ada `service_role`/`MIDTRANS_*` di produksi. · Tindakan: config auth template custom tidak bisa di-push ke free tier tanpa SMTP; template lokal tetap ada, redirect/OTP sudah benar.

#50 · 25 Nov 2026 · data · Cek constraint `orders.metode_bayar`: bukan satu nilai. Migrasi `0004_multi_metode_bayar.sql:9-12` menetapkan `text[]` dengan `cardinality(...) between 1 and 4` dan anggota `TRANSFER/COD/QRIS/LAINNYA`; UI form juga checkbox ganda. · Tindakan: multi-nilai memang disengaja sejak #24; jangan masuk daftar pembersihan. Bug #47 bukan constraint, melainkan read model yang mengira selalu string.

#51 · 25 Nov 2026 · jurnal · Slice 3 core + integrasi selesai test-first: pgTAP `0010_m4_journal_core_test.sql` + `0011_m4_journal_integration_test.sql` hijau (total `Files=11, Tests=377`), migrasi `0010_m4_journal_core.sql` + `0011_m4_journal_integration.sql`. Invariant debit=kredit dijaga assertion `post_journal` + constraint trigger DEFERRED; jurnal immutable/reversi T11; T1–T7/T9–T12 teruji; HPP rata-rata update via MASUK; KELUAR hanya `ship_order`. · Tindakan: keterbatasan T8 dicatat — template `_journal_event('T8')` ada, tetapi `record_stock_move` MASUK belum memposting jurnal pembelian (akun lawan belum dipilih); jangan klaim T8 otomatis. CI journal-write guard sudah ditambah; type drift sudah dicek, tapi belum commit/deploy/review founder #3.

#52 · 26 Nov 2026 · gate · Founder ACC arsitektur slice 3 + fixture Siti (`225000/240000/140000`, HPP `165000`, laba `75000`), lalu meminta dua gap ditutup sebelum commit: `gagal_kirim` (#43) dan auto-SELESAI COD-only (#44). · Tindakan: Gate #3 dijawab eksplisit — (a) stok kurang DIBLOK dengan `STOK_TIDAK_CUKUP` sebelum jurnal/movement (fixture lama 0005/0009 diberi stok 50); (b) T8 template manual, prefill dari movement MASUK terakhir + risiko ledger-vs-stok divergensi bila diedit/tidak dipost; (c) tombol "Bayar online"/Snap Dihapus dari detail order karena Midtrans per-seller ditunda; (d) T9 = template beban operasional manual internal. Urutan: fix → commit → push → CI 4/4 → deploy staging → HP founder; dilarang deploy lokal. Verifikasi lokal setelah fix: pgTAP `Files=13, Tests=434`, lint/typecheck/105 test/build (hash diperbarui setelah commit), Worker dry-run, type drift/secret/journal guards, `git diff --check` hijau.

#53 · 26 Nov 2026 · akuntansi · Founder menegaskan snapshot HPP retur: `gagal_kirim` wajib memakai `harga_beli` dari movement KELUAR saat pengiriman, BUKAN `products.hpp_rata_rata` saat gagal (pembelian di antaranya mengubah rata-rata). · Tindakan: `0012_m4_failed_shipment.sql` mengambil `keluar.harga_beli` via join `stock_movements`; pgTAP `0012` menambah 2 assertion (`snapshot = KELUAR`, `snapshot != moving average`) dengan skenario beli 10@80000 setelah kirim 1@50000; total 2 file baru = 55 test. Catat sebagai keputusan lifecycle di sini; jangan pakai rata-rata terkini untuk retur.

#54 · 26 Nov 2026 · gate · Founder ACC Gate #3. Bukti terkuat: RED probe guard, HPP snapshot + 2 assertion, CEK12 COD-only di HP, disiplin commit→CI→staging→HP, dan caveats jujur. UMP tertahan DISETUJUI sebagai liabilitas; refund dicatat manual saat terjadi. · Tindakan: promosi produksi hanya setelah satu batch UI/docs kecil lolos CI 4/4; backlog reminder `UMP tertahan Rp X — kembalikan & catat refund`.

#55 · 26 Nov 2026 · UX · Detail `DIKIRIM` non-COD dengan sisa > 0 lebih dulu mengirim `jenis: DP`, sehingga `record_payment` menolak `TRANSISI_TIDAK_VALID`; `STOK_TIDAK_CUKUP` juga tersamarkan jadi `Aksi gagal. Coba lagi.`. · Tindakan: `pembayaranEfektif()` mengunci `PELUNASAN` (COD → `COD`/`COD`) dari `nextAction()`; `pesanAksi()` mengembalikan teks stok apa adanya; keduanya golden-test.

#56 · 26 Nov 2026 · deploy · Provenance dua hash staging: CI `45351527629` (`84b0c8f`) deploy `index-BB2ga9MK.js`; CI `45352513863` (`1ab17af`, docs-only) deploy ulang bundle identik; CI `45519222493` (`2fa0c3a`) baru deploy `index-CxqO3nNU.js`. · Tindakan: beda hash quality job (`index-zbsBKyFy.js`) vs deploy-staging bukan anomali — env build berbeda; yang di HP adalah hash deploy-staging.

#57 · 26 Nov 2026 · verifikasi · Delta pgTAP `432 → 434` bukan regresi: angka 432 dicatat di tengah sesi sebelum 2 assertion snapshot HPP di `0012` (`plan 39 → 41`). 434 adalah angka kanonik. · Tindakan: jangan lagi mengutip 432 sebagai hasil akhir; gunakan 434 di laporan/AGENTS.

#58 · 26 Nov 2026 · bukti · Retest HP CEK10–CEK14 PASS 20/20 pada device `e8c955c3`, CDP 9223, bundle staging `index-BC-7Gz73.js`, SW/cache dibersihkan. · Tindakan: screenshot + `retest-results.json` disimpan di `docs/evidence/m4/`; `plans/W3-M4-ORDERS-PAYMENTS.md:263` diperbaiki dari `index-BrrhJJ05.js` ke hash yang benar.

#59 · 26 Nov 2026 · deploy · Batch pra-promosi di-commit `5bb15e3` (15 files, +848/−19), push `c3ea691..5bb15e3 main -> main`, CI `45788400727` hijau 4/4, staging bundle `index-Zbfd4X71.js`. · Tindakan: promosi produksi dilakukan setelah CI hijau: migrasi `0010`–`0013` di-apply ke Supabase produksi (`fqncaxjqyebrijjcdvjh`), Worker `gerailo-production` version `2dcaea96-f34b-4d88-aee7-d94fd3390e8e`, bundle `index-DgwjxP9i.js`, health OK. `.env` punya duplikat `VITE_*`: baris 13/14 produksi, baris 20/21 staging; build produksi harus memakai pasangan pertama + `VITE_WORKER_URL` produksi.

#60 · 26 Nov 2026 · smoke · Smoke produksi HP `e8c955c3` sukses pada `ORD-20261126-003`: onboarding dibuat, 3×Sosis @75000 + ongkir 15000, `PELUNASAN` 240000 MANUAL → DIKONFIRMASI/Lunas → SIAP_DIKIRIM → DIKIRIM (JNE JP0012345678) → `receive_order` → SELESAI/Lunas/Sisa 0. · Tindakan: verifikasi REST dengan JWT (RLS) menunjukkan T1 240/240, T2 240/240, T3 150/150, satu `stock_movements` KELUAR qty −3 dengan `harga_beli=50000`, stok akhir 17. Dua order uji cacat `ORD-20261126-001`/`002` dibatalkan.

#61 · 26 Nov 2026 · auth/device · OTP produksi awalnya gagal karena Chrome Android tidak bisa resolve host Supabase (`ERR_NAME_NOT_RESOLVED`) walau `adb shell ping` berhasil; permintaan di-proxy lewat CDP `Fetch` + Node `fetch` mengungkap email produksi memakai template default **Magic Link**, bukan kode 6 digit (free tier tidak bisa push template custom tanpa SMTP). · Tindakan: magic link dibuka di Chrome HP yang sama dan `/auth/callback` berhasil membuat sesi; gunakan tab existing dari `/json/list` karena `page.goto` langsung sering gagal. Playwright `connectOverCDP` sempat hang setelah target kosong; raw CDP `Runtime.evaluate` + proxy `Fetch` lebih stabil.

#62 · 26 Nov 2026 · remember · M4 ditutup: `AGENTS.md` M4 `[x]`, LESSONS #59–#61, laporan engineering, plan, dan modul M4 disinkronkan; docs commit `52b6181 Docs: tutup M4 produksi dan smoke HP` di-push `5bb15e3..52b6181 main -> main`, working tree bersih. Tidak ada deviasi SSoT baru: UMP-liabilitas sudah di #54, Midtrans per-seller ditunda di #48, template email produksi masuk backlog. · Tindakan: antrian sesi berikutnya M5 stok sederhana lalu M7 laporan/export; baca `docs/MODULES/M5-STOCK.md` + `M7-REPORTS.md`, `docs/DATA-MODEL.md`, `docs/ACCOUNTING-RULES.md`; prerequisite golden test stok/HPP dan RLS owner tetap hijau, jangan sentuh jurnal tanpa test. iOS fisik tetap catatan founder.

#63 · 26 Nov 2026 · closing/ADR-13 · M4 dinyatakan SELESAI — ACC dengan catatan reviewer. Promosi produksi dilakukan atas otorisasi founder berdasarkan Gate #3 + smoke HP `ORD-20261126-003` (3×Sosis @75000 + ongkir 15000, `PELUNASAN` 240000 MANUAL, T1/T2/T3 seimbang, stok akhir 17); tag `m4-production-v1` → commit `ecf798a` → Worker Version ID `2dcaea96-f34b-4d88-aee7-d94fd3390e8e` → bundle `index-DgwjxP9i.js`. · Pertanyaan transparansi lama (Gate #1, #37/#38, provenance `index-BB2ga9MK.js` → `index-CxqO3nNU.js`) DITUTUP sebagai technical debt yang diterima; kompensasi permanen = provenance hash + version ID per deploy (#56). · Utang yang dibawa: (1) `.env` duplikat `VITE_*` (split per env); (2) akun smoke `Dapur Bu Siti` tetap di produksi sebagai bukti & dikecualikan dari uji M7; (3) template OTP 6 produksi masih Magic Link default; (4) pembersihan nilai `metode_bayar` tunggal warisan (constraint `text[]` multi-nilai sudah benar sejak #24/#50). Antrean `M5 → M6 → M7` sudah tercatat di backlog/`docs/ROADMAP.md:18` (M6 di posisi antara M5 dan M7); rollback Worker via `wrangler versions rollback`, DB forward-only tanpa down-migration. Sesi lama beku; M5 TIDAK dimulai di sini.

#64 · 27 Nov 2026 · proses · Paket migrasi ECC 6 butir diterapkan: bagian PROSES WAJIB + gate ACC di `AGENTS.md`, slash command `.opencode/command/ecc-prep|plan|review|laporan.md`, `sop/HARD-RULES.md` (core posting `_post_payment`, larangan enum tanpa ADR, RED probe, snapshot HPP, pgTAP 434, provenance deploy), `sop/SWARM-DISCIPLINE.md`, golden matrix wajib di `plans/TEMPLATE-PLAN.md`, dan `docs/evidence/README.md` lanjutan format m4. · Fakta: penomoran LESSONS sudah mencapai #63 sebelum sesi ini, jadi entri baru mulai #64 (bukan #63). · Tindakan: sesi M5 dimulai dengan `/ecc-prep` + 5 pertanyaan gate, ACC dulu baru `/ecc-plan`; jalur migrasi/RPC/jurnal/RLS/uang tetap satu penulis serial.

#65 · 27 Nov 2026 · harness · Percobaan harness jcode: spawn git/MSYS dari tool butuh console nyata; `git.exe` menggantung bila tanpa console (berisiko `index.lock`); workaround `start "" /wait cmd /c "git ..."` berfungsi tetapi tidak memenuhi syarat ECC (output & exit code harus tertangkap mulus, otomatis, tanpa jendela console baru). · Tindakan: keputusan founder kembali ke OpenCode CLI untuk seluruh siklus ECC; catatan disimpan bila jcode dicoba lagi setelah bug spawn fix. Commit `a0d518e` tetap 1 di depan `origin/main` dan di-push dari terminal; tidak ada commit lain dari jcode; AGENTS kembali netral-harness.

#66 · 27 Nov 2026 · M5 · Stok sederhana selesai test-first: `0014_m5_stock_test.sql` plan(24) MERAH 4 gagal (7-8, 11, 13) sebelum migrasi `0014_m5_stock.sql`, lalu HIJAU; angka kanonik CI hijau `Files=14, Tests=458` (434 → 458). Guard baru menolak `PENYESUAIAN` negatif yang membuat saldo < 0 dengan `STOK_TIDAK_CUKUP: <nama> — tersedia X, butuh Y` (22023) tanpa mengubah signature lean. G6 retur: snapshot `harga_beli` KELUAR 11000 + pool HPP ter-update `14857` (`round(520000/35)`) + saldo `35`. K5: `MASUK` tanpa harga saat saldo 0 → HPP tetap 0, UI "HPP belum di-set". · Tindakan: CI `45931832498` 4/4, staging `index-UaU8g1fa.js`, smoke HP `e8c955c3` CEK1–CEK5b 8/8, evidence `docs/evidence/m5/`; promosi produksi M5 menunggu ACC.

#67 · 27 Nov 2026 · closing/produksi M5 · M5 SELESAI produksi: jalur CI produksi baru `production.yml` (workflow_dispatch, environment `production`) — run `45966741343` 4/4 (`quality` + `deploy-production`), migrasi `0014_m5_stock.sql` ter-apply. Worker `gerailo-production` Version ID `023a5055-2957-4e24-b104-f5fcbcb7813c`, bundle `index-DpG1p5iU.js`, health OK; tag `m5-production-v1` → commit `ffbc7c7`. Smoke produksi `e8c955c3` CEK1–CEK5b 8/8, termasuk CEK5 **satu order penuh via alur UI** (COD → konfirmasi → siap kirim → kirim) sampai KELUAR −5; evidence `docs/evidence/m5/production/`. · Pelajaran smoke: CEK5 staging via RPC cukup untuk backend, tetapi rilis final wajib alur UI karena hanya itu yang menguji selector/state React; produk `SMOKE M5 1624` + order `2f2e9f60-735e-4a5b-aabe-c4bbb629f13c` sengaja dipertahankan sebagai bukti dan dikecualikan dari uji M7. · Rollback: Worker ke `2dcaea96-f34b-4d88-aee7-d94fd3390e8e` (M4) aman karena `0014` additive-only (CREATE OR REPLACE signature sama, tanpa perubahan tabel); DB forward-only. Token Cloudflare dirotasi + secret GitHub diperbarui (updated 27 Nov 08:25Z), environment `production` diisi DB URL/VITE tanpa echo nilai; hash commit Task 0 = `81ae04e` (AGENTS.md + LESSONS #65).

#68 · 27 Nov 2026 · tooling/env · `supabase` CLI gagal parse `.env` root (`unexpected character "-" in variable name`) karena baris catatan + token Cloudflare ditulis tanpa quoting seperti variabel, sehingga semua perintah CLI berhenti sebelum jalan. · Tindakan: jalankan dari root dengan `--workdir packages` (CLI membaca `.env` workdir Supabase); Docker Desktop harus Start untuk pgTAP lokal; jangan pernah echo isi `.env`. Perbaikan permanen tetap utang split `.env` per environment (#63).

#70 - 28 Nov 2026 - M7 - Laporan selesai STAGING test-first: pgTAP `0015` plan(17) RED `relation v_pnl_bulan does not exist` (0/17) > migrasi `0015_m7_reports.sql` (3 views security_invoker, journal-pure) > kanonik CI **`Files=15, Tests=475`**; Vitest **153** (CSV RFC-4180 + BOM, angka mentah, dashboard komposisi, RED probe route 401/whitelist). Smoke HP 9/9: dashboard 4 angka **= REST JWT**, CSV Worker (BOM byte, Content-Disposition), `Page.printToPDF` bukti PDF, piutang 1-1030 vs UMP 2-2010 TERPISAH, PII di-mask. Timing 90,4 ms @ ~80k journal_lines (BEGIN..ROLLBACK, data temp tidak bertahan). - Tindakan: dua bug tertangkap smoke - (1) `TextDecoder` memotong BOM, assert BOM wajib byte `EF BB BF`; (2) pemilihan bulan P&L wajib `startsWith` (kolom view `YYYY-MM-DD`); perbandingan dua-sisi dengan fallback nol bisa false-PASS. Utang: helper pemilihan bulan shared + golden test. Deviasi model (GLM untuk semua task) di-ACC founder, tercatat di plan + `sop/MODEL-ROUTING.md`. `.env` split + OTP 6 digit produksi (ops) ditutup; smoke exclusion terverifikasi read-only (semua smoke di bisnis `Dapur Bu Siti Smoke`).

#69 · 27 Nov 2026 · roadmap · Founder ACC: M7 (laporan/export) dikerjakan SEBELUM M6 (pelanggan) — deviasi urutan W3 menjadi M5 → M7 → M6; M6 TIDAK dibatalkan, tetap dijadwalkan setelah M7. Alasan: laporan memvalidasi angka M1–M5 (order → jurnal → stok/HPP) dan menjadi pintu penutupan utang (split `.env` #63/#68, pengecualian entitas smoke, disclosure nilai persediaan). · Tindakan: PREP M7 wajib mempertimbangkan dimensi pelanggan dari data yang sudah ada (`orders.customer_id` → `customers.nama`/`telepon` format `628…`, terverifikasi `0003:40-51`) untuk piutang/repeat; jangan mengasumsikan kolom baru sebelum gate.

#71 · 28 Nov 2026 · closing/produksi M7 · M7 SELESAI produksi: prasyarat commit `f6e1be6` (golden boundary bulan P&L MERAH 3/5 → HIJAU 5/5 + `scripts/evidence-rekap.mjs` + format rekap), CI `46111609810` 4/4; deploy `production.yml` run `46111829074` 4/4 (approval reviewer founder), migrasi `0015_m7_reports.sql` ter-apply, Worker `gerailo-production` Version `3b4e9c52-6013-4ef5-bd36-e41c79cbbabb`, bundle `index-q9tXteDE.js`, health OK; tag `m7-production-v1` → `f6e1be6` (dokumen penutup di-push SETELAH tag). Smoke produksi `e8c955c3` **10/10**: dashboard = REST JWT (penjualan 615.000, laba 410.000, piutang+UMP 0, persediaan 993.000), rekap per-akun (kas 615.000; pendapatan 615.000; HPP 205.000; beban 0), Σ CSV persediaan = 993.000 = kartu, 4 laporan, CSV BOM+filename, print PDF, PII di-mask; evidence `docs/evidence/m7/production/`. Kanonik: pgTAP **`Files=15, Tests=475`**; Vitest **158** (153 saat staging + 5 golden boundary bulan). · Tindakan: koreksi kode akun piutang `1-1300` → **`1-1030`** (UMP tetap `2-2010`) dipin dari `docs/ACCOUNTING-RULES.md`; deviasi model GLM-full di-ACC founder (pemetaan `sop/MODEL-ROUTING.md` tetap untuk sesi berikutnya); timing 90,4 ms @ ~80k `journal_lines`. Rollback target Worker `023a5055-2957-4e24-b104-f5fcbcb7813c` (M5) aman karena `0015` additive-only (views+grants, tanpa perubahan tabel); DB forward-only. M6 menyusul (urutan normal M6 setelah M7).

#72 · 28 Nov 2026 · M6 · Pelanggan selesai STAGING test-first: pgTAP `0016` plan(24) RED `function public.upsert_customer does not exist` (0/24) → migrasi `0016_m6_customers.sql` (`customers.aktif` + 4 RPC satu pintu) → kanonik **`Files=16, Tests=499`**; Vitest **165** (stats: DRAFT/BATAL diabaikan, fixture 755.000/4/2026-11-27; filter arsip+badge; pesan FK/telepon). Smoke HP `e8c955c3` **8/8 CEK1–CEK8** (CEK8 = bundle sama dengan CI): list/cari, tambah, edit, arsip+toggle (default sembunyi), autocomplete+badge arsip, hapus tanpa order sukses + hapus ber-order → PostgREST **409 code 23503** → UI "Gunakan Arsipkan", stats 1.230.000/8 = REST, piutang+UMP 745.000 tidak berubah. **Angka regulasi baru (kanonik): pgTAP `Files=16, Tests=499` + Vitest `165`; angka lama 475/158 dinyatakan superseded.** · Tindakan: view M7 TIDAK difilter `aktif` (angka tetap); auto-link tetap ke pelanggan arsip; model aktif GLM mengerjakan Task 4/5/7 (override ke atas, dicatat di plan Deviasi); evidence `docs/evidence/m6/` PII telepon di-mask; data uji `M6 Smoke …`/`M6 Hapus …` di staging masuk backlog pembersihan.

#73 · 28 Nov 2026 · closing/produksi M6 · M6 SELESAI produksi: deploy `production.yml` run **`46132777400` 4/4** (approval reviewer founder) dari commit `e967b8d` → migrasi `0016` ter-apply → Worker `gerailo-production` version **`80fc7512-9cc2-41d6-bd50-9daec8385b8b`**, bundle `/assets/index-CYTvk6cO.js`, health OK; tag **`m6-production-v1`** → `e967b8d`. Smoke HP produksi `e8c955c3` **8/8 CEK1–CEK8** (stats 375.000/1 = REST, piutang+UMP 0 tidak berubah; hapus tanpa order 204 + FK 409/23503; pelanggan uji dibersihkan via `hapus_customer` 204); evidence `docs/evidence/m6/production/` (PII masked). Rollback target Worker M7 `3b4e9c52-6013-4ef5-bd36-e41c79cbbabb`; `0016` additive-only. · Tindakan: CEK8 = bundle check (selaras CI); angka regulasi baru tetap pgTAP 499/Vitest 165.

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
- **React Fast Refresh warning** di `apps/web/src/lib/auth.tsx:61` (helper diekspor
  bareng komponen) — refactor kecil, bukan blocker M3
- **Reminder UMP tertahan** di detail order: `UMP tertahan Rp X — kembalikan & catat refund`
  (follow-up pasca-promosi; refund tetap manual)
- **Template email OTP 6 produksi** di dashboard Supabase: produksi masih memakai Magic Link
  default `{{ .ConfirmationURL }}`; ubah ke template `{{ .Token }}` bila ingin alur kode 6 digit
- **Utang teknis M4 (diterima reviewer):** `.env` memiliki duplikat `VITE_*` (baris 13/14
  produksi, 20/21 staging); split konfigurasi per environment sebelum modul berikutnya.
- **Akun smoke produksi** `Dapur Bu Siti` sengaja dipertahankan sebagai bukti promosi
  `ORD-20261126-003`; dikecualikan dari uji M7.
- **Pembersihan `metode_bayar` nilai tunggal warisan:** constraint `text[]` multi-nilai sudah
  benar sejak #24/#50; yang dibersihkan hanya data lama berbentuk string tunggal.
- **Antrean modul pasca-M4:** `M5 → M6 → M7` sesuai `docs/ROADMAP.md:18` (posisi M6 antara
  M5 dan M7); jangan mulai M5 di sesi lama.

## Status deploy production

- 25 Nov 2026: `https://gerailo-production.mdimas-jobs.workers.dev` — Worker `gerailo-production`, migrasi 0001–0009, bundle `index-BRLaIdz4.js`, version `57a2c302-032a-4a37-bddf-44d9544b84cf`. Pada saat itu Slice 3 (`0010`–`0013`) belum ikut deploy; lihat entri 26 Nov di bawah.
- 26 Nov 2026: produksi dipromosikan ke bundle `index-DgwjxP9i.js`, version `2dcaea96-f34b-4d88-aee7-d94fd3390e8e`, migrasi `0010`–`0013` ter-apply, health OK. Smoke HP produksi `ORD-20261126-003` SELESAI/Lunas/Sisa 0, T1/T2/T3 seimbang, stok 17.

## PERLU SSoT v1.x

- Modul M8 Smart Transaction Page (ADR-11, 20 Nov 2026): scope MVP, arsitektur halaman
  publik ber-token, mapping status buyer — perlu masuk SSoT v1.1 (Bab 6 scope, Bab 9/10
  tabel & RPC baru, Bab 11 roadmap W4).
- Modul M9 Digital Catalog (ADR-12, 20 Nov 2026): dua fase, order_leads, kolom katalog
  M2, RPC publik katalog — masuk SSoT v1.1 (Bab 6, 9/10, 11).
