---
name: ecc-core
description: >
  SOP alur inti ECC (Everything Claude Code, adaptasi Gerailo): prep → gate ACC →
  plan → gate ACC → execute (test-first) → review → laporan. Gunakan skill ini DI
  SETIAP sesi sebelum menjalankan skill modul, atau ketika founder meminta
  membangun sesuatu dan tidak menyebut skill spesifik.
---

# Skill: ecc-core (loop sesi ECC)

## Prasyarat
- Baca `AGENTS.md` (wajib pertama) + `sop/HARD-RULES.md`.
- Ada satu target jelas: modul (M1–M8, atau M9 sesuai ADR-12) atau potongan dari `plans/`.
- Ritual mengikat: `/ecc-prep` → `/ecc-plan` → EXECUTE → `/ecc-review` → `/ecc-laporan`.

## Fase 1 — PREP (muat konteks, jangan coding)
1. Baca `AGENTS.md`, `sop/HARD-RULES.md`, `LESSONS-LEARNED.md` (#50–akhir),
   `docs/TECH-STACK.md` (ringkas), `docs/PRODUCT.md`, plan aktif.
2. Laporkan: (a) posisi proyek & modul selesai, (b) target sesi, (c) peringatan
   LESSONS/HARD-RULES yang relevan, (d) halangan (KYC, secret hilang, types belum di-gen).
3. Tulis ringkasan pemahaman ≤10 baris + **5 pertanyaan gate** (scope, data/safety,
   golden test, bukti, risiko). Cetak `GATE PREP: MENUNGGU ACC` dan berhenti.
   Jangan menulis kode/migrasi sebelum founder menjawab ACC.

## Fase 2 — PLAN (rencana = kontrak sesi)
1. Baca `docs/MODULES/<MODUL>.md` + `skills/<modul>/SKILL.md` + rules yang dirujuk
   + `docs/API-CONTRACTS.md` (RPC/endpoint) + `docs/UI-UX.md` (UI) +
   `docs/ACCOUNTING-RULES.md` (keuangan).
2. Tulis `plans/W<n>-<MODUL>.md` mengikuti `plans/TEMPLATE-PLAN.md`: task berurutan
   (migrasi SQL → golden test MERAH → implement → wiring UI → CI staging),
   **golden test matrix** (fixture, assert, cara bukti MERAH), **lane + kepemilikan
   berkas**, DoD, risiko.
3. Tampilkan ringkasan, cetak `GATE PLAN: MENUNGGU ACC`, berhenti. Koreksi founder
   diterapkan ke plan lalu minta ACC ulang.
4. Scope check: setiap task di luar modul = hapus + catat backlog. Migrasi/RPC/
   jurnal/RLS/logika uang = satu penulis, serial.

## Fase 3 — EXECUTE (test-first di area suci)
1. Urutan beku: migrasi SQL (`supabase migration new` + `supabase db push` lokal) →
   `supabase gen types` + commit types → golden test (MERAH dulu) → implement
   (UI: TanStack Query + shadcn; Worker: Hono + zod) → `pnpm lint/test/build` hijau.
2. Satu commit per task, format `M<n>: <task>`. Migrasi skema + gen types satu commit.
3. Deployment HANYA via CI dari `main` (push → CI → staging); jangan `wrangler deploy`
   dari laptop. Produksi hanya dari tag yang lolos CI + smoke HP.
4. Setiap guard baru wajib punya bukti MERAH (probe/test gagal sebelum guard).
5. Jika perlu file/fitur di luar plan: STOP, tunjukkan pilihan (masukkan plan /
   jadwalkan berikutnya). Jangan diam-diam.

## Fase 4 — REVIEW + VERIFY
1. Audit diff terhadap `sop/HARD-RULES.md` + `rules/00..03`: core posting tunggal
   `_post_payment`, tanpa enum/status baru, snapshot HPP retur, pgTAP 434 kanonik,
   jurnal immutable, RLS, BIGINT via money.ts, tanpa kredensial di bundle web.
2. Jalankan `pnpm lint && pnpm test && pnpm build` (web & worker) + test RPC di
   Supabase lokal. Wajib hijau sebelum verdict.
3. Verdict MERGE / FIX / REVERT, catat di plan. Minta founder verify manual 5 menit
   di HP (staging) untuk MERGE.

## Fase 5 — LAPORAN (jangan pernah dilewati)
1. Jalankan `/ecc-laporan`: tulis `docs/evidence/<m>/retest-results.json`, update
   status `AGENTS.md`, tambah `LESSONS-LEARNED.md` (nomor lanjut), tandai task plan.
2. Catat provenance deploy: CI run id, commit, hash bundle, Worker Version ID, tag.
3. Jika scope/keputusan berubah → tandai file docs/SSoT yang perlu revisi (jangan
   edit blueprint diam-diam).

## Anti-pattern (hentikan jika muncul)
- Menulis kode sebelum gate ACC → REVERT ke PREP.
- Membangun fitur "bonus" di luar plan → REVERT.
- Test ditulis belakangan "biar cepat" → kembalikan urutan.
- Menyalin logika `_post_payment` atau menulis journal_*/status langsung dari klien → REVERT.
- Menambah enum/status tanpa ADR → REVERT.
- `useEffect`+fetch manual untuk data (harus TanStack Query) → REVERT.
- Deploy manual dari laptop → STOP; gunakan CI.
- Sesi panjang >2 modul → sarankan sesi baru.
