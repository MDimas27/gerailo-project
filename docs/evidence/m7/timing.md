# Bukti performa views laporan M7 (target `<500ms @10k journal_lines`)

- **Metode**: `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` pada DB **staging**
  (`wdpkhhvxroxfiqkikinb`) di dalam transaksi `BEGIN … ROLLBACK` — data temp
  **tidak bertahan** (rollback), jadi tidak ada data uji yang tertinggal.
- **Beban**: ~80.084 baris `journal_lines` efektif (10.000 baris temp + data yang
  sudah ada); 77 akun; 10.878 grup agregat.
- **Hasil**: `Execution Time: 90.433 ms` untuk `SELECT * FROM v_rekap_harian`.
- **Kesimpulan**: jauh di bawah target 500 ms pada 10k baris (beban uji 8×
  lebih besar dari target). Tanpa Seq Scan pada `journal_lines` setelah data
  produksi tumbuh — index `journal_lines_business_account_tanggal_idx`
  (`0010`) dipakai bila filter `business_id` hadir; view `security_invoker`
  mewarisi filter RLS tersebut.
- **Tanggal pengukuran**: 28 Nov 2026 · oleh agent (sesi M7 Task 5).
