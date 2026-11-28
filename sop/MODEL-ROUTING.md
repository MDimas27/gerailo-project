# MODEL-ROUTING — pembagian model per fase (ACC founder 27 Nov 2026)

> Mengikat seluruh sesi ECC. Gate tidak berubah karena model; CI satu-satunya
> hakim implementasi. Semua angka & fixture melewati model penalaran + founder.

| Fase / tugas | Model | Catatan |
|---|---|---|
| PREP, PLAN, penulisan golden test/pgTAP + RED probe, review laporan | **GLM 5.3 Flash** | Penalaran angka/fixture & audit aturan |
| Implementasi menuju test yang sudah beku, docs, smoke, evidence | **DeepSeek 4.1 Flash** | Test SUDAH beku dari fase PLAN |
| Ops task founder (mis. OTP dashboard) | Founder | Bukti dicatat agent, tanpa PII |
| Dokumen netral (plan formal, bukti, arsip) | Bebas | Tidak menyentuh angka/fixture |
| Draft laporan `/ecc-laporan` | Bebas | Review akhir = GLM/founder |

## Invariant
1. Gate PREP/PLAN/REVIEW tidak berubah dengan model; hanya eksekusi yang boleh
   dipindah ke model murah setelah test beku.
2. CI (GitHub Actions) adalah satu-satunya hakim implementasi; laporan "selesai"
   tanpa CI hijau ditolak.
3. Semua angka, fixture, dan keputusan akuntansi melewati model penalaran
   (GLM) + ACC founder; model implementasi dilarang mengubah fixture.
4. Bila model aktif berbeda dari pemetaan di atas, dicatat di kolom **Deviasi**
   plan berjalan + LESSONS; jangan diam-diam.
