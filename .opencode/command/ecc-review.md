---
description: REVIEW ECC Gerailo — audit diff terhadap HARD-RULES + rules/00-03, beri verdict MERGE/FIX/REVERT dengan bukti.
---

Prasyarat: fase EXECUTE selesai, test hijau, dan diff sesi tersedia (git diff /
daftar commit `M<n>: ...`). Jika test belum hijau, **jangan review** — kembali ke
EXECUTE.

## 1. Kumpulkan bukti

- Diff berkas yang berubah + daftar commit (harus satu task satu commit).
- Angka test: pgTAP (`Files=..., Tests=...`), Vitest, `pnpm lint`, `pnpm typecheck`,
  `pnpm build`.
- Bila ada smoke HP: bukti di `docs/evidence/<m>/`.

## 2. Audit HARD-RULES (`sop/HARD-RULES.md`)

- [ ] **Core posting tunggal**: tidak ada duplikasi logika `_post_payment`;
      RPC baru memanggil helper, bukan INSERT manual.
- [ ] **Tanpa enum/status baru**; retur memakai RPC `gagal_kirim`, bukan status baru.
- [ ] **Setiap guard punya bukti MERAH** (probe/test gagal sebelum guard).
- [ ] **Retur HPP** membaca snapshot `stock_movements.harga_beli` (KELUAR),
      bukan harga produk terkini.
- [ ] **Angka pgTAP kanonik** = angka pada CI hijau terakhir, dicatat di
      LESSONS (selisih wajib dijelaskan).
- [ ] **Provenance deploy**: CI run id, hash bundle, Worker Version ID, tag.

## 3. Audit rules/00 + domain

- Jurnal immutable; tidak ada UPDATE/DELETE `journal_*`; debit = kredit.
- Tidak ada query data usaha tanpa filter `business_id`; RLS utuh.
- Uang BIGINT; parse/format hanya `packages/shared/src/money.ts`; tidak ada
  `Number()` pada uang di komponen.
- Tidak ada `service_role`/`LLM_API_KEY`/secret di bundle web.
- Scope: tidak ada fitur di luar M<n> (temuan → BACKLOG).
- `rules/01` (akuntansi), `rules/02` (parser), `rules/03` (git/deploy) sesuai area.

## 4. Verdict (pilih satu)

- **MERGE** — semua checklist lolos, test hijau, bukti lengkap.
- **FIX** — daftar temuan + file:baris + perbaikan yang diminta; catat di plan;
  jangan deploy sampai hijau ulang.
- **REVERT** — pendekatan salah; jelaskan alternatif.

Tulis hasil ke `plans/W<n>-*.md` bagian **Review** (temuan, verdict, tanggal),
lalu cetak ringkasan ≤10 baris: temuan terbanyak, verdict, langkah berikutnya.

Bukti > klaim. Jangan meloloskan diff karena "terlihat benar".
