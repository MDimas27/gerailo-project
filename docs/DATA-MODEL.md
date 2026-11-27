# DATA-MODEL.md — Skema Postgres, RPC, dan Invariant

> Sumber: SSoT Bab 10 + ADR-10. Konvensi: snake_case; semua tabel punya `created_at`,
> `updated_at`; tabel usaha punya `business_id` (RLS deny-by-default);
> **uang = BIGINT rupiah integer** (tanpa float) — supabase-js mengembalikan BIGINT
> sebagai STRING, konversi hanya via `packages/shared/src/money.ts`. Types:
> `supabase gen types typescript --linked` → `packages/supabase/types/db.ts`
> (di-commit; CI cek drift). Order & jurnal tidak pernah dihapus (batal = reversi).

| Tabel | Fungsi | Kolom/relasi kunci |
|---|---|---|
| businesses | Profil usaha | id, owner_id (auth.users), nama, jenis, metode_bayar, plan, onboarding_selesai, pdpr_consent_at (izin simpan teks chat) |
| store_profiles | Identitas toko: halaman pembeli (M8) & katalog publik (M9) | business_id unique, nama_toko, logo_path, kontak, alamat_singkat, slug (unique, katalog), katalog_aktif |
| bank_accounts | Rekening tampil di instruksi pembayaran (M8) | id, business_id, bank, nomor_rekening, atas_nama, aktif |
| products | Master produk (+ data katalog publik M9) | id, business_id, nama, harga_jual BIGINT, harga_promo BIGINT?, hpp_rata_rata BIGINT (default 0), foto_paths text[] (max 3), deskripsi_singkat, kategori, tampil_katalog (default false), stok_min, aktif |
| product_aliases | Alias nama untuk parser M3 (unik case-insensitive per usaha) | id, business_id, product_id, alias |
| product_variants | Varian teks sederhana | id, business_id, product_id, nama, selisih_harga BIGINT, aktif |
| customers | Pelanggan | id, business_id, nama, telepon (unique per usaha, bentuk 628…), alamat, catatan |
| orders | Pesanan | id, business_id, customer_id, status enum, ongkir BIGINT, dp BIGINT (informasi dari chat, BUKAN pembayaran), metode_bayar, nomor (ORD-YYYYMMDD-###, unik), share_token (hex 32, unik), kurir_nama?, nomor_resi?, due_date? (batas pelunasan DP) |
| order_items | Item per order | id, order_id, product_id/variant_id, qty, harga_satuan BIGINT |
| payments | Riwayat pembayaran (append-only) | id, business_id, order_id, jenis (DP/PELUNASAN/COD), jumlah BIGINT, kanal (MANUAL/COD/QRIS/VA/E_WALLET/MIDTRANS/LAINNYA), bukti_path? (bucket privat `bukti-pembayaran`), catatan? |
| payment_intents | Intent Snap server-side M4 | id, business_id, order_id, provider (`MIDTRANS`), provider_order_id UNIQUE, amount BIGINT server-side, jenis (DP/PELUNASAN), status (PENDING/PAID/EXPIRED/CANCELLED), expiry; satu PENDING per order |
| payment_events | Raw notification gateway (append-only) | id, provider (`MIDTRANS`), event_id (`transactionId:status:statusCode`) UNIQUE per provider, payload jsonb, signature_status awal `UNVERIFIED`, received_at; payload tidak pernah diubah |
| payment_event_verifications | Hasil verifikasi tanda tangan (append-only) | id, event_id → payment_events, signature_status (VERIFIED/INVALID), diverifikasi_pada; `apply_payment_event` memakai status terakhir |
| payment_event_outcomes | Hasil pemrosesan webhook (append-only) | id, business_id, order_id, provider, event_id, outcome (POSTED/IGNORED/REJECTED), payment_id?, detail; UNIQUE(order_id,event_id) + UNIQUE(provider,event_id) |
| payment_reports | Laporan bayar dari buyer (M8 P1) | id, order_id, jumlah BIGINT, tanggal, catatan, url_bukti?, status (DILAPORKAN/KONFIRMASI/DITOLAK); insert HANYA via RPC by token |
| order_leads | Pesanan masuk dari katalog publik (M9 Fase 2) | id, business_id, slug, items jsonb, nama, telepon, alamat?, catatan?, status (BARU/DIKONVERSI/DITOLAK); insert HANYA via RPC by slug; TIDAK pernah otomatis jadi orders |
| stock_movements | Pergerakan stok | id, business_id, product_id, jenis (MASUK/KELUAR/PENYESUAIAN), qty, harga_beli BIGINT?, alasan, order_id? → orders (NOT VALID); UNIQUE order_id+product_id untuk KELUAR; MASUK pengembalian dari `gagal_kirim` boleh berdampingan dengan KELUAR |
| accounts | COA per usaha | id, business_id, kode, nama, tipe (seed 19 akun) |
| journal_entries | Header jurnal (immutable) | id, business_id, kejadian (T1..T12 + T0 hanya konsep), tanggal, order_id?, expense_id?, reversi_dari_id? → journal_entries |
| journal_lines | Baris debit-kredit (immutable) | id, entry_id → journal_entries, business_id, account_id, tanggal, debit BIGINT, kredit BIGINT |
| expenses | Beban operasional manual | id, business_id, akun beban, jumlah BIGINT, tanggal |
| ai_usage_logs | Log ekstraksi Smart Paste | id, business_id, sumber (PARSER/AI), skor, token, model?, simpan_teks (consent), teks_asli (NULL tanpa consent), dikoreksi, created_at |
| subscriptions | Paket & masa berlaku | id, business_id, plan, status, periode, ref_pembayaran |
| app_settings | Pengaturan usaha | kuota_ai_terpakai, kuota_ai_periode (reset bulanan lazy), preferensi export, retensi log |
| v_rekap_harian | View ringkasan harian minimal (M7) | turunan `journal_lines` per business_id+tanggal: pendapatan, HPP, laba kotor, kas masuk, piutang, UMP, beban; `security_invoker = on` |

## Relasi & aturan integritas

- `orders.status` enum: `DRAFT, DIKONFIRMASI, DP_DITERIMA, SIAP_DIKIRIM, DIKIRIM,
  SELESAI, BATAL` — SIAP_DIKIRIM opsional (M8): `mark_ready`, TANPA jurnal/stok.
  `BATAL` pra-kirim via `cancel_order`; `DIKIRIM→BATAL` khusus `gagal_kirim`.
- Piutang & UMP **bukan tabel** — saldo akun 1-1030 dan 2-2010 dari jurnal (sengaja,
  agar laporan tak bisa beda dengan buku besar).
- `stock_movements` KELUAR selalu dibuat oleh `ship_order` untuk order DIKIRIM dan unik per
  order+produk; `record_stock_move` dari klien menolak KELUAR. PENYESUAIAN wajib alasan dan
  DITOLAK bila membuat saldo < 0 (`STOK_TIDAK_CUKUP`); MASUK tanpa `harga_beli` menambah
  saldo tanpa mengubah `hpp_rata_rata`.
  `gagal_kirim` membuat MASUK pengembalian dengan `harga_beli` = **snapshot `harga_beli`
  dari baris KELUAR saat barang dikirim**, bukan moving average saat ini; alasan
  `pengembalian kiriman gagal`. `record_stock_move` MASUK tetap menghitung ulang rata-rata
  dengan harga snapshot tersebut (mis. pool `30 @15.500` + retur `5 @11.000` →
  `round(520.000/35) = 14.857`). T8 tidak otomatis:
  template manual, prefill dari MASUK terakhir + risiko divergensi ledger-vs-stok.
- Index wajib: journal_lines (business_id, account_id, tanggal); orders (business_id,
  status) + UNIQUE (business_id, nomor) + UNIQUE (share_token); products (business_id +
  trigram nama) + product_aliases (UNIQUE business_id + lower(alias), trigram
  lower(alias)) untuk cari instan; store_profiles.slug UNIQUE.
- Semua query modul usaha difilter `business_id` + RLS policy deny-by-default.

## RPC — sumber kebenaran operasi atomik (kontrak: docs/API-CONTRACTS.md §B)

| RPC | Jaminan |
|---|---|
| `create_business(...)` | Transaksi: usaha + seed 19 akun COA + app_settings; SECURITY DEFINER + guard `auth.uid()` |
| `create_product(...)` | Transaksi: produk + alias + stok awal (MASUK) sekaligus; kuota paket diperiksa trigger; SECURITY DEFINER + guard pemilik usaha |
| `confirm_draft_order(...)` | Transaksi: customer dedup + order DRAFT + items; harga dari `products.harga_jual` server; klien tidak boleh kirim harga/total; tanpa jurnal/payment/stok | 
| `create_manual_order(...)` | Transaksi: customer dedup + order DRAFT + items; `harga_satuan` dari klien HANYA untuk form manual; product_id wajib milik usaha; tanpa jurnal/payment/stok (0006) |
| `claim_ai_quota(...)` | Klaim kuota + log AI atomik `FOR UPDATE`; reset periode lazy; `AI_QUOTA_EXCEEDED` bila habis; teks asli hanya dengan consent |
| `log_parser_extraction(...)` | Log parser pola tanpa kuota; teks asli hanya dengan consent |
| `mark_extraction_corrected(...)` | Tandai log pernah dikoreksi untuk metrik akurasi final; guard owner |
| `record_stock_move(...)` | MASUK/PENYESUAIAN; MASUK memperbarui HPP rata-rata bergerak; PENYESUAIAN wajib alasan; KELUAR ditolak dari klien |
| `ship_order(p_order_id, p_kurir_nama?, p_nomor_resi?, p_biaya_kurir?)` | DIKONFIRMASI/DP_DITERIMA/SIAP_DIKIRIM → DIKIRIM; cek stok dulu (`STOK_TIDAK_CUKUP` → rollback tanpa jurnal/movement); kurir/resi opsional; satu transaksi T2/T5/T6 + T3 HPP + T7 bila biaya kurir > 0 + movement KELUAR unik per order/produk |
| `receive_order(p_order_id)` | DIKIRIM lunas → SELESAI; sisa > 0 ditolak "MASIH ADA SISA — catat pelunasan dulu"; tanpa payment/jurnal baru; guard owner |
| `record_payment(p_order_id, p_jenis, p_jumlah, p_kanal, p_bukti_path?, p_biaya_gateway?)` | Tulis `payments` + hitung sisa di server + tolak overpay + update status + T1/T4/T12; dua DP parsial tetap akumulasi benar; auto-SELESAI saat lunas HANYA COD — non-COD di DIKIRIM tetap DIKIRIM |
| `create_payment_intent(p_order_id, p_jenis?, p_expiry_minutes?)` | Amount Snap dihitung server-side; satu PENDING per order; JWT seller |
| `log_payment_event(...)` | Worker/service_role only; raw notification append-only + replay guard |
| `mark_payment_event_verified(...)` | Worker/service_role only; tulis VERIFIED/INVALID ke tabel verifikasi append-only |
| `apply_payment_event(...)` | Worker/service_role only; cek verifikasi + amount + status + idempotensi; sukses via `_post_payment` |
| `cancel_order(p_order_id)` | DRAFT/DIKONFIRMASI/DP_DITERIMA/SIAP_DIKIRIM → BATAL; DIKIRIM/SELESAI/BATAL ditolak; jurnal order T1/T4/T7/T12 direversi via T11 |
| `gagal_kirim(p_order_id)` | DIKIRIM → BATAL; guard owner; reversi T2/T3/T4/T5/T6/T7 via `_reverse_journal`; MASUK pengembalian per item berkirim dengan snapshot HPP KELUAR; T1/UMP tidak direversi |
| `set_shipping(p_order_id, p_kurir, p_resi)` | Perbarui kurir/resi setelah kirim — TANPA menyentuh jurnal | halaman pembeli M8 |
| `get_public_order(p_token)` | SECURITY DEFINER: lookup by token, kembalikan HANYA kolom aman (masking telepon/alamat, tanpa HPP); token salah = kosong | halaman publik M8 |
| `rotate_share_token(p_order_id)` | Token baru → link lama mati (404) | pencabutan akses M8 |
| `mark_ready(p_order_id)` | DIKONFIRMASI/DP_DITERIMA → SIAP_DIKIRIM; TANPA jurnal/stok | "siap dikirim" M8 |
| `add_payment_report(p_token, p_jumlah, p_tanggal?, p_catatan, p_url_bukti?)` | SECURITY DEFINER by token → insert payment_reports (DILAPORKAN); TIDAK menulis payments/jurnal/status | lapor bayar buyer M8 P1 |
| `resolve_payment_report(p_report_id, p_status)` | KONFIRMASI/DITOLAK; uang tetap dicatat via `record_payment` | konfirmasi laporan M8 P1 |
| `get_public_catalog(p_slug)` | SECURITY DEFINER: hanya produk aktif+tampil_katalog — foto, nama, harga/promo, varian, status stok (TANPA HPP/stok_min/alias); slug salah/katalog mati = kosong | katalog publik M9 |
| `add_order_lead(p_slug, p_items, p_nama, p_telepon, p_alamat?, p_catatan?)` | SECURITY DEFINER by slug → insert order_leads (BARU); TIDAK menulis orders/payments/jurnal | form pemesanan M9 Fase 2 |
| `convert_order_lead(p_lead_id)` | Satu transaksi: dedup/buat customer by telepon + order DRAFT + items; TANPA jurnal; lead → DIKONVERSI | konversi lead M9 Fase 2 |
| `post_journal(p_business_id, p_kejadian, p_tanggal, p_order_id, p_reversi_dari_id, p_lines)` | INTERNAL (REVOKE dari klien): assertion SUM(debit)=SUM(kredit) SEBELUM insert, constraint trigger DEFERRED, satu transaksi |

## Invariant di level database (lapisan kedua di atas RPC)

- **Constraint trigger DEFERRED** pada `journal_lines` (AFTER ROW, INITIALLY DEFERRED):
  saat commit, SUM(debit) = SUM(kredit) per entry — pelanggaran = rollback, SEKALIPUN
  penyebabnya bug aplikasi/lupa assertion.
- `journal_entries`/`journal_lines` immutable: REVOKE UPDATE/DELETE dari semua role,
  termasuk service_role; koreksi = entri reversi T11 via `_reverse_journal`.
- REVOKE INSERT/UPDATE/DELETE langsung pada `journal_entries`, `journal_lines`,
  `payments`, `payment_intents`, `payment_events`,
  `payment_event_verifications`, `payment_event_outcomes` dari
  anon/authenticated/service_role — hanya RPC yang boleh menulis.
- `stock_movements` KELUAR hanya dibuat oleh `ship_order` (guard di RPC).
- `ship_order` memvalidasi saldo setiap item sebelum jurnal/movement; saldo kurang = rollback
  penuh dengan `STOK_TIDAK_CUKUP`, bukan stok negatif. `gagal_kirim` hanya menerima
  `DIKIRIM` dan menolak pemanggilan kedua lewat guard status.

## Nomor pesanan & halaman pembeli publik (M8)

- Trigger BEFORE INSERT pada `orders`: `nomor` = ORD-YYYYMMDD-### (unik per usaha per
  hari) + `share_token` = `encode(gen_random_bytes(16),'hex')` — dibuat DI DATABASE,
  bukan di aplikasi.
- Halaman publik `/t/:token` (tanpa login) membaca via `get_public_order` — satu-satunya
  jalur data ke buyer; aturan masking & privasi: rules/00 §13 + docs/UI-UX.md §8.6.
- Timeline buyer = TURUNAN dari status + payments + laporan (docs/UI-UX.md §8.3);
  satu-satunya nilai enum tambahan = SIAP_DIKIRIM (opsional, tanpa jurnal).
- Katalog publik `/toko/:slug` (M9) membaca via `get_public_catalog`; pesanan dari
  katalog = `order_leads` (staging) → `convert_order_lead` — pola tulis-publik-ke-
  staging yang sama dengan M8 (rules/00 §14).

## Views laporan (M7 — tanpa agregat paralel)

`v_rekap_harian` sudah ada (slice 3); `v_pnl_bulan`, `v_arus_kas`, `v_piutang_ump`
masih target M7 — semuanya SQL murni atas journal_lines/orders dengan
`security_invoker = on` agar mengikuti RLS.

## Enum & nilai awal penting

- `metode_bayar` order: array `text[]` unik, 1–4 pilihan dari TRANSFER, COD, QRIS, LAINNYA. `businesses.metode_bayar` tetap satu metode utama untuk onboarding.
- `kanal` payments: MANUAL, COD, QRIS, VA, E_WALLET, MIDTRANS, LAINNYA.
- `payments.bukti_path` adalah path object di bucket Storage privat `bukti-pembayaran`;
  policy hanya mengizinkan prefix `business_id/` milik owner.
- Seed `accounts` dijalankan oleh RPC `create_business` (M1) — 19 akun dari
  docs/ACCOUNTING-RULES.md.
