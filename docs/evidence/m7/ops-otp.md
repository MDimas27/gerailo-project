# Bukti ops: template OTP 6 digit produksi (Task 0a M7)

- **Tanggal**: 27 Nov 2026
- **Aksi**: founder mengubah template email auth di **dashboard Supabase produksi**
  dari Magic Link default (`{{ .ConfirmationURL }}`) menjadi template kode OTP 6 digit
  (`{{ .Token }}`).
- **Lingkup**: project Supabase produksi (`fqncaxjqyebrijjcdvjh`); staging sudah
  memakai template 6 digit sejak 21 Nov 2026 (SMTP kustom Resend, docs/ENV-SETUP §4.1).
- **Eksekusi**: founder (dashboard), di luar agent — sesuai putusan GATE PREP M7.
- **PII**: tidak ada (alamat email/token tidak dicatat di repo).
- **Verifikasi lanjutan**: alur OTP 6 digit end-to-end produksi akan diverifikasi
  bila smoke M7 menuntut login baru; sesi perangkat yang ada tidak dipakai untuk
  menguji template ini.
- **Rujukan utang**: LESSONS #63 butir (3) "template OTP 6 produksi masih Magic
  Link default" — **ditutup** oleh bukti ini (dicatat ulang saat `/ecc-laporan` M7).
