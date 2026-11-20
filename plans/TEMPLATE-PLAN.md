# TEMPLATE-PLAN — Rencana Kerja Modul (isi salinan file ini, jangan edit template)

> W<n>-<MODUL>.md · dibuat oleh /plan pada <tanggal> · status: DRAFT | DISETUJUI | SELESAI

## Tujuan sesi
Satu paragraf: apa yang akan ada di staging setelah sesi ini selesai.

## Konteks yang dibaca
[ ] AGENTS.md  [ ] docs/MODULES/<MODUL>.md  [ ] skills/<modul>/SKILL.md
[ ] rules/00  [ ] rules/<domain>  [ ] docs/DATA-MODEL.md (jika migrasi/RPC)
[ ] docs/API-CONTRACTS.md (jika endpoint/RPC)  [ ] docs/ACCOUNTING-RULES.md (jika keuangan)
[ ] LESSONS-LEARNED (entri #..)

## Task berurutan (urutan beku)
| # | Task | Jenis | File utama | Selesai |
|---|---|---|---|---|
| 1 | Migrasi SQL <tabel/RPC> + `supabase gen types` (commit types bersama migrasi) | migrasi | packages/supabase/migrations/... | [ ] |
| 2 | Tulis golden test <fixture> (MERAH dulu) | test | apps/worker/tests/... | [ ] |
| 3 | Implement <logika> | kode | apps/worker/src/... atau packages/shared/... | [ ] |
| 4 | Wiring UI <halaman> | UI | apps/web/src/routes/... | [ ] |
| 5 | pnpm lint+test+build hijau & deploy staging (wrangler) | ops | — | [ ] |

## Daftar test (semua wajib di CI)
- Golden: <daftar fixture dari docs modul>
- Negatif RLS: <query lintas business_id ditolak>
- Edge: <mis. pembayaran berlebih ditolak>

## Definition of Done
- [ ] Test hijau (jumlah: ...)
- [ ] Verify manual 5 menit di HP (alur: ...)
- [ ] Review MERGE (rules 00–03 dicek)
- [ ] Status AGENTS.md + LESSONS-LEARNED diperbarui

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|

## Deviasi dari plan (diisi saat berjalan, dengan alasan)
- —

## BACKLOG (temuan sesi ini yang di luar scope)
- —
