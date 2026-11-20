# M1 — Registrasi Usaha & Onboarding

## Tujuan & nilai
Pengguna baru dari registrasi sampai **order pertama terkonfirmasi** tanpa bantuan,
median ≤10 menit. Onboarding 3 langkah: profil usaha → tambah produk pertama →
coba Smart Paste dengan chat contoh.

## Entitas & relasi
`auth.users` (Supabase Auth) → `businesses` (1 owner MVP) → seed `accounts` (19 akun)
+ `app_settings` — ketiganya dibuat ATOMIK oleh RPC `create_business`.

## Halaman & API
- Routes (react-router): `/auth/login`, `/auth/register` (phone/email OTP via
  supabase-js), `/onboarding` (wizard 3 langkah) — wajib dilewati pengguna lama.
- Data: buat usaha = `supabase.rpc('create_business', {...})` (bukan REST); profil
  usaha = query `businesses` (RLS).

## Alur user
Register → buat usaha (nama, jenis dari daftar ICP, metode bayar) → RPC seed otomatis
19 akun COA + settings → tambah 2–3 produk (form cepat M2) → demo Smart Paste (chat
contoh Siti, tombol "coba dengan contoh ini") → arahan ke dashboard.
Langkah OPSIONAL (bisa dilewati): identitas toko — logo, kontak, rekening
(`store_profiles`/`bank_accounts`) — dipakai halaman transaksi pembeli M8; bisa diisi
belakangan di Pengaturan.

## Aturan khusus
- Consent PDP + link privasi/syarat WAJIB di registrasi (W4 tayang penuh; dari awal
  tampil checkbox).
- Seed COA gagal = transaksi `create_business` gagal (tidak ada usaha tanpa COA).
- Contoh chat demo di-hardcode (bukan LLM).
- Identitas toko/rekening tidak menghalangi aktivasi (opsional); tanpa rekening,
  halaman pembeli M8 menampilkan instruksi transfer generik + kontak toko.
- `VITE_SUPABASE_*` = publik; tanpa service_role di sini (rules/00 §7).

## Golden tests
- `create_business` baru → 19 baris `accounts` + 1 `app_settings` terbentuk; gagal seed
  = rollback penuh.
- Usaha A tidak melihat/mengakses apa pun milik usaha B (RLS, negatif test).
- Onboarding belum selesai → dashboard menampilkan wizard, bukan tabel kosong.

## DoD
Alur register→produk→demo selesai di HP (staging); RLS teruji; consent tampil;
`pnpm build` + test hijau; status AGENTS.md + LESSONS-LEARNED diperbarui.

## Urutan build
W1 (parsial: auth + usaha + seed) → diselesaikan W2 (wizard + demo) sebelum M3 final.
Dependensi: tidak ada. Prasyarat semua modul lain.
