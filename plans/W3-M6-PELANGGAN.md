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
2. `/customers/:id` — profil editable, histori order, 3 statistik (total belanja,
   frekuensi, tanggal terakhir), arsip/reaktivasi, hapus (hanya tanpa order).
3. Autocomplete pelanggan di `/orders/new` — sembunyikan arsip default + badge
   "Diarsipkan" + ajakan reaktivasi; order tetap auto-link ke pelanggan diarsipkan.

## Keputusan gate PREP (mengikat)
| ID | Putusan |
|---|---|
| a | Auto-link **TETAP** (key `normalize_telepon`); tidak ada kasus ditolak; profil editable; merge dua-telepon = backlog; re-pin dedup. |
| b | Hapus keras hanya pelanggan **tanpa** order; ber-order = **arsip** `aktif BOOLEAN NOT NULL DEFAULT true` (0016, additive); M7 views **tidak** memfilter `aktif`; autocomplete/list sembunyikan arsip + toggle + reaktivasi; auto-link tetap ke pelanggan diarsipkan (badge). Label test: FK delete-ber-order = **re-pin**; RED asli = kolom/RPC arsip, pengecualian autocomplete, guard RPC baru. |
| c | Stats **v1**; `totalBelanja` via `money.ts`; **0 `Number()`** di komponen. |
| d | `metode_bayar` cleanup **tetap backlog**. |
| e | Jalur tulis = **RPC** (`upsert_customer`, `update_customer`, `set_customer_aktif`, `hapus_customer`), `normalize_telepon` server-side; grant+policy **ditolak**; kontrak §B + DATA-MODEL diperbarui; PII telepon di-mask di semua evidence. |

## Koreksi GATE PLAN (mengikat)
1. **G9 aturan status EKSPLISIT**: `DRAFT` & `BATAL` diabaikan; `SELESAI`,
   `DIKIRIM`, `DP_DITERIMA`, `SIAP_DIKIRIM` dihitung (konsisten T2: pendapatan
   diakui saat kirim). Fixture: `SELESAI 240.000 (23) + DP_DITERIMA 50.000 (24) +
   BATAL 100.000 (25) + SIAP_DIKIRIM 90.000 (26) + DIKIRIM 375.000 (27)` →
   **total 755.000 / frekuensi 4 / terakhir 2026-11-27**; nol order → `{0n, 0, null}`.
2. **G13** helper filter arsip (sembunyikan default + toggle + badge) **RED dulu**,
   dipakai Task 5. Tambah kasus **telepon tidak valid ditolak** (pgTAP G14).
3. **Routing 7 task**: GLM = Task 1, 2, 3 (penulisan test/DB = jalur penalaran);
   DeepSeek = Task 4, 5, 7; docs = Task 6.
4. **CEK1–CEK7** di Task 7: list/cari, tambah, edit, arsip+reaktivasi,
   autocomplete+badge arsip, hapus+FK→"gunakan Arsipkan", stats cocok fixture +
   breakdown M7 tak berubah. PII telepon di-mask semua evidence.

## Task berurutan (satu task satu commit)
| # | Task | Jenis | File utama | Model | Selesai |
|---|---|---|---|---|---|
| 1 | pgTAP `0016_m6_customers_test.sql` plan(24) **MERAH** (kolom/RPC belum ada) | test | `packages/supabase/tests` | **GLM** | [ ] |
| 2 | Migrasi `0016_m6_customers.sql`: `customers.aktif` + 4 RPC (SECURITY DEFINER, guard owner, `normalize_telepon`, validasi) + REVOKE/GRANT; **HIJAU** + `gen types` | DB | migrations + types | **GLM** | [ ] |
| 3 | Vitest **MERAH**: `statistikPelanggan`, `saringPelangganArsip` + badge, pesan error `TELEPON_TERDAFTAR`/FK `23503` | test | `packages/shared`, `apps/web/src/lib/form-error.test.ts` | **GLM** | [ ] |
| 4 | Implementasi helper + pemetaan pesan → **HIJAU** | kode | shared + form-error | DeepSeek | [ ] |
| 5 | UI: `use-customers.ts`/`use-customer.ts`, `/customers`, `/customers/:id`, autocomplete `/orders/new` (badge arsip) | UI | `apps/web/src` | DeepSeek | [ ] |
| 6 | Kontrak docs: API-CONTRACTS §B (4 RPC) + §C, DATA-MODEL (`aktif` + RPC), MODULES/M6 | docs | 3 docs | bebas | [ ] |
| 7 | Gate kualitas + CI staging + smoke HP CEK1–CEK7 (PII mask) + evidence `docs/evidence/m6/` + review/laporan | ops/docs | evidence | DeepSeek | [ ] |

## Golden test matrix (RED asli vs re-pin)
| # | Test | Label | Fixture → Assert | File |
|---|---|---|---|---|
| G1 | `upsert_customer` baru | **RED dulu** (RPC belum ada) | `'+62 812-1111-0001'` → tersimpan `6281211110001`, `aktif=true` | pgTAP 0016 |
| G2 | Duplikat telepon (beda format) | **RED dulu** (guard baru) | `TELEPON_TERDAFTAR` (22023); termasuk pelanggan **diarsipkan** | pgTAP 0016 |
| G3 | `update_customer` | **RED dulu** | nama/alamat/catatan berubah; telepon→existing ditolak; telepon baru OK | pgTAP 0016 |
| G4 | `set_customer_aktif` arsip/reaktivasi | **RED dulu** (kolom/RPC baru) | `aktif=false` → `true`; guard owner | pgTAP 0016 |
| G5 | `hapus_customer` tanpa order | **RED dulu** | `lives_ok` | pgTAP 0016 |
| G6 | FK delete-ber-order | **re-pin** (`0003:73`) | `hapus_customer` pelanggan ber-order → `23503` | pgTAP 0016 |
| G7 | Auto-link order existing & diarsipkan | **re-pin** (`0003:120-175`, `0006:224-246`) | `order.customer_id` = pelanggan; `aktif` tetap `false` | pgTAP 0016 |
| G8 | RLS negatif | **re-pin pola** | usaha B: SELECT 0; RPC pelanggan A → `PELANGGAN_TIDAK_DITEMUKAN` | pgTAP 0016 |
| G9 | Stats aritmetika | **RED dulu** | 755.000 / 4 / 2026-11-27; nol → `{0n,0,null}`; DRAFT+BATAL diabaikan | Vitest |
| G10 | Pesan error FK/telepon | **RED dulu** | `23503` → "gunakan Arsipkan"; `TELEPON_TERDAFTAR` → pesan ramah | Vitest |
| G11 | Re-pin M7 | **re-pin** | `0015` tetap hijau; angka 5 laporan tidak berubah | full suite |
| G12 | Catatan >500 ditolak | **RED dulu** (validasi RPC) | `22023` | pgTAP 0016 |
| G13 | Filter arsip + badge | **RED dulu** | default sembunyikan `aktif=false`; toggle tampilkan; label "Diarsipkan" | Vitest |
| G14 | Telepon tidak valid | **RED dulu** | `'abc'` → `TELEPON_TIDAK_VALID` (22023) | pgTAP 0016 |

**Fixture G9 (pin reviewer):**
```
orders: [SELESAI 240000 @2026-11-23, DP_DITERIMA 50000 @2026-11-24,
         BATAL 100000 @2026-11-25, SIAP_DIKIRIM 90000 @2026-11-26,
         DIKIRIM 375000 @2026-11-27]
→ totalBelanja 755000n, frekuensi 4, tanggalTerakhir 2026-11-27
orders kosong → { totalBelanja: 0n, frekuensi: 0, tanggalTerakhir: null }
```

## Target kanonik
- pgTAP: `0016` plan(24) → **`Files=16, Tests=499`** (475 + 24).
- Vitest: 158 + 8 = **166** (stats 3, filter/badge 3, pesan 2).
- Kanonik final = angka CI hijau terakhir (dicatat LESSONS).

## Lane & kepemilikan
| Lane | Menulis | Serial/paralel |
|---|---|---|
| L1 DB/RPC/pgTAP/types | `0016_*`, `types/db.ts` | SERIAL |
| L2 shared + form-error | `packages/shared`, `apps/web/src/lib/form-error.ts` | SERIAL setelah L1 |
| L3 UI | `apps/web/src` | setelah L2 |
| L4 docs/evidence | `docs/`, `plans/`, `LESSONS` | bebas |

## Definition of Done
- [ ] G1–G14 lulus; label RED asli vs re-pin jujur sesuai tabel.
- [ ] `pnpm lint`/`typecheck`/`test`/`build` + pgTAP hijau; G11 (M7) hijau **sebelum** staging.
- [ ] Smoke HP CEK1–CEK7 (PII telepon di-mask); evidence `docs/evidence/m6/`.
- [ ] CI staging 4/4; provenance; promosi produksi setelah ACC (pola M5/M7).
- [ ] AGENTS/LESSONS/modul/plan diperbarui.

## Risiko, mitigasi, rollback
| Risiko | Mitigasi |
|---|---|
| `customers` dipakai `v_piutang_ump` | Jangan ubah view; G11 re-pin wajib hijau sebelum staging |
| Hapus pelanggan merusak histori | FK RESTRICT + `hapus_customer` RPC; UI arahkan ke Arsipkan |
| Duplikat telepon lintas format | `normalize_telepon` server-side + guard `TELEPON_TERDAFTAR`; re-pin dedup |
| PII bocor | Mask telepon/email di semua screenshot evidence |
| Rollback | `0016` additive (kolom default + fungsi baru) → rollback Worker aman; DB forward-only |

## Deviasi dari plan (substansi pasca-ACC)
- **Model aktif ≠ pemetaan**: Task 4/5/7 (DeepSeek) dikerjakan model aktif (GLM) —
  override ke atas; CI tetap hakim implementasi. Dicatat di laporan + LESSONS.
- —

## BACKLOG (di luar scope M6)
- Merge pelanggan dua-telepon (identity resolution) — pasca-MVP.
- Cleanup data `metode_bayar` single-value.
- Sinkron katalog WhatsApp Business (bulan ke-3, evaluasi).
