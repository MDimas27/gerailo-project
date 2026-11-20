---
name: m6-customers
description: >
  SOP membangun modul M6 Pelanggan ringkas (data minimal, dedup telepon via
  unique index, histori & 3 statistik otomatis, autocomplete order). Gunakan
  saat founder minta mengerjakan M6/pelanggan/CRM.
---

# Skill: M6 — Pelanggan

## Konteks wajib dibaca dulu
`AGENTS.md` → `docs/MODULES/M6-CUSTOMERS.md` → `docs/DATA-MODEL.md` (customers) →
catatan PDP di `docs/ARCHITECTURE.md` §Keamanan.

## Urutan build (test-first)
1. Migrasi: `customers` + unique index telepon-normalisasi per business_id + RLS.
2. Helper normalisasi nomor Indonesia di `packages/shared` (08… & +62 8… → 628…;
   satu file, test unit).
3. Test normalisasi & dedup: "+62 812-3456-7890" == "081234567890" → satu pelanggan
   (upsert dedup via supabase-js).
4. Implement CRUD + autocomplete (query ilike nama/telepon) + statistik ringkas
   (total belanja, terakhir, frekuensi — dari SUM orders, bukan angka terpisah).
5. Wire ke form order M4: pilih pelanggan 2 ketukan; pelanggan baru dari konfirmasi
   Smart Paste otomatis.
6. Profil: link "minta data / hapus data" (hak PDP) — endpoint sederhana + konfirmasi.
7. `pnpm build` + test hijau → deploy staging → verify manual.

## Review check khusus M6
- Query "tidak belanja ≥60 hari" ada sebagai fungsi teruji (dipakai AI Assistant
  bulan ke-3) tapi BELUM jadi fitur UI terpisah (scope freeze).
- Tidak ada field marketing (hobi/preferensi dsb.) — minimasi data PDP.
- RLS negatif hijau.

## DoD ringkas
Autocomplete cepat; dedup jalan; statistik cocok order; hak PDP tersedia;
status diperbarui (ecc-remember).
