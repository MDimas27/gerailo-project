# SWARM-DISCIPLINE — mempercepat tanpa merusak keamanan

> Untuk sesi dengan beberapa agent (jcode swarm, subagent, opencode). Tujuan:
> paralel di jalur aman, serial di jalur berbahaya. CI adalah satu-satunya hakim.

## Prinsip

1. **Lane = kepemilikan berkas.** Setiap lane wajib mendeklarasikan daftar berkas
   yang akan ditulis SEBELUM agent dijalankan. Dua lane tidak boleh menulis berkas
   yang sama; bila tumpang tindih → serialkan.
2. **Paralel hanya bila tanpa shared write.** Membaca boleh bersamaan; menulis
   berkas yang sama tidak.
3. **Bukti, bukan klaim.** Worker melapor dengan test/hash/output nyata; root
   mengintegrasikan dan memverifikasi ulang sebelum menyatakan selesai.
4. **Scope freeze tetap berlaku** untuk setiap lane; temuan di luar scope → BACKLOG.

## Boleh paralel (4 lane aman)

| Lane | Menulis hanya | Syarat |
|---|---|---|
| Riset/baca kode | tidak menulis apa pun | laporan temuan + kutipan file:baris |
| Test lebih dulu (MERAH) | `apps/worker/tests/`, `tests/`, `packages/supabase/tests/` | assert diturunkan dari docs, bukan dari kode |
| Dokumentasi | `docs/`, `plans/`, `sop/`, `LESSONS-LEARNED.md` | tidak mengubah kode/DB |
| Jalur teks UI | `apps/web/src/**` teks/label saja | tanpa logika uang/jurnal/RLS; tanpa `Number()` untuk uang |

Keempat lane di atas tidak menulis berkas yang sama, sehingga aman berjalan
bersamaan.

## Larangan paralel (penulis tunggal, serial)

- `packages/supabase/migrations/*` (migrasi, RPC, trigger, constraint).
- Jurnal: `journal_entries`, `journal_lines`, `post_journal`, `_post_payment`.
- Kebijakan RLS dan grant/revoke.
- Logika jumlah uang apa pun (`money.ts`, kalkulasi total/HPP/sisa bayar).

Aturan untuk jalur ini: **satu penulis, golden test MERAH dulu → implement →
HIJAU → commit**. Jangan pernah menyerahkan migrasi/jurnal/RLS ke beberapa agent
sekaligus, sekalipun terlihat cepat.

## Alur kerja swarm per task

1. Root menulis lane + kepemilikan berkas di `plans/W<n>-*.md`.
2. Root spawn worker per lane; lane serial dijalankan berurutan oleh satu worker.
3. Worker melapor: berkas yang disentuh, test (merah→hijau), bukti RED probe,
   dan commit.
4. Root menjalankan CI/lint/test gabungan; konflik atau kegagalan → perbaiki
   sebelum menambah lane baru.
5. Satu task satu commit `M<n>: <task>`; laporan akhir lewat `/ecc-laporan`.

## Routing model & batas biaya

- Tugas presisi tinggi (core akuntansi, RPC, RLS, migrasi) → model dengan batas
  dolar tinggi; jangan dihemat.
- Tugas volume (dokumentasi, label UI, riset) → model murah.
- Bila aktivitas coding besar menyentuh cap paket, pertimbangkan upgrade (Go
  Plus) secara sadar; jangan memaksakan model murah untuk jalur berbahaya.
- Catat model/agent di laporan bila memengaruhi hasil (mis. bug akibat model murah).

## Anti-pola yang sudah terbukti merugikan

- Dua agent menulis migrasi sekaligus → konflik `gen types` dan constraint.
- "Cuma tambah satu guard" tanpa RED probe → guard tidak terbukti menutup bug.
- Menjalankan review paralel sebelum test hijau → verdict palsu.
- Worker melapor "selesai" tanpa hash/test → root menganggap selesai; CI merah.
