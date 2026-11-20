---
description: Review diff sesi ini terhadap rules + verifikasi test (fase REVIEW/VERIFY loop ECC). Hasil: MERGE / FIX / REVERT.
---

Jalankan fase **REVIEW + VERIFY** loop ECC Gerailo untuk perubahan sesi ini.

1. Kumpulkan diff (commit sejak plan dimulai) dan review terhadap:
   - `rules/00-iron-rules.md` (semua 12 butir, khususnya jurnal immutable, RLS,
     BIGINT via money.ts, kredensial, scope).
   - `rules/01-accounting-safety.md` bila menyentuh jurnal/stok/HPP.
   - `rules/02-parser-safety.md` bila menyentuh Smart Paste/AI.
   - `rules/03-git-deploy-discipline.md` untuk commit/branch/migrasi/gen types.
2. Jalankan: `pnpm lint && pnpm test && pnpm build` (web & worker) + test RPC di
   Supabase lokal (`supabase start`) — seluruh golden test wajib hijau. Sertakan
   ringkasan hasil (jumlah test, lulus/gagal).
3. Cek 5 hal berbahaya secara eksplisit dan sebutkan hasilnya: (a) ada tulis
   journal_*/payments/status orders DI LUAR RPC? (b) ada query tanpa filter
   business_id? (c) ada float/`Number()` langsung ke uang (harus via money.ts)?
   (d) ada secret/hardcoded key — atau `service_role`/`LLM_API_KEY` bocor ke
   bundle `apps/web`? (e) ada endpoint/RPC/logika di luar plan?
4. Beri verdict: **MERGE** (aman ke main/staging) / **FIX** (daftar perbaikan spesifik,
   lalu perbaiki sekarang dan ulangi cek) / **REVERT** (pendekatan salah).
5. Setelah MERGE: minta founder verify manual 5 menit di HP (staging) sesuai DoD modul,
   dan catat temuannya untuk fase /remember.
