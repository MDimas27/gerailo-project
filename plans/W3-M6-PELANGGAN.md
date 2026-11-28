# W3-M6-PELANGGAN.md — Rencana Kerja M6 Pelanggan

> W3-M6 · plan formal · status: **DISETUJUI (GATE PLAN ACC 28 Nov 2026 — tanpa gate kedua)**
> Prasyarat: M7 produksi (`3b4e9c52…`, tag `m7-production-v1`); PREP M6 ACC (a)–(e).
> Deviasi pasca-ACC wajib masuk kolom **Deviasi** di bawah.

## Tujuan sesi
M6 = **UI CRUD pelanggan + hubungan order-pelanggan** di atas skema yang SUDAH ada
(`customers` 0003:40-51, dedup `normalize_telepon`, `orders.customer_id`, FK
`ON DELETE RESTRICT`). Tidak ada skema pelanggan baru selain kolom arsip `aktif`.
Tanpa menyentuh `_post_payment`, core jurnal, enum, dan angka 5 laporan M7.

3 permukaan utuh:
1. `/customers` — list + cari, default sembunyikan arsip + toggle.
2. `/customers/:id` — profil editable, histori order, 3 statistik, arsip/reaktivasi, hapus (hanya tanpa order).
3. Autocomplete pelanggan di `/orders/new` — sembunyikan arsip default + badge "Diarsipkan" + ajakan reaktivasi; order tetap auto-link ke pelanggan diarsipkan.

## Keputusan gate PREP (mengikat)
| ID | Putusan |
|---|---|
| a | Auto-link **TETAP** (key `normalize_telepon`); tidak ada kasus ditolak; profil editable; merge dua-telepon = backlog; re-pin dedup. |
| b | Hapus keras hanya pelanggan **tanpa** order; ber-order = **arsip** `aktif BOOLEAN NOT NULL DEFAULT true` (0016, additive); M7 views **tidak** memfilter `aktif`; autocomplete/list sembunyikan arsip + toggle + reaktivasi; auto-link tetap ke pelanggan diarsipkan (badge). Label test: FK delete-ber-order = **re-pin**; RED asli = kolom/RPC arsip, pengecualian autocomplete, guard RPC baru. |
| c | Stats **v1**; `totalBelanja` via `money.ts`; **0 `Number()`** di komponen. |
| d | `metode_bayar` cleanup **tetap backlog**. |
| e | Jalur tulis = **RPC** (`upsert_customer`, `update_customer`, `set_customer_aktif`, `hapus_customer`), `normalize_telepon` server-side; grant+policy **ditolak**; kontrak §B + DATA-MODEL diperbarui; PII telepon di-mask di semua evidence. |

## Koreksi GATE PLAN (mengikat)
1. **G9 aturan status EKSPLISIT**: `DRAFT` & `BATAL` diabaikan; `SELESAI`, `DIKIRIM`,
   `DP_DITERIMA`, `SIAP_DIKIRIM` dihitung. Fixture: `SELESAI 240.000 (23) +
   DP_DITERIMA 50.000 (24) + BATAL 100.000 (25) + SIAP_DIKIRIM 90.000 (26) +
   DIKIRIM 375.000 (27)` → **755.000 / 4 / 2026-11-27**; nol order → `{0n,0,null}`.
2. **G13** helper filter arsip (sembunyikan default + toggle + badge) **RED dulu**,
   dipakai Task 5; tambah kasus **telepon tidak valid ditolak** (G14).
3. **Routing 7 task**: GLM = Task 1, 2, 3; DeepSeek = Task 4, 5, 7; docs = Task 6.
4. **CEK1–CEK7** di Task 7: list/cari, tambah, edit, arsip+reaktivasi,
   autocomplete+badge arsip, hapus+FK→"gunakan Arsipkan", stats cocok fixture +
   breakdown M7 tak berubah. PII telepon di-mask semua evidence.

## Task berurutan (satu task satu commit)
| # | Task | Jenis | File utama | Model | Selesai |
|---|---|---|---|---|---|
| 1 | pgTAP `0016_m6_customers_test.sql` plan(24) **MERAH** | test | `packages/supabase/tests` | **GLM** | [x] |
| 2 | Migrasi `0016_m6_customers.sql`: `customers.aktif` + 4 RPC + REVOKE/GRANT; HIJAU + `gen types` | DB | migrations + types | **GLM** | [x] |
| 3 | Vitest **MERAH**: stats, filter arsip/badge, pesan error | test | `packages/shared`, `form-error.test.ts` | **GLM** | [x] |
| 4 | Implementasi helper + pemetaan pesan → HIJAU | kode | shared + form-error | DeepSeek | [x] |
| 5 | UI: hooks, `/customers`, `/customers/:id`, autocomplete `/orders/new` | UI | `apps/web/src` | DeepSeek | [x] |
| 6 | Kontrak: API-CONTRACTS §B/§C, DATA-MODEL, MODULES/M6 | docs | 3 docs | bebas | [x] |
| 7 | Gate + CI staging + smoke HP CEK1–CEK7 + evidence + review/laporan | ops/docs | evidence | DeepSeek | [ ] |

## Golden test matrix (RED asli vs re-pin)
| # | Test | Label | Fixture → Assert | File |
|---|---|---|---|---|
| G1 | `upsert_customer` baru | **RED dulu** | `'+62 812-1111-0001'` → `6281211110001`, `aktif=true` | pgTAP 0016 |
| G2 | Duplikat telepon (beda format/arsip) | **RED dulu** | `TELEPON_TERDAFTAR` (22023) | pgTAP 0016 |
| G3 | `update_customer` | **RED dulu** | profil/telepon berubah; tabrakan ditolak | pgTAP 0016 |
| G4 | Arsip/reaktivasi | **RED dulu** | `aktif=false` → `true`; guard owner | pgTAP 0016 |
| G5 | `hapus_customer` tanpa order | **RED dulu** | `lives_ok` + baris hilang | pgTAP 0016 |
| G6 | FK delete-ber-order | **re-pin** (`0003:73`) | `23503` | pgTAP 0016 |
| G7 | Auto-link existing & arsip | **re-pin** (`0003:120-175`, `0006:224-246`) | `order.customer_id` = pelanggan; `aktif` tetap | pgTAP 0016 |
| G8 | RLS negatif | **re-pin pola** | SELECT 0; RPC → `PELANGGAN_TIDAK_DITEMUKAN` | pgTAP 0016 |
| G9 | Stats aritmetika | **RED dulu** | 755.000 / 4 / 2026-11-27; nol → `{0n,0,null}` | Vitest |
| G10 | Pesan error | **RED dulu** | `23503` → "gunakan Arsipkan"; `TELEPON_TERDAFTAR` | Vitest |
| G11 | Re-pin M7 | **re-pin** | `0015` hijau; angka tidak berubah | full suite |
| G12 | Catatan >500 | **RED dulu** | `22023` | pgTAP 0016 |
| G13 | Filter arsip + badge | **RED dulu** | default sembunyikan; toggle tampil; label | Vitest |
| G14 | Telepon tidak valid | **RED dulu** | `TELEPON_TIDAK_VALID` (22023) | pgTAP 0016 |

**Fixture G9 (pin reviewer):**
```
orders: [SELESAI 240000 @2026-11-23, DP_DITERIMA 50000 @2026-11-24,
         BATAL 100000 @2026-11-25, SIAP_DIKIRIM 90000 @2026-11-26,
         DIKIRIM 375000 @2026-11-27]
→ totalBelanja 755000n, frekuensi 4, tanggalTerakhir 2026-11-27
kosong → { totalBelanja: 0n, frekuensi: 0, tanggalTerakhir: null }
```

## Target kanonik
- pgTAP: `Files=16, Tests=499` (475 + plan(24)).
- Vitest: **165** (158 + 7 test baru).
- Kanonik final = angka CI hijau terakhir (dicatat LESSONS).

## Definition of Done
- [ ] G1–G14 lulus; G11 hijau **sebelum** staging.
- [ ] lint/typecheck/test/build + pgTAP hijau; CI staging 4/4.
- [ ] Smoke HP CEK1–CEK7 (PII telepon di-mask); evidence `docs/evidence/m6/`.
- [ ] AGENTS/LESSONS/modul/plan diperbarui; promosi produksi setelah ACC.

## Deviasi dari plan (substansi pasca-ACC)
- **Model aktif ≠ pemetaan**: Task 4/5/7 (DeepSeek) dikerjakan model aktif (GLM) —
  override ke atas; CI tetap hakim. Dicatat di laporan + LESSONS.

## BACKLOG
- Merge pelanggan dua-telepon · cleanup `metode_bayar` · sinkron katalog WA.
