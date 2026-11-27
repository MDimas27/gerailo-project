# HARD-RULES — aturan pelajaran berdarah (satu halaman)

> Mengikat founder + semua agent (jcode/Claude/opencode/swarm). Pelanggaran =
> stop, revert, catat di `LESSONS-LEARNED.md`. Ringkasan insiden nyata dari M3/M4;
> `rules/00-iron-rules.md` tetap berlaku penuh bila terjadi konflik.

## 1. Core posting tunggal: `_post_payment` satu-satunya

- Semua posting pembayaran masuk HANYA lewat `public._post_payment(order, jenis,
  jumlah, kanal, bukti, biaya_gateway)` — `create or replace` terakhir di
  `packages/supabase/migrations/0011_m4_journal_integration.sql:303`.
- RPC publik (`record_payment`, `record_cod_payment`, dst.) memanggil helper itu;
  dilarang menyalin logika posting, jurnal, atau kalkulasi sisa bayar ke RPC baru.
- RPC baru di masa depan: panggil `_post_payment`, jangan tulis ulang INSERT
  `payments`/`journal_*` sendiri.

## 2. Dilarang menambah status/enum baru tanpa ADR

- `public.order_status` (`0003_m3_smart_paste.sql:19`): `DRAFT`, `DIKONFIRMASI`,
  `DP_DITERIMA`, `SIAP_DIKIRIM`, `DIKIRIM`, `SELESAI`, `BATAL`.
- Kasus retur/gagal kirim TIDAK menambah status: gunakan RPC `gagal_kirim`
  (`0012`) + transisi yang sudah ada. Ide status baru (mis. `DIKEMBALIKAN`) =
  ADR dulu, bukan migrasi langsung.
- Menambah nilai enum tanpa ADR = melanggar scope freeze dan merusak laporan.

## 3. Setiap guard wajib punya bukti MERAH (RED probe)

- Sebelum memasang guard/constraint/RPC check, tunjukkan probe yang GAGAL:
  query/test yang membuktikan bug/eskalasi benar-benar terjadi.
- Bukti disimpan di laporan sesi + `plans/W<n>-*.md` (kolom "RED proof").
- Guard tanpa bukti merah = tidak diterima di review (contoh historis: array
  `metode_bayar` `["COD"]` lolos karena tidak ada probe; snapshot HPP tertangkap
  justru karena test-nya ada).

## 4. Retur HPP memakai snapshot movement

- HPP order dibekukan dari `stock_movements.harga_beli` berjenis `KELUAR` saat
  pengiriman (`0012_m4_failed_shipment.sql:179`), bukan harga produk saat retur.
- Semua perhitungan retur/reversi HPP membaca snapshot itu; dilarang menghitung
  ulang dari `products.harga_beli` atau rata-rata bergerak terkini.
- Test kanonik: KELUAR qty −3 `harga_beli=50000` → MASUK +3 harus memakai 50000.

## 5. Angka pgTAP kanonik = angka pada CI hijau terakhir

- Angka acuan = angka pgTAP pada CI hijau TERAKHIR, dan WAJIB dicatat di
  `LESSONS-LEARNED.md` saat berubah (jangan mengutip angka basi antar migrasi).
- Riwayat penting: 434 adalah angka kanonik saat penutupan M4 (bukan 432 — 432
  adalah angka tengah sesi sebelum 2 assertion snapshot HPP di `0012`).
- Setiap perubahan jumlah test wajib dijelaskan di `LESSONS-LEARNED.md`; jangan
  mengutip angka lama sebagai hasil akhir.
- Test suite hijau = syarat commit; angka baru dicatat di laporan.

## 6. Catat hash + version id setiap deploy

- Setiap deploy wajib mencatat: CI run id, commit, bundle `index-*.js` (dan CSS
  bila berubah), Worker Version ID, serta tag produksi.
- Deploy hanya lewat CI dari `main`; produksi hanya dari tag yang lolos CI +
  smoke HP. Rollback Worker = `wrangler versions rollback`; database
  forward-only (tanpa down-migration).
- Hash beda antara job quality dan deploy-staging bukan anomali (env build beda);
  yang dirujuk di laporan adalah hash deploy-staging yang terpasang.

## Checklist cepat sebelum commit

- [ ] Tidak ada INSERT/UPDATE/DELETE jurnal di luar RPC; debit = kredit.
- [ ] Uang BIGINT; parse/format hanya `packages/shared/src/money.ts`.
- [ ] RLS `business_id` tetap utuh; ada test negatif lintas usaha bila menyentuh tabel.
- [ ] Tidak ada `service_role`/`LLM_API_KEY` di bundle web.
- [ ] Satu task = satu commit `M<n>: <task>`; laporan menyebut bukti + angka test.
