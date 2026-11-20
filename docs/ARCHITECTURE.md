# ARCHITECTURE.md — Stack, Monorepo, Lingkungan, ADR

> Sumber: SSoT Bab 5 (ADR), Bab 9 (arsitektur) + ADR-9/ADR-10 (hosting & stack).
> Ganti keputusan = buat ADR baru di bagian "ADR tambahan" + catat di LESSONS-LEARNED.

## Stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Klien | React 19 + Vite + TS + Tailwind + shadcn/ui + TanStack Query + react-router + zod | SPA statis PWA (ADR-10); detail `docs/TECH-STACK.md` |
| PWA | vite-plugin-pwa (Workbox) | Manifest + SW deklaratif; Web Share Target |
| Halaman pembeli | Route SPA publik `/t/:token` + endpoint Worker `GET /api/public/order/:token` (rate-limited) | Tanpa login; token acak ≥128-bit; M8/ADR-11 |
| Katalog publik | Route SPA publik `/toko/:slug` + Worker `GET /api/public/catalog/:slug` (rate-limited); Fase 2: POST order-lead | Tanpa login; hanya produk aktif+tampil_katalog; M9/ADR-12 |
| API | Cloudflare Workers + Hono | SATU Worker: `/api/*` + aset statis (tanpa CORS, satu deploy) |
| DB | Supabase Postgres + RLS per `business_id` | supabase-js (anon key) di browser; TANPA ORM |
| Operasi atomik | RPC Postgres (`docs/API-CONTRACTS.md` §B) | `post_journal` internal; invariant dijaga trigger DB |
| Auth/Storage | Supabase Auth + Storage | service_role HANYA di Worker |
| Hosting | Cloudflare Workers (ADR-9) | Rollback per deployment; DNS/domain sudah di Cloudflare |
| AI | LLM murah per-token (ADR-8) | HANYA dari Worker; kuota server-side |
| Billing | Midtrans/Xendit QRIS/VA (ADR-6) | Webhook → Worker; fallback transfer manual |
| Monitoring | Sentry (error) + PostHog (produk) | Aktif sejak hari pertama |

## Struktur repo (monorepo pnpm — lihat docs/TECH-STACK.md §Monorepo)

```
gerailo/
├── apps/web/        # SPA PWA: src/routes/, src/features/<modul>/, src/lib/api.ts
├── apps/worker/     # Hono: src/routes/, src/services/ (parser, kuota AI), src/webhooks/, wrangler.jsonc
├── packages/shared/ # zod schemas + tipe + money.ts (dipakai web & worker)
├── packages/supabase/ # migrations/*.sql + seed COA + types/db.ts (hasil `supabase gen types`)
└── AGENTS.md · docs/ · rules/ · skills/ · commands/ · plans/
```

Area suci (hanya berubah dengan golden test hijau): `apps/worker/src/services/parser`,
SQL RPC di `packages/supabase/migrations`, `packages/shared/src/money.ts`.
Founder menulis/memahami area ini; agent boleh scaffold UI & boilerplate.

## Lingkungan

- **local** → `supabase start` (stack lokal untuk test RPC) + `wrangler dev`
  (Worker + aset web lokal).
- **staging** → push `main` → GitHub Actions: migrasi (`supabase db push`) +
  `pnpm build` + `wrangler deploy` (env `staging`) ke domain staging; uji manual harian.
- **production** → tag `vYYYYMMDD` + approval GitHub Environment → migrasi + deploy
  env `production`; rollback via Cloudflare deployments.

## Keamanan minimum (bagian dari DoD tiap modul)

- RLS deny-by-default di semua tabel usaha; test negatif lintas `business_id` wajib.
- service_role, LLM_API_KEY, kunci gateway = wrangler secrets (Worker saja);
  CI grep bundle `apps/web`: dilarang ada `service_role`/`LLM_API_KEY`.
- Tulis jurnal/status/pembayaran hanya via RPC (REVOKE INSERT/UPDATE langsung pada
  `journal_*`, `payments`, `orders`); validasi input zod di Worker & di RPC.
- Rate limit endpoint AI, auth & halaman publik pembeli (Cloudflare WAF/rate-limiting +
  guard di aplikasi); halaman publik: token ≥128-bit, masking PII, label "terverifikasi"
  hanya setelah konfirmasi seller, tanpa cache SW (rules/00 §13).
- PDP (UU 27/2022): consent saat registrasi, hak akses/koreksi/hapus, retensi 90 hari
  pasca-berhenti langganan; log ekstraksi simpan teks asli hanya dengan persetujuan.

## ADR (kondensat — detail alasan di SSoT Bab 5)

| ID | Keputusan |
|---|---|
| ADR-1 | Beachhead: penjual WA order harian (frozen food + reseller, Bekasi-Cikarang) |
| ADR-2 | Platform MVP: PWA, bukan native |
| ADR-3 | Stack Next.js+TS+Supabase+Prisma (hosting awal Vercel — diganti ADR-9/ADR-10) |
| ADR-4 | Double-entry event-driven, COA 19 akun, HPP rata-rata bergerak, jurnal immutable |
| ADR-5 | Smart Paste hybrid: parser pola → AI fallback berkuota → konfirmasi wajib |
| ADR-6 | Gateway QRIS/VA lokal + fallback transfer manual; final hari ke-0 [TERBUKA] |
| ADR-7 | WhatsApp hanya sumber input: salin/share/Cloud API resmi; TANPA scraping |
| ADR-8 | LLM murah per-token hanya untuk kasus ambigu; asisten Q&A bulan ke-3 [TERBUKA] |

## ADR tambahan (tambahkan baris baru di sini saat keputusan baru diambil)

| ID | Tanggal | Keputusan | Alasan |
|---|---|---|---|
| ADR-9 | 19 Nov 2026 | Hosting Cloudflare Workers, bukan Vercel; rollback per deployment; dump backup ke R2 [akses DB awalnya Prisma+Hyperdrive — diganti ADR-10] | Infra, DNS & domain sudah di Cloudflare; satu atap domain + CDN + WAF |
| ADR-10 | 19 Nov 2026 | Stack frontend React+Vite SPA (bukan Next.js); TANPA ORM — supabase-js + RPC Postgres; satu Worker (Hono) untuk `/api/*` + aset statis; uang BIGINT + invariant trigger DB; AI hanya di Worker; offline-lite; service_role hanya Worker | Akurasi agent CLI (data latih React terbesar, tanpa RSC/use-client); lebih sedikit moving parts; SEO hanya untuk landing statis — lihat docs/TECH-STACK.md |
| ADR-11 | 20 Nov 2026 | Smart Transaction Page → modul MVP M8: halaman transaksi pembeli ber-token (tanpa login), share via WhatsApp, timeline buyer = turunan status; PDF P1 via print CSS; identitas toko = `store_profiles`/`bank_accounts` | Diferensiasi + kepercayaan buyer + saluran distribusi organik (powered-by); keputusan founder — docs/UI-UX.md §8, docs/MODULES/M8-SMART-TRANSACTION-PAGE.md |
| ADR-12 | 20 Nov 2026 | Digital Catalog & Product Showcase → modul M9 (dua fase): data foundation di M2 (foto/deskripsi/kategori/harga promo/tampil_katalog), katalog publik `/toko/:slug` read-only + share WA + QR + "Pesan via WhatsApp"→Smart Paste (Fase 1, W4-P1 bila sisa waktu), form pemesanan → tabel staging `order_leads` + `convert_order_lead` (Fase 2, bulan ke-2); TANPA sinkronisasi katalog WhatsApp Business di MVP | Diferensiasi (pilar Digital Catalog), bekerja untuk seller WA biasa, pola tulis-publik-ke-staging sama dengan M8; keputusan founder — docs/MODULES/M9-DIGITAL-CATALOG.md |
