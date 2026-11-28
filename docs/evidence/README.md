# docs/evidence/ — bukti uji per modul

Satu folder per modul: `m4/`, `m5/`, `m6/`, dst. Isi minimal:
`retest-results.json` + screenshot `CEK<n>-<slug>.png`. Evidence adalah bukti,
bukan narasi: angka dan status harus bisa diperiksa ulang.

## Format `retest-results.json` (lanjutan format m4)

```json
{
  "stamp": "392026",
  "shotDir": "C:/Users/<user>/AppData/Local/Temp/opencode/pwa-smoke",
  "device": "e8c955c3",
  "bundle": "index-BC-7Gz73.js",
  "ciRun": "45788400727",
  "versionId": "2dcaea96-f34b-4d88-aee7-d94fd3390e8e",
  "results": [
    { "nama": "CEK10 status BATAL", "lulus": true, "detail": "BATAL" }
  ],
  "readme": {
    "CEK10": { "order": "ORD-...", "id": "...", "snap": { } }
  }
}
```

- `stamp` — stempel waktu singkat sesi uji (`HHMMSS` atau `DDHHMM`), sama dengan
  akhiran nama produk/order uji.
- `shotDir` — folder screenshot saat uji; boleh path mesin lokal.
- `results[]` — satu baris per pemeriksaan: `nama` (CEK…), `lulus` (boolean),
  `detail` (nilai nyata: status, array, rekap, dsb.).
- `readme` — opsional; snapshot objek per CEK (order/entries/payments/movements/
  rekap) agar hasil bisa diaudit tanpa membuka DB.
- `device`, `bundle`, `ciRun`, `versionId` — opsional tetapi sangat disarankan;
  provenance wajib dicatat di laporan (`sop/HARD-RULES.md` §6).

## Aturan

1. Jangan menaruh data pribadi (telepon, alamat penuh, nama pembeli nyata).
2. Screenshot dinamai `CEK<n>-<slug>.png`, mis. `CEK13-stok-kurang.png`.
3. Jangan mengubah evidence lama untuk "merapikan"; tambah file retest baru.
4. Modul baru: salin `TEMPLATE-retest-results.json`, isi, lalu simpan di
   `docs/evidence/<m>/`.

## Referensi

- Contoh nyata: `docs/evidence/m4/` (CEK10-CEK14, 20/20 PASS), `docs/evidence/m5/` + `docs/evidence/m5/production/` (CEK1-CEK5b, 8/8 PASS), dan `docs/evidence/m7/` + `docs/evidence/m7/production/` (CEK1-CEK7, 10/10 PASS), dan `docs/evidence/m6/` (CEK1-CEK7, 8/8 PASS).
- `.opencode/command/ecc-laporan.md` — langkah menulis evidence saat menutup sesi.
