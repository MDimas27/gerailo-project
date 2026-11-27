---
description: PREP ECC Gerailo — muat konteks, laporkan pemahaman ≤10 baris + 5 pertanyaan gate. Tanpa ACC, jangan tulis kode.
---

Fase **PREP**. Target sesi: $ARGUMENTS (kosong → usulkan dari `docs/ROADMAP.md`
dan status di `AGENTS.md`).

## Wajib dibaca sebelum menjawab

1. `AGENTS.md` — bagian PROSES WAJIB + status proyek.
2. `sop/HARD-RULES.md` — 6 aturan keras.
3. `LESSONS-LEARNED.md` — #50 sampai entri terakhir.
4. Plan aktif di `plans/` (jika ada) + `docs/MODULES/<MODUL>.md`.
5. `docs/DATA-MODEL.md`, `docs/API-CONTRACTS.md`, `docs/ACCOUNTING-RULES.md`
   bila sentuh DB/jurnal/keuangan.
6. `rules/00-iron-rules.md` + rules domain (`01`/`02`/`03`).

## Keluaran (format tetap, ringkas)

**A. Ringkasan pemahaman ≤10 baris** — tujuan sesi, batas scope, area yang TIDAK
boleh disentuh, definisi selesai.

**B. Posisi proyek** — modul selesai/aktif, plan terakhir, angka test kanonik
(angka pgTAP pada CI hijau terakhir, dicatat di LESSONS; Vitest; status
staging/produksi terakhir).

**C. Peringatan** — entri LESSONS-LEARNED (#..) dan HARD-RULES yang paling
berisiko dilanggar sesi ini.

**D. 5 pertanyaan gate PREP** (wajib dijawab founder sebelum PLAN):

1. **Scope** — apakah target ini murni M<n> dan tidak menambah fitur di luar
   `AGENTS.md`? Adakah bagian yang harus dipotong?
2. **Data & safety** — apakah menyentuh migrasi/RPC/jurnal/RLS? Jika ya, siapa
   penulis tunggalnya dan apa rollback-nya?
3. **Golden test** — fixture + assert mana yang wajib MERAH lebih dulu, dan dari
   dokumen mana fixture itu diturunkan?
4. **Bukti** — apa yang harus ada di `docs/evidence/<m>/` agar sesi dianggap
   selesai (retest-results.json, screenshot CEK…)?
5. **Risiko** — risiko terbesar sesi ini dan mitigasinya; apa yang membuat kita
   berhenti (stop condition)?

## Gate

Cetak `GATE PREP: MENUNGGU ACC` lalu **BERHENTI**. Dilarang menulis kode,
migrasi, atau mengubah dokumen keputusan sebelum founder menjawab ACC.

Jika dokumen wajib hilang/bertentangan (AGENTS vs docs vs SSoT), laporkan
pertentangannya dan jangan menebak.
