# ENV-SETUP.md — Checklist Fase 0 (Persiapan Sebelum Sesi Coding Pertama)

Target: saat sesi jcode pertama dimulai, semua akun, kunci, dan pipeline sudah siap,
sehingga agent tidak menunggu apa pun. Durasi realistis: 1–2 hari (paralel dengan KYC).

## 1. Akun & layanan (buat dulu, murah/nol biaya di awal)

- [ ] Repo GitHub `gerailo` + clone lokal.
- [ ] Cloudflare (akun & domain sudah disetup founder) → `wrangler login`; Workers
      project `gerailo` dengan 2 environment (`staging`/`production`) di
      `apps/worker/wrangler.jsonc` (aset statis PWA ikut Worker — satu deploy);
      buat R2 bucket `gerailo-backups`.
- [ ] Supabase → 2 project: `gerailo-staging` dan `gerailo-prod` (region terdekat);
      `supabase login` + link keduanya; buat **Supabase Access Token** untuk CI
      (migrasi `supabase db push` dari GitHub Actions).
- [ ] Sentry → project `gerailo` (DSN keduanya). PostHog → project + API key.
- [ ] Midtrans DAN Xendit → daftar + kirim dokumen KYC (NIB/akta/KTP) — **hari ke-0**,
      karena aktivasi bisa >1 minggu. Keputusan final ADR-6.
- [x] Provider LLM = NVIDIA NIM (free) → 1 API key `nvapi-...` dari build.nvidia.com
      untuk staging; base URL `https://integrate.api.nvidia.com/v1`.
- [ ] Domain: DNS sudah di Cloudflare → attach custom domain staging & production
      ke Worker begitu nama final terpilih.

## 2. Repo & kit

- [ ] Salin isi kit ke root repo monorepo.
- [ ] Buat folder `docs/SSOT/` dan taruh `Gerailo_Blueprint_SSoT_v1.0.docx` (+PDF).
- [ ] `.gitignore`: `.env*`, `node_modules`, `dist`, `.wrangler`, `supabase/.temp`.
- [ ] CI (GitHub Actions): `pnpm i` → `lint` + `test` + `build` (web & worker) →
      `supabase db push` (env sesuai branch) → push `main` = deploy staging
      (wrangler-action); tag `v*` = deploy production dengan approval.
      Test merah = tidak boleh merge (rules/03).

## 3. Environment variables & secrets

| Kunci | Lokasi | Catatan |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | build env CI + `.env.local` | **publik** (masuk bundle); anon key + RLS |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | wrangler secret (Worker, staging + production) | runtime supabase-js di Worker; anon key + RLS, bukan `service_role` |
| `SUPABASE_SERVICE_ROLE_KEY` | wrangler secret (Worker) | **hanya Worker** — webhook & cron |
| `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_URL` | GitHub Secrets (CI) | migrasi `supabase db push` per env |
| `SENTRY_DSN` | per env (Worker secret + Vite build) | |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | build env CI | publik |
| `LLM_API_KEY` | wrangler secret (Worker) | kunci NVIDIA NIM `nvapi-...`, dipakai `services/parser/llm.ts` |
| `LLM_BASE_URL` + `LLM_MODEL` | wrangler vars (Worker, bukan secret) | `https://integrate.api.nvidia.com/v1` + `nvidia/nemotron-3-ultra-550b-a55b` |
| `MIDTRANS_SERVER_KEY` / `XENDIT_SECRET` | wrangler secret (Worker) | aktif setelah KYC lolos |

Mekanisme: kunci Worker via `wrangler secret put <NAMA> --env staging|production`;
`VITE_*` bersifat build-time — set sebagai environment di workflow CI (bukan secret
runtime). Untuk build/deploy manual, ekspor ketiga `VITE_*` dari GitHub Variables
dulu; bundle tanpa `VITE_*` bisa memanggil Supabase lokal dan tersimpan di cache PWA.
CI grep bundle `apps/web`: `service_role`/`LLM_API_KEY` ditemukan = gagal.
Aturan: kredensial TIDAK PERNAH lewat prompt agent / chat / log (rules/00 §7);
agent boleh tahu NAMA kunci, bukan isinya.

## 4. Supabase setup awal

- [ ] RLS deny-by-default di semua tabel (migrasi pertama sudah membawa policy).
- [ ] Backup PITR/harian aktif di project prod + jadwal dump mingguan ke R2 bucket
      `gerailo-backups` (W4: uji restore sekali).
- [ ] Migrasi pertama dari `docs/DATA-MODEL.md` (businesses/accounts/settings dulu;
      orders & jurnal migrasi W2–W3 mengikuti kebutuhan modul); setiap migrasi →
      `supabase gen types` → commit `packages/supabase/types/db.ts`.

### 4.1 Auth cloud (staging)

- Site URL + redirect URLs staging sudah di-set 21 Nov 2026 via `supabase config push`:
  `https://gerailo-staging.mdimas-jobs.workers.dev` dan `.../**`; `otp_length=6`,
  `enable_confirmations=false`.
- Staging memakai **SMTP kustom Resend** sejak 21 Nov 2026 (`smtp.resend.com:465`,
  sender `noreply@gerailo.com`). Free tier baru mengizinkan ubah template setelah
  SMTP kustom aktif; template `magic_link.html` + subject "Kode masuk Gerailo"
  sudah di-push. Email berisi **kode 6 digit** + tautan masuk.
- Kredensial SMTP hanya di dashboard Supabase (secret), jangan masuk repo. Field
  `[auth.email.smtp]` sengaja tidak dideklarasikan di `config.toml`; `config push`
  tidak mengubah properti remote yang tidak dideklarasikan.
- `supabase config push` mengirim seluruh config auth — selalu jalankan
  `config diff` dulu. Config lokal tetap `localhost`; jangan commit nilai staging
  ke `packages/supabase/config.toml`.
- Migrasi CI memakai **session pooler** `aws-0-ap-southeast-2.pooler.supabase.com:5432`
  karena host `db.<ref>.supabase.co` hanya AAAA (IPv6) dan runner GitHub IPv4-only.
  Workflow menulis ulang host + username dari `SUPABASE_DB_URL`; tidak perlu secret baru.
- Tautan masuk **sekali pakai** dan sesi terikat browser. Di HP: minta tautan baru
  dari browser yang akan dipakai, buka tautan di browser yang sama (bukan in-app
  Gmail/PWA terpisah). Redirect diarahkan ke `/auth/callback` agar error
  `otp_expired`/tautan terpakai tampil jelas, bukan looping ke halaman masuk.

## 5. Deploy pertama (definisi selesai fase 0)

- [ ] Worker Hono (`/api/health`) + SPA shell online di domain staging Cloudflare
      (satu deploy: aset web + API).
- [ ] CI hijau di PR pertama; migrasi terbangun di staging; types ter-commit.
- [ ] Brain terverifikasi (README §2): jcode menjawab 8 modul + 3 aturan besi +
      dokumen yang wajib dibaca sebelum menyentuh mesin jurnal.

## 6. Paralel non-teknis (jangan ditunda)

- [ ] Draft kebijakan privasi + syarat layanan (template sumber bebas + review
      mandiri; W4 tayang) — basis data: UU PDP No. 27/2022.
- [ ] Jadwal wawancara 20 UMKM (validasi masalah, SSoT Bab 14.1) — mulai minggu ini.
- [ ] Rekrut 3–5 kenalan penjual untuk uji penerimaan W4.
