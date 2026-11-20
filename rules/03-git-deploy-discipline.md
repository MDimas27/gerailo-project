# 03 — GIT & DEPLOY DISCIPLINE

1. Branch: `main` = staging (GitHub Actions: `supabase db push` + `pnpm build` +
   `wrangler deploy` env `staging`); `release` = production (deploy via tag
   `vYYYYMMDD` + approval GitHub Environment → env `production`); feature branch
   `m<n>/<task>` dari main.
2. Commit kecil per task: `M3: tambah fixture chat COD`. Pesan bahasa Indonesia,
   tanpa detail kredensial.
3. PR ke main wajib: CI hijau (lint + test + build web & worker + test RPC di Supabase
   lokal). Tanpa CI hijau = merge diblokir (jangan pernah `--no-verify`).
4. Deploy ke production HANYA setelah: /review MERGE + verify manual 5 menit di HP
   + golden test hijau. Kalau ragu → staging dulu, tidur, lihat besok.
5. Rollback: Cloudflare deployment rollback (dashboard atau `wrangler rollback`) ke
   versi sebelumnya; migrasi SQL wajib backward-compatible (turun aman) agar rollback
   tidak merusak data.
6. Migrasi SQL (Supabase CLI): satu migrasi per task struktural (`supabase migration
   new`); jangan edit migrasi yang sudah diterapkan; setiap migrasi skema → jalankan
   `supabase gen types` + commit `types/db.ts` pada commit yang sama; migrasi merusak
   data = stop dan tanya founder.
7. Backup: PITR/harian Supabase prod + dump mingguan ke R2 bucket `gerailo-backups`;
   uji restore W4 (docs/ENV-SETUP.md). Backup yang belum pernah direstore = belum ada backup.
8. Fitur freeze sejak 17 Des: hanya bugfix ke `release`.
9. Setiap deploy production dicatat di `LESSONS-LEARNED.md` (tanggal, tag, isi utama).
10. Jika agent menemukan secret bocor di history/kode/bundle: STOP, laporkan founder,
    rotasi kunci sebelum lanjut apa pun (termasuk cek: `service_role` tidak pernah
    ada di bundle `apps/web`).
