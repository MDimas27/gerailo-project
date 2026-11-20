---
name: ecc-core
description: >
  SOP alur inti ECC (Everything CLAUDE Code, adaptasi Gerailo): prep → plan →
  execute (test-first) → review+verify → remember. Gunakan skill ini DI SETIAP
  sesi sebelum menjalankan skill modul, atau ketika founder meminta membangun
  sesuatu dan tidak menyebut skill spesifik.
---

# Skill: ecc-core (loop sesi ECC)

## Prasyarat
- Baca `AGENTS.md` (wajib pertama).
- Ada satu target jelas: modul (M1–M8) atau potongan modul dari `plans/`.

## Fase 1 — PREP (muat konteks, jangan coding)
1. Baca `AGENTS.md`, `docs/TECH-STACK.md` (ringkas), `docs/PRODUCT.md`,
   `LESSONS-LEARNED.md`.
2. Laporkan 4 hal: (a) posisi proyek & modul selesai, (b) modul/potongan target
   sesi ini, (c) peringatan dari LESSONS-LEARNED yang relevan, (d) halangan
   (mis. KYC, secret hilang, types belum di-gen).
3. Berhenti & tanya founder HANYA jika target tidak jelas. Kalau jelas, lanjut.

## Fase 2 — PLAN (rencana = kontrak sesi)
1. Baca `docs/MODULES/<MODUL>.md` + `skills/<modul>/SKILL.md` + rules yang dirujuk
   + `docs/API-CONTRACTS.md` bila menyentuh RPC/endpoint + `docs/UI-UX.md` bila
   membangun UI.
2. Tulis `plans/W<n>-<MODUL>.md` mengikuti `plans/TEMPLATE-PLAN.md`: task berurutan
   (migrasi SQL → golden test → implement → wiring UI → deploy), file yang
   dibuat/diubah, daftar test, DoD, risiko.
3. Tunjukkan rencana untuk disetujui founder. Koreksi langsung terapkan.
4. Scope check: setiap task di luar M1–M8 = hapus + catat backlog.

## Fase 3 — EXECUTE (test-first di area suci)
1. Urutan beku: migrasi SQL (`supabase migration new` + `supabase db push` lokal) →
   `supabase gen types` + commit types → golden test (MERAH dulu) → implement
   (UI: TanStack Query + shadcn; Worker: Hono + zod) → `pnpm build` + test hijau →
   `wrangler deploy` staging.
2. Satu commit per task, format `M<n>: <task>`. Migrasi skema + gen types satu commit.
3. Jika menyadari perlu file/fitur di luar plan: STOP, tunjukkan pilihan
   (masukkan plan / jadwalkan berikutnya). Jangan diam-diam.
4. Area suci (`apps/worker/src/services/parser`, SQL RPC di
   `packages/supabase/migrations`, `packages/shared/src/money.ts`): founder ikut
   memahami diff — jelaskan keputusan penting 2–3 kalimat saat commit.

## Fase 4 — REVIEW + VERIFY
1. Self-review diff terhadap `rules/00..03`: keseimbangan jurnal (RPC+trigger),
   RLS, BIGINT via money.ts, tanpa kredensial, tanpa tulis journal_* di luar RPC,
   parser tidak menebak, tidak ada `service_role`/`LLM_API_KEY` di bundle web.
2. Jalankan `pnpm lint && pnpm test && pnpm build` (web & worker) + test RPC di
   Supabase lokal (`supabase start`). Wajib hijau.
3. Minta founder verify manual 5 menit di HP (staging). Catat temuannya.

## Fase 5 — REMEMBER (jangan pernah dilewati)
1. Jalankan skill `ecc-remember`: tulis LESSONS-LEARNED, perbarui status modul di
   `AGENTS.md`, tandai task plan selesai.
2. Jika scope/keputusan berubah → tandai file docs/ mana yang perlu revisi + SSoT.

## Anti-pattern (hentikan jika muncul)
- Membangun fitur "bonus" di luar plan → REVERT.
- Test ditulis belakangan "biar cepat" → kembalikan urutan.
- Menulis journal_*/orders status langsung dari klien (bukan RPC) → REVERT.
- `useEffect`+fetch manual untuk data (harus TanStack Query) → REVERT.
- Menambah dependency tanpa alasan di plan → STOP.
- Sesi panjang >2 modul → sarankan sesi baru.
