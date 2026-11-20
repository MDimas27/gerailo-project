# ROADMAP.md — 4 Sprint Menuju Launch 19 Desember 2026

> Sumber: SSoT Bab 11. Tanggal = komitmen. Terlambat → pangkas scope modul,
> JANGAN geser tanggal. Perbarui status di AGENTS.md tiap akhir sesi.

| Periode | Fokus | Deliverable | Kriteria selesai |
|---|---|---|---|
| W1 · 19–25 Nov | Fondasi: repo, CI deploy, skema DB+migrasi, auth, COA seed, **M2 produk** (+ kolom katalog M9: foto/deskripsi/kategori/harga promo/tampil_katalog), onboarding dasar; daftar KYC | Produk mentah di staging; CRUD produk jalan; KYC terkirim | Deploy otomatis jalan; pengguna internal bisa daftar & buat produk |
| W2 · 26 Nov–2 Des | **M3 Smart Paste**: parser pola, matching katalog, form konfirmasi, golden test, fallback AI; KYC follow-up | Alur chat→draft order; log ekstraksi aktif | Seluruh kasus uji parser lulus; draft tersimpan & bisa diedit |
| W3 · 3–9 Des | **M4 order & pembayaran** + **M5 stok** + **M6 pelanggan** + mesin jurnal + **M7 laporan inti** + export | Alur ujung-ke-ujung: chat→order→DP→kirim→lunas→laporan | Semua jurnal fixture seimbang; laba rugi & arus kas cocok jurnal |
| W4 · 10–16 Des | **M8 Smart Transaction Page** (P0: halaman pembeli ber-token, share WhatsApp, status dinamis; P1: lapor bukti bayar + PDF print + resi klik) + **M9 Fase 1 katalog publik + share + QR + pesan via WA (P1, bila sisa waktu)** + hardening: PWA install + Web Share Target, RLS audit, backup + uji restore, billing QRIS/link, landing + harga + trial, privasi & syarat, onboarding 3 langkah | Produk siap jual; halaman pembeli tayang & teruji 3 kondisi; dokumen legal tayang; monitoring aktif | Uji penerimaan 3–5 penjual kenalan lolos tanpa bug penghalang |
| 17–19 Des | Soft launch 10–20 UMKM pilot (17 Des) → **LAUNCH + trial 19 Des** | Pilot aktif; kanal dukungan WA siap | Checklist DoD launch 12/12 (di bawah) |

## Sprint → modul mapping

- W1: infra + M1 (parsial) + M2
- W2: M3 (utama) + M1 selesai
- W3: M4 → M5 → M6 → M7 (urutan beku; M4 sebelum M5 karena jurnal kas dulu)
- W4: M8 (utama, P0) → hardening semua modul + billing + legal

## DoD Launch (13 item — semua wajib; gagal = launch mundur via changelog SSoT)

1. Alur inti ujung-ke-ujung di production: daftar→katalog→Smart Paste→konfirmasi→DP→kirim→lunas→laporan cocok.
2. Seluruh golden test parser + mesin jurnal lulus di pipeline.
3. Balance assertion server teruji di semua fixture (DP, COD, pelunasan, batal, prive).
4. Backup harian aktif + restore pernah berhasil sekali.
5. Trial 14 hari bisa dibuat dari landing tanpa kartu kredit.
6. Pembayaran STARTER bisa diselesaikan via QRIS/link (atau fallback manual terdokumentasi).
7. PWA terpasang di Android + Web Share Target menerima teks dari WhatsApp.
8. Privasi, syarat layanan, consent PDP tayang & tertaut saat registrasi.
9. Onboarding 3 langkah mengantarkan pengguna baru ke order pertama (uji dengan orang awam).
10. Sentry + alert aktif; halaman status sederhana tersedia.
11. 10 chat nyata pilot → draft order layak konfirmasi.
12. Halaman transaksi pembeli (M8) tayang: link dibagikan via WhatsApp, ketiga kondisi
    (menunggu bayar / terkonfirmasi / dikirim) teruji di HP, rotasi token jalan.
13. Freeze fitur sejak 17 Des: hanya bugfix.

## Setelah launch (ringkas)

- Bulan 2 (20 Des–17 Jan): stabilisasi, metrik mingguan, parser dari log nyata,
  neraca + wizard saldo awal + CaLK, multi-user, billing langganan penuh (BUSINESS),
  M9 Fase 2 (form pemesanan dari katalog → order_leads), validasi praktisi akuntansi.
- Bulan 3: AI Business Assistant (premium), WhatsApp Cloud API opsional berbayar
  (termasuk evaluasi sinkronisasi katalog WA Business — ADR-12), integrasi sesuai
  permintaan pilot.
