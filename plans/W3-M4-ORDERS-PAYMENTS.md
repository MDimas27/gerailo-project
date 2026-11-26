# W3-M4-ORDERS-PAYMENTS.md — Rencana Kerja M4 Order & Pembayaran

> W3-M4 · dibuat 24 Nov 2026 oleh /prep + /plan · status 25 Nov: SUB-SLICE 1 + UX + fix COD
> **DI-PRODUCTION**; SUB-SLICE 2 Midtrans per-seller **RESCOPED/DITUNDA**; SLICE 3 aktif berikutnya.
> Gate founder awal: **1 – 1 – 1** (Midtrans; M4 + jurnal + HPP dalam 3 sub-slice; service_role khusus webhook).
> Gate #1 APPROVED 24 Nov; Gate #2 re-test OK 25 Nov, lalu diubah founder: Midtrans per-seller dibatalkan.
> CI produksi/manual: build prod hijau, bundle `index-BRLaIdz4.js`, Worker `gerailo-production`, version `57a2c302-032a-4a37-bddf-44d9544b84cf`, health OK.

### Jawaban Gate #1 founder (file:line, 25 Nov 2026)

1. **`complete_order` menyesatkan, bukan "terima"** → rename lewat migrasi BARU `packages/supabase/migrations/0009_m4_receive_order.sql:1-32` (`ship_order`; nama lama di-`drop` di `:32`), bukan mengedit `0005` yang sudah ter-apply. Transisi akhir ada di `receive_order` `:34-68`. UI saat ini: `apps/web/src/routes/orders-detail.tsx:820-829`; regresi test: `packages/supabase/tests/0005_m4_manual_payments_test.sql:251`.
2. **Batal setelah barang dikirim** → DB hanya mengizinkan `DRAFT`–`SIAP_DIKIRIM`: `packages/supabase/migrations/0009_m4_receive_order.sql:70-90`. UI menyembunyikan tombol lewat `bisaBatal` `apps/web/src/routes/orders-detail.tsx:232,829,846`. pgTAP: `packages/supabase/tests/0009_m4_receive_order_test.sql:349-365`.
3. **Satu jalur posting uang** → core privat `_post_payment` `packages/supabase/migrations/0005_m4_manual_payments.sql:131-212`; dipanggil `record_payment` `:252` dan `apply_payment_event` `packages/supabase/migrations/0008_m4_midtrans_verifications.sql:164`. Tidak ada jalur webhook kedua; LESSONS #37.
4. **Webhook lifecycle/raw append-only** → tabel verifikasi + RPC `packages/supabase/migrations/0008_m4_midtrans_verifications.sql:1-51`; urutan Worker `log UNVERIFIED → verify → mark → apply` `apps/worker/src/routes/payments.ts:205-228`; pgTAP adversarial di `packages/supabase/tests/0008_m4_midtrans_verifications_test.sql:104-194`. LESSONS #38 (arsip template billing sejak 25 Nov).
5. **Jurnal/stok masuk slice 3** → batasan tertulis `plans/W3-M4-ORDERS-PAYMENTS.md:145-147`; kontrak `docs/API-CONTRACTS.md:43`. Isolasi usaha dijaga `_assert_order_owner` `packages/supabase/migrations/0005_m4_manual_payments.sql:82-110` + pgTAP lintas `business_id`. Banner lama "jurnal menyusul" sudah diganti menjadi "Jurnal otomatis aktif; kiriman gagal dibatalkan lewat reversi." di `apps/web/src/routes/orders-detail.tsx`; Slice 3 sudah lolos CI/HP dan menunggu promosi produksi.

### Amandemen strategis founder 25 Nov 2026 (menggantikan SUB-SLICE 2 lama)
- **TIDAK ADA Midtrans per-seller.** Pembayaran buyer→seller tetap manual: no. rekening/
  QRIS seller sendiri + `record_payment`; alur ini sudah jadi dan teruji.
- SUB-SLICE 2 (Snap + webhook per order seller) **RESCOPED/DITUNDA**. KYC seller bukan
  lagi blokir apa pun. Kode lama dipertahankan sebagai arsip/template implementasi, bukan
  jalur aktif produksi.
- Midtrans hanya untuk tagihan **LANGGANAN seller→Gerailo** di masa depan, dengan akun
  merchant milik Gerailo (KYC sekali saat slice billing dibangun). Pendapatan Gerailo sendiri.
- Platform **TIDAK PERNAH** memegang dana buyer untuk seller (risiko lisensi PJP).
- Lima kondisi keras Midtrans diarsipkan sebagai template slice billing, bukan gate M4 aktif.
- Lanjut ke slice 3: jurnal T0–T12, HPP rata-rata bergerak, rekap harian minimal.

### Penyempurnaan UX seller 25 Nov 2026 — UI-only

Keputusan founder setelah review: **TIDAK** mengubah schema/migrasi/RPC/RLS/business logic.
Perubahan hanya lapisan presentasi + read model: enum internal tetap menjadi sumber
kebenaran backend, frontend hanya menerjemahkan ke pekerjaan seller dan satu
**Next Best Action**. `metode_bayar` ditambahkan ke `select`/`OrderRecord` di
`apps/web/src/hooks/use-orders.ts` dari kolom yang sudah ada — bukan perubahan DB.

| Internal | Label seller | Badge pembayaran (turunan) | Kelompok pekerjaan | Primary action |
|---|---|---|---|---|
| DRAFT | Menunggu konfirmasi | Belum dibayar | Pesanan Baru | Periksa & konfirmasi |
| DIKONFIRMASI | Pesanan dikonfirmasi | Belum bayar / DP diterima / Lunas | Diproses | Prepaid sisa>0 → Catat pembayaran; COD → Siapkan pesanan; lunas → Tandai siap dikirim |
| DP_DITERIMA | Pesanan dikonfirmasi | DP diterima / Lunas | Diproses | sisa>0 → Catat pelunasan; lunas → Tandai siap dikirim |
| SIAP_DIKIRIM | Siap dikirim | mengikuti sisa | Siap Dikirim | Tandai dikirim + kurir/resi |
| DIKIRIM | Dalam pengiriman | Belum lunas / Lunas | Diproses (sublabel) | sisa>0 → Catat pelunasan/COD; sisa=0 → Tandai diterima/selesai |
| SELESAI | Selesai | Lunas | Selesai | tidak ada |
| BATAL | Dibatalkan | — | Selesai (sublabel terminal) | tidak ada |

Aturan yang **tidak berubah**: cancel hanya DRAFT–SIAP_DIKIRIM; terima hanya
DIKIRIM + sisa Rp0; prepaid belum lunas tidak bisa ditutup; COD lunas di DIKIRIM
auto-SELESAI; SELESAI terminal; DP/parsial tetap bisa dicatat. Tombol "Batalkan"
tetap terlihat sebagai secondary di pra-kirim agar Fase A/C tetap terverifikasi.

Regresi smoke UI (Fase A–D, dari founder 25 Nov):

- **A** — Prepaid lunas sebelum kirim: DRAFT tampil "Menunggu konfirmasi" + Batalkan ada → konfirmasi → bayar penuh → siap dikirim → kirim → Batalkan hilang + Terima muncul → tap Terima → SELESAI tanpa aksi.
- **B** — COD belum bayar: DIKIRIM + sisa>0 → Terima tidak ada, warning "Masih ada sisa Rp …" tampil, Batalkan hilang; biarkan order tetap terbuka.
- **C** — COD dibayar penuh di order Fase B: status langsung SELESAI tanpa tap Terima; terminal tanpa aksi.
- **D** — Sanity: DRAFT/SIAP_DIKIRIM tidak menampilkan "Tandai diterima".

Hasil smoke 25 Nov 2026: CEK0–CEK4/CEK7/CEK8 PASS di staging pada `ORD-20261123-001`; CEK9 dilewati karena tidak ada order BATAL. CEK5/CEK6 sempat FAIL karena deteksi COD membandingkan `metode_bayar` array dengan string; setelah `adalahCod()` + golden test, PASS di dev server Android pada `ORD-20261125-007` dan di staging pada `ORD-20261125-008` (CI `45598889915`, bundle `index-DTeG_QNY.js`, SW/cache dibersihkan). Founder ACC smoke Fase A–D + fix COD; produksi dipromosikan dalam satu deploy dengan bundle `index-BRLaIdz4.js` (version `57a2c302-032a-4a37-bddf-44d9544b84cf`).

## Tujuan sesi
Setelah slice 3 selesai: order DRAFT dari Smart Paste bisa diproses sampai lunas/dikirim
dengan status machine eksplisit, pembayaran manual transfer/COD menjadi satu-satunya
jalur buyer→seller, dan setiap kejadian uang memposting jurnal double-entry immutable.
Midtrans Snap/webhook tidak termasuk target M4; kode lama dipertahankan sebagai template
billing. Stok KELUAR dan HPP rata-rata bergerak terjadi di `ship_order`; rekap harian
minimal menjadi turunan langsung dari `journal_lines` (bukan agregat paralel).

## Konteks yang dibaca
[x] AGENTS.md  [x] docs/PRODUCT.md  [x] docs/ROADMAP.md (W3)
[x] docs/MODULES/M4-ORDERS-PAYMENTS.md  [x] skills/m4-orders/SKILL.md
[x] skills/ecc-core/SKILL.md  [x] rules/00  [x] rules/01-accounting-safety.md
[x] rules/03-git-deploy-discipline.md  [x] docs/DATA-MODEL.md
[x] docs/API-CONTRACTS.md §A–C  [x] docs/ACCOUNTING-RULES.md T0–T12 + fixture Siti
[x] docs/UI-UX.md §3–4  [x] docs/STITCH-DESIGN.md (kelola_pesanan, detail_order)
[x] docs/ENV-SETUP.md  [x] LESSONS-LEARNED (#1,#3,#4,#7,#8,#9,#27,#28–#34)
[x] plans/TEMPLATE-PLAN.md  [x] plans/W2-M3-SMART-PASTE.md (pola gate & closing)
[x] packages/supabase/migrations/0001–0004 + tests 0001–0004
[x] apps/worker/src/index.ts, routes, lib/supabase.ts, wrangler.jsonc
[x] apps/web/src/main.tsx, paste-confirm.tsx, hooks, lib/api.ts
[x] .github/workflows/ci.yml  [x] packages/shared/src/money.ts

## Keputusan gate yang mengikat
| ID | Keputusan final |
|---|---|
| G1 | Awal: Gateway = **Midtrans**, Snap server-side + webhook SHA512. **Diamandemen 25 Nov:** Midtrans per-seller DITUNDA; transfer/COD manual adalah jalur aktif M4. `payment_events` tetap gateway-agnostic sebagai arsip/template billing. |
| G2 | Scope = **M4 + mesin jurnal + HPP**, dipecah 3 sub-slice: (1) status machine + pembayaran manual, (2) Midtrans Snap + webhook, (3) jurnal T0–T12 + stok KELUAR/HPP + rekap harian minimal. **Tiap sub-slice punya gate sendiri: CI hijau + review founder sebelum lanjut.** |
| G3 | Arsip/template billing (tidak aktif di M4): `SUPABASE_SERVICE_ROLE_KEY` dipakai hanya untuk webhook tagihan Gerailo, RPC allowlist, payload append-only, verifikasi SHA512, amount server-side, idempotensi. Produksi M4 **tidak** menyetel `service_role` atau `MIDTRANS_*`; exception ini tidak otomatis berlaku di milestone berikutnya. |
| G4 | Metode HPP diputuskan: **rata-rata bergerak (weighted average)**. Nilai desimal dibulatkan ke rupiah terdekat via `round()` dan disimpan BIGINT; aturan + golden T8 ditulis di PLAN dan tidak boleh diubah tanpa ADR. |
| G5 | Jurnal immutable: `journal_entries`/`journal_lines` tidak pernah UPDATE/DELETE; koreksi/batal = entri reversi baru dengan `reversi_dari_id`, baris debit↔kredit dibalik. Semua nominal BIGINT; konversi/format di TS hanya via `packages/shared/src/money.ts`. |
| G6 | pgTAP wajib menguji aturan posting **dan** adversarial: amount mismatch, transisi ilegal, replay webhook, duplicate payment, insert jurnal timpang, RLS lintas `business_id`. Satu merah = gate gagal. |

## Amandemen disadari 24 Nov 2026 (sebelum commit pertama)
- A1 · 2.3: `apply_payment_event` tanpa JWT tidak memanggil `record_payment`; core privat `_post_payment(...)` dipakai bersama, guard `auth.uid()` tidak dilonggarkan.
- A2 · 1.1: `DP_DITERIMA` skippable (COD langsung `SIAP_DIKIRIM`); pelunasan penuh sekali bayar diuji; event gagal Midtrans → `IGNORED`, refund backlog.
- A3 · 3.3: fee T12 dari `payment_type`/input manual penjual, bukan hardcode 0,7%.
- A4 · BACKLOG: stok per varian tertunda eksplisit sampai order ber-varian ada.
- A5 · formula signature sudah dikutip dari docs; founder belum verifikasi independen (timeout). Slice 2 wajib catat sumber + hasil sandbox di LESSONS; beda formula = stop & lapor.
- A6 · 0003 sudah `REVOKE INSERT` pada `orders`/`order_items` dari `authenticated`, jadi `/orders/new` tidak boleh insert langsung. Tambah RPC `create_manual_order` di migrasi `0006_m4_manual_order.sql` (harga manual ONLY di form ini, product_id tetap dari katalog milik usaha). Penomoran slice 2 bergeser ke 0007, slice 3 ke 0008–0009.

## Kutipan docs Midtrans yang dipakai (wajib)
Sumber: `https://docs.midtrans.com/docs/access-keys` (diambil 24 Nov 2026).

> **What changed on 28 October 2026**
> - You can now have up to 10 Server Keys. Each key has its own name, notes, permissions, and expiry date.
> - The key that verifies HTTP notifications is now a separate key, the Signature Secret Key.

> | Key | How many | Used for |
> |---|---|---|
> | Server Key | Up to 10 | Authorizes server-side API requests to Snap, Core API, Payment Link, Invoicing, and Subscriptions |
> | Signature Secret Key | 1 | Verifies the `signature_key` field in HTTP notifications and API responses |

> Calculate the expected value on your server and compare it with the value that you received:
> `SHA512(order_id + status_code + gross_amount + SignatureSecretKey)`
> Before 28 October 2026, this calculation used your Server Key. It now uses the Signature Secret Key.

> Use the Server Key to authorize API requests.
> Use the Signature Secret Key to verify the `signature_key` in notifications.

Sumber kedua: `https://docs.midtrans.com/docs/https-notification-webhooks` (diambil 24 Nov 2026).

> Implement notification handling in an idempotent way. In extremely rare cases, we may send multiple notifications for the same transaction event. ... use order_id as the key to track the entries.
> Check the following three fields when confirming success transactions: `status_code`: 200; `fraud_status`: ACCEPT if exists; `transaction_status`: settlement or capture.
> To confirm that you received the notification, your notification URL or backend must respond with HTTP status code 200.

Sumber pendukung: `https://docs.midtrans.com/docs/https-notification-webhooks` —
verifikasi `status_code=200`, `fraud_status=ACCEPT` bila ada,
`transaction_status=capture|settlement`, respons 2xx, dan handler idempoten memakai
`order_id`/event key. **Kesimpulan implementasi: HMAC/SHA512 notifikasi memakai
`MIDTRANS_SIGNATURE_SECRET_KEY`, BUKAN `MIDTRANS_SERVER_KEY`; Server Key hanya untuk
request Snap server-side.**

## Status machine (urutan beku)
`DRAFT → DIKONFIRMASI → DP_DITERIMA → [SIAP_DIKIRIM] → DIKIRIM → SELESAI`
`BATAL` dari status pra-kirim via `cancel_order`; setelah kirim = BATAL via `gagal_kirim`
(reversi T2/T3/T4/T5/T6/T7 + stok MASUK pengembalian; DP T1 tetap s/d direfund).

- Transfer manual: seller input/catat DP atau pelunasan via `record_payment`; bukti opsional.
- COD: tanpa gateway; T5/T6 diproses di `ship_order`.
- Midtrans per-seller DITUNDA; bukan kanal aktif M4. Manual/COD tetap menjadi sumber kebenaran pembayaran.
- Semua transisi hanya lewat RPC; UPDATE langsung `orders`/`payments` tetap REVOKE.

---

## SUB-SLICE 1 — Order status machine + pembayaran manual
Status: `[x]` dieksekusi (CI hijau 24 Nov 2026). Gate keluar: **APPROVED oleh founder #1**; slice 2 dilanjutkan.
> Development-only: sub-slice 1 **tidak boleh dianggap rilis/production** sebelum
> sub-slice 3 hijau, karena jurnal belum dipasang.

### Task berurutan
| # | Task | Jenis | File utama | Gate |
|---|---|---|---|---|
| 1.1 | Tulis pgTAP MERAH untuk transisi legal/ilegal, overpay, DP parsial, RLS lintas usaha, direct UPDATE ditolak, manual order (harga beda katalog, dedup pelanggan, field tambahan ditolak). **Eksplisit:** `DP_DITERIMA` SKIPPABLE — COD tanpa DP `DIKONFIRMASI → SIAP_DIKIRIM` langsung; pelunasan penuh sekali bayar wajib diuji; event Midtrans non-sukses (`expire`/`deny`/`cancel`) → outcome `IGNORED`, tidak pernah silent drop (refund = BACKLOG) | test | `packages/supabase/tests/0005_m4_manual_payments_test.sql`, `0006_m4_manual_order_test.sql` | merah dulu |
| 1.2 | Migrasi 0005: `payments` (id, business_id, order_id, jenis DP/PELUNASAN/COD, jumlah BIGINT, kanal MANUAL/COD/QRIS/VA, bukti_path opsional, catatan), `payment_status` bila diperlukan, index, RLS select-own, REVOKE tulis langsung; perbaiki guard null `ongkir`/`dp` yang hilang di 0004 via CHECK baru (jangan edit 0004) | migrasi | `packages/supabase/migrations/0005_m4_manual_payments.sql` | hijau |
| 1.3 | RPC `create_manual_order(p_items jsonb,p_ongkir bigint,p_dp bigint,p_nama text,p_telepon text,p_alamat text default null,p_catatan text default null,p_metode_bayar text[] default ['TRANSFER'],p_due_date timestamptz default null) returns uuid` (harga satuan manual, product_id milik usaha), `confirm_order(p_order_id uuid) returns uuid`, `record_payment(p_order_id uuid,p_jenis text,p_jumlah bigint,p_kanal text,p_bukti_path text default null) returns uuid`, `mark_ready(p_order_id uuid)`, `ship_order(p_order_id uuid,p_kurir_nama text default null,p_nomor_resi text default null)` **status-only**, `receive_order(p_order_id uuid)` **status-only (DIKIRIM+lunas; sisa>0 ditolak; tanpa uang baru)**, `set_shipping(p_order_id uuid,p_kurir text,p_resi text)`, `cancel_order(p_order_id uuid)` **status-only (DRAFT–SIAP_DIKIRIM saja)**; SECURITY DEFINER + guard `auth.uid()`; kalkulasi sisa dari server; tolak overpay; tanpa jurnal/stok | RPC | `0005_m4_manual_payments.sql`, `0006_m4_manual_order.sql`, `0009_m4_receive_order.sql` | hijau |
| 1.4 | `supabase gen types typescript --local --workdir packages` + commit `types/db.ts` bersama migrasi | ops | `packages/supabase/types/db.ts` | drift check hijau |
| 1.5 | Zod order/payment schema + money adapter BIGINT; tidak ada `Number()` untuk uang | kode | `packages/shared/src/schemas/payment.ts`, `packages/shared/src/money.ts` | `pnpm test` hijau |
| 1.6 | UI seller: `/orders` filter status + `/orders/:id` detail timeline/histori pembayaran + `/orders/new` manual + modal catat bayar & upload bukti privat Storage; aksi sesuai status | UI | `apps/web/src/routes/orders*.tsx`, `src/hooks/use-orders.ts`, `src/main.tsx` | build hijau |
| 1.7 | Sinkron kontrak: API-CONTRACTS §B/C, DATA-MODEL, M4 modul; catat devisi "status-only sementara" | docs | 3 file docs di atas | review |

### Test wajib slice 1
- pgTAP: `DRAFT→DIKONFIRMASI→DP_DITERIMA→SIAP_DIKIRIM→DIKIRIM→SELESAI`; **`DP_DITERIMA` skippable** untuk COD tanpa DP (`DIKONFIRMASI→SIAP_DIKIRIM`); **pelunasan penuh sekali bayar**; `SELESAI→DIKIRIM` ditolak; overpay ditolak; dua DP parsial akumulasi benar; `set_shipping` tanpa perubahan uang; cross-`business_id` gagal; anon/direct UPDATE gagal; `create_manual_order` memakai harga manual, menolak field tambahan/DP berlebih, dan dedup pelanggan.
- Vitest: schema payment menolak desimal dan nominal negatif; format via `formatRupiah`.
- Manual HP 5 menit: konfirmasi draft → DP transfer manual + bukti → buka lagi bukti dari detail order → pelunasan → status.

### Gate keluar 1
`pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` + `supabase test db` + drift types hijau; diff reviewed; founder approve sebelum slice 2.

---

## SUB-SLICE 2 — Midtrans Snap + webhook (ARSIP / DITUNDA)
Status: `[~]` dieksekusi 24 Nov 2026, lalu **RESCOPED/DITUNDA 25 Nov 2026** oleh founder.
Gate #2 sempat APPROVED, tetapi tidak dilanjutkan ke produksi dan bukan blocker apa pun.
Task 2.1–2.9 di bawah dibekukan sebagai template implementasi slice billing langganan.
Progres Gate #2: pgTAP 229 hijau (tambah 0008 verifikasi append-only), Vitest 89 hijau
(Shared + Worker), lint/typecheck/build/worker bundle/guard/browser types drift hijau,
UI Snap token terpasang. Deploy staging sukses; device USB `e8c955c3` membuka detail
`ORD-20261124-001` via URL cache-bust: tombol "Bayar online" + "Lihat bukti" tampil,
"Lihat bukti" membuka signed URL Supabase Storage. Task 2.9 (sandbox secrets +
verifikasi founder) masih menunggu kredensial/KYC.

### Task berurutan
| # | Task | Jenis | File utama | Gate |
|---|---|---|---|---|
| 2.1 | Tulis pgTAP MERAH untuk `payment_events` append-only, replay `(provider,event_id)`, amount mismatch, signature-status belum VERIFIED, transisi ilegal | test | `packages/supabase/tests/0007_m4_midtrans_events_test.sql` | merah dulu |
| 2.2 | Migrasi 0007: `payment_intents` (provider_order_id UNIQUE global, amount BIGINT server-side, jenis, status, expiry), `payment_events` gateway-agnostic (provider, event_id, payload jsonb, signature_status, received_at), `payment_event_outcomes` append-only dengan `UNIQUE(order_id,event_id)`; REVOKE tabel dari service_role, GRANT EXECUTE hanya RPC allowlist | migrasi | `packages/supabase/migrations/0007_m4_midtrans_events.sql` | hijau |
| 2.2a | Migrasi 0008: `payment_event_verifications` append-only + RPC `mark_payment_event_verified`; `apply_payment_event` membaca status verifikasi terakhir (fallback kompatibel untuk raw lama) tanpa mengubah payload `payment_events` | migrasi | `packages/supabase/migrations/0008_m4_midtrans_verifications.sql`, `0008_m4_midtrans_verifications_test.sql` | hijau |
| 2.3 | RPC allowlist `log_payment_event(p_provider,p_event_id,p_payload,p_signature_status)` + `mark_payment_event_verified(p_event_id,p_signature_status)` + `apply_payment_event(p_event_id,p_provider_order_id,p_gross_amount,p_transaction_status,p_status_code,p_fraud_status)`; validasi: raw event UNVERIFIED → verifikasi → amount server-side, status success, legal transition, idempoten. **JANGAN panggil `record_payment` langsung** (`apply_payment_event` tanpa JWT user; guard `auth.uid()` akan gagal, dilarang melonggarkan guard global). Satu core privat `_post_payment(...)` SECURITY DEFINER dipakai manual dan webhook; `apply_payment_event` memvalidasi `order_id`/`business_id` sendiri sebelum memanggil core; tanpa query bebas | RPC | `0007_m4_midtrans_events.sql`, `0008_m4_midtrans_verifications.sql` | hijau |
| 2.4 | `parseGatewayAmount` di `money.ts`: terima `"165000.00"`/`"165000"`, tolak `"165000.5"`; golden test; Worker & RPC pakai BIGINT identik | kode | `packages/shared/src/money.ts`, `money.test.ts` | hijau |
| 2.5 | `src/lib/midtrans.ts`: Snap server-side via `MIDTRANS_SERVER_KEY` (Basic auth) ke endpoint Snap resmi; buat `provider_order_id` unik; return token/redirect URL; tidak kirim Secret Key ke browser | kode | `apps/worker/src/lib/midtrans.ts` | mock test hijau |
| 2.6 | `POST /api/webhooks/payments/midtrans`: zod body, `log_payment_event(...,'UNVERIFIED')` paling awal, verifikasi `SHA512(order_id+status_code+gross_amount+SignatureSecretKey)` dengan Web Crypto + constant-time, `mark_payment_event_verified`, lalu `apply_payment_event` via service_role; invalid=401, mismatch=422, RPC gagal=500 retry, duplicate raw=200 no-op | kode | `apps/worker/src/routes/payments.ts`, `src/index.ts` | hijau |
| 2.7 | Vitest route: stub `fetch`, secret fixture, replay, bad signature, mismatch, RPC failure; CI grep secret di `apps/web/dist` termasuk `MIDTRANS_*` | test/CI | `apps/worker/tests/payments-route.test.ts`, `.github/workflows/ci.yml` | mock tanpa secret nyata |
| 2.8 | UI: tombol "Bayar via Midtrans" di `/orders/:id` memanggil Worker dengan JWT user; status menunggu dibaca via TanStack Query | UI | `apps/web/src/routes/orders-detail.tsx`, `src/lib/api.ts` | build hijau |
| 2.9 | Founder isi sandbox secrets via `wrangler secret put`: `MIDTRANS_SERVER_KEY`, `MIDTRANS_SIGNATURE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; verifikasi sandbox manual | ops | Worker staging | gate founder |

### Test wajib slice 2
- pgTAP adversarial: amount mismatch, replay webhook, event UNVERIFIED/INVALID, raw payload tidak bisa diubah, verifikasi append-only idempoten, transisi ilegal, order BATAL, intent expired, service_role mencoba SELECT tabel langsung = ditolak.
- Vitest: signature valid/invalid + rotasi kunci, duplicate event, RPC error, amount desimal ditolak, urutan `log → verify → mark → apply`.
- CI assert: bundle web bebas `service_role|SUPABASE_SERVICE_ROLE|LLM_API_KEY|MIDTRANS_(SERVER_KEY|SIGNATURE_SECRET_KEY|PREVIOUS_SIGNATURE_SECRET_KEY|SECRET|API_KEY)`.
- Event non-sukses (`expire`/`deny`/`cancel`) wajib menghasilkan `payment_event_outcomes` berstatus `IGNORED`, bukan silent drop; refund masuk BACKLOG.
- **Catatan verifikasi founder:** formula `SHA512(order_id+status_code+gross_amount+MIDTRANS_SIGNATURE_SECRET_KEY)` sudah dikutip ulang dari docs resmi `access-keys` (update 3 Nov 2026): sejak 28 Okt 2026 verifikasi notifikasi memakai Signature Secret Key, bukan Server Key. Founder belum bisa verifikasi independen saat perencanaan (docs timeout); verifikasi sandbox mandiri masih menunggu kredensial/KYC. Saat slice 2, catat di LESSONS: sumber formula + URL docs + hasil verifikasi sandbox. Jika sandbox menunjukkan formula beda, **hentikan dan laporkan** sebelum lanjut.

### Gate keluar 2 (arsip, tidak dipakai)
Riwayat: `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` + pgTAP + drift types + grep bundle hijau; founder approve. Keputusan terbaru menggantikan gate ini — slice 3 tidak menunggu KYC/gateway.

---

## SUB-SLICE 3 — Jurnal T0–T12 + stok KELUAR/HPP + rekap harian minimal
Status: `[~]` basis hijau: pgTAP `0010`–`0013` (`Files=13, Tests=434`), `pnpm lint` (0 error), `pnpm typecheck`, `pnpm test` (109 setelah 4 golden test batch pra-promosi), `pnpm build` (`index-3SNyYUkr.js`), Worker bundle dry-run, type drift/secret guard/journal guard/`git diff --check`; commit `c3ea691`, CI `45740583748` 4/4, staging `index-BC-7Gz73.js`, HP CEK10–CEK14 20/20. **Gate #3 ACC 26 Nov**; promosi produksi menunggu batch UI/docs terakhir lolos CI.
Gate keluar: CI hijau + review founder #3 + promosi produksi + `/remember`.
Jawaban Gate #1 (5 pertanyaan + file:line) sudah ditempelkan ke chat dan diarsipkan di
`plans/W3-M4-ORDERS-PAYMENTS.md:9-15`.

### Task berurutan
| # | Task | Jenis | File utama | Gate |
|---|---|---|---|---|
| 3.1 | Tulis pgTAP MERAH untuk semua fixture T0–T12 + adversarial: insert jurnal timpang langsung ditolak trigger DEFERRED, reversal immutable, HPP dobel, amount mismatch, duplikat pembayaran manual, transisi ilegal | test | `packages/supabase/tests/0010_m4_journal_core_test.sql`, `0011_m4_journal_integration_test.sql` | merah dulu |
| 3.2 | Migrasi 0010: `journal_entries` (kejadian T0..T12, order_id, reversi_dari_id), `journal_lines` (debit/kredit BIGINT), `post_journal` INTERNAL (assertion SUM debit=kredit sebelum insert), constraint trigger DEFERRED, REVOKE UPDATE/DELETE/INSERT langsung, kolom `reversi_dari_id` | migrasi | `packages/supabase/migrations/0010_m4_journal_core.sql` | hijau |
| 3.3 | Migrasi 0011: template T0–T12 di SQL (bukan TS), integrasi ke RPC slice 1/2: `record_payment` → T1/T4/T12, `ship_order` → T2+T3 atau T5/T6, `mark_ready` → T0 tanpa jurnal, `receive_order` → tanpa jurnal, `cancel_order` → reversi, T7 ongkir ditanggung penjual. **Sumber fee T12 eksplisit:** input manual penjual untuk MVP (webhook Midtrans bukan sumber aktif M4); **dilarang hardcode 0,7% untuk semua kanal** | migrasi | `packages/supabase/migrations/0011_m4_journal_integration.sql` | hijau |
| 3.4 | HPP rata-rata bergerak: `ship_order` buat `stock_movements` KELUAR dalam transaksi sama dengan T3; rata-rata `(qty_lama*hpp_lama + qty_masuk*harga_beli)/(qty_lama+qty_masuk)` dibulatkan `round()` ke BIGINT; FK/unique KELUAR per order; `record_stock_move` KELUAR dari klien tetap ditolak | RPC | `0011_m4_journal_integration.sql` | golden T8 hijau |
| 3.5 | View `v_rekap_harian` minimal dengan `security_invoker = on`, turunan `journal_lines`; tanpa tabel agregat paralel; label UI "mengacu SAK EMKM" | DB/docs | `0011_m4_journal_integration.sql`, `docs/ACCOUNTING-RULES.md` | hijau |
| 3.6 | Koreksi docs: `docs/ACCOUNTING-RULES.md:15` `templates.ts` → template di SQL migration sesuai rules/01 §1; update API-CONTRACTS/DATA-MODEL/M4 | docs | 4 file docs | review |
| 3.7 | `supabase gen types` + commit types; verifikasi RLS lintas usaha; CI grep jurnal hanya di migrasi | ops | `types/db.ts`, `.github/workflows/ci.yml` | drift hijau |
| 3.8 | Verify manual HP: alur Siti `3×75.000 + 15.000 ongkir, DP 100.000, kirim, lunas 140.000`; COD tanpa DP; COD+DP; batal sebelum/sesudah kirim; rekap harian cocok | ops | staging | founder review |
| 3.9 | Celah 1: `gagal_kirim(p_order_id)` DIKIRIM→BATAL, reversi T2/T3/T4/T5/T6/T7, stok MASUK pengembalian dengan snapshot `harga_beli` KELUAR (bukan rata-rata saat ini), guard owner, tombol UI | migrasi/test/UI | `0012_m4_failed_shipment.sql`, `0012_m4_failed_shipment_test.sql`, `orders-detail.tsx` | hijau |
| 3.10 | Celah 2: auto-SELESAI hanya `jenis='COD'`; pelunasan non-COD saat DIKIRIM tetap DIKIRIM lalu `receive_order` | migrasi/test | `0013_m4_cod_only_completion.sql`, `0013_m4_cod_only_completion_test.sql` | hijau |
| 3.11 | Gate #3 a–d: blok stok kurang, T8 prefill manual + risiko divergensi, sembunyikan Bayar online, konfirmasi T9 | docs/UI | plan + docs + UI | review |

### Golden fixture wajib
- Siti T1–T4: DP `100.000` ke UMP; T2 UMP+Piutang `140.000` / Pendapatan `225.000` + Ongkir `15.000`; T3 HPP `165.000` / Persediaan; T4 Kas `140.000` / Piutang.
- T5 COD tanpa DP; T6 COD+DP; T7 ongkir ditanggung penjual; T8 pembelian mengubah rata-rata; T10 prive; T11 pra-kirim = `cancel_order` (reversi jurnal order, tanpa stok KELUAR); T11 setelah kirim = `gagal_kirim` (reversi T2/T3/T4/T5/T6/T7 + stok MASUK memakai snapshot HPP KELUAR); **T12 fee dari input manual penjual, bukan hardcode 0,7% universal**; T0 tanpa jurnal.
- Adversarial: amount mismatch, transisi ilegal, duplikat pembayaran manual, insert jurnal timpang, langsung UPDATE/DELETE jurnal, lintas `business_id`.

### Jawaban Gate #3 founder (file:line, 26 Nov 2026)
1. **Stok kurang saat `ship_order`** — DIBLOK, bukan diizinkan negatif. `ship_order`
   mengecek stok tersedia sebelum movement/jurnal apa pun dan menaikkan
   `STOK_TIDAK_CUKUP: <nama produk> — tersedia X, butuh Y`
   (`packages/supabase/migrations/0012_m4_failed_shipment.sql:53-68`). Tidak ada jurnal
   atau stok parsial (pgTAP `0012_m4_failed_shipment_test.sql:362-385`). Fixture lama
   `0005`/`0009` diberi stok awal 50 agar tetap realistis.
2. **T8 manual** — template `_journal_event('T8')` tetap internal SQL; belum dipost
   otomatis oleh `record_stock_move`. Saat UI jurnal manual dibangun, field qty/harga
   DI-PREFILL dari `stock_movements` MASUK terakhir produk yang bersangkutan, lalu seller
   boleh mengubah. Risiko: ledger bisa diverge dari stok bila seller mengubah nilai atau
   tidak memposting T8; dicatat di `docs/ACCOUNTING-RULES.md` dan `docs/DATA-MODEL.md`.
3. **Tombol "Bayar online"** — DISEmbunyikan/dihapus dari produksi. Blok QRIS/VA dan
   loader Snap dihapus dari `apps/web/src/routes/orders-detail.tsx`; Midtrans per-seller
   ditunda, jadi tidak ada CTA yang mengarah ke Worker tanpa secret. Worker lama tetap
   arsip template billing. Gate HP: tidak ada tombol "Buat QRIS/VA".
4. **T9** — DIKONFIRMASI sebagai template beban operasional manual internal
    (`_journal_event('T9')` → 6-6040), bukan jalur order. Teruji di
    `packages/supabase/tests/0011_m4_journal_integration_test.sql:862-904`.

Tambahan Review #3: snapshot HPP retur wajib dari `harga_beli` movement KELUAR asli, bukan
`products.hpp_rata_rata` saat `gagal_kirim` (LESSONS #53); dikunci 2 assertion pgTAP `0012`.

Batch pra-promosi 26 Nov (ACC Gate #3): Jenis pembayaran efektif dihitung dari `nextAction()` —
non-COD `DIKIRIM` dengan sisa > 0 terkunci `PELUNASAN`, COD terkunci `COD`/`COD`
(`apps/web/src/lib/order-presentation.ts`); `STOK_TIDAK_CUKUP` ditampilkan apa adanya
(`apps/web/src/lib/form-error.ts`). Keduanya golden-test. Bukti HP dipindah ke
`docs/evidence/m4/`. `432 → 434` berasal dari 2 assertion snapshot HPP yang ditambahkan ke
`0012` (plan `39 → 41`) setelah angka 432 dicatat di tengah sesi; 434 yang kanonik.
Provenance deploy: CI `45351527629` (`84b0c8f`) → `index-BB2ga9MK.js`; CI `45352513863`
(`1ab17af`, docs-only) → deploy ulang bundle yang sama; CI `45519222493` (`2fa0c3a`) →
`index-CxqO3nNU.js`.

### Skrip retest HP lanjutan (CEK 10+ — staging, setelah CI 4/4)
Prasyarat origin: `https://gerailo-staging.mdimas-jobs.workers.dev`.
1. `adb devices` → pastikan device `e8c955c3`; `adb forward tcp:9223 localabstract:chrome_devtools_remote`.
2. Cek target HP: `curl http://127.0.0.1:9223/json/version` wajib mengandung `Android-Package`.
3. CLEAR SITE DATA per-origin staging sebelum tes (SW cache per-origin):
   `cdp = await context.newCDPSession(page); await cdp.send("Storage.clearDataForOrigin", { origin: "https://gerailo-staging.mdimas-jobs.workers.dev", storageTypes: "all" });`
   lalu reload dan cek HTML memuat `/assets/index-BC-7Gz73.js`; aset mengandung
   "Lapor gagal kirim", "Jurnal otomatis aktif", "Catat COD diterima", TANPA
   "Bayar online"/"Buat QRIS/VA".
4. **CEK10 `gagal_kirim`/reversi**: buat order transfer DP `100.000`, 3×`75.000` + ongkir
   `15.000`; konfirmasi → catat DP → kirim → lunas `140.000` (status tetap DIKIRIM) →
   tombol "Lapor gagal kirim" → status BATAL milik usaha itu; rekap harian pendapatan/HPP/
   piutang = `0`, UMP = `100.000`, kas = `100.000`; stok balik; baris KELUAR lama tetap ada
   dan MASUK memakai HPP snapshot KELUAR.
5. **CEK11 COD auto-SELESAI**: order COD tanpa DP → konfirmasi → kirim → "Catat COD
   diterima" → status SELESAI langsung; jurnal T5 sekali, T4 tidak dobel.
6. **CEK12 prepaid TIDAK auto-SELESAI**: order transfer tanpa DP → konfirmasi → kirim →
   catat pelunasan penuh → status MASIH DIKIRIM + CTA "Tandai diterima/selesai" → klik →
   SELESAI tanpa uang/jurnal baru.
7. **CEK13 blokir stok kurang**: produk stok 1, order qty 2 → konfirmasi → "Tandai dikirim"
   → error `STOK_TIDAK_CUKUP: <nama> — tersedia 1, butuh 2`; status tetap DIKONFIRMASI;
   tidak ada jurnal/stock movement baru.
8. **CEK14 Bayar online absen**: di detail DIKONFIRMASI/DP_DITERIMA tidak ada tombol
   "Bayar online"/"Buat QRIS/VA", tetapi "Catat pembayaran" manual masih berfungsi dan
   memposting T1/T4; `metode_bayar` array COD/TRANSFER tetap tampil benar.
9. Rekam nomor order + screenshot per CEK; CEK10–CEK14 lulus 20/20 dan Review #3 ACC.
   Produksi dipromosikan 26 Nov setelah batch pra-promosi lolos CI 4/4: commit `5bb15e3`,
   CI `45788400727` 4/4, staging `index-Zbfd4X71.js`, produksi `index-DgwjxP9i.js`.

### Gate keluar 3 / Definition of Done
`pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build`, semua pgTAP hijau, drift types hijau, grep bundle hijau, CI 4/4, manual HP terverifikasi. `AGENTS.md`, `LESSONS-LEARNED.md`, modul M4, API-CONTRACTS, DATA-MODEL diperbarui; M4 ditandai `[x]` setelah promosi produksi + smoke HP produksi `ORD-20261126-003`. `/remember` masih menyusul.

### Promosi & smoke produksi 26 Nov
- Commit `5bb15e3`, CI `45788400727` 4/4, staging `index-Zbfd4X71.js`.
- Migrasi `0010`–`0013` ter-apply ke Supabase produksi; Worker `gerailo-production` version `2dcaea96-f34b-4d88-aee7-d94fd3390e8e`; bundle `index-DgwjxP9i.js`; health OK.
- Smoke HP produksi `ORD-20261126-003`: 3×Sosis @75000 + ongkir 15000 → `PELUNASAN` 240000 MANUAL → DIKONFIRMASI/Lunas → SIAP_DIKIRIM → DIKIRIM (JNE JP0012345678) → `receive_order` → SELESAI/Lunas/Sisa 0.
- Verifikasi REST/JWT: T1 240/240, T2 240/240, T3 150/150; stok KELUAR −3, HPP snapshot 50000, stok akhir 17. Order cacat `ORD-20261126-001`/`002` dibatalkan.
- Catatan: email produksi masih Magic Link default; magic link dibuka di Chrome HP yang sama dan `/auth/callback` sukses.

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Slice 1/2 belum memposting jurnal | Sudah ditutup di Slice 3; banner lama diganti, jurnal otomatis aktif, produksi dipromosikan 26 Nov dan terverifikasi. |
| KYC Midtrans | Tidak relevan untuk M4; Midtrans per-seller ditunda. KYC Gerailo hanya saat slice billing langganan. |
| `service_role` meluas ke milestone lain | LESSONS #35 mencatat scoped exception; DB membatasi 2 RPC; CI grep; approval gate baru untuk penggunaan lain. |
| `gross_amount` Midtrans desimal | `parseGatewayAmount` + regex `^\d+(\.00)?$` di TS dan SQL; BIGINT di kedua sisi. |
| 0004 kehilangan guard null DP/ongkir | CHECK baru di 0005; migrasi lama tidak diedit. |
| Urutan webhook tidak guaranteed (Xendit nanti) | `payment_events` gateway-agnostic + outcome idempoten; tidak bergantung urutan. |

## BACKLOG (tidak masuk M4 slice ini)
- Xendit sebagai opsi kedua (tabel already gateway-agnostic; butuh adapter + callback token).
- Webhook langganan/`subscriptions` + cron `billing-daily` (ADR terpisah).
- M8 halaman pembeli ber-token, `payment_reports`, share WA, rotasi token.
- M9 katalog publik + `order_leads`.
- **Stok per varian tertunda secara eksplisit:** `order_items` masih product-level sejak M3; belum ada stok/varian-level. Jangan hilang diam-diam — aktifkan hanya saat order ber-varian didukung.
- iOS fisik 5 menit (perangkat belum tersedia), edit profil/pengaturan M1.
- Reminder detail order `UMP tertahan Rp X — kembalikan & catat refund` follow-up pasca-promosi (ACC founder Gate #3).
