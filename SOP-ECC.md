# SOP ECC untuk Gerailo — Tutorial Alur Teruji (dipadatkan untuk solo founder + jcode)

Metodologi ini diadaptasi dari **ECC (Everything Claude Code)** ala Affaan Mustafa —
repo `affaan-m/ecc` — yang intinya: agent tidak dibiarkan bebas, tapi dijalankan di
dalam **loop berdisiplin dengan konteks yang dijual eksplisit dan memori yang ditulis**.
Loop ECC: `plan → test → implement → review → verify → remember → improve`.

Prinsip kuncinya tiga:
1. **Konteks dijual, bukan diasumsikan.** Agent membaca docs yang tepat di fase yang tepat.
2. **Test lebih dulu di area yang tidak boleh salah** (parser, mesin jurnal). Di area lain, boleh cepat tapi tetap ada smoke test.
3. **Memori ditulis di akhir sesi.** Tanpa `/remember`, sesi berikutnya mulai dari nol.

---

## FASE 0 — Persiapan (sekali, sebelum sesi coding pertama)

Target fase 0: ketika kamu duduk di sesi pertama, agent tidak perlu menebak apa pun.

- [ ] Repo GitHub `gerailo` dibuat, clone lokal.
- [ ] Salin seluruh kit ini ke root repo.
- [ ] Ikuti `docs/ENV-SETUP.md`: Supabase project + CLI (migrasi & gen types),
      Cloudflare Worker (Hono + aset statis PWA), secrets via wrangler, deploy
      hello-world (API + SPA) ke staging.
- [ ] Daftarkan KYC payment gateway (Midtrans/Xendit) — proses ini lambat, mulai sekarang.
- [ ] Verifikasi brain (lihat README §2): jcode menjawab benar 8 modul + aturan besi.
- [ ] Sisipkan `Gerailo_Blueprint_SSoT_v1.0.docx` (atau export PDF-nya) ke `docs/SSOT/` sebagai referensi tertinggi.

**Keluaran fase 0**: repo dengan kit terpasang, staging online, brain terverifikasi.

## LOOP SESI HARIAN (inti ECC)

Satu sesi idealnya 1–3 jam dan mengerjakan **satu modul atau satu potongan modul**.
Ikuti enam langkah berikut dengan perintah dari folder `commands/`.

### Langkah 1 — `/prep` (muat konteks, 3 menit)

Jalankan `commands/prep.md`. Agent akan membaca `AGENTS.md`, `docs/PRODUCT.md`,
`LESSONS-LEARNED.md`, lalu melaporkan: posisi proyek, modul berikutnya, peringatan
dari pelajaran lama. **Kamu memverifikasi laporannya benar** sebelum lanjut.
Jangan pernah mulai coding tanpa langkah ini — inilah yang mencegah agent "hallucinate scope".

### Langkah 2 — `/plan` (rencana modul, 15 menit)

Jalankan `commands/plan.md MODUL_NAMA`. Agent membaca `docs/MODULES/<MODUL>.md`
+ skill modul terkait, lalu menulis `plans/W<n>-<MODUL>.md` mengikuti
`plans/TEMPLATE-PLAN.md`: daftar task berurutan, file yang dibuat/diubah,
daftar test, DoD, dan risiko. **Kamu review rencananya 5 menit** — corem task yang
tidak perlu (pelanggaran scope), tambah yang kurang. Rencana disetujui = kontrak sesi.

### Langkah 3 — `/execute` (test-first → implement, 60–120 menit)

Jalankan `commands/execute.md <NAMA-PLAN>`. Aturan eksekusi (dari ECC):

1. **Urutan beku**: migrasi SQL (`supabase db push` + `gen types`) → golden test →
   implement → wiring UI → deploy staging (wrangler).
2. **Golden test ditulis lebih dulu** untuk parser dan mesin jurnal — fixtures dari
   `docs/ACCOUNTING-RULES.md` dan `docs/MODULES/M3-SMART-PASTE.md` §Golden tests.
   Merah dulu, baru kode.
3. **Commit kecil per task** dengan pesan `M<n>: <task>` — memudahkan /review dan rollback.
4. Jika agent menyimpang dari plan (membuat file/fitur baru), **hentikan**: kembali ke plan
   atau perbarui plan secara sadar. Ini penangkal scope creep vibe coding.
5. Di akhir execute: `pnpm build` (web & worker) + test suite hijau di staging.

### Langkah 4 — `/review` (review + verify, 15–30 menit)

Jalankan `commands/review.md`. Agent memeriksa diff sesi ini terhadap `rules/*.md`:
invariant jurnal (RPC + trigger), RLS business_id, tidak ada kredensial/service_role
di bundle web, tidak ada tulis jurnal/status di luar RPC, uang BIGINT via money.ts.
Kemudian **verify**: jalankan seluruh test + cek manual alur utama modul di staging
(kamu sendiri, 5 menit, via HP).

Hasil review: `MERGE` / `FIX` (catat di plan) / `REVERT` (kalau pendekatan salah).

### Langkah 5 — `/remember` (simpan memori, 5 menit)

Jalankan `commands/remember.md`. Agent menambahkan ke `LESSONS-LEARNED.md`:
apa yang berjalan lancar, apa yang makan waktu, keputusan kecil yang diambil,
dan status modul. Kalau sesi ini **mengubah scope atau keputusan arsitektur**,
agent juga memperbarui bagian terkait di `docs/` dan menandai SSoT perlu revisi
(jangan mengubah SSoT diam-diam).

### Langkah 6 — `improve` (implisit)

Pelajaran dari `/remember` dipakai di `/prep` sesi berikutnya. Loop selesai.

---

## Contoh transcript sesi (Minggu 2, modul M3)

```
Kamu   : /prep
jcode  : [baca AGENTS.md, PRODUCT, LESSONS-LEARNED]
         Status: M1+M2 selesai (staging). Peringatan dari lessons: "jangan pakai
         float untuk rupiah" dan "parser wajib log ekstraksi".
         Modul berikutnya: M3 Smart Paste. Siap.
Kamu   : /plan m3-smart-paste
jcode  : [baca docs/MODULES/M3-SMART-PASTE.md, skills/m3-smart-paste/SKILL.md,
         rules/02-parser-safety.md]
         Menulis rencana W2-M3-SMART-PASTE di folder plans/: 9 task, 14 golden test, DoD…
Kamu   : corem task UI animasi, tambah fixture chat COD. Lanjut.
jcode  : Plan diperbarui. 8 task, 15 test.
Kamu   : /execute W2-M3-SMART-PASTE
jcode  : [migrasi SQL ai_usage_logs + gen types → tulis 15 test (merah) → implement
         parser di Worker → matching katalog → form konfirmasi → commit per task]
         Build hijau, deploy staging.
Kamu   : /review
jcode  : [diff vs rules] Ditemukan: 1 query tanpa filter business_id → diperbaiki.
         Verify: test 15/15 hijau, build ok.
Kamu   : [uji manual di HP: paste chat Siti, konfirmasi order] OK.
Kamu   : /remember
jcode  : [tulis LESSONS-LEARNED #7: "label 'ongkir' sering muncul setelah total,
         parser harus cek baris terakhir juga"; update status M3 = 90%]
```

## Disiplin lintas sesi (dari ECC, dipertahankan penuh)

- **Session hygiene**: mulai sesi baru per modul; jangan satu sesi maraton 3 modul —
  konteks agent menurun kualitasnya seiring panjang sesi.
- **Kredensial tidak pernah lewat prompt** — hanya env var (lihat rules/00).
- **Scope freeze absolut**: fitur baru yang menarik → backlog di `LESSONS-LEARNED.md`.
- **SSoT tetap sumber kebenaran**: kit ini boleh cepat berubah; SSoT hanya berubah
  lewat changelog v1.1, v1.2 (lihat blueprint §1.2).
- **Tanggal bersifat komitmen**: lihat `docs/ROADMAP.md`; kalau modul terlambat,
  pangkas scope modul itu, jangan geser tanggal launch.

## Troubleshooting umum

| Gejala | Penyebab | Penawar |
|---|---|---|
| Agent membuat fitur di luar scope | AGENTS.md tidak dibaca / sesi terlalu panjang | Jalankan /prep ulang; mulai sesi baru; tegaskan rules/00 |
| Jurnal tidak seimbang | Golden test belum ditulis / dilewati | Stop; tulis fixture dari docs/ACCOUNTING-RULES.md dulu |
| Parser "menebak" harga | rules/02 tidak diterapkan | Tambah test negatif; larang fallback harga |
| Sesi berikutnya lupa keputusan | /remember tidak dijalankan | Wajibkan langkah 5; LESSONS-LEARNED adalah memori |
| Test hijau tapi aplikasi rusak | Tidak ada verify manual | Langkah 4 wajib uji 5 menit di HP |
