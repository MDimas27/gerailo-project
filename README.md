# Gerailo ECC Kit — SOP & Context Kit untuk Vibe Coding dengan jcode

Kit ini mengadaptasi metodologi **ECC (Everything Claude Code)** ala Affaan Mustafa
(repo `affaan-m/ecc`: loop `plan → test → implement → review → verify → remember → improve`,
folder `skills/ commands/ rules/ docs/`, brain file `AGENTS.md`) ke proyek **Gerailo**,
dengan tenaga 1 founder + agent **jcode**.

> SSoT tertinggi proyek tetap dokumen **Gerailo_Blueprint_SSoT_v1.0.docx**.
> Kit ini adalah "versi operasional" dari SSoT itu yang dikonsumsi agent saat coding.
> Jika ada konflik: SSoT > docs/ > AGENTS.md > skills/ > commands/.
> Stack terkunci via ADR-10: **React+Vite SPA + Hono di Cloudflare Workers + Supabase
> (tanpa ORM)** — detail `docs/TECH-STACK.md`.

---

## 1. Apa isi kit ini

| Folder / file | Fungsi | Dibaca kapan |
|---|---|---|
| `AGENTS.md` | Brain file: identitas, aturan besi, peta konteks. Dibaca agent di AWAL setiap sesi | Setiap sesi |
| `CLAUDE.md` | Pointer ke AGENTS.md (kompatibilitas Claude Code / tool lain) | Otomatis |
| `SOP-ECC.md` | **Tutorial utama**: alur ECC teruji, fase 0 persiapan, loop sesi harian | Baca sekali, rujuk saat ragu |
| `docs/TECH-STACK.md` | Stack terkunci + 6 penyempurnaan + monorepo | Fase prep & plan |
| `docs/PRODUCT.md` | Visi, ICP, scope MVP, metrik, unit ekonomi | Fase prep |
| `docs/UI-UX.md` | Design system + spesifikasi layar (§8 halaman pembeli M8, §9 katalog M9) | Sebelum bangun UI |
| `docs/UI-UX-PANDUAN-LENGKAP.md` | Panduan UI/UX penuh v1.0 (sumber UI-UX.md) | Rujukan detail |
| `docs/STITCH-DESIGN.md` | Peta design Google Stitch → modul + keputusan divergensi UI | Sebelum bangun UI |
| `docs/ARCHITECTURE.md` | Arsitektur, monorepo, lingkungan, ADR 1–11 | Fase prep/plan |
| `docs/API-CONTRACTS.md` | Kontrak Worker (Hono), RPC Postgres, webhook | Setiap sentuh API/RPC |
| `docs/ACCOUNTING-RULES.md` | Aturan mesin jurnal: COA, template event→jurnal, golden fixtures | Setiap sentuh modul keuangan |
| `docs/DATA-MODEL.md` | Skema Postgres, RPC, invariant trigger, views | Setiap buat migrasi |
| `docs/ROADMAP.md` | 4 sprint + DoD launch | Fase plan |
| `docs/ENV-SETUP.md` | Checklist akun, secrets, dan setup infra fase awal | Sekali di fase 0 |
| `docs/MODULES/M1..M9.md` | Spesifikasi tiap modul (apa yang dibangun) | Sebelum /plan modul |
| `rules/*.md` | Aturan besi per domain (akuntansi, parser, git) | Fase execute & review |
| `skills/*/SKILL.md` | **SOP alur per modul & per workflow** (cara membangun) | Saat menjalankan skill |
| `commands/*.md` | Prompt siap pakai: /prep /plan /execute /review /remember /module | Setiap sesi |
| `plans/` | Rencana kerja per modul (template + contoh terisi W1) | Output /plan |
| `LESSONS-LEARNED.md` | Memori proyek: pelajaran & keputusan kecil | Baca di /prep, tulis di /remember |
| `design/stitch/` | 10 layar design Google Stitch (HTML + screenshot) — sumber visual frontend | Saat wiring UI |

## 2. Instalasi (5 menit)

1. Salin seluruh isi folder ini ke **root repo monorepo Gerailo** (sejajar
   `pnpm-workspace.yaml`). Jika jcode punya folder skill/command sendiri
   (mis. `.jcode/skills`, `.claude/commands`), salin juga file dari `skills/` dan
   `commands/` ke sana — formatnya markdown biasa, aman dibaca di mana pun.
   Lihat tabel adaptasi di bawah.
2. Buka `docs/ENV-SETUP.md` dan selesaikan checklist fase 0 (akun, secrets, deploy pertama).
3. Buka sesi jcode baru dan jalankan verifikasi brain:

   > Baca AGENTS.md di repo ini, lalu jawab: apa 8 modul MVP, 3 aturan besi
   > yang paling penting, kenapa jurnal hanya boleh ditulis lewat RPC, dan
   > dokumen apa yang harus dibaca sebelum menyentuh mesin jurnal?

   Jika jawabannya benar semua, kit siap. Jika tidak, perbaiki path/repo dulu.

## 3. Loop ECC (ringkasan — detail di SOP-ECC.md)

```
/prep  →  /plan  →  /execute  →  /review  →  /remember  →  (improve di sesi berikut)
 muat      rencana   test-first    cek vs      simpan
 konteks   modul     implement     rules+test  pelajaran
```

Satu sesi = satu modul (atau satu potongan modul). Jangan pernah dua modul dalam satu sesi.

## 4. Adaptasi ke jcode

ECC dirancang untuk Claude Code (skills, slash commands, hooks). jcode memiliki konsep
serupa; petakan dengan tabel ini. Kolom "skill di jcode" diisi 21 Nov 2026 dari daftar
skill instalasi; audit ulang dengan `/skill-stocktake` bila kit berubah.

| Kebutuhan | Komponen di kit | Jika jcode punya skill serupa |
|---|---|---|
| Memuat konteks sesi | `commands/prep.md` | `/resume-session`, `/save-session`, `/ck` (memori proyek) |
| Membuat rencana | `commands/plan.md` + `plans/TEMPLATE-PLAN.md` | `/blueprint`, `/plan-orchestrate`, `/orch-pipeline` |
| Implementasi TDD | `commands/execute.md` + `skills/ecc-core/SKILL.md` | `/tdd-workflow`, `/verification-loop`, `/react-testing` |
| Migrasi DB + RPC | `docs/DATA-MODEL.md` + `docs/API-CONTRACTS.md` | `/database-migrations`, `/postgres-patterns` (Supabase spesifik tetap via CLI + docs) |
| Review kode | `commands/review.md` + `rules/*.md` | `/code-reviewer`, `/security-review`, `/production-audit` |
| Simpan pelajaran | `commands/remember.md` + `LESSONS-LEARNED.md` | `/save-session`, `/ck`, `/growth-log` |
| Enforcement otomatis (hooks ECC) | `rules/*.md` (versi prompt, portabel) | `/delivery-gate`, `/gateguard`, `/safety-guard` — prompt-level; CI tetap penjaga utama |

Jika jcode tidak punya konsep skill/command: cukup tempel isi file `commands/*.md`
sebagai prompt, atau sebut nama filenya dalam instruksi ("ikuti alur di
`skills/m3-smart-paste/SKILL.md`"). Agent modern membaca file markdown dari repo tanpa
registrasi khusus.

## 5. Aturan main yang tidak bisa ditawar

1. **Scope freeze**: hanya modul M1–M8 untuk launch + M9 sesuai ADR-12 (Fase 1 W4-P1
   bila sisa waktu; Fase 2 pasca-launch) dari `docs/PRODUCT.md`. Ide baru → tulis ke
   backlog di `LESSONS-LEARNED.md`, jangan dikerjakan.
2. **Jurnal immutable + invariant debit=kredit ganda (RPC + trigger DB)**: lihat
   `rules/01-accounting-safety.md`. Test merah = PR tidak boleh merge.
3. **Parser tidak mengarang harga; key AI hanya di Worker**: lihat `rules/02-parser-safety.md`.
4. **Satu modul satu sesi**, commit kecil, staging tiap hari, production hanya
   dari tag lolos uji (lihat `rules/03-git-deploy-discipline.md`).
5. **Setiap sesi diakhiri `/remember`** — tanpa ini, memori proyek hilang.

## 6. Peta file (tree)

```
Gerailo-ECC-Kit/
├── README.md                    ← file ini
├── SOP-ECC.md                   ← tutorial alur ECC teruji
├── AGENTS.md                    ← brain file (dibaca tiap sesi)
├── CLAUDE.md                    ← pointer AGENTS.md
├── LESSONS-LEARNED.md
├── docs/
│   ├── TECH-STACK.md             ├── PRODUCT.md
│   ├── ARCHITECTURE.md           ├── API-CONTRACTS.md
│   ├── ACCOUNTING-RULES.md       ├── DATA-MODEL.md
│   ├── ROADMAP.md                ├── ENV-SETUP.md
│   ├── UI-UX.md                  ├── UI-UX-PANDUAN-LENGKAP.md
│   ├── STITCH-DESIGN.md         (peta & keputusan design Stitch)
│   └── MODULES/
│       ├── M1-ONBOARDING.md      ├── M2-PRODUCTS.md
│       ├── M3-SMART-PASTE.md     ├── M4-ORDERS-PAYMENTS.md
│       ├── M5-STOCK.md           ├── M6-CUSTOMERS.md
│       ├── M7-REPORTS.md         ├── M8-SMART-TRANSACTION-PAGE.md
│       └── M9-DIGITAL-CATALOG.md
├── design/stitch/               ← 10 layar Google Stitch (sumber visual frontend)
├── rules/
│   ├── 00-iron-rules.md
│   ├── 01-accounting-safety.md
│   ├── 02-parser-safety.md
│   └── 03-git-deploy-discipline.md
├── skills/
│   ├── ecc-core/SKILL.md         ├── ecc-remember/SKILL.md
│   ├── m1-onboarding/SKILL.md    ├── m2-products/SKILL.md
│   ├── m3-smart-paste/SKILL.md   ├── m4-orders/SKILL.md
│   ├── m5-stock/SKILL.md         ├── m6-customers/SKILL.md
│   ├── m7-reports/SKILL.md       ├── m8-transaction/SKILL.md
│   └── m9-catalog/SKILL.md
├── commands/
│   ├── prep.md  ├── plan.md  ├── execute.md
│   ├── review.md ├── remember.md └── module.md
└── plans/
    ├── TEMPLATE-PLAN.md
    └── W1-FONDASI-M2-PRODUCTS.md   ← contoh rencana terisi
```
