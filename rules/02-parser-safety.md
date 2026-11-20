# 02 — PARSER SAFETY (aturan area suci Smart Paste)

Referensi teknis: `docs/MODULES/M3-SMART-PASTE.md`.

1. Pipeline beku: normalisasi → parser pola → matching katalog (persis → alias →
   fuzzy trigram ≥0,8) → fallback AI (berkuota, hanya jika keyakinan rendah) →
   konfirmasi wajib. Jangan tukar urutan tanpa ADR.
2. **Harga tidak pernah dikarang**: harga diambil dari katalog; kalau produk tidak
   dikenal → kolom harga KOSONG + penanda "perlu dipilih saat konfirmasi".
   AI tidak boleh mengisi harga yang tidak ada di teks ATAU katalog.
3. Total & sisa dihitung server (Worker Hono / perhitungan RPC, uang BIGINT via
   `packages/shared/src/money.ts`), bukan klien/AI.
4. Produk/pelanggan baru hanya dibuat SETELAH konfirmasi pengguna, dengan sumber
   teks asli disimpan (untuk alias otomatis nanti).
5. Skor keyakinan 3 tingkat menentukan UI: tinggi = cukup konfirmasi; sedang = sorot
   kolom bermasalah; rendah = minta pelengkapan. Tidak ada mode "auto-save tanpa lihat".
6. AI fallback: panggil hanya jika (a) parser pola gagal lengkap ATAU (b) keyakinan
   rendah; HANYA dari route Worker `POST /api/smart-paste/ai` — `LLM_API_KEY` =
   wrangler secret (tidak pernah di browser), kirim konteks katalog; output JSON
   schema ketat; kuota per paket dihitung server (docs/PRODUCT.md §Paket); log ke
   `ai_usage_logs` (sumber, skor, token, consent) via service_role di Worker.
7. Privacy: teks chat bisa berisi data pribadi — simpan teks asli hanya dengan
   consent usaha; tanpa consent, simpan hasil terstruktur saja.
8. Golden test wajib (di `apps/worker/tests/parser/`): chat Siti (lengkap), chat COD
   singkat, format angka "75rb"/"75k"/"75.000", qty "x3"/"3 pcs", ongkir di baris
   akhir, teks acak tanpa produk (harus keyakinan rendah, bukan tebakan), produk luar
   katalog (harus kosong + penanda), pesan 2 produk sekaligus.
9. Metrik wajib dicatat: hit-rate parser pola (target ≥70% pilot) & akurasi final ≥90%;
   tampilkan di halaman admin internal sederhana (bukan publik).
10. Tanpa scraping/otomasi WhatsApp tidak resmi — input hanya: salin, Web Share Target,
    (nanti) Cloud API resmi. Endpoint yang menerima teks tidak boleh menanyakan
    kredensial WhatsApp pengguna.
