# W1-FONDASI-M2-PRODUCTS.md — Contoh plan TERISI (hasil /plan minggu ke-1)

> W1-FONDASI-M2 · dibuat 19 Nov 2026 oleh /plan · status: DISETUJUI
> (Contoh pemakaian kit ini; sesi W1 dibagi 2: W1a infra, W1b M2.)
> Stack mengikuti ADR-10: React+Vite SPA + Hono Worker + Supabase tanpa ORM.

## Tujuan sesi
Setelah sesi ini: monorepo dengan CI jalan, satu Worker (API + aset SPA) online di
staging, skema DB inti (businesses/accounts/app_settings/products/product_variants/
stock_movements) + RPC create_business & record_stock_move + auth + CRUD produk +
onboarding minimal (M1 parsial) jalan di staging.

## Konteks yang dibaca
[x] AGENTS.md  [x] docs/TECH-STACK.md  [x] docs/MODULES/M1-ONBOARDING.md
[x] docs/MODULES/M2-PRODUCTS.md  [x] skills/m1-onboarding/SKILL.md
[x] skills/m2-products/SKILL.md  [x] rules/00, 03  [x] docs/DATA-MODEL.md
[x] docs/API-CONTRACTS.md  [x] docs/ENV-SETUP.md  [x] docs/ROADMAP.md

## Task berurutan (urutan beku)
| # | Task | Jenis | File utama | Selesai |
|---|---|---|---|---|
| 1 | Scaffold monorepo pnpm: apps/web (Vite+React+TS strict+Tailwind+shadcn+TanStack Query+react-router+zod), apps/worker (Hono), packages/shared (money.ts+zod schemas), packages/supabase; CI GitHub Actions (lint/test/build; push main = deploy staging) | infra | pnpm-workspace.yaml, .github/workflows/ci.yml | [x] |
| 2 | Cloudflare: wrangler.jsonc 2 env + static assets binding (SPA); `GET /api/health` + SPA shell online di staging; secrets via `wrangler secret put` | infra | apps/worker/wrangler.jsonc | [x] |
| 3 | Migrasi 0001: businesses, accounts, app_settings + RLS deny-by-default + policy + RPC `create_business` (usaha+19 COA+settings, SECURITY DEFINER + guard auth.uid()) + `supabase gen types` | migrasi | packages/supabase/migrations/0001 | [x] |
| 4 | Test RPC `create_business` (19 akun, rollback saat gagal) + test negatif RLS (Supabase lokal `supabase start`) | test | packages/supabase/tests/ | [x] |
| 5 | Auth supabase-js (register/login OTP) + wizard profil usaha memanggil RPC `create_business` + consent checkbox | kode | apps/web/src/routes/auth | [x] |
| 6 | Migrasi 0002: products, product_variants (unique alias + trigram), stock_movements + fungsi DB kuota paket (FREE 100/STARTER 500) + RPC `record_stock_move` + gen types | migrasi | packages/supabase/migrations/0002 | [ ] |
| 7 | Test: alias duplikat ditolak, harga BIGINT >0, produk ke-101 FREE ditolak, stok awal = movement MASUK, RLS negatif | test | packages/supabase/tests/ | [ ] |
| 8 | UI produk (shadcn + TanStack Query): /products list+new+edit, cari instan (ilike/trigram), soft-delete, stok awal via RPC, harga tampil via money.ts | UI | apps/web/src/features/products | [ ] |
| 9 | UI onboarding wizard 3 langkah (versi minim) + demo Smart Paste placeholder (chat Siti hardcoded) | UI | apps/web/src/routes/onboarding | [ ] |
| 10 | pnpm lint+test+build hijau & deploy staging; verify HP | ops | — | [ ] |

## Daftar test (wajib di CI)
- Golden: `create_business` → 19 akun COA (daftar kode = docs/ACCOUNTING-RULES.md §COA)
- Negatif RLS: usaha A gagal query usaha B (products & accounts)
- Edge: alias duplikat; harga 0/negatif; produk ke-101 paket FREE ditolak dengan
  pesan upgrade; soft-delete tetap terlihat di order lama (siap M4); insert jurnal
  timpang langsung ke DB ditolak trigger (sudah di migrasi 0003 nanti W3 — siapkan
  sketsanya di 0001)

## Definition of Done
- [x] Test hijau (target: ≥14 test)
- [ ] Verify manual di HP: register → buat usaha (19 akun) → tambah 3 produk → cari
- [x] Review MERGE (rules 00–03; grep bundle web: tanpa service_role/LLM_API_KEY)
- [x] Status AGENTS.md + LESSONS-LEARNED diperbarui

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| RLS Supabase salah konfigurasi | Test negatif task 4 sebelum UI; policy deny-by-default |
| Types drift (skema berubah tanpa gen types) | CI: jalankan gen types + `git diff --exit-code` pada types/db.ts |
| Konfigurasi static assets/wrangler salah | PoC task 2 hari pertama; env staging dulu sebelum prod |
| CI lambat (build >10 menit) | Cache pnpm/vite; mulai minimal, tambah paralel |
| KYC gateway belum jalan | Tidak menghalangi W1 — hanya checklist paralel (ENV-SETUP §1) |

## Deviasi dari plan
- (diisi saat berjalan)
- Task 2: deploy staging selesai 21 Nov 2026 di `https://gerailo-staging.mdimas-jobs.workers.dev`. `/api/health` 200, `/` dan `/auth/login` 200 SPA fallback, render nyata ok. `VITE_*` dibaca dari `.env` root via `envDir`, CI deploy memakai GitHub vars.
- Task 3 dikerjakan lebih dulu secara lokal sambil menunggu login Cloudflare (tidak butuh kredensial; memakai Supabase lokal di Docker). Selesai: `db reset` + `gen types` ter-commit.
- Task 4: 14 test pgTAP hijau (`supabase test db`), mencakup 19 COA, 1 app_settings, rollback validasi, rollback saat seed COA gagal, RLS A/B, dan anon ditolak. CI job `db-tests` ditambahkan (migrasi + pgTAP + type drift).
- Task 5: alur UI nyata lolos via Chrome CDP di Supabase lokal: daftar OTP (template email lokal ditambah `{{ .Token }}`) → wizard profil usaha → beranda menampilkan usaha. Rate limit email lokal dinaikkan ke 100 untuk dev.
- Cloud staging: migrasi `0001` di-push manual (`migration list` remote = 0001). REST `businesses`/`accounts` → 200 `[]`, RPC `create_business` oleh anon → 401 (sesuai grant). CI job `db-migrate-staging` sempat sukses lalu gagal karena host `db.<ref>` hanya IPv6; workflow diubah memakai session pooler Sydney (`aws-0-ap-southeast-2.pooler.supabase.com:5432`), tanpa secret baru.
- Cloud auth: `supabase config push` menyetel Site URL + redirect URLs staging, `otp_length=6`, `enable_confirmations=false`. Free tier menolak ubah template email (`entitlement_required`), jadi email staging = tautan masuk default (bukan kode 6 digit); UI copy disesuaikan. Smoke test cloud 21 Nov 2026 PASS via email nyata/disposable: kirim OTP → klik tautan → onboarding → beranda "Dapur Uji Staging".

## BACKLOG
- Import CSV produk (W4 jika sisa waktu)
- Demo video onboarding (bukan MVP)
