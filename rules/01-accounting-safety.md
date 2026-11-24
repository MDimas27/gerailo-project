# 01 — ACCOUNTING SAFETY (aturan area suci mesin jurnal)

Referensi teknis: `docs/ACCOUNTING-RULES.md` + `docs/DATA-MODEL.md` + `docs/API-CONTRACTS.md` §B.

1. Mesin jurnal = SQL di `packages/supabase/migrations` (RPC `post_journal` internal
   + trigger invariant). Kode aplikasi (web/worker) TIDAK PERNAH menulis
   `journal_entries`/`journal_lines` langsung — CI grep menolak INSERT/UPDATE
   journal_* di luar migrasi.
2. Invariant GANDA: (a) assertion SUM(debit)=SUM(kredit) di dalam RPC sebelum insert;
   (b) constraint trigger DEFERRED pada `journal_lines` di level DB. Golden test wajib
   menguji KEDUANYA (termasuk: percobaan insert timpang langsung ke DB harus ditolak).
3. Setiap kejadian → template T0..T12 (docs/ACCOUNTING-RULES.md §Template). Template
   baru/perubahan = ubah fixture golden + alasan dicatat di LESSONS-LEARNED.
4. Reversi: entry baru dengan `reversi_dari_id`, baris dibalik debit↔kredit, nilai sama.
   Tidak ada UPDATE/DELETE jurnal — di REVOKE juga di DB.
5. Pengakuan pendapatan HANYA di event `DIKIRIM` (T2/T3 via `ship_order`);
   DP = T1 ke UMP (via `record_payment`); COD = T5/T6 di `ship_order`.
6. Stok: movement KELUAR dibuat `ship_order` dalam transaksi yang sama dengan T3.
   `record_stock_move` menolak KELUAR dari klien.
7. HPP rata-rata bergerak dihitung DI DALAM RPC (`record_stock_move` MASUK memperbarui
   rata-rata; `ship_order` membaca rata-rata saat kirim). Larang FIFO/LIFO/manuel
   tanpa ADR.
8. Uang = BIGINT rupiah. Nominal masuk RPC via parameter/jsonb → cast `::bigint`.
   Di TypeScript: parse/format HANYA via `packages/shared/src/money.ts`
   (BIGINT supabase-js = string; dilarang `Number()` langsung di komponen).
9. Golden fixtures wajib (test RPC di Supabase lokal `supabase start`): Siti (T1–T4),
   COD tanpa DP (T5), COD+DP (T6), ongkir penjual (T7), batal setelah kirim (T11),
   fee gateway (T12), prive (T10), perubahan rata-rata (T8). Semua di CI; SATU merah
   = merge diblokir.
10. Laporan (M7) = views `security_invoker` atas journal_lines (`docs/DATA-MODEL.md`
    §Views) — tanpa agregat terpisah. Laporan ≠ jurnal → perbaiki view, bukan buat
    angka paralel.
11. Kepatuhan: label "mengacu SAK EMKM" (docs/ACCOUNTING-RULES.md §Label); larang kata
    "mematuhi/lolos SAK EMKM" di UI sebelum validasi praktisi.
