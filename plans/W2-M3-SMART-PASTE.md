# W2-M3-SMART-PASTE.md — Rencana Kerja M3 Smart Paste

> W2-M3 · dibuat 22 Nov 2026 oleh /prep + /plan · status: MENUNGGU CEK FOUNDER
> Eksekusi mulai 22 Nov 2026 (keputusan I2 — lebih awal dari kalender W2, 26 Nov).
> Disetujui founder 22 Nov 2026: A1 B1 C1 D1 E1 F1 G1 H1 I2 + amandemen 1–8.
> Status: DISETUJUI — eksekusi Task 7 dimulai 22 Nov 2026; plan ini kontrak sesi.

## Tujuan sesi
Setelah sesi ini: pengguna bisa menyalin/membagikan chat WhatsApp → parser pola
(+ fallback AI berkuota) menghasilkan draft terstruktur dengan penanda sumber
kolom → pengguna mengoreksi & mengonfirmasi → satu RPC atomik menyimpan order
DRAFT beserta customer dan itemnya di staging. Total dihitung server dari harga
katalog; tidak ada jurnal/pembayaran/stok; tidak ada klien yang mengirim harga.

## Konteks yang dibaca
[x] AGENTS.md  [x] docs/PRODUCT.md  [x] LESSONS-LEARNED (#1,#2,#5,#7,#14,#16)
[x] docs/MODULES/M3-SMART-PASTE.md  [x] skills/m3-smart-paste/SKILL.md
[x] skills/ecc-core/SKILL.md  [x] rules/00  [x] rules/02-parser-safety.md
[x] rules/03  [x] docs/DATA-MODEL.md  [x] docs/API-CONTRACTS.md §A–D
[x] docs/ACCOUNTING-RULES.md §Fixture Siti  [x] docs/ROADMAP.md (W2)
[x] docs/UI-UX.md §4  [x] docs/STITCH-DESIGN.md + design/stitch/smart_paste_whatsapp
[x] packages/supabase/migrations/0001 + 0002 (pg_trgm sudah ada di 0002)

## Keputusan & amandemen yang mengikat
| ID | Keputusan final |
|---|---|
| A1 | Fondasi `customers`, `orders`, `order_items`, `ai_usage_logs` dibuat di 0003; M4 tinggal menambah RPC. Tanpa tabel draft sementara. |
| B1 | `pdpr_consent_at` + `kuota_ai_periode` ikut 0003; reset kuota **lazy di dalam** `claim_ai_quota`, atomik, tanpa cron. FREE = 0, STARTER = 300/bulan (dikonfirmasi founder). |
| C1 | Prompt AI hanya menerima kandidat hasil matching F1; zod schema membatasi `product_id` ke ID kandidat itu atau `null` — ditegakkan di schema, bukan prompt saja. |
| D1 | `vite-plugin-pwa` + `share_target` dipasang sekarang; **jalur salin-tempel manual di `/share` wajib ada** (iOS tidak mendukung share_target); verify manual di Android. |
| E1 | Fixture Siti kanonik = 3 × @Rp75.000 + ongkir Rp15.000 + DP Rp100.000; demo onboarding & referensi M3 disamakan. |
| F1 | Worker mengambil katalog via supabase-js + JWT user (RLS); klien tidak mengirim daftar produk. |
| G1+1 | Konfirmasi **hanya lewat RPC atomik `confirm_draft_order`**; klien mengirim `{product_id, qty}`, ongkir, dp, data pelanggan — TIDAK pernah harga/total. INSERT customer+order+item satu transaksi; pgTAP di 0003. |
| H1+5 | `/admin/parser` diproteksi di Worker: JWT Supabase + allowlist email founder dari secret `ADMIN_EMAILS` (server-side; tidak ada email di bundle). Metrik dari `ai_usage_logs`. |
| 6 | **Tanpa `SUPABASE_SERVICE_ROLE_KEY` di M3.** Semua baca/tulis via JWT user + RLS; logging & kuota masuk RPC SECURITY DEFINER dengan guard `auth.uid()`. Deviasi sadar dari kata "via service_role" di rules/02 §6 — dicatat di API-CONTRACTS + LESSONS saat /remember. |
| 7 | `/share`: Web Share Target Android + tombol salin teks universal. Verify manual HP Android; jalur iOS tetap bisa. |
| 8 | Golden test AI **mock**; CI tidak bergantung secret. Founder menjalankan `wrangler secret put LLM_API_KEY` + `LLM_MODEL` sebelum verify live. |
| 4 | pgTAP 0003 menjadi task tersendiri (pola W1b Task 7), commit terpisah dari migrasi+types. |
| I2 | Eksekusi dimulai sekarang (22 Nov 2026), bukan menunggu 26 Nov. |
| K1 | **Buyer tracking `/track/{token}` sengaja TIDAK masuk M3 (opsi b).** Trigger `share_token` di 0003 = fondasi data saja; bukan halaman pembeli. UI/akses publik dicatat di BACKLOG dan TIDAK ditandai selesai saat M3 `[x]`. Catatan: kit menempatkan halaman pembeli sebagai M8/W4; founder menyebut "M4" — sinkronkan label saat /remember. |
| K2 | `total = SUM(harga_jual*qty) + ongkir` adalah **asumsi draft** bahwa buyer menanggung ongkir. Aturan "ongkir mengikuti pihak penanggung" (buyer/seller/kurir) tetap keputusan M4/M7 — bukan perilaku permanen. |

## Task berurutan (urutan beku)
| # | Task | Jenis | File utama | Commit | Selesai |
|---|---|---|---|---|---|
| 1 | Migrasi 0003: `pdpr_consent_at`, `kuota_ai_periode`, tabel `customers`/`orders`/`order_items`/`ai_usage_logs`, enum + trigger nomor&token, RLS deny-by-default, REVOKE tulis langsung, 4 RPC (lihat §Signature RPC); + `supabase gen types` satu commit | migrasi | `packages/supabase/migrations/0003_m3_smart_paste.sql`, `types/db.ts` | `M3: fondasi data + RPC confirm_draft_order & kuota AI` | [x] 22 Nov |
| 2 | pgTAP 0003 terpisah: RLS A/B, anon ditolak, RPC confirm harga dari server & klien-dikirim-harga ditolak, kuota FREE/STARTER + reset periode + race, consent teks asli, trigger nomor/token unik, dedup customer | test | `packages/supabase/tests/0003_m3_smart_paste_test.sql` | `M3: pgTAP 0003` | [x] 22 Nov |
| 3 | 11 golden fixture parser (teks → hasil terstruktur), dijalankan **MERAH** sebelum implementasi | test | `apps/worker/tests/parser/` | `M3: fixture golden parser (merah)` | [x] 22 Nov |
| 4 | Normalisasi angka Indonesia & qty + parser pola; seluruh aturan pola di satu `rules.ts` | kode | `apps/worker/src/services/parser/{normalize,rules,index}.ts` | `M3: normalisasi + parser pola` | [x] 22 Nov |
| 5 | Matching persis→alias→trigram ≥0,8 (katalog dari F1), 2 kandidat = pilihan UI; skor 3 tingkat + penanda sumber; zod schema bersama | kode | `apps/worker/src/services/parser/{matching,confidence}.ts`, `packages/shared/src/schemas/smart-paste.ts` | `M3: matching katalog + skor keyakinan` | [x] 22 Nov |
| 6 | `POST /api/smart-paste`: JWT + zod + katalog via JWT user, total BIGINT server, `log_parser_extraction`, TANPA menyimpan draft | kode | `apps/worker/src/routes/smart-paste.ts`, `apps/worker/src/index.ts`, `apps/worker/src/lib/supabase.ts` | `M3: route parser pola` | [x] 22 Nov |
| 7 | `POST /api/smart-paste/ai`: kandidat saja, schema ketat candidate-ID-or-null, mock di test, `claim_ai_quota`, kuota habis → pesan jelas + parser tetap jalan; tanpa service_role | kode | `apps/worker/src/services/parser/llm.ts`, `apps/worker/src/routes/smart-paste.ts` | `M3: fallback AI berkuota` | [ ] |
| 8 | UI `/share` (salin-tempel universal + Web Share Target Android), `/paste`, `/paste/confirm` (sumber kolom + pilihan 2 kandidat); konfirmasi memanggil RPC, bukan INSERT klien | UI | `apps/web/src/routes/{share,paste,paste-confirm}.tsx`, `apps/web/src/hooks/use-smart-paste.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/main.tsx`, `apps/web/vite.config.ts`, `apps/web/package.json` | `M3: UI paste + konfirmasi draft` | [ ] |
| 9 | `/admin/parser` + `GET /api/admin/parser-metrics`: allowlist `ADMIN_EMAILS` di Worker, baca `ai_usage_logs` via RLS, wiring `mark_extraction_corrected` saat user mengoreksi | UI+kode | `apps/web/src/routes/admin-parser.tsx`, `apps/worker/src/routes/admin.ts` | `M3: metrik internal terproteksi` | [ ] |
| 10 | Samakan demo chat Siti & referensi fixture; sinkron docs API-CONTRACTS/DATA-MODEL/M3 (termasuk catatan deviasi service_role) | docs | `apps/web/src/routes/onboarding.tsx`, `docs/MODULES/M3-SMART-PASTE.md`, `docs/API-CONTRACTS.md`, `docs/DATA-MODEL.md` | `M3: sinkron fixture & kontrak` | [ ] |
| 11 | Verify: `pnpm lint/typecheck/test/build`, pgTAP, cek drift types, grep bundle web, deploy staging; founder isi secret LLM via wrangler; verify manual HP Android (share WA) + jalur salin-tempel | ops | — | — | [ ] |
| 12 | /review + /remember: status M3 `[x]`, LESSONS entri baru, plan SELESAI | ops | `AGENTS.md`, `LESSONS-LEARNED.md`, plan ini | — | [ ] |

## Signature RPC (final — dibuat di 0003)
```sql
-- Konfirmasi draft: SATU transaksi, harga NEVER dari klien.
confirm_draft_order(
  p_items          jsonb,     -- [{ "product_id": uuid, "qty": int }, ...] — key lain (harga/total) DITOLAK
  p_ongkir         bigint,                -- wajib dikirim klien (0 bila tidak ada)
  p_dp             bigint,                -- informasi dari chat; BUKAN pembayaran (M4 record_payment)
  p_nama           text,
  p_telepon        text,                    -- dinormalisasi 628...
  p_alamat         text       default null,
  p_catatan        text       default null,
  p_metode_bayar   text       default 'TRANSFER',
  p_due_date       timestamptz default null
) returns uuid                 -- order id (status DRAFT)

-- Klaim kuota + log AI, atomik (lazy reset di dalam), SECURITY DEFINER + guard auth.uid().
claim_ai_quota(
  p_model    text,
  p_tokens   integer,
  p_skor     numeric,          -- 0..1
  p_teks_asli text default null -- disimpan HANYA bila businesses.pdpr_consent_at IS NOT NULL
) returns uuid                 -- ai_usage_logs id; raise AI_QUOTA_EXCEEDED bila habis

-- Log ekstraksi parser pola (tanpa kuota).
log_parser_extraction(
  p_skor      numeric,
  p_teks_asli text default null
) returns uuid

-- Sinyal koreksi pengguna untuk metrik akurasi final.
mark_extraction_corrected(p_log_id uuid) returns void
```
Semua RPC: `security definer`, `set search_path = public`, `revoke all ... from public, anon`,
`grant execute ... to authenticated`, guard `auth.uid()` + `business_id` pemilik.
`confirm_draft_order` mengambil `products.harga_jual` untuk usaha pemilik, menolak
produk asing/nonaktif, mengagregasi duplikat `product_id`, menghitung
`total = SUM(harga_jual*qty) + ongkir` di server, dedup customer by telepon, lalu
INSERT `orders` + `order_items`. Tidak ada INSERT ke `payments`/`journal_*`/
`stock_movements` (juga diblokir REVOKE & trigger di 0003).

## Skema kuota AI (final)
| Elemen | Nilai / aturan |
|---|---|
| `businesses.plan` | `FREE` → batas 0; `STARTER` → batas 300 ekstraksi AI / bulan |
| `app_settings.kuota_ai_terpakai` | integer ≥ 0 (sudah ada di 0001), naik 1 per `claim_ai_quota` |
| `app_settings.kuota_ai_periode` | `date not null default date_trunc('month', now())::date` (baru di 0003) |
| Reset | **Lazy**: saat klaim, `select ... for update` baris app_settings; bila periode ≠ bulan berjalan → `kuota_ai_terpakai = 0`, `kuota_ai_periode = bulan berjalan`; lalu cek batas; tanpa cron |
| Race | Baris dikunci `FOR UPDATE` selama cek+increment; dua klaim bersamaan tidak bisa melampaui batas |
| Parser pola | Tidak pernah dikenakan kuota (hanya `log_parser_extraction`) |
| Kuota habis | `AI_QUOTA_EXCEEDED` → Worker balas pesan jelas; hasil parser pola tetap dikembalikan |
| Logging | `ai_usage_logs`: `sumber` PARSER/AI, `skor`, `token`, `model`, `simpan_teks`, `teks_asli` (NULL tanpa consent), `dikoreksi` |
| Kredensial | `LLM_API_KEY`, `LLM_MODEL` = wrangler secret; `ADMIN_EMAILS` = wrangler secret; **tidak ada** `SUPABASE_SERVICE_ROLE_KEY`; tidak ada nilai secret di repo/bundle |

## Daftar test (semua wajib di CI)
- Golden 11 fixture: Siti lengkap (3×75rb + ongkir 15rb + DP 100rb); COD singkat;
  `75rb/75k/75.000` → BIGINT sama; `x3/3 pcs/3x`; ongkir di baris akhir; teks acak
  → keyakinan rendah & nol tebakan; produk luar katalog → harga kosong + penanda;
  2 produk → 2 `order_items`; AI mock → benar + terlog + kuota terpakai; kuota habis
  → pesan jelas & parser jalan; format pesan katalog M9 tanpa AI.
- Negatif AI: `product_id` di luar kandidat / harga dari AI / customer dari AI →
  ditolak oleh zod schema (bukan hanya prompt).
- pgTAP 0003: RLS usaha A≠B, anon ditolak; klien kirim `harga`/`total` → error;
  produk asing/nonaktif ditolak; DP ≠ payment; kuota FREE=0 ditolak, STARTER ke-301
  ditolak, reset periode, race aman; tanpa consent `teks_asli` NULL; nomor &
  share_token unik; customer dedup.
- **Kontrak hasil ekstraksi (dikunci Task 3, MERAH 11/11 suite):**
  - `parseSmartPaste(teks, katalog)` → `{ sumber: "POLA", confidence, pelanggan, items, ongkir, dp, metode_bayar, total, flags }`.
  - `Field<T> = { value: T | null; source: "katalog" | "teks" | "kosong" }`; uang BIGINT;
    `total = Σ(qty × harga katalog) + ongkir`, dihitung di Worker. Field uang agregat
    (`ongkir`, `dp`) bernilai `0n` + source `kosong` bila tidak disebut; harga per item
    yang tidak dikenal tetap `null` + source `kosong`.
  - `extractWithAi(teks, katalog, { complete, claimQuota })` → `{ extraction, logId, tokens }`;
    `parseAiResponse(json, candidateIds)` (zod strict) hanya menerima `product_id` dari
    kandidat, menolak `harga_satuan`/`harga`/`total` dan `pelanggan` dari AI; `ongkir`/`dp`
    tetap diizinkan sebagai angka dari teks (bukan harga produk).
- Edge: JWT invalid → 401; 2 kandidat mirip → UI pilihan; `/admin/parser` email
  di luar allowlist → 403; iOS jalur salin-tempel tetap tersedia.
- Gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, `supabase test db`,
  drift `types/db.ts`, grep bundle web tanpa `service_role`/`LLM_API_KEY`.

## Definition of Done
- [ ] 11 fixture + pgTAP 0003 hijau; `pnpm build` hijau.
- [ ] Draft tersimpan hanya via `confirm_draft_order`; klien tidak mengirim harga.
- [ ] RLS teruji (akses lintas `business_id` gagal).
- [ ] Verify manual HP Android: share WA → koreksi → konfirmasi → draft jadi;
      jalur salin-tempel juga diuji; AI live setelah secret diisi founder.
- [ ] Review MERGE (rules 00–03 + deviasi service_role tercatat).
- [ ] Buyer tracking `/track/{token}` TIDAK termasuk DoD M3 (K1 — lihat BACKLOG).
- [ ] Status AGENTS.md + LESSONS-LEARNED diperbarui; plan SELESAI.

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Skema order W3 ditarik ke W2 | 0003 hanya DRAFT + struktur; M4 tetap pemilik RPC status/payment/jurnal; tanpa jurnal |
| Deviasi rules/02 §6 (tanpa service_role) | RPC SECURITY DEFINER + `auth.uid()` + RLS; dicatat eksplisit di API-CONTRACTS & LESSONS |
| Secret LLM belum ada | Golden test mock; secret diisi founder sebelum verify live; kuota habis tidak crash |
| Worker butuh `SUPABASE_URL` + `SUPABASE_ANON_KEY` | Binding Worker (bukan secret bila anon), di-set sebelum verify; route gagal jelas `_BELUM_DISET` bila kosong; tidak ada `service_role` |
| Fixture Siti inkonsisten | E1 kanonisasi + update demo onboarding & referensi docs |
| Web Share Target iOS tidak didukung | Tombol salin-tempel wajib di `/share` (D1/7) |
| RLS/trigger nomor salah | pgTAP task 2 sebelum UI task 8 |

## Deviasi dari plan (diisi saat berjalan, dengan alasan)
- Task 1: `p_ongkir`/`p_dp` tidak bisa memakai `default 0` karena Postgres melarang
  parameter wajib setelah parameter bertipe default; urutan & nama argumen tetap,
  klien diwajibkan mengirim keduanya (types ter-generasi mencerminkan ini).
- Task 1: FK `order_items.variant_id` memakai FK sederhana ke `product_variants(id)`
  karena 0002 tidak punya unique `(id, business_id)`; M3 tidak mengirim `variant_id`,
  dan guard kepemilikan usaha tetap berada di RPC.
- Task 2: race concurrency tidak disimulasikan dengan dua sesi paralel; pgTAP menguji
  batas claim ke-300/ke-301 dan `claim_ai_quota` memakai `SELECT ... FOR UPDATE`,
  sehingga serialisasi dijamin database.

## BACKLOG (temuan sesi ini di luar scope)
- **Buyer tracking `/track/{token}`** (K1): sengaja tidak dikerjakan di M3; fondasi `share_token` sudah ada di 0003, UI publik + aturan akses token menyusul (modul resmi kit = M8/W4; label "M4" dari founder perlu disinkronkan). Jangan tandai selesai saat M3 `[x]`.
- Edit profil usaha & edit pengaturan usaha (M1 sisa, bukan M3)
- KYC payment gateway (non-teknis, tetap paralel)
- PWA install penuh & hardening (W4, sesuai ROADMAP)
