---
description: PLAN ECC Gerailo — tulis plans/W<n>-<MODUL>.md lengkap dengan golden test matrix + kepemilikan lane, lalu berhenti untuk ACC.
---

Prasyarat: `GATE PREP` sudah **ACC**. Jika belum, jalankan `/ecc-prep` dan
berhenti.

Target: $ARGUMENTS

## Baca dulu

`docs/MODULES/<MODUL>.md` · `skills/<modul>/SKILL.md` · `rules/00` + rules domain ·
`docs/DATA-MODEL.md` + `docs/API-CONTRACTS.md` (bila RPC/endpoint) ·
`docs/ACCOUNTING-RULES.md` (bila keuangan) · `docs/ROADMAP.md` ·
`plans/TEMPLATE-PLAN.md` · `sop/SWARM-DISCIPLINE.md` · `LESSONS-LEARNED.md`.

## Tulis plan LENGKAP (bukan ringkasan)

1. **Tujuan sesi** + kondisi staging setelah sesi selesai.
2. **Task berurutan (urutan beku)**: migrasi SQL + `supabase gen types` →
   golden test MERAH → implement → wiring UI → CI/staging. Sertakan file utama
   per task dan status checkbox.
3. **Golden test matrix (WAJIB, ditetapkan di fase ini)**:

   | Test | Fixture | Assert | RED proof (cara membuktikan gagal) | File |
   |---|---|---|---|---|

   Fixture diturunkan dari `docs/` (bukan dari kode); tulis juga test negatif
   RLS dan edge case (mis. bayar berlebih, stok kurang).
4. **Lane & kepemilikan berkas**:

   | Lane | Agent | Boleh menulis | Serial/paralel | Gate |
   |---|---|---|---|---|

   Migrasi / RPC / jurnal / RLS / logika uang = **satu penulis, serial**.
   Lane aman paralel: riset (tanpa tulis), test MERAH, dokumentasi, teks UI.
5. **Definition of Done**: angka test target, smoke HP, review MERGE, jalur
   `docs/evidence/<m>/`, provenance deploy.
6. **Risiko + mitigasi + rollback**; **BACKLOG** untuk temuan di luar scope.

## Gate

Tampilkan ringkasan plan (task, jumlah golden test, lane) lalu cetak
`GATE PLAN: MENUNGGU ACC` dan **BERHENTI**. Jangan menulis kode/migrasi sebelum
ACC. Jika founder meminta perubahan, perbarui plan dulu, minta ACC ulang.
