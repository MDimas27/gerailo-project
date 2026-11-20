# 00 — IRON RULES (semua mengikat agent & founder)

1. **Scope freeze**: hanya modul M1–M8 untuk launch + M9 sesuai ADR-12 (data
   foundation P0; Fase 1 W4-P1 bila sisa waktu; Fase 2 pasca-launch — AGENTS.md).
   Fitur/endpoint/tabel di luar itu = TOLAK dan tawarkan catat ke
   `LESSONS-LEARNED.md` (backlog). Mengecualikan diri "cuma tambahan kecil" =
   pelanggaran.
2. **Jurnal immutable**: tidak pernah UPDATE/DELETE `journal_entries`/`journal_lines`.
   Koreksi = reversi. Batal = reversi.
3. **Invariant debit=kredit GANDA**: assertion di RPC `post_journal` + constraint
   trigger DEFERRED di database; menulis jurnal HANYA lewat RPC. Test tanpa fixture
   seimbang = PR ditolak.
4. **Parser tidak mengarang**: harga/produk/pelanggan tidak pernah diisi dari tebakan;
   total dihitung server; simpan hanya setelah konfirmasi pengguna.
5. **Test-first di area suci** (`apps/worker/src/services/parser`, SQL RPC di
   `packages/supabase/migrations`, `packages/shared/src/money.ts`): golden test
   merah dulu, baru implementasi. Area lain: build + smoke test minimal.
6. **RLS `business_id`**: semua query data usaha difilter; test negatif lintas usaha
   wajib di DoD modul.
7. **Uang = BIGINT rupiah** (tanpa float); supabase-js mengembalikan BIGINT sebagai
   STRING — parse/format hanya via `money.ts`, dilarang `Number()` di komponen.
8. **Kredensial** hanya secrets (`VITE_*` = publik; `service_role` & `LLM_API_KEY`
   hanya secret Worker, CI grep bundle web); agent tidak boleh meminta/menyimpan/echo
   nilai kunci; deteksi pola secret (`sk-`, `ghp_`, `AKIA`, dsb.) dalam diff = stop
   dan laporkan.
9. **Git**: commit kecil per task dengan format `M<n>: <task>`; staging tiap hari;
   production hanya dari branch/tag yang lolos /review + test hijau (rules/03).
10. **Sesi**: satu modul per sesi; mulai dengan /prep; akhiri dengan /remember.
11. **Bahasa**: komentar & dokumen dalam Bahasa Indonesia; identifier kode English.
12. **Konflik dokumen**: SSoT > docs/ > AGENTS.md > rules/ > skills/ > commands/.
    Jika SSoT perlu berubah → tandai untuk changelog v1.x, jangan edit diam-diam.
13. **Halaman publik pembeli (M8)**: akses hanya via token acak ≥128-bit (bukan nomor
    order); TANPA telepon/alamat penuh, HPP/harga beli, atau data usaha lain; label
    "terverifikasi" HANYA setelah seller konfirmasi (bukan unggahan buyer); rate limit
    endpoint publik; service worker tidak menyimpan cache `/t/*`; rotasi token =
    link lama mati; satu-satunya tulis publik = lapor pembayaran (P1, status
    DILAPORKAN) — tidak pernah mengubah transaksi.
14. **Katalog publik (M9)**: hanya produk `aktif + tampil_katalog`; TANPA HPP/harga
    beli, stok_min, alias internal, atau angka stok (hanya status Tersedia/Menipis/
    Habis); katalog bisa dimatikan seller (`katalog_aktif=false` → 404); pesanan dari
    katalog SELALU lewat tabel staging `order_leads` + konfirmasi seller — tidak
    pernah membuat order/jurnal langsung; rate limit + honeypot endpoint publik.
