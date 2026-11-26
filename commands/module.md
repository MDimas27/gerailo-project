---
description: Jalankan satu modul end-to-end dalam satu sesi (PREP→PLAN→EXECUTE→REVIEW→REMEMBER loop ECC penuh).
---

Kerjakan modul: $ARGUMENTS — gunakan loop ECC penuh dalam sesi ini.

1. `/ecc-prep` → 2. `/ecc-plan <modul>` → gate ACC → 3. `/execute <plan>`
→ 4. `/ecc-review` → 5. minta verify manual founder di HP → 6. `/ecc-laporan`.

Aturan sesi tunggal:
- Modul boleh dikerjakan penuh HANYA jika plan tidak melebihi ~10 task; kalau lebih,
  pecah: kerjakan bagian pertama, sisanya jadwal sesi berikutnya (tulis di antrian
  LESSONS-LEARNED).
- Jangan lanjut fase tanpa gate: plan disetujui, test hijau, review MERGE, verify manual.
- Jika ada bagian modul yang prasyaratnya belum ada (modul lain belum selesai),
  STOP di PREP dan laporkan urutan build yang benar (lihat docs/MODULES §Urutan build).
