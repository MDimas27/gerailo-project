# AGENTS.md — Brain File Proyek Gerailo

> File ini dibaca agent (jcode/Claude/Cursor/dll) di awal setiap sesi.
> Jaga tetap di bawah ~150 baris. Detail panjang ada di docs/, bukan di sini.

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
Sentry + PostHog · payment gateway QRIS/VA (Midtrans/Xendit).
Monorepo pnpm: `apps/web` · `apps/worker` · `packages/shared` · `packages/supabase`.

## Modul MVP (M1–M8 beku untuk launch; M9 = keputusan founder, ADR-12)

| # | Modul | Status |
|---|---|---|
| M1 | Registrasi usaha & onboarding 3 langkah | [~] parsial |
| M2 | Master produk & harga (+ varian teks, alias) | [x] |
| M3 | Smart Paste (parser pola + fallback AI + konfirmasi) | [x] |
| M4 | Order & pembayaran (status, DP, COD, pelunasan) | [ ] |
| M5 | Stok sederhana (pergerakan + HPP rata-rata bergerak) | [ ] |
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
9. Akhiri setiap sesi dengan `/remember`.
10. **Halaman publik pembeli (M8)**: akses hanya via token acak ≥128-bit; TANPA
    telepon/alamat penuh/HPP; label "terverifikasi" hanya setelah seller konfirmasi;
    rate limit; tanpa cache service worker; satu-satunya tulis publik = lapor
    pembayaran (P1, DILAPORKAN — tidak pernah mengubah transaksi) (rules/00 §13).
11. **Katalog publik (M9)**: hanya produk `aktif + tampil_katalog`; TANPA HPP atau
    angka stok (hanya status Tersedia/Menipis/Habis); pesanan dari katalog SELALU
    lewat tabel staging `order_leads` + konfirmasi seller — tidak pernah membuat
    order langsung (rules/00 §14).

## Peta konteks — baca sesuai kebutuhan (jangan baca semua sekaligus)

| Tugas | Baca dulu |
|---|---|
| Memulai sesi | AGENTS.md (file ini) + docs/PRODUCT.md + LESSONS-LEARNED.md |
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

## Definisi selesai (semua modul)

(1) `pnpm build` hijau, (2) test hijau termasuk golden test area terkait, (3) RLS
teruji (tes akses lintas business_id gagal), (4) alur utama dites manual di HP via
staging, (5) status di file ini diperbarui, (6) LESSONS-LEARNED diperbarui.

## Status proyek (perbarui tiap sesi)

- Sprint aktif: W2 M3 SELESAI 23 Nov; W3 M4 SUB-SLICE 1 (status machine + pembayaran manual) APPROVED founder #1 24 Nov; W3 M4 SUB-SLICE 2 (Midtrans Snap + webhook) deploy staging 24 Nov, menunggu Gate #2; state machine akhir diperbaiki: `ship_order` (rename "kirim"), `receive_order` (DIKIRIM+lunas→SELESAI), cancel DIKIRIM ditolak. Jurnal/HPP/stok KELUAR belum masuk.
- Modul selesai: M2 (produk, varian, alias, stok, kuota paket, RPC create_product/record_stock_move); M3 (Smart Paste parser pola + fallback AI berkuota + konfirmasi order + admin parser + PWA share target).
- M3 `[x]` — iOS fisik BELUM diuji (perangkat tidak tersedia); jalur clipboard terverifikasi di Android/desktop. Uji iOS 5 menit saat perangkat tersedia: Safari → Add to Home Screen → PWA standalone → salin teks WA → /share → tempel → konfirmasi → order DRAFT. pgTAP 98, Vitest 93, lint/typecheck/build hijau; RLS/RPC diuji. Golden #12: AI menyelesaikan typo katalog & membatasi akurasi ke `SEDANG`. Admin parser 200: 6 kartu metrik + baris AI `nvidia/nemotron-3-ultra-550b-a55b`. Konfirmasi order `9b9a5140-eb0e-4e13-a5ca-d65d260fb3c9` dan share target `f65b34da-0d89-4125-ad03-122134c8bdfc` + clipboard `9a0d6661-1b1e-4a63-bde5-7239a58500a5`: DRAFT, ongkir 15000, DP 50000, total 165000, 2× Sosis @75000 dari katalog.
- M1 parsial: auth OTP, usaha, 19 COA, settings. **Sisa M1 (backlog)**: edit profil usaha, edit pengaturan. Kolom `pdpr_consent_at` sudah masuk migrasi 0003.
- Deploy staging terakhir: 25 Nov 2026 — https://gerailo-staging.mdimas-jobs.workers.dev (CI run `45519222493` hijau 4/4; db-migrate + deploy staging sukses); bundle `/assets/index-CxqO3nNU.js` + `/assets/index-C4m8cC6k.css`. Aset sudah dicek mengandung `receive_order` + "Tandai diterima" + pesan error ramah pengguna ("Nominal wajib diisi", "Periksa kembali data pembayaran"). Route Worker `/api/payments/midtrans/token` aktif (401 tanpa JWT). Device USB `e8c955c3` dulu membuka detail `ORD-20261124-001`: "Bayar online" + "Lihat bukti" → signed URL Supabase Storage. Service worker masih bisa menyajikan bundle lama ("Batalkan order" tampil, "Tandai diterima/selesai" belum); sebelum re-test: unregister SW / clear site data. Laporan M3: `plans/W2-M3-SMART-PASTE.md` + `docs/MODULES/M3-SMART-PASTE.md`.
- Deploy M3 staging: secrets Worker `LLM_API_KEY`, `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` terdaftar; usaha staging sudah `STARTER`. Android: WebAPK staging `org.chromium.webapk.a31e5d83e0e7d8c17_v2` ter-install via Chrome 157 ⋮ → "Install and create shortcut" → Install; target CDP `standalone: true`. SEND intent ke `ShareActivity` membuka `/share?text=...`, review → koreksi produk → DRAFT. iOS: tidak ada perangkat fisik; jalur salin-tempel diverifikasi lewat clipboard API + `/share` → AI → konfirmasi → DRAFT.
- Halangan: KYC gateway; verifikasi Safari/iOS fisik tetap dicatat sebagai catatan founder.
