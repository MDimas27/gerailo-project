# AGENTS.md — Brain File Proyek Gerailo

> File ini dibaca agent (jcode/Claude/Cursor/dll) di awal setiap sesi.
> Jaga tetap di bawah ~150 baris. Detail panjang ada di docs/, bukan di sini.

## PROSES WAJIB (ECC) — mengikat semua agent, tidak boleh dilewati

**Urutan beku: PREP → GATE → PLAN → GATE → EXECUTE → LAPORAN.**

1. **PREP** — baca file ini, `sop/HARD-RULES.md`, `LESSONS-LEARNED.md` (#50–akhir),
   plan aktif, docs modul + data model + accounting rules. Laporkan ringkasan
   pemahaman ≤10 baris + 5 pertanyaan gate. **Tidak menulis kode.**
2. **GATE PREP** — tunggu ACC founder. Tanpa ACC, dilarang lanjut.
3. **PLAN** — tulis/perbarui `plans/W<n>-<MODUL>.md`: golden test ditetapkan di
   fase ini (fixture, assert, cara bukti MERAH), lane + kepemilikan berkas.
4. **GATE PLAN** — tunggu ACC rencana. Rencana disetujui = kontrak sesi.
5. **EXECUTE** — golden test MERAH → implement → HIJAU → bukti RED probe untuk
   tiap guard. Satu task satu commit `M<n>: <task>`. Jurnal/RPC/RLS/money =
   penulis tunggal, serial (`sop/SWARM-DISCIPLINE.md`).
6. **LAPORAN** — `/ecc-laporan`: angka test, hash bundle, Worker Version ID, CI
   run, evidence `docs/evidence/<m>/`, update status AGENTS + LESSONS.

- Slash command: `/ecc-prep`, `/ecc-plan`, `/ecc-review`, `/ecc-laporan` (`.opencode/command/`).
- Routing model per fase: PREP/PLAN/golden test + RED probe/review laporan = GLM 5.3 Flash; implementasi pasca-test beku/docs/smoke/evidence = DeepSeek 4.1 Flash (`sop/MODEL-ROUTING.md`); CI satu-satunya hakim implementasi.
- Larangan: deploy manual; enum/status baru tanpa ADR; guard tanpa RED probe; menyalin logika `_post_payment`; menyatakan selesai tanpa CI hijau.
- Deployment HANYA via CI dari `main`; produksi dari tag yang lolos CI + smoke HP.

**Kalimat pembuka sesi baru (salin apa adanya):** "Baca AGENTS.md, `sop/HARD-RULES.md`, `LESSONS-LEARNED.md` (#50–akhir), `plans/<plan-aktif>.md`, `docs/MODULES/<modul>.md`, `docs/DATA-MODEL.md`, `docs/ACCOUNTING-RULES.md`. Tulis ringkasan pemahaman ≤10 baris + 5 pertanyaan gate (PREP). Jangan tulis kode sebelum gate ACC. Jurnal tidak disentuh tanpa golden test hijau."

## Identitas proyek

Gerailo = PWA SaaS untuk UMKM Indonesia yang menjual via WhatsApp. Alur inti:
**chat WhatsApp → Smart Paste → order terkonfirmasi → jurnal double-entry → laporan**.
Tiga pilar satu sumber data: **Digital Catalog (M9) → Order & Transaction (M4/M8) →
Business Management (M2–M7)**.
Dibangun 1 founder + agent (vibe coding), target launch 19 Desember 2026.
SSoT tertinggi: `docs/SSOT/Gerailo_Blueprint_SSoT_v1.0.docx` (atau PDF-nya).

## Stack (TERKUNCI, ADR-10 — jangan diganti/tambah tanpa ADR baru)

React 19 + Vite + TypeScript strict + Tailwind + shadcn/ui · TanStack Query (server
state) · react-router + react-hook-form + zod · vite-plugin-pwa · Supabase Postgres
(RLS per `business_id`, Auth, Storage) via supabase-js di browser · **TANPA ORM** —
operasi atomik via RPC Postgres · Cloudflare Workers + Hono: SATU Worker untuk
`/api/*` + aset statis PWA · service_role & LLM_API_KEY hanya secret Worker ·
Sentry + PostHog · pembayaran buyer→seller MANUAL (no. rekening/QRIS seller + catat pembayaran); Midtrans/Xendit hanya untuk tagihan langganan seller→Gerailo di slice billing (bukan M4, platform tidak pernah memegang dana buyer).
Monorepo pnpm: `apps/web` · `apps/worker` · `packages/shared` · `packages/supabase`.

## Modul MVP (M1–M8 beku untuk launch; M9 = keputusan founder, ADR-12)

| # | Modul | Status |
|---|---|---|
| M1 | Registrasi usaha & onboarding 3 langkah | [~] parsial |
| M2 | Master produk & harga (+ varian teks, alias) | [x] |
| M3 | Smart Paste (parser pola + fallback AI + konfirmasi) | [x] |
| M4 | Order & pembayaran (status, DP, COD, pelunasan) | [x] |
| M5 | Stok sederhana (pergerakan + HPP rata-rata bergerak) | [x] |
| M6 | Pelanggan (data ringkas + histori otomatis) | [ ] |
| M7 | Laporan & export (rekap harian, laba rugi, arus kas, piutang/UMP, CSV/PDF) | [ ] |
| M8 | Smart Transaction Page (halaman transaksi pembeli ber-token, share WA, bukti bayar, status pengiriman) | [ ] |
| M9 | Digital Catalog & Product Showcase (katalog publik /toko/:slug, share WA + QR, pesan via WA→Smart Paste; Fase 2 pasca-launch: form pemesanan → order_leads) | [ ] |

Perbarui status [x] setiap akhir sesi. Fitur di luar daftar ini = TOLAK, tawarkan
catat ke backlog di `LESSONS-LEARNED.md`. M9 Fase 1 hanya dikerjakan di W4 BILA sisa
waktu — jangan menggeser launch 19 Des.

## Aturan besi (detail: rules/)

1. Jurnal akuntansi **immutable**: tidak pernah UPDATE/DELETE `journal_entries` /
   `journal_lines`; batal/koreksi = entri reversi.
2. **Debit = Kredit dijaga GANDA**: assertion di RPC `post_journal` + constraint
   trigger DEFERRED di database. Menulis jurnal HANYA lewat RPC.
3. **Parser tidak pernah mengarang** harga/produk/pelanggan; total dihitung server;
   simpan hanya setelah konfirmasi pengguna; key AI hanya di Worker.
4. Area parser & mesin jurnal **hanya berubah dengan golden test hijau** (test-first).
5. Semua data usaha terisolasi RLS per `business_id`; tidak ada query lintas usaha.
6. Uang = **BIGINT rupiah integer**; supabase-js mengembalikan BIGINT sebagai STRING —
   konversi/format hanya via `packages/shared/src/money.ts` (dilarang `Number()` di komponen).
7. Kredensial hanya via secrets/env; `service_role` & `LLM_API_KEY` dilarang masuk
   bundle browser (CI grep).
8. Commit kecil per task; staging tiap hari; production hanya dari tag lolos uji.
9. Akhiri setiap sesi dengan `/ecc-laporan` (termasuk update `LESSONS-LEARNED.md`).
10. **Halaman publik pembeli (M8)**: akses hanya via token acak ≥128-bit; TANPA
    telepon/alamat penuh/HPP; label "terverifikasi" hanya setelah seller konfirmasi;
    rate limit; tanpa cache service worker; satu-satunya tulis publik = lapor
    pembayaran (P1, DILAPORKAN — tidak pernah mengubah transaksi) (rules/00 §13).
11. **Katalog publik (M9)**: hanya produk `aktif + tampil_katalog`; TANPA HPP atau
    angka stok (hanya status Tersedia/Menipis/Habis); pesanan dari katalog SELALU
    lewat tabel staging `order_leads` + konfirmasi seller — tidak pernah membuat
    order langsung (rules/00 §14).
12. **Pembayaran M4 manual**: buyer→seller via rekening/QRIS seller + `record_payment`.
    Midtrans per-seller DITUNDA; gateway hanya untuk tagihan langganan dengan merchant
    account Gerailo di slice billing. Platform TIDAK PERNAH memegang dana buyer.

## Peta konteks — baca sesuai kebutuhan (jangan baca semua sekaligus)

| Tugas | Baca dulu |
|---|---|
| Memulai sesi | AGENTS.md (file ini) + sop/HARD-RULES.md + docs/PRODUCT.md + LESSONS-LEARNED.md |
| Ritual ECC (PREP/PLAN/review/laporan) | .opencode/command/ecc-*.md + SOP-ECC.md + sop/SWARM-DISCIPLINE.md |
| Memahami stack & monorepo | docs/TECH-STACK.md |
| Rencanakan modul | docs/MODULES/<MODUL>.md + docs/ROADMAP.md |
| Bekerja dengan DB/RPC | docs/DATA-MODEL.md + docs/API-CONTRACTS.md |
| Sentuh jurnal/keuangan | docs/ACCOUNTING-RULES.md + rules/01-accounting-safety.md |
| Sentuh parser/AI | docs/MODULES/M3-SMART-PASTE.md + rules/02-parser-safety.md |
| Bangun halaman pembeli/share | docs/MODULES/M8-SMART-TRANSACTION-PAGE.md + docs/UI-UX.md §8 + rules/00 §13 |
| Bangun katalog publik/share | docs/MODULES/M9-DIGITAL-CATALOG.md + docs/UI-UX.md §9 + rules/00 §14 |
| Bangun/ubah UI frontend | docs/STITCH-DESIGN.md + design/stitch/<layar>/code.html + docs/UI-UX.md |
| Deploy/git/migrasi | rules/03-git-deploy-discipline.md |
| SOP alur build modul | skills/<modul>/SKILL.md + skills/ecc-core/SKILL.md |

## Konvensi kode

- TypeScript strict; tidak ada `any` di modul keuangan.
- Nama tabel/kolom snake_case; komponen React PascalCase; file kebab-case.
- Logika uang: `packages/shared/src/money.ts` satu-satunya tempat parse/format.
- Logika parser: `apps/worker/src/services/parser` — aturan pola di satu file konfigurasi.
- Operasi atomik DB = RPC baru di migrasi SQL (`packages/supabase/migrations`), bukan
  N query dari klien; setelah migrasi → jalankan `supabase gen types` + commit types.
- Semua fetch data via TanStack Query; validasi input zod dari `packages/shared`.
- Setiap endpoint Worker: verifikasi JWT Supabase + validasi zod; tidak percaya klien.
- Pengujian PWA/perangkat: WAJIB `adb reverse tcp:5173 tcp:5173` + Playwright/CDP
  (`chromium.connectOverCDP` lewat `adb forward tcp:9223 localabstract:chrome_devtools_remote`);
  cek `/json/version` mengandung `Android-Package` — port 9222 di mesin ini adalah Chrome
  headless Windows. Dilarang `adb shell input`/`uiautomator` untuk interaksi UI.

## Definisi selesai (semua modul)

(1) `pnpm build` hijau, (2) test hijau termasuk golden test area terkait, (3) RLS
teruji (tes akses lintas business_id gagal), (4) alur utama dites manual di HP via
staging, (5) status di file ini diperbarui, (6) LESSONS-LEARNED diperbarui,
(7) bukti + provenance deploy tercatat di `docs/evidence/<m>/`.

## Status proyek (perbarui tiap sesi)

- Sprint aktif: W2 M3 SELESAI 23 Nov; W3 M4 SELESAI 26 Nov; W3 M5 SELESAI PRODUKSI 27 Nov. Slice 1 status machine + pembayaran manual ACC founder #1; slice 2 Midtrans per-seller DITUNDA; slice 3 jurnal/HPP/stok KELUAR + `gagal_kirim` + COD-only ACC Gate #3. State machine akhir: `ship_order`, `receive_order` (DIKIRIM+lunas→SELESAI), `cancel_order` DIKIRIM ditolak (`gagal_kirim` untuk retur). pgTAP saat penutupan M4 `Files=13, Tests=434`; lint/typecheck/109 test hijau. Batch pra-promosi commit `5bb15e3`; dokumen penutup commit `52b6181` sudah di-push. CI `45788400727` 4/4, staging `index-Zbfd4X71.js`. Produksi 26 Nov: migrasi `0010`–`0013` ter-apply, Worker `gerailo-production` version `2dcaea96-f34b-4d88-aee7-d94fd3390e8e`, bundle `index-DgwjxP9i.js`, health OK. Smoke HP produksi `ORD-20261126-003`: 3×Sosis @75000 + ongkir 15000, `PELUNASAN` 240000 → DIKONFIRMASI/Lunas → SIAP_DIKIRIM → DIKIRIM (JNE JP0012345678) → SELESAI/Lunas/Sisa 0; jurnal T1/T2/T3 seimbang (240/240, 240/240, 150/150), stok 20→17, HPP snapshot 50000. Dua order uji cacat `ORD-20261126-001`/`002` dibatalkan.
- Modul selesai: M2 (produk, varian, alias, stok, kuota paket, RPC create_product/record_stock_move); M3 (Smart Paste parser pola + fallback AI berkuota + konfirmasi order + admin parser + PWA share target); M4 (manual order, status machine, DP/pelunasan/COD, jurnal T1–T7/T9–T12, stok KELUAR+retur, gagal_kirim, UI 4 lane); M5 (stok + HPP rata-rata bergerak, blokir stok minus, UI `/stock` + `/stock/adjust` + drawer riwayat).
- M5 `[x]` produksi 27 Nov: `record_stock_move` lean + blokir `PENYESUAIAN` minus (`STOK_TIDAK_CUKUP`, 22023); UI `/stock` + `/stock/adjust` + drawer riwayat reusable; T8 manual prefill dari MASUK terakhir. pgTAP kanonik `Files=14, Tests=458` (RED 4 gagal sebelum migrasi `0014`), Vitest 128, lint/typecheck/build hijau. CI staging `45931832498` 4/4 (`index-UaU8g1fa.js`); CI produksi `45966741343` 4/4, Worker Version `023a5055-2957-4e24-b104-f5fcbcb7813c`, bundle `index-DpG1p5iU.js`, health OK, migrasi `0014` ter-apply. Smoke HP `e8c955c3` staging 8/8 + produksi 8/8 (CEK5 order penuh via UI); evidence `docs/evidence/m5/` + `docs/evidence/m5/production/`.
- M3 `[x]` — iOS fisik BELUM diuji (perangkat tidak tersedia); jalur clipboard terverifikasi di Android/desktop. Uji iOS 5 menit saat perangkat tersedia: Safari → Add to Home Screen → PWA standalone → salin teks WA → /share → tempel → konfirmasi → order DRAFT. pgTAP 98, Vitest 93, lint/typecheck/build hijau; RLS/RPC diuji. Golden #12: AI menyelesaikan typo katalog & membatasi akurasi ke `SEDANG`. Admin parser 200: 6 kartu metrik + baris AI `nvidia/nemotron-3-ultra-550b-a55b`. Konfirmasi order `9b9a5140-eb0e-4e13-a5ca-d65d260fb3c9` dan share target `f65b34da-0d89-4125-ad03-122134c8bdfc` + clipboard `9a0d6661-1b1e-4a63-bde5-7239a58500a5`: DRAFT, ongkir 15000, DP 50000, total 165000, 2× Sosis @75000 dari katalog.
- UX M4 25 Nov: `apps/web/src/lib/order-presentation.ts` + golden test, daftar kerja 4 lane, detail order Next Best Action; UI-only tanpa RPC/schema/RLS/business logic. `pnpm lint` 0 error (1 warning lama), `pnpm typecheck`, `pnpm test` 105, `pnpm build`, `git diff --check` hijau. Bundle staging awal `index-DoWfl7yR.js` + `index-mN0Q7tUp.css` (CI `45570443621` hijau 4/4); bundle fix `index-DTeG_QNY.js` + `index-mN0Q7tUp.css` (CI `45598889915` hijau 4/4); aset dicek mengandung "Langkah berikutnya", "Periksa & konfirmasi", "Masih ada sisa", "Simpan pesanan", "Pesanan Baru", "Tandai diterima/selesai", "Catat COD diterima".
- Smoke HP 25 Nov: Playwright/CDP Android `e8c955c3` via port 9223; bundle `index-DoWfl7yR.js` terverifikasi di staging. CEK0–CEK4/CEK7/CEK8 PASS pada `ORD-20261123-001` (DRAFT→DIKONFIRMASI→DP_DITERIMA→lunas→SIAP_DIKIRIM→DIKIRIM→SELESAI). CEK9 dilewati (tidak ada order BATAL; dilarang mengubah). CEK5/CEK6 awalnya FAIL karena `metode_bayar` Supabase berbentuk array `["COD"]` tetapi dibandingkan sebagai string; diperbaiki via `adalahCod()` + golden test, lalu PASS di dev server Android pada `ORD-20261125-007` dan di staging pada `ORD-20261125-008` (COD `DIKIRIM` → "Catat COD diterima" → auto-SELESAI/Lunas). Deploy staging fix sukses; produksi di-promote 25 Nov.
- M1 parsial: auth OTP, usaha, 19 COA, settings. **Sisa M1 (backlog)**: edit profil usaha, edit pengaturan. Kolom `pdpr_consent_at` sudah masuk migrasi 0003.
- Deploy staging terakhir: 25 Nov 2026 — https://gerailo-staging.mdimas-jobs.workers.dev (CI run `45598889915` hijau 4/4; db-migrate + deploy staging sukses); bundle `/assets/index-DTeG_QNY.js` + `/assets/index-mN0Q7tUp.css`. Aset sudah dicek mengandung "Langkah berikutnya", "Periksa & konfirmasi", "Masih ada sisa", "Simpan pesanan", "Pesanan Baru", "Tandai diterima/selesai", "Catat COD diterima". Route Worker `/api/payments/midtrans/token` masih ada di staging (401 tanpa JWT) tetapi tidak dipakai M4; Midtrans per-seller ditunda. Device USB `e8c955c3` dulu membuka detail `ORD-20261124-001`: "Bayar online" + "Lihat bukti" → signed URL Supabase Storage. Service worker pada perangkat lama masih bisa menyajikan bundle lama; sebelum re-test: unregister SW / hapus Cache Storage. Laporan M3: `plans/W2-M3-SMART-PASTE.md` + `docs/MODULES/M3-SMART-PASTE.md`. Deploy staging terakhir 26 Nov 2026: CI `45788400727` 4/4, bundle `/assets/index-Zbfd4X71.js` + `/assets/index-mN0Q7tUp.css`.
- Deploy staging M5 27 Nov 2026: CI `45931832498` 4/4 (quality, db-tests, db-migrate-staging, deploy-staging); bundle `/assets/index-UaU8g1fa.js`; pgTAP `Files=14, Tests=458`.
- Deploy produksi M5 27 Nov 2026: CI `45966741343` 4/4 (workflow `production.yml`, environment `production`); migrasi `0014_m5_stock.sql` ter-apply; Worker `gerailo-production` version `023a5055-2957-4e24-b104-f5fcbcb7813c`, bundle `/assets/index-DpG1p5iU.js`, health OK; tag `m5-production-v1` (commit `ffbc7c7`). Smoke HP `e8c955c3` CEK1–CEK5b 8/8 (CEK5 order penuh via UI), evidence `docs/evidence/m5/production/`. Rollback target Worker `2dcaea96-f34b-4d88-aee7-d94fd3390e8e` (M4); `0014` additive-only.
- Deploy produksi 25 Nov 2026: https://gerailo-production.mdimas-jobs.workers.dev — Worker `gerailo-production` dibuat, migrasi 0001–0009 ter-apply, auth site_url/redirect production + OTP 6 di-push, bundle `/assets/index-BRLaIdz4.js` + `/assets/index-mN0Q7tUp.css`, health `{"status":"ok","service":"gerailo-worker"}`, version `57a2c302-032a-4a37-bddf-44d9544b84cf`. Isi bundle dicek mengandung "Langkah berikutnya", "Periksa & konfirmasi", "Masih ada sisa", "Tandai siap dikirim", "Tandai diterima/selesai", "Catat COD diterima". Midtrans per-seller tidak aktif; tidak ada `service_role` di Worker produksi.
- Deploy produksi terakhir 26 Nov 2026: https://gerailo-production.mdimas-jobs.workers.dev — bundle `/assets/index-DgwjxP9i.js` + `/assets/index-mN0Q7tUp.css`, version `2dcaea96-f34b-4d88-aee7-d94fd3390e8e`, health OK, migrasi `0010`–`0013` ter-apply. Bundle dicek mengandung `PELUNASAN`, `STOK_TIDAK_CUKUP`, `Jurnal otomatis aktif`, `Catat COD diterima`; TANPA "Bayar online"/"Buat QRIS/VA". Login produksi via magic link Supabase default (template OTP 6 produksi belum custom); `/auth/callback` sukses.
- Tag produksi `m4-production-v1` (commit `ecf798a`) → Worker Version ID `2dcaea96-f34b-4d88-aee7-d94fd3390e8e` → bundle `index-DgwjxP9i.js`; rollback Worker via `wrangler versions rollback`, database forward-only (tanpa down-migration).
- Deploy M3 staging: secrets Worker `LLM_API_KEY`, `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` terdaftar; usaha staging sudah `STARTER`. Android: WebAPK staging `org.chromium.webapk.a31e5d83e0e7d8c17_v2` ter-install via Chrome 157 ⋮ → "Install and create shortcut" → Install; target CDP `standalone: true`. SEND intent ke `ShareActivity` membuka `/share?text=...`, review → koreksi produk → DRAFT. iOS: tidak ada perangkat fisik; jalur salin-tempel diverifikasi lewat clipboard API + `/share` → AI → konfirmasi → DRAFT.
- Halangan: KYC seller tidak lagi relevan; KYC Gerailo baru diperlukan saat slice billing langganan. Verifikasi Safari/iOS fisik tetap dicatat sebagai catatan founder.
- Sesi lama dibekukan setelah clean tree + `HEAD=origin/main` dikonfirmasi; M5 dilarang keras dimulai di sesi lama (ADR-13).
