---
name: m3-smart-paste
description: >
  SOP membangun modul M3 Smart Paste (Worker Hono: parser pola + matching
  katalog; fallback AI berkuota di Worker; konfirmasi wajib; draft order via
  supabase-js). AREA SUCI: test-first wajib. Gunakan saat founder minta
  mengerjakan M3/Smart Paste/parser.
---

# Skill: M3 — Smart Paste

## Konteks wajib dibaca dulu
`AGENTS.md` → `rules/02-parser-safety.md` (WAJIB, area suci) →
`docs/MODULES/M3-SMART-PASTE.md` → `docs/API-CONTRACTS.md` §A →
`docs/ACCOUNTING-RULES.md` (angka fixture) → SSoT Lampiran A.
Founder ikut memahami diff di area ini.

## Urutan build (GOLDEN TEST DULU — merah sebelum hijau)
1. Tulis 10 fixture golden dari `docs/MODULES/M3-SMART-PASTE.md` §Golden tests
   sebagai test unit murni di `apps/worker/tests/parser/` (teks → hasil
   terstruktur). Jalankan: MERAH.
2. Implement normalisasi (angka "75.000/75rb/75k" → BIGINT, qty "x3/3 pcs/3x").
3. Implement parser pola di `apps/worker/src/services/parser` — aturan pola di
   SATU file konfigurasi (`rules.ts`), bukan tersebar.
4. Implement matching katalog: persis → alias → trigram ≥0,8; 2 kandidat = pilihan UI.
5. Implement skor keyakinan 3 tingkat + penanda sumber kolom (katalog vs teks vs kosong).
6. Route Worker `POST /api/smart-paste`: verifikasi JWT + zod + perhitungan total
   BIGINT server-side (TIDAK menyimpan order).
7. Route Worker `POST /api/smart-paste/ai`: LLM_API_KEY (secret), JSON schema ketat,
   kuota per paket via `ai_usage_logs` (service_role), log sumber/skor/token/consent.
8. UI: `/share` (Web Share Target), `/paste`, `/paste/confirm` (penanda sumber kolom;
   konfirmasi → insert order DRAFT via supabase-js, RLS).
9. `pnpm build` + test hijau + grep bundle web (tanpa LLM_API_KEY/service_role) →
   deploy staging → verify manual: share chat Siti dari WhatsApp di HP → konfirmasi
   → order jadi.

## Review check khusus M3
- Harga tidak pernah dari tebakan AI (test negatif #6/#7 hijau).
- Kuota habis = pesan jelas, parser pola tetap jalan.
- Teks asli hanya disimpan bila consent; tanpa consent hanya hasil terstruktur.
- Tidak ada endpoint yang meminta kredensial WhatsApp (rules/02 §10).
- Key AI hanya di Worker secret — grep bundle web wajib kosong.

## DoD ringkas
10 fixture hijau di CI; hit-rate & akurasi tampil di admin internal; verify manual
HP; status diperbarui (ecc-remember).

## Jika akurasi buruk saat pilot
Jangan panik: tambah pola baru ke `rules.ts` + fixture, log koreksi pengguna jadi
sinyal. Parser adalah produk yang diberi makan, bukan fitur sekali jadi.
