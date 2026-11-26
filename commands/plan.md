---
description: Buat rencana kerja modul (fase PLAN loop ECC) → plans/W<n>-<MODUL>.md
---

> Legacy alias. Ritual mengikat: `/ecc-plan` (gate ACC wajib, lihat
> `.opencode/command/ecc-plan.md`).

Jalankan fase **PLAN** loop ECC Gerailo untuk target: $ARGUMENTS

1. Baca `AGENTS.md`, `docs/MODULES/<MODUL>.md`, skill `skills/<modul>/SKILL.md`,
   rules yang dirujuk, `docs/API-CONTRACTS.md` (bila menyentuh RPC/endpoint), dan
   `docs/ROADMAP.md` (posisi minggu).
2. Tulis `plans/W<n>-<MODUL>.md` mengikuti `plans/TEMPLATE-PLAN.md` secara PENUH:
   tujuan, task berurutan (migrasi SQL + gen types → golden test merah → implement →
   wiring UI → deploy staging), file dibuat/diubah, daftar test (termasuk fixture
   golden), DoD, risiko, estimasi sesi.
3. Scope check vs `docs/PRODUCT.md`: task di luar M1–M8 = hapus, catat ke
   bagian BACKLOG di plan bawah.
4. Tampilkan rencana ringkas untuk persetujuan founder. JANGAN coding.
