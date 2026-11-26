# ACCOUNTING-RULES.md — Aturan Mesin Jurnal (AREA PALING SUCI)

> Sumber: SSoT Bab 8 + Lampiran B. Setiap baris di sini adalah kontrak implementasi
> DAN daftar kasus uji golden. Melanggar satu baris = bug akuntansi = produk gagal.

## Prinsip mesin

1. **Double-entry wajib**: setiap kejadian bernilai uang → 1 `journal_entries` +
   baris `journal_lines` (debit/kredit) yang totalnya seimbang.
2. **Balance assertion server-side** sebelum simpan; ditolak kalau tidak seimbang.
   Klien tidak pernah menghitung/menyimpan jurnal langsung.
3. **Jurnal immutable**: tidak ada UPDATE/DELETE. Koreksi/batal = entri reversi
   (referensi ke entry asal).
4. **1 kejadian = maksimal 1 jurnal**; setiap kejadian punya template tetap,
   didefinisikan di satu tempat: `packages/supabase/migrations/0011_m4_journal_integration.sql` (`_journal_event`).
5. **Pengakuan pendapatan saat barang DIKIRIM**, bukan saat DP masuk atau tombol
   bayar diklik. DP mengendap di akun Uang Muka Pelanggan.
6. **Stok berkurang di momen pengiriman** (konsisten dengan pengakuan pendapatan).
7. **HPP = rata-rata bergerak** per produk: setiap pembelian memperbarui rata-rata;
   pengiriman mengeluarkan HPP dengan rata-rata saat itu.
8. Angka uang **integer rupiah** di seluruh sistem.

## COA minimal (19 akun — seed otomatis per usaha)

| Kode | Nama | Tipe |
|---|---|---|
| 1-1010 | Kas | Aset |
| 1-1020 | Bank / e-wallet | Aset |
| 1-1030 | Piutang usaha | Aset |
| 1-1040 | Persediaan barang | Aset |
| 2-2010 | Uang muka pelanggan | Liabilitas |
| 2-2020 | Utang supplier | Liabilitas |
| 2-2030 | Utang biaya / kurir | Liabilitas |
| 2-2040 | Utang pajak (cadangan) | Liabilitas |
| 3-3010 | Modal pemilik | Ekuitas |
| 3-3020 | Prive | Ekuitas |
| 3-3030 | Laba (tutup tahun) | Ekuitas |
| 4-4010 | Pendapatan penjualan | Pendapatan |
| 4-4020 | Pendapatan ongkir | Pendapatan |
| 5-5010 | HPP | HPP |
| 6-6010 | Beban pengiriman | Beban |
| 6-6020 | Beban bahan baku / produksi | Beban |
| 6-6030 | Beban promosi / iklan | Beban |
| 6-6040 | Beban operasional lain | Beban |
| 6-6050 | Beban platform / fee gateway | Beban |

## Template event → jurnal (kontrak + fixture)

| # | Kejadian | Debit | Kredit |
|---|---|---|---|
| T1 | DP diterima | Kas/Bank | Uang muka pelanggan |
| T2 | Barang dikirim: pendapatan | UMP (DP) + Piutang (sisa) | Pendapatan penjualan + Pendapatan ongkir |
| T3 | Barang dikirim: HPP | HPP | Persediaan |
| T4 | Pelunasan diterima | Kas/Bank | Piutang usaha |
| T5 | COD lunas saat kirim, tanpa DP | Kas/Bank (total) | Pendapatan penjualan + Pendapatan ongkir |
| T6 | COD dengan DP sebelumnya | Kas (sisa) + UMP (DP) | Pendapatan penjualan + Pendapatan ongkir |
| T7 | Ongkir ditanggung penjual | Beban pengiriman | Kas/Utang kurir |
| T8 | Pembelian stok | Persediaan | Kas/Bank atau Utang supplier |
| T9 | Beban operasional | Beban sesuai jenis | Kas/Bank |
| T10 | Prive | Prive | Kas/Bank |
| T11 | Batal pra-kirim via `cancel_order`; gagal kirim via `gagal_kirim` | Reversi jurnal order (pra: T1/T4/T7/T12; kirim: T2/T3 + T4/T5/T6/T7) | stok KELUAR dibatalkan via MASUK |
| T12 | Fee gateway/QRIS | Beban platform | Bank |
| T0 | Order draft/dikonfirmasi | — tanpa jurnal — | |

## Fixture golden utama (order Siti — WAJIB lulus sebagai test)

Order: 3 × Rp75.000 = Rp225.000; ongkir Rp15.000; total Rp240.000; DP Rp100.000
transfer; HPP Rp55.000/pcs; dikirim lalu dilunasi Rp140.000.

1. T1: Kas 100.000 / UMP 100.000
2. T2: UMP 100.000 + Piutang 140.000 / Pendapatan penjualan 225.000 + Pendapatan ongkir 15.000
3. T3: HPP 165.000 / Persediaan 165.000
4. T4: Kas 140.000 / Piutang 140.000
5. Hasil laporan: pendapatan 240.000; HPP 165.000; laba kotor 75.000; kas masuk 240.000;
   piutang & UMP kembali nol.

Fixture tambahan yang wajib ada di test suite: T5 (COD tanpa DP), T6 (COD + DP),
T7 (ongkir penjual), T11 pra-kirim (reversi `cancel_order`, tanpa stok KELUAR) dan
T11 setelah kirim (`gagal_kirim`: reversi T2/T3/T4/T5/T6/T7 + stok MASUK),
T12 (fee platform dari `p_biaya_gateway`, input manual — bukan persentase hardcode),
T10 (prive), dan pembelian stok yang mengubah rata-rata bergerak.
T8 tersedia sebagai template `_journal_event('T8')`; `record_stock_move` MASUK baru
memperbarui `products.hpp_rata_rata`, belum memposting jurnal pembelian otomatis
(akun lawan/Kas vs Utang belum menjadi input RPC). Keputusan Gate #3: saat UI jurnal
manual dibangun, qty/harga T8 DI-PREFILL dari `stock_movements` MASUK terakhir; seller
boleh mengubah, sehingga ledger dapat diverge dari stok bila T8 tidak dipost/diedit —
risiko ini wajib tampil di UI. T9 dikonfirmasi sebagai template beban operasional manual
internal (`_journal_event('T9')` → 6-6040), bukan jalur order.

## Kasus khusus yang sering salah (uji semua)

- **DP bukan pendapatan** — sampai pengiriman ia liabilitas (UMP).
- **HPP tidak boleh dobel** — 1 pengiriman = 1 baris HPP; reversi mengembalikan.
- **Snapshot HPP retur** — `gagal_kirim` memakai `harga_beli` dari movement KELUAR asli,
  bukan `products.hpp_rata_rata` saat ini, agar pembelian di antara kirim dan retur tidak
  mengubah nilai pengembalian.
- **Ongkir 3 skenario**: ditagih pembeli → Pendapatan ongkir (4-4020) + Beban
  pengiriman saat diteruskan kurir; ditanggung penjual → hanya Beban pengiriman;
  ditagih langsung kurir ke pembeli → catatan order saja, tidak masuk jurnal.
- **Batal sebelum kirim** → `cancel_order`: hanya reversi pembayaran yang sudah masuk.
- **Gagal kirim setelah kirim** → `gagal_kirim`: status `DIKIRIM→BATAL`, reversi T2/T3
  (+T4/T5/T6/T7 yang relevan), `stock_movements` MASUK pengembalian. DP T1 tetap di UMP
  sampai direfund/dicatat manual, jadi UMP `2-2010` tidak ikut net-zero.
- **Saldo awal** (bulan ke-2): wizard mengisi akun via jurnal pembuka terpisah.

## Label kepatuhan (copywriting produk)

Gunakan "laporan keuangan **mengacu SAK EMKM**" sampai validasi praktisi (bulan ke-2).
Laporan wajib SAK EMKM = posisi keuangan + laba rugi + CaLK; arus kas = fitur
manajerial, bukan bagian klaim kepatuhan.
