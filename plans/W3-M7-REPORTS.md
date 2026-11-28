# W3-M7-REPORTS.md — Rencana Kerja M7 Laporan & Export

> W3-M7 · dibuat `/ecc-plan` 27 Nov 2026 · status: **SELESAI PRODUKSI 28 Nov 2026** (tag `m7-production-v1` → `f6e1be6`)
> Prasyarat: M5 produksi (`023a5055…`); ACC PREP/PLAN M7 + 6 tambahan; prasyarat 0 (golden boundary bulan + rekap per-akun) lunas.

## Tujuan sesi
5 laporan MVP + export + PDF print, semuanya dari SQL views `security_invoker`
(tanpa angka paralel, tanpa neraca/CaLK):
1. **Dashboard 4 angka (DIPIN)**: penjualan bulan berjalan, laba kotor bulan
   berjalan, piutang+UMP saldo kini, nilai persediaan (saldo × HPP rata-rata +
   disclosure unit tanpa harga).
2. `/reports/daily`, `/reports/pnl`, `/reports/cashflow`, `/reports/receivables`
   (piutang & UMP **terpisah** + breakdown pelanggan; repeat analytics → M6).
3. Export CSV Worker (`rekap-harian`, `pnl`, `arus-kas`, `piutang-ump`,
   `persediaan` per produk) + PDF via print CSS (`Page.printToPDF`).
4. Footer "mengacu SAK EMKM" (rules/01 §11).

## Keputusan gate yang mengikat
| ID | Putusan |
|---|---|
| Q1 | 5 laporan + CSV + PDF, tanpa neraca/CaLK. Dashboard 4 angka DIPIN. Nilai persediaan = kartu dashboard + **CSV persediaan per produk**, BUKAN laba rugi v1. Dimensi pelanggan v1 hanya breakdown piutang/UMP. OTP 6 digit = ops founder. Cleanup `metode_bayar` tetap backlog. |
| Q2 | Views turunan `journal_lines`/`journal_entries`, `security_invoker`, nol agregasi paralel. Smoke terverifikasi di bisnis `Dapur Bu Siti Smoke` (`c1681709-…`) → RLS + filter `business_id`; **tanpa** flag/backfill/kolom baru. `.env` split ACC. |
| Q3 | Fixture Siti (240.000/165.000/75.000; kas 240.000; piutang 0 setelah lunas; 13×11.000=143.000). CSV angka mentah, tanggal ISO, escaping koma/kutip/baris baru, BOM. Piutang & UMP terpisah. RED probe route export. |
| Q4 | Bukti print-preview PDF; screenshot PII di-mask; cross-check UI vs REST JWT. |
| Q5 | CSV tanpa masking (data seller); yang di-mask hanya evidence. Target `<500ms @10k journal_lines`, bukti timing. Stop: ubah `_post_payment`/core jurnal, enum baru, angka paralel, kolom baru di tabel jurnal, export lintas usaha. |
| T1 | Kode akun dipin dari `docs/ACCOUNTING-RULES.md`: piutang **`1-1030`** (koreksi `1-1300` → `1-1030`), UMP **`2-2010`**. |
| T2 | `v_arus_kas` = **`1-1010` Kas + `1-1020` Bank/e-wallet** saja. |
| T3 | Route export: zod whitelist 5 jenis + `Content-Disposition: attachment; filename="<jenis>-YYYY-MM-DD.csv"`. |
| T4 | Assert Vitest: 4 angka dashboard = komposisi G1/G3/G4. |
| T5 | Substansi pasca-ACC → kolom Deviasi. |
| T6 | Smoke HP wajib; offline = **jadwal ulang, bukan skip**. |

## Pemetaan model (sop/MODEL-ROUTING.md)
Task 2 & 3a = GLM; Task 1/3b/4/5 = DeepSeek; 0a = founder; 0b bebas; laporan draft bebas + review GLM/founder.
**Deviasi di-ACC founder:** model aktif GLM mengerjakan seluruh task (dicatat di Deviasi).

## Task berurutan (satu task satu commit)
| # | Task | Jenis | File utama | Selesai |
|---|---|---|---|---|
| 0a | OTP 6 digit produksi → `docs/evidence/m7/ops-otp.md` | ops | evidence | [x] |
| 0b | `sop/MODEL-ROUTING.md` + 1 baris `AGENTS.md` + plan formal | docs | 2 file + plan | [x] |
| 1 | `.env` split `.env.staging`/`.env.production` + `.env.example` + dev `vite --mode staging` + docs | infra | `.env*`, docs/ENV-SETUP.md | [x] |
| 2 | pgTAP `0015_m7_reports_test.sql` MERAH → migrasi `0015_m7_reports.sql` → HIJAU + `gen types` | DB | tests + migrations + types | [x] |
| 3a | Golden test Vitest MERAH (persediaan/CSV/dashboard/route) | test | `apps/worker/tests`, `packages/shared` | [x] |
| 3b | Implementasi helper + route `GET /api/export/:jenis` | kode | shared + worker | [x] |
| 4 | UI dashboard 4 kartu + 4 route laporan + print CSS + unduh CSV | UI | `apps/web/src` | [x] |
| 5 | Gate kualitas + CI staging + smoke HP + evidence + timing | ops | `docs/evidence/m7/` | [x] |
| 6 | Prasyarat produksi (golden boundary bulan + rekap per-akun) + promosi + tag | docs/ops | plan + evidence | [x] |

## Golden test matrix
| # | Test | Assert | RED proof |
|---|---|---|---|
| G1 | `v_pnl_bulan` Siti | 240.000 / 165.000 / 75.000; beban 0 | view belum ada (0/17) |
| G2 | `v_arus_kas` (1-1010/1-1020) | masuk 240.000; keluar 0; nol akun non-kas | view belum ada |
| G3 | `v_piutang_ump` (**1-1030** vs **2-2010**) | piutang 140.000 → 0 setelah lunas; UMP terpisah (50.000 menggantung); nama pelanggan | view belum ada |
| G4 | Nilai persediaan | 13 × 11.000 = 143.000; unitTanpaHarga 1 | helper belum ada |
| G5 | CSV | BOM byte `EF BB BF`; escaping RFC-4180; angka mentah; ISO; whitelist; `Content-Disposition` | 4 file Vitest RED |
| G6 | RLS negatif | 3 views lintas usaha = 0 baris | pgTAP |
| G7 | Dashboard komposisi | 4 angka = G1/G3/G4 | Vitest RED |
| G8 | Boundary bulan P&L | `2026-11-01` match `2026-11`; `2026-1` tidak match | **MERAH 3/5** terhadap `bulan ===` |
| G9 | Performa | timing `<500ms @10k` (bukti evidence) | — |

## Definition of Done (tercapai)
- [x] pgTAP kanonik **`Files=15, Tests=475`**; Vitest **158**; RED probe tiap guard.
- [x] 5 laporan + 5 CSV + print PDF jalan di HP; smoke **10/10** produksi.
- [x] Angka UI = REST JWT + rekap per-akun; timing **90,4 ms @ ~80k lines**.
- [x] Evidence `docs/evidence/m7/` + `docs/evidence/m7/production/` (PII masked).
- [x] CI staging & produksi 4/4; provenance + tag `m7-production-v1`.
- [x] AGENTS/LESSONS/modul/plan tersinkron.

## Hasil eksekusi & bukti
- **pgTAP**: RED `relation public.v_pnl_bulan does not exist` (0/17) → HIJAU; kanonik `Files=15, Tests=475`.
- **Vitest**: 4 file RED → 153; setelah golden boundary bulan → **158**.
- **CI staging**: `46100547730`, `46102778602`, `46103496746`, `46109283876`, `46111609810` semua 4/4.
- **Smoke staging**: 9/9 (dashboard = REST JWT; CSV BOM+filename; printToPDF; PII mask).
- **Timing**: 90,433 ms @ ~80.084 `journal_lines` (`BEGIN…ROLLBACK`, tanpa data tertinggal).

## Promosi produksi (28 Nov 2026)
- Prasyarat: commit `f6e1be6` (golden boundary bulan MERAH 3/5 → HIJAU 5/5 + `scripts/evidence-rekap.mjs` + format rekap), CI `46111609810` 4/4.
- Deploy via CI `production.yml` (approval reviewer founder): run **`46111829074`** 4/4; migrasi **`0015_m7_reports.sql`** ter-apply; Worker `gerailo-production` Version **`3b4e9c52-6013-4ef5-bd36-e41c79cbbabb`**; bundle **`/assets/index-q9tXteDE.js`**; health OK.
- Smoke produksi `e8c955c3` **10/10**: dashboard = REST JWT (penjualan 615.000, laba 410.000, piutang+UMP 0, persediaan 993.000); rekap per-akun (kas 615.000; pendapatan 615.000; HPP 205.000; beban 0); `Σ CSV persediaan = 993.000`; 4 laporan; CSV BOM+filename; print PDF; PII di-mask.
- Tag **`m7-production-v1`** → `f6e1be6` (dokumen penutup di-push setelah tag).
- **Rollback**: Worker ke **`023a5055-2957-4e24-b104-f5fcbcb7813c`** (M5); `0015` **additive-only** (views + grants, tanpa perubahan tabel) → rollback app aman, DB forward-only.

## Deviasi dari plan (substansi pasca-ACC)
- **Model aktif ≠ pemetaan**: Task 1/3b/4/5 dikerjakan GLM (ACC founder); pemetaan `sop/MODEL-ROUTING.md` tetap untuk sesi berikutnya.
- **Assert BOM** diubah ke byte `EF BB BF` (commit `b1db4db`) karena `TextDecoder` memotong BOM.
- **Fix substansi post-ACC**: pemilihan bulan P&L via helper `pilihBarisBulan` (`slice(0,7)`) + golden boundary (commit `f6e1be6`); sebelumnya `startsWith` di komponen, dan perbandingan dua-sisi dengan fallback nol bisa false-PASS.
- **Koreksi kode akun**: `1-1300` → **`1-1030`** (UMP tetap `2-2010`) dipin dari `docs/ACCOUNTING-RULES.md`.

## BACKLOG (di luar scope M7)
- Cleanup data `metode_bayar` single-value (tetap backlog).
- Repeat analytics pelanggan → M6.
- Neraca penuh + wizard saldo awal + CaLK (bulan ke-2).
- Export PDF server-side (ADR terpisah bila dibutuhkan).
