---
name: m7-reports
description: >
  SOP membangun modul M7 Laporan & Export (SQL views security_invoker atas
  journal_lines; rekap harian, laba rugi, arus kas, piutang/UMP, dashboard;
  export CSV via Worker, PDF via print browser). Gunakan saat founder minta
  mengerjakan M7/laporan/export.
---

# Skill: M7 — Laporan & Export

## Konteks wajib dibaca dulu
`AGENTS.md` → `rules/01-accounting-safety.md` §10–11 → `docs/MODULES/M7-REPORTS.md` →
`docs/DATA-MODEL.md` §Views → `docs/ACCOUNTING-RULES.md` (fixture verifikasi angka).

## Urutan build (test-first)
1. Tulis test angka dari fixture Siti: laba rugi = pendapatan 240.000 / HPP
   165.000 / laba 75.000; arus kas = masuk 240.000 (MERAH).
2. Migrasi: views `v_rekap_harian, v_pnl_bulan, v_arus_kas, v_piutang_ump`
   (SQL murni atas journal_lines/orders, `security_invoker = on`) + index yang
   dibutuhkan. `supabase gen types`.
3. Dashboard 4 angka + rekap harian (dipakai sehari-hari; buat dulu) via
   TanStack Query.
4. Laba rugi bulanan (akrual: pendapatan saat DIKIRIM) + arus kas metode langsung
   (hanya akun kas 1-1010/1-1020; tanpa item non-kas) + piutang & UMP.
5. Export CSV: route Worker `GET /api/export/:jenis` (JWT, streaming, RFC-4180 +
   BOM UTF-8; test buka tanpa angka rusak). PDF: window.print + CSS cetak.
6. Halaman per laporan + filter periode; label "mengacu SAK EMKM" di footer.
7. `pnpm build` + test hijau → deploy staging → verify manual: cocokkan 3 angka
   kunci dengan fixture.

## Review check khusus M7
- TIDAK ADA tabel/angka paralel — jika laporan ≠ jurnal, perbaiki view (rules/01 §10).
- NERACA & CaLK tidak ditampilkan (bulan ke-2) — scope freeze.
- Performa: laporan bulanan <500ms @10k journal_lines (EXPLAIN tanpa seq scan berat).
- RLS: laporan A tidak pernah menampilkan data usaha B (security_invoker teruji).

## DoD ringkas
5 laporan + export jalan di HP; angka cocok fixture; performa oke; RLS;
status diperbarui (ecc-remember).
