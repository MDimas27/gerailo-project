# Format rekap per-akun (evidence M7)

> Alat: `scripts/evidence-rekap.mjs` (Node 22, REST JWT, **tanpa** `service_role`).
> Dipakai saat smoke staging & produksi; output disimpan ke
> `docs/evidence/m7/production/rekap-per-akun.json` (atau `docs/evidence/m7/`).

## Sumber

| Data | Sumber |
|---|---|
| Saldo akun | `GET /rest/v1/journal_lines?select=debit,kredit,tanggal,accounts(kode)&business_id=eq.<id>` (RLS JWT) |
| Persediaan | `products.hpp_rata_rata` + `v_stock_balance.saldo` |
| CSV persediaan | `GET <worker>/api/export/persediaan` (Bearer JWT) |

## Pemetaan angka

| Angka dashboard | Perhitungan dari buku |
|---|---|
| Penjualan bulan berjalan | `4-4010 + 4-4020` (kredit − debit), filter `tanggal` prefix `YYYY-MM` |
| Laba kotor bulan berjalan | penjualan bulan − `5-5010` (debit − kredit) bulan |
| Piutang + UMP saldo kini | `1-1030` (debit − kredit) + `2-2010` (kredit − debit) |
| Nilai persediaan | Σ `saldo > 0` × `hpp_rata_rata`; harus **sama** dengan Σ kolom `nilai` CSV `persediaan` |

## Menjalankan (jangan pernah commit nilai env)

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<publishable> \
SUPABASE_JWT=<access token sesi perangkat> \
BUSINESS_ID=<uuid bisnis smoke> \
WORKER_URL=https://<worker> \
node scripts/evidence-rekap.mjs > rekap-per-akun.json
```

Verifikasi: `cocok.nilaiPersediaanVsCsv === true` wajib. JWT/anon diambil dari
sesi perangkat saat smoke dan **tidak** disimpan di repo.
