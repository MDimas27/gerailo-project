# API-CONTRACTS.md — Kontrak Antarmuka (Worker, RPC, Webhook)

> Prinsip pembagian (ADR-10): **operasi data = browser → supabase-js → PostgREST/RPC
> (RLS aktif)**; **rahasia & integrasi = Worker (Hono)**. Jangan memindahkan logika
> antara keduanya tanpa ADR — daftar ini adalah kontrak yang diuji.

## A. Worker (Hono) — `apps/worker`

| Route | Fungsi | Auth | Catatan |
|---|---|---|---|
| `GET /api/health` | Cek hidup untuk monitoring | publik | dipakai uptime check |
| `GET /api/public/order/:token` | Data halaman transaksi pembeli (M8) | publik + rate limit | panggil RPC `get_public_order`; respons hanya kolom aman; token tidak di-log penuh |
| `POST /api/public/order/:token/payment-report` | Lapor pembayaran dari buyer (M8 P1) | publik + rate limit ketat | RPC `add_payment_report` → status DILAPORKAN; TIDAK pernah mengubah transaksi |
| `GET /api/public/catalog/:slug` | Data katalog publik toko (M9) | publik + rate limit | RPC `get_public_catalog`; respons hanya produk aktif+tampil_katalog; slug tidak di-log penuh |
| `POST /api/public/catalog/:slug/order-lead` | Form pemesanan dari katalog (M9 Fase 2) | publik + rate limit ketat + honeypot | RPC `add_order_lead` → order_leads (BARU); TIDAK pernah membuat order langsung |
| `POST /api/smart-paste` | Parser pola + matching katalog → hasil ekstraksi (TIDAK menyimpan) | JWT Supabase (Bearer) | verifikasi JWT via `supabase.auth.getUser()`; kuota parser pola tidak dibatasi |
| `POST /api/smart-paste/ai` | Fallback AI untuk kasus ambigu | JWT Supabase | NVIDIA NIM OpenAI-compatible: `LLM_API_KEY` = secret, `LLM_BASE_URL`/`LLM_MODEL` = vars; kuota + log via RPC `claim_ai_quota`/`log_parser_extraction` dengan JWT user + RLS (TANPA `service_role`); keluaran = JSON schema ketat (zod); 503 `AI_NOT_CONFIGURED` bila key/base kosong |
| `GET /api/admin/parser-metrics` | Metrik internal Smart Paste | JWT Supabase + allowlist `ADMIN_EMAILS` di Worker | agregat `ai_usage_logs` milik usaha founder via RLS; tanpa `teks_asli`; 403 bila email di luar allowlist atau `ADMIN_EMAILS` kosong |
| `POST /api/payments/midtrans/token` | Buat intent server-side + Snap token untuk order seller | JWT Supabase (Bearer) | `snapTokenRequestSchema`; nominal dari RPC `create_payment_intent`; `MIDTRANS_SERVER_KEY` hanya di Worker; respons memuat `token`, `redirect_url`, `client_key` publik, `provider_order_id`, `amount` string, `jenis`, `environment` |
| `POST /api/webhooks/payments/midtrans` | Webhook pembayaran Midtrans M4 | signature gateway (SHA512) | urutan wajib: log raw `UNVERIFIED` → verifikasi `MIDTRANS_SIGNATURE_SECRET_KEY` → `mark_payment_event_verified` → `apply_payment_event` via service_role; idempoten `(order_id,event_id)`; invalid=401, mismatch=422, duplikat=200; tidak percaya redirect browser |
| `POST /api/webhooks/payments` | Webhook Midtrans/Xendit (status pembayaran langganan) | signature gateway | verifikasi signature dulu; update `subscriptions` via service_role; idempotent (unique ref) |
| Cron (wrangler) `billing-daily` | Cek langganan expired → downgrade FREE | internal | service_role; log ke Sentry |

Kontrak umum Worker: validasi input pakai zod dari `packages/shared`; error JSON
`{ error: "KODE", detail? }` (M3); TANPA kunci rahasia di log; `VITE_*` tidak relevan di sini.
Web memakai `VITE_WORKER_URL` publik untuk memanggil Worker.

## B. RPC Postgres (dipanggil via supabase-js dari browser; RLS aktif)

| RPC | Menjamin | Menggantikan |
|---|---|---|
| `create_business(p_nama, p_jenis, p_metode_bayar)` | Satu transaksi: usaha + seed 19 akun COA + app_settings | alur registrasi M1 |
| `create_product(p_business_id, p_nama, p_harga_jual, p_stok_min?, p_aliases?, p_stok_awal?, p_harga_beli?)` | Satu transaksi: produk + alias + movement MASUK stok awal; kuota paket dicek trigger; guard pemilik usaha | tambah produk M2 |
| `confirm_draft_order(p_items, p_ongkir, p_dp, p_nama, p_telepon, p_alamat?, p_catatan?, p_metode_bayar[]?, p_due_date?)` | SATU transaksi: dedup customer + order DRAFT + items; harga dari katalog server; klien DILARANG kirim harga/total; `p_metode_bayar` array unik maks. 4 dari TRANSFER/COD/QRIS/LAINNYA | konfirmasi Smart Paste M3 |
| `claim_ai_quota(p_model, p_tokens, p_skor, p_teks_asli?)` | Klaim kuota + log AI atomik; reset bulanan lazy `FOR UPDATE`; `AI_QUOTA_EXCEEDED` bila habis; teks asli hanya dengan consent | fallback AI M3 |
| `log_parser_extraction(p_skor, p_teks_asli?)` | Log ekstraksi pola tanpa kuota; teks asli hanya dengan consent | parser pola M3 |
| `mark_extraction_corrected(p_log_id)` | Tandai ekstraksi pernah dikoreksi user (metrik akurasi final); guard owner | koreksi Smart Paste M3 |
| `record_stock_move(p_product_id, p_type, p_qty, p_unit_price, p_reason, p_order_id?)` | MASUK/PENYESUAIAN; PENYESUAIAN wajib alasan; KELUAR dari klien = DITOLAK (HPP rata-rata menyusul W3) | stok awal & pembelian M5 |
| `create_manual_order(p_items, p_ongkir, p_dp, p_nama, p_telepon, p_alamat?, p_catatan?, p_metode_bayar[]?, p_due_date?)` | SATU transaksi: customer dedup + order DRAFT + items; `p_items` wajib `product_id, qty, harga_satuan` — harga manual HANYA lewat form `/orders/new`; product_id harus milik usaha; tanpa jurnal/payment/stok | order manual M4 |
| `confirm_order(p_order_id)` | DRAFT → DIKONFIRMASI; guard owner; tanpa jurnal | konfirmasi order M4 |
| `ship_order(p_order_id, p_kurir_nama?, p_nomor_resi?)` | **Status-only sementara (slice 1):** DIKONFIRMASI/DP_DITERIMA/SIAP_DIKIRIM → DIKIRIM + kurir/resi opsional. Target slice 3: jurnal T2+T3 + movement KELUAR + HPP satu transaksi | aksi "kirim" M4 |
| `receive_order(p_order_id)` | **Status-only:** DIKIRIM lunas → SELESAI; sisa > 0 ditolak "MASIH ADA SISA — catat pelunasan dulu"; tanpa payment/jurnal baru; guard owner | terima pesanan buyer M4/M8 |
| `record_payment(p_order_id, p_jenis, p_jumlah, p_kanal, p_bukti_path?)` | Catat DP/PELUNASAN/COD ke `payments`, hitung sisa di server, tolak overpay/transisi ilegal, update status (DP_DITERIMA/SELESAI). **Belum memposting jurnal T1/T4/T12** sampai slice 3 | pembayaran M4 |
| `create_payment_intent(p_order_id, p_jenis?, p_expiry_minutes?)` | JWT seller; hitung `amount` BIGINT dari total server-side dikurangi payments (DP dibatasi `orders.dp`); satu intent PENDING per order; `provider_order_id` dibuat server | Snap token M4 |
| `log_payment_event(p_provider, p_event_id, p_payload, p_signature_status)` | **Worker/service_role only**; append-only raw notification dengan `provider + event_id` unik; duplikat = replay | webhook M4 |
| `mark_payment_event_verified(p_event_id, p_signature_status)` | **Worker/service_role only**; tulis hasil verifikasi ke `payment_event_verifications` append-only; tidak mengubah payload raw | webhook M4 |
| `apply_payment_event(p_event_id, p_provider_order_id, p_gross_amount, p_transaction_status, p_status_code, p_fraud_status?)` | **Worker/service_role only**; cek verifikasi, amount == intent server, status sukses, legal transition, idempotensi; sukses memanggil `_post_payment` (bukan `record_payment`) | webhook M4 |
| `cancel_order(p_order_id)` | **Status-only:** DRAFT/DIKONFIRMASI/DP_DITERIMA/SIAP_DIKIRIM → BATAL; DIKIRIM/SELESAI/BATAL ditolak. Target slice 3: reversi jurnal (T11) + stok kembali | batal M4 |
| `set_shipping(p_order_id, p_kurir, p_resi)` | Perbarui kurir/resi setelah kirim — tanpa jurnal | update resi M8 |
| `get_public_order(p_token)` | SECURITY DEFINER: hanya kolom aman (masking PII, tanpa HPP); token salah = kosong | halaman publik M8 |
| `rotate_share_token(p_order_id)` | Token baru → link lama 404 | pencabutan akses M8 |
| `mark_ready(p_order_id)` | DIKONFIRMASI/DP_DITERIMA → SIAP_DIKIRIM; tanpa jurnal/stok | aksi "siap dikirim" M8 |
| `add_payment_report(p_token, p_jumlah, p_tanggal?, p_catatan, p_url_bukti?)` | SECURITY DEFINER by token → insert payment_reports (DILAPORKAN); TIDAK menulis payments/jurnal/status | lapor bayar buyer P1 |
| `resolve_payment_report(p_report_id, p_status)` | KONFIRMASI/DITOLAK; uang tetap dicatat via `record_payment` | konfirmasi laporan P1 |
| `get_public_catalog(p_slug)` | SECURITY DEFINER: hanya produk aktif+tampil_katalog (tanpa HPP/stok_min/alias); slug salah = kosong | katalog publik M9 |
| `add_order_lead(p_slug, p_items, p_nama, p_telepon, p_alamat?, p_catatan?)` | SECURITY DEFINER by slug → insert order_leads; TIDAK menulis orders/payments/jurnal | form pemesanan Fase 2 |
| `convert_order_lead(p_lead_id)` | Dedup/buat customer + order DRAFT + items — satu transaksi, tanpa jurnal; lead → DIKONVERSI | inbox lead Fase 2 |
| `post_journal(...)` | **INTERNAL** — REVOKE dari anon/authenticated; dipanggil RPC lain; assertion debit=kredit | mesin jurnal |

Aturan: operasi multi-tabel/atomik WAJIB jadi RPC baru (bukan N query dari klien).
Tambah RPC = migrasi baru + update daftar ini + golden test. RPC
`log_payment_event`, `mark_payment_event_verified`, dan `apply_payment_event`
hanya diizinkan untuk `service_role` di Worker; tabel `payment_intents`,
`payment_events`, `payment_event_verifications`, dan `payment_event_outcomes`
ditutup dari akses langsung (termasuk `service_role`).

## C. Akses tabel langsung dari browser (supabase-js, RLS)

- READ: products, product_variants, product_aliases, customers, orders, order_items,
  ai_usage_logs (milik usaha sendiri), payments, stock_movements, v_stock_balance,
  accounts (COA), journal_entries/journal_lines (hanya M7 laporan), subscriptions.
- INSERT sederhana: products/variants/aliases (soft-delete via UPDATE `aktif`; field
  katalog M9 — foto/deskripsi/kategori/harga_promo/tampil_katalog — juga UPDATE
  langsung). Untuk produk + alias + stok awal, pakai RPC `create_product` (atomik).
- DRAFT Smart Paste: TIDAK ada INSERT langsung ke customers/orders/order_items dari
  klien — semua lewat RPC `confirm_draft_order` (REVOKE tulis langsung di 0003).
- Order manual `/orders/new`: TIDAK ada INSERT langsung; semua lewat RPC
  `create_manual_order` (0006) karena GRANT tabel hanya SELECT. Bedanya dengan
  `confirm_draft_order`: `harga_satuan` dikirim klien HANYA di form manual ini.
- UPDATE/DELETE langsung pada `orders`, `payments`, `journal_*` = DILARANG —
  hanya lewat RPC (REVOKE di migrasi). Laporan = SQL views `security_invoker`
  (`v_rekap_harian`, `v_pnl_bulan`, `v_arus_kas`, `v_piutang_ump`).

## D. Web Share Target & PWA

- Route SPA `/share` menerima share teks dari WhatsApp via `GET /share?text=...` →
  prefill `/paste`; iOS/umum memakai textarea + clipboard/manual paste.
- Manifest + service worker di-generate vite-plugin-pwa; versi SW naik otomatis per build.

## E. Halaman publik pembeli (M8 — `/t/:token`)

- Route SPA publik (tanpa login) memanggil `GET /api/public/order/:token` → RPC
  `get_public_order`; SATU nomor pesanan untuk 3 tampilan (konfirmasi/bukti/kirim —
  docs/UI-UX.md §8).
- WAJIB: token ≥128-bit acak, rotasi via `rotate_share_token`, masking PII, label
  "terverifikasi" hanya setelah seller konfirmasi, TANPA HPP/harga beli, tanpa cache SW
  pada `/t/*`, rate limit (rules/00 §13). PDF (P1) = print CSS — satu sumber data.
- (P1) Buyer bisa melaporkan pembayaran via `POST /payment-report` → status buyer
  "Menunggu konfirmasi"; label terkonfirmasi tetap HANYA via `record_payment` seller.

## F. Katalog publik toko (M9 — `/toko/:slug`, ADR-12)

- Route SPA publik (tanpa login) memanggil `GET /api/public/catalog/:slug` → RPC
  `get_public_catalog`; share WA + QR dari layar katalog seller.
- Fase 1: tombol "Pesan via WhatsApp" → wa.me seller + teks terstruktur → masuk lewat
  Smart Paste (M3, fixture khusus) — TANPA tulis publik.
- Fase 2 (bulan ke-2): form pemesanan → `POST .../order-lead` → `order_leads` (BARU) →
  seller konversi via `convert_order_lead` → order DRAFT M4 → link transaksi M8.
- WAJIB: hanya produk `aktif+tampil_katalog`, TANPA HPP/stok_min/stok angka, rate
  limit, tanpa cache SW untuk data katalog, `katalog_aktif=false` = 404 (rules/00 §14).
