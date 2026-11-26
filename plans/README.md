# plans/ — kontrak sesi per modul

Setiap sesi yang menyentuh kode wajib punya satu plan di folder ini. Plan adalah
**kontrak**: di luar plan = scope creep (tolak atau perbarui plan lalu minta ACC).

## Penamaan & siklus

- Format: `W<n>-<MODUL>.md`, mis. `W4-M5-STOCK.md` (satu plan per modul/minggu).
- Status di header: `DRAFT` → `DISETUJUI` (setelah gate PLAN ACC) → `SELESAI`.
- Salin `TEMPLATE-PLAN.md`; jangan mengedit template.
- Plan lama tidak dihapus; tambahkan bagian "Deviasi" dan "Review" saat berjalan.

## Yang wajib ada (ditetapkan di fase PLAN)

1. **Task berurutan** dengan urutan beku: migrasi SQL + `gen types` → golden test
   MERAH → implement → UI → CI/staging.
2. **Golden test matrix**: test, fixture (dari `docs/`), assert, cara bukti MERAH,
   file. Golden test tidak boleh "ditemukan" saat coding.
3. **Lane & kepemilikan berkas** bila memakai swarm (lihat `sop/SWARM-DISCIPLINE.md`).
4. **Definition of Done** termasuk smoke HP, evidence `docs/evidence/<m>/`, dan
   provenance deploy (CI run, hash bundle, Worker Version ID).
5. **Risiko + mitigasi + rollback**, serta BACKLOG untuk temuan di luar scope.

## Aturan jalur berbahaya

Migrasi, RPC, jurnal, RLS, dan logika uang = **satu penulis, serial**. Test lebih
dulu (MERAH), baru implementasi. Jangan memparalelkan jalur ini meski terlihat
lebih cepat.

## Referensi

- `plans/TEMPLATE-PLAN.md` — kerangka.
- `sop/HARD-RULES.md` — aturan keras yang diaudit saat review.
- `sop/SWARM-DISCIPLINE.md` — lane paralel/serial.
- `.opencode/command/ecc-plan.md` — perintah pembuat plan.
