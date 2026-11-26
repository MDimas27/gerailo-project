---
description: LAPORAN ECC Gerailo — tutup sesi: evidence, status AGENTS, LESSONS, dan provenance deploy.
---

Prasyarat: `/ecc-review` verdict **MERGE** (atau FIX yang sudah diperbaiki dan
hijau ulang). Jika belum, jangan tutup sesi.

## 1. Kumpulkan bukti (bukan klaim)

- Commit sesi: daftar `M<n>: <task>` (harus kecil, satu task satu commit).
- Angka test: pgTAP (`Files=..., Tests=...`), Vitest, lint, typecheck, build.
- Deploy: CI run id, commit, hash bundle `index-*.js`, Worker Version ID, tag.
- Smoke HP: screenshot + hasil per CEK.

## 2. Tulis evidence

- `docs/evidence/<m>/retest-results.json` mengikuti `docs/evidence/README.md`
  (`stamp`, `shotDir`, `results[]` dengan `nama`/`lulus`/`detail`).
- Screenshot `CEK<n>-<slug>.png` untuk setiap pemeriksaan manual.
- Jangan menaruh data pribadi (telepon/alamat penuh) di evidence.

## 3. Update dokumen

- `plans/W<n>-*.md`: task `[x]`, deviasi + alasan, hasil review, bukti.
- `AGENTS.md` status proyek: tanggal, CI, hash, version, angka test, catatan
  penting (maksimal beberapa baris; jangan menambah sejarah panjang).
- `LESSONS-LEARNED.md`: entri baru dengan nomor lanjut (fakta, ≤10 baris,
  `Tindakan:`). Satu pelajaran = satu entri.
- Bila ada keputusan arsitektur baru: catat ADR (jangan edit SSoT diam-diam).

## 4. Laporkan ke founder (urutan tetap)

1. **Hasil vs DoD** — apa yang sudah jalan di staging.
2. **Bukti** — angka test, hash, version id, CI run, evidence path.
3. **Deviasi** — apa yang berubah dari plan + alasan.
4. **Utang/backlog** — temuan di luar scope.
5. **Rekomendasi sesi berikut** — target + risiko.

## 5. Gate penutup

- Deployment tetap hanya via CI dari `main`; produksi hanya dari tag yang lolos
  CI + smoke HP.
- Jangan menyatakan "selesai" bila ada checklist HARD-RULES yang belum terbukti.

Cetak `LAPORAN SELESAI` + ringkasan ≤15 baris.
