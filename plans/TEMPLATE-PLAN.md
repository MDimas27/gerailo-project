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

## Golden test matrix (WAJIB — ditetapkan di fase PLAN, bukan saat coding)
| # | Test | Fixture (sumber dokumentasi) | Assert | RED proof (cara bukti gagal) | File |
|---|---|---|---|---|---|
| 1 | | | | | |

> Fixture diturunkan dari `docs/`, bukan dari implementasi. Setiap guard baru
> wajib punya "RED proof": test/probe yang GAGAL sebelum guard dipasang (lihat
> `sop/HARD-RULES.md` §3).

## Lane & kepemilikan berkas (wajib bila sesi memakai swarm)
| Lane | Agent | Boleh menulis | Serial/paralel | Gate |
|---|---|---|---|---|
| | | | | |

> Migrasi/RPC/jurnal/RLS/logika uang = satu penulis, serial. Lane aman paralel:
> riset (tanpa tulis), test MERAH, dokumentasi, teks UI (`sop/SWARM-DISCIPLINE.md`).

## Test pendukung
- Negatif RLS: <query lintas business_id ditolak>
- Edge: <mis. pembayaran berlebih ditolak, stok kurang ditolak>

## Definition of Done
- [ ] Test hijau (jumlah: ...)
- [ ] Golden test terbukti MERAH dulu (commit/test merah dicatat)
- [ ] Verify manual 5 menit di HP (alur: ...)
- [ ] Review MERGE (rules 00–03 + `sop/HARD-RULES.md` dicek)
- [ ] Evidence `docs/evidence/<m>/` + provenance (CI run, hash bundle, version id)
- [ ] Status AGENTS.md + LESSONS-LEARNED diperbarui

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|

## Deviasi dari plan (diisi saat berjalan, dengan alasan)
- —

## BACKLOG (temuan sesi ini yang di luar scope)
- —
