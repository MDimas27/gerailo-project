---
name: m1-onboarding
description: >
  SOP membangun modul M1 Registrasi Usaha & Onboarding Gerailo (auth Supabase,
  RPC create_business, seed COA, wizard 3 langkah, consent PDP). Gunakan saat
  founder minta mengerjakan M1/onboarding.
---

# Skill: M1 — Onboarding

## Konteks wajib dibaca dulu
`AGENTS.md` → `docs/MODULES/M1-ONBOARDING.md` → `docs/DATA-MODEL.md` (businesses,
accounts, app_settings + RPC `create_business`) → `rules/00` (RLS, kredensial)
→ `docs/TECH-STACK.md` §Monorepo.

## Urutan build (test-first)
1. Migrasi SQL: `businesses, accounts, app_settings` + RLS deny-by-default + policy.
2. RPC `create_business` (SECURITY DEFINER + guard `auth.uid()`): transaksi usaha +
   seed 19 akun + settings; gagal seed = rollback penuh. Test RPC di Supabase lokal.
3. `supabase gen types` + commit types (satu commit dengan migrasi).
4. Test negatif RLS: usaha A tidak lihat usaha B.
5. Auth: register/login supabase-js (phone/email OTP) + routes react-router.
6. Wizard 3 langkah (`/onboarding`): profil usaha (panggil RPC) → produk pertama
   (form cepat M2) → demo Smart Paste (chat Siti hardcoded, placeholder M3).
7. Consent PDP: checkbox + link privasi/syarat di registrasi.
8. `pnpm build` + test hijau → `wrangler deploy` staging → verify manual di HP.

## Review check khusus M1
- Seed COA hanya di RPC — tidak ada logika seed di UI/Worker.
- Contoh demo TIDAK memanggil LLM (hardcoded) — hemat kuota & deterministik.
- Wizard tidak bisa diakses usaha yang sudah selesai onboarding.
- Tidak ada `service_role`/`VITE_*` berisi kunci rahasia (grep bundle).

## DoD ringkas
Register→produk→demo jalan di HP; RLS negatif hijau; consent tampil;
status AGENTS.md + LESSONS-LEARNED diperbarui (skill ecc-remember).
