---
description: Eksekusi rencana modul (fase EXECUTE loop ECC) — test-first di area suci, commit kecil, deploy staging.
---

Jalankan fase **EXECUTE** loop ECC Gerailo untuk rencana: $ARGUMENTS
(jika kosong, pakai plan terakhir yang belum selesai di `plans/`).

Aturan eksekusi (melanggar = revert):
1. Baca `plans/<PLAN>.md`, `rules/00-iron-rules.md`, dan rules domain yang relevan
   (01 accounting / 02 parser).
2. Urutan beku: migrasi SQL (`supabase db push` + `supabase gen types`, commit types
   bersama migrasi) → golden test MERAH dulu → implement → wiring UI — frontend
   MENGIKUTI design Google Stitch (`design/stitch/<layar>/code.html`; peta layar,
   keputusan divergensi, dan gap: `docs/STITCH-DESIGN.md`) dengan token & aturan
   `docs/UI-UX.md` menang di atas Stitch →
   `pnpm lint && pnpm test && pnpm build` (web & worker) hijau → deploy staging
   (`wrangler deploy`).
3. Satu commit per task, pesan `M<n>: <task>`. Jangan menumpuk task dalam satu commit.
4. Keputusan di luar plan (file baru, dependency baru, endpoint/RPC baru) = STOP dan
   tanyakan founder, atau usulkan edit plan secara sadar.
5. Di area suci (`apps/worker/src/services/parser`, SQL RPC
   `packages/supabase/migrations`, `packages/shared/src/money.ts`): jelaskan
   keputusan penting tiap commit 2–3 kalimat agar founder memahami.
6. Catat progress di plan (tandai task selesai) sejak berjalan, bukan di akhir saja.

Selesaikan dengan fase REVIEW (command /review) dan REMEMBER (command /remember).
