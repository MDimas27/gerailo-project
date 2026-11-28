# W3-M7-REPORTS.md — Rencana Kerja M7 Laporan & Export

> W3-M7 · dibuat oleh `/ecc-plan` 27 Nov 2026 · status: **DISETUJUI (GATE PLAN ACC 27 Nov 2026 — tanpa gerbang kedua)**
> Prasyarat: M5 produksi (`023a5055-2957-4e24-b104-f5fcbcb7813c`, `index-DpG1p5iU.js`); ACC PREP M7 (Q1–Q5) + 6 tambahan GATE PLAN.

## Tujuan sesi
5 laporan MVP + export + PDF print, semuanya dari SQL views `security_invoker`
(aturan: tanpa angka paralel, tanpa neraca/CaLK):
1. **Dashboard 4 angka (DIPIN)**: penjualan bulan berjalan, laba kotor bulan
   berjalan, piutang+UMP saldo kini, nilai persediaan (saldo × HPP rata-rata +
   disclosure unit tanpa harga).
2. `/reports/daily` (rekap harian), `/reports/pnl`, `/reports/cashflow`,
   `/reports/receivables` (piutang & UMP **terpisah** + breakdown pelanggan
   nama+telepon; repeat analytics → M6).
3. Export CSV per laporan (`rekap-harian`, `pnl`, `arus-kas`, `piutang-ump`) +
   **`persediaan` per produk** (produk, saldo, HPP, nilai, unit tanpa harga).
4. PDF = print browser (`window.print` + CSS cetak) dengan footer "mengacu SAK
   EMKM" (rules/01 §11).

## Konteks yang dibaca
[x] AGENTS.md · [x] sop/HARD-RULES.md · [x] sop/MODEL-ROUTING.md · [x] sop/SWARM-DISCIPLINE.md
[x] docs/MODULES/M7-REPORTS.md + skills/m7-reports/SKILL.md · [x] docs/DATA-MODEL.md (§Views)
[x] docs/ACCOUNTING-RULES.md (COA + fixture Siti) · [x] docs/API-CONTRACTS.md §A/§B/§C
[x] docs/UI-UX.md §keuangan + design/stitch/keuangan_sederhana · [x] LESSONS #50–#69
[x] rules/00–03 · [x] plans/TEMPLATE-PLAN.md · [x] verifikasi lokasi smoke (read-only, bisnis
`Dapur Bu Siti Smoke` `c1681709-…` — semua smoke di bisnis terpisah, tanpa flag/kolom baru)

## Keputusan gate yang mengikat (PREP Q1–Q5 + GATE PLAN)
| ID | Putusan |
|---|---|
| Q1 | ACC 5 laporan + CSV + PDF print, tanpa neraca/CaLK. Dashboard 4 angka DIPIN (di atas). Nilai persediaan = kartu dashboard + **CSV persediaan per produk** (putusan founder), BUKAN di laba rugi v1. Dimensi pelanggan v1 HANYA breakdown piutang/UMP (nama+telepon). OTP 6 digit = ops task founder sekarang (bukti dicatat). Cleanup `metode_bayar` tetap backlog. |
| Q2 | Views turunan `journal_lines`/`journal_entries`, `security_invoker = on`, nol agregasi paralel. Pengecualian smoke: **terverifikasi** semua smoke di bisnis `Dapur Bu Siti Smoke` (`c1681709-…`; order M4 `ORD-20261126-003` SELESAI + produk/order M5) → RLS + filter `business_id` menyelesaikan; **TIDAK ADA** flag/backfill/kolom baru; aturan ops "smoke hanya di akun smoke". `.env` split ACC (`.env.staging`/`.env.production` + CI inject + `.env.example`, tanpa secret). |
| Q3 | Fixture ACC (240.000/165.000/75.000; kas 240.000; piutang 0 setelah lunas; 13×11.000=143.000). RED probe wajib. Tiga tambahan: (1) CSV angka mentah tanpa `Rp`/pemisah, tanggal ISO, fixture produk berisi koma/kutip/baris baru, assert BOM; (2) **piutang & UMP tampil TERPISAH** (`1-1030` vs `2-2010`) sebagai pengingat UMP tertahan; (3) RED probe route export di Vitest. |
| Q4 | Bukti print-preview PDF; screenshot evidence **WAJIB mask telepon/email**; cross-check angka UI vs REST JWT (pola M4). |
| Q5 | CSV tanpa masking (data milik seller, RLS melindungi); yang di-mask hanya evidence. Performa `<500ms @10k journal_lines` = target, bukti timing di evidence. Stop: ubah `_post_payment`/core jurnal, enum baru, angka paralel, kolom baru di tabel jurnal, export lintas usaha. |
| T1 | **G3 pin kode akun dari migrasi aktual**: piutang **`1-1030`**, UMP **`2-2010`** (terverifikasi `docs/ACCOUNTING-RULES.md` §COA + seed 19 akun; koreksi `1-1300→1-1030` dicatat di LESSONS). |
| T2 | **`v_arus_kas` definisi eksplisit akun kas/bank** mengikuti `docs/ACCOUNTING-RULES.md`: **`1-1010` Kas + `1-1020` Bank/e-wallet** saja; item non-kas tidak masuk arus kas. |
| T3 | Route export: **zod whitelist jenis** (`rekap-harian`, `pnl`, `arus-kas`, `piutang-ump`, `persediaan`) + header `Content-Disposition: attachment; filename="<jenis>-YYYY-MM-DD.csv"` (tanggal ekspor ISO; `persediaan-YYYY-MM-DD.csv` untuk jenis persediaan). |
| T4 | **1 assert Vitest**: 4 angka dashboard dari fixture = **komposisi G1/G3/G4** (dihitung dari view/helper yang sama, bukan agregat kedua). |
| T5 | Substansi berubah pasca-ACC → wajib masuk kolom **Deviasi** + LESSONS. |
| T6 | **Task 5**: HP wajib reconnect; smoke offline = **dijadwalkan ulang, bukan dilewati (skip)**. |

## Pemetaan model per tugas (sop/MODEL-ROUTING.md)
| Task | Model |
|---|---|
| 0a OTP dashboard | Founder |
| 0b routing doc + plan formal | bebas |
| 1 `.env` split | DeepSeek 4.1 Flash |
| 2 migrasi views + pgTAP | **GLM 5.3 Flash** |
| 3a penulisan golden test Vitest | **GLM 5.3 Flash** |
| 3b implementasi helpers + route export | DeepSeek 4.1 Flash |
| 4 UI | DeepSeek 4.1 Flash |
| 5 gate + smoke + evidence | DeepSeek 4.1 Flash |
| Laporan | draft bebas + review GLM/founder |

> Bila model aktif berbeda dari pemetaan, catat di **Deviasi** + LESSONS.

## Task berurutan (urutan beku, satu task satu commit)
| # | Task | Jenis | File utama | Model |
|---|---|---|---|---|
| 0a | Founder ubah template OTP 6 digit produksi → bukti `docs/evidence/m7/ops-otp.md` (tanpa PII) | ops | evidence | founder |
| 0b | `sop/MODEL-ROUTING.md` + 1 baris `AGENTS.md` + plan formal ini | docs | 2 file + plan | bebas |
| 1 | `.env` split: `.env.staging`/`.env.production` (gitignored) + `.env.example` + dev `vite --mode staging` + `docs/ENV-SETUP.md`; CI inject tetap (ci.yml vars staging, production.yml env vars); verifikasi CI hijau | infra | `.env*`, docs/ENV-SETUP.md | DeepSeek |
| 2 | pgTAP `0015_m7_reports_test.sql` **MERAH** (views belum ada) → migrasi `0015_m7_reports.sql` (`v_pnl_bulan`, `v_arus_kas`, `v_piutang_ump` + grant; `security_invoker`) → **HIJAU** + `supabase gen types` | DB | tests + migrations + `types/db.ts` | **GLM** |
| 3a | Golden test Vitest **MERAH**: helper nilai persediaan + formatter CSV (BOM/RFC-4180/angka mentah/tanggal ISO/escaping) + assert dashboard komposisi + RED probe route (401 tanpa JWT, whitelist) | test | `apps/worker/tests`, `packages/shared` | **GLM** |
| 3b | Implementasi: helper `nilaiPersediaan`/`csvEscape`/`csvBom` di shared; route Worker `GET /api/export/:jenis` (JWT + zod whitelist + streaming CSV + Content-Disposition) → **HIJAU** | kode | `packages/shared/src`, `apps/worker/src/routes` | DeepSeek |
| 4 | UI: dashboard 4 kartu + 4 route laporan + print CSS + footer SAK EMKM; uang hanya `money.ts`; TanStack Query | UI | `apps/web/src` | DeepSeek |
| 5 | Gate kualitas (`pnpm lint/typecheck/test/build` + pgTAP) → CI staging hijau → **smoke HP wajib (reconnect dulu; offline = jadwal ulang)** dengan evidence PII-masked + cross-check REST JWT + bukti timing `<500ms @10k` + print-preview PDF | ops | `docs/evidence/m7/` | DeepSeek |
| 6 | `/ecc-review` → `/ecc-laporan` (status AGENTS, LESSONS, modul M7) | docs | — | draft bebas + review GLM/founder |

## Golden test matrix (ditetapkan di PLAN; fixture dari docs, bukan kode)
| # | Test | Fixture | Assert | RED proof | File |
|---|---|---|---|---|---|
| G1 | `v_pnl_bulan` (akrual) | Siti: 3×75.000+ongkir 15.000, DP 100.000, kirim, lunas 140.000; HPP 165.000 | bulan berjalan: pendapatan **240.000**, HPP **165.000**, laba kotor **75.000**; beban 0 | view belum ada → query error `relation does not exist` | `0015_m7_reports_test.sql` |
| G2 | `v_arus_kas` (metode langsung, **hanya 1-1010/1-1020**) | fixture Siti (kas 1-1010) | kas masuk **240.000**; tidak ada item non-kas | view belum ada | `0015` |
| G3 | `v_piutang_ump` (pin kode **`1-1030`** vs **`2-2010`**) | order DIKIRIM belum lunas → pelunasan | piutang muncul lalu **0**; UMP tetap; **kolom terpisah** + nama/telepon pelanggan; breakdown per order | view belum ada | `0015` |
| G4 | Helper nilai persediaan | produk saldo 13, HPP 11.000; produk kedua saldo 5, HPP 0 | nilai **143.000**; `unitTanpaHarga = 1`; disclosure label | helper belum ada (Vitest) | `packages/shared` |
| G5 | CSV | nilai berisi koma/kutip/baris baru; angka BIGINT; tanggal ISO | BOM `EF BB BF`; RFC-4180 (kutip ganda dilarang lolos); tanpa `Rp`/pemisah ribuan; `Content-Disposition` `<jenis>-YYYY-MM-DD.csv`; 401 tanpa JWT; jenis di luar whitelist ditolak | Vitest route RED | `apps/worker/tests` |
| G6 | RLS negatif | usaha B membaca views usaha A | 0 baris; export lintas usaha tidak ada (views security_invoker) | pgTAP | `0015` |
| G7 | Dashboard komposisi (T4) | gabungan G1+G3+G4 | 4 angka dashboard **=** komposisi komponen yang sama (bukan agregat kedua) | Vitest RED sebelum helper | `packages/shared` |
| G8 | Performa | 10k journal_lines | bukti timing `<500ms` di evidence (bukan assert) | — | evidence |

## Lane & kepemilikan berkas
| Lane | Menulis | Serial/paralel | Gate |
|---|---|---|---|
| L1 DB/views/pgTAP/types | `0015_*` + `types/db.ts` | **SERIAL** | MERAH→HIJAU |
| L2 shared + worker (test dulu) | `packages/shared`, `apps/worker` | SERIAL setelah L2 | MERAH→HIJAU |
| L3 UI | `apps/web/src` | setelah L2 | build hijau |
| L4 docs/evidence | `docs/`, `plans/`, `sop/`, `LESSONS-LEARNED.md` | bebas | review |

## Definition of Done
- [ ] pgTAP hijau dengan angka kanonik = CI hijau terakhir, dicatat LESSONS.
- [ ] Vitest hijau termasuk G4/G5/G7; RED probe tiap guard ada buktinya.
- [ ] 5 laporan + 5 CSV + print-preview PDF jalan di HP (smoke **wajib**; offline = jadwal ulang).
- [ ] Angka UI = REST JWT (pola M4); timing `<500ms @10k` tercatat.
- [ ] Evidence `docs/evidence/m7/` (retest-results.json + screenshot **PII-masked** + `ops-otp.md` + timing).
- [ ] CI staging 4/4; provenance (commit, run id, bundle hash); promosi produksi = workflow_dispatch + approval founder + tag.
- [ ] AGENTS/LESSONS/modul/plan diperbarui.

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| `.env` split merusak build lokal/CI | verifikasi CI hijau sebelum lanjut; `.env.example` + docs; tanpa secret di repo |
| View tidak journal-pure | review Q2; semua angka dari `journal_lines`/`journal_entries`; grep angka paralel |
| CSV salah escaping/BOM | golden G5 dengan fixture jahat; buka via Excel saat smoke |
| PII bocor di evidence | mask telepon/email di screenshot; CSV boleh mentah (RLS) |
| Smoke device offline | **jadwal ulang, bukan skip** (T6) |

## Deviasi dari plan (substansi pasca-ACC wajib masuk sini)
- —

## BACKLOG (di luar scope M7)
- Cleanup data `metode_bayar` single-value warisan (tetap backlog — ACC Q1).
- Repeat analytics pelanggan → M6.
- Neraca penuh + wizard saldo awal + CaLK (bulan ke-2, SSoT 6.2).
- Export PDF server-side (ADR terpisah bila benar-benar dibutuhkan).
