# Panduan UI/UX Produk

## Platform Pengelolaan Bisnis UMKM Berbasis WhatsApp

**Dokumen:** UI/UX Product Direction\
**Versi:** 1.0\
**Tujuan:** Menjadi acuan desain antarmuka, pengalaman pengguna, dan
prototipe MVP.

------------------------------------------------------------------------

## 1. Visi desain

Produk ini membantu pemilik UMKM mengubah percakapan dan pesanan
WhatsApp menjadi aktivitas bisnis yang tertata: pesanan, pembayaran,
stok, pelanggan, dan laporan keuangan.

Prinsip desain utamanya:

> **Terlihat sederhana seperti aplikasi sehari-hari, bekerja sekuat
> sistem operasional bisnis.**

Antarmuka harus terasa modern, elegan, profesional, tetapi tidak seperti
software akuntansi yang rumit. Pengguna sebaiknya dapat menyelesaikan
pekerjaan utama tanpa memahami istilah teknis seperti debit, kredit,
jurnal, atau rekonsiliasi.

### Karakter visual

-   **Modern:** tata letak lapang, komponen konsisten, ikon sederhana,
    dan tipografi jelas.
-   **Elegan:** palet warna terbatas, kontras terukur, sudut komponen
    lembut, serta penggunaan ruang kosong yang cukup.
-   **Profesional:** angka mudah dipindai, status konsisten, tabel rapi,
    dan visualisasi data tidak dekoratif berlebihan.
-   **Mudah digunakan:** satu tindakan utama yang jelas pada setiap
    layar, bahasa sehari-hari, dan alur kerja singkat.
-   **Ramah perangkat mobile:** fungsi penting nyaman digunakan dengan
    satu tangan di layar ponsel.

------------------------------------------------------------------------

## 2. Target pengguna dan konteks penggunaan

### Pengguna utama

Pemilik atau staf UMKM yang: - menerima pesanan melalui WhatsApp; -
mengelola produk dan stok sendiri; - menerima transfer, DP, pelunasan,
atau COD; - belum memiliki staf administrasi khusus; - membutuhkan
ringkasan usaha tanpa harus belajar akuntansi.

### Kondisi penggunaan

Desain harus mengakomodasi pengguna yang: - sering berpindah antara
WhatsApp dan aplikasi; - bekerja sambil melayani pelanggan atau mengemas
barang; - memasukkan data dalam kondisi terburu-buru; - menggunakan
ponsel Android dengan ukuran layar beragam; - mungkin kurang terbiasa
dengan istilah dan laporan keuangan.

### Persona ringkas

**Pemilik usaha:** ingin tahu pesanan yang harus dikerjakan, uang yang
sudah diterima, stok yang menipis, dan keuntungan usaha.

**Admin toko:** ingin memasukkan pesanan dengan cepat, memperbarui
status, dan menghindari salah kirim.

**Staf gudang:** ingin melihat barang yang harus disiapkan dan
memperbarui stok tanpa mengakses data keuangan sensitif.

------------------------------------------------------------------------

## 3. Arah visual dan design system

### 3.1 Palet warna

Gunakan warna netral sebagai dasar agar aplikasi terasa tenang dan
profesional. Warna hijau-teal menjadi aksen utama untuk tindakan positif
dan identitas produk.

  -----------------------------------------------------------------------
  Peran                   Warna                   Penggunaan
  ----------------------- ----------------------- -----------------------
  Primary                 Teal gelap `#0F766E`    Tombol utama, tautan
                                                  aktif, elemen identitas

  Primary soft            Teal muda `#CCFBF1`     Latar status atau
                                                  sorotan ringan

  Background              `#F7F8FA`               Latar halaman

  Surface                 `#FFFFFF`               Kartu, panel, modal

  Text primary            `#17212B`               Judul dan isi utama

  Text secondary          `#667085`               Label, keterangan

  Border                  `#E6E9ED`               Garis pembatas

  Success                 `#15803D`               Lunas, berhasil, stok
                                                  aman

  Warning                 `#D97706`               Menunggu, stok menipis

  Danger                  `#DC2626`               Gagal, terlambat, stok
                                                  habis

  Info                    `#2563EB`               Informasi dan status
                                                  netral
  -----------------------------------------------------------------------

Aturan penggunaan: - Jangan memakai banyak warna aksen sekaligus. -
Warna status harus konsisten di seluruh aplikasi. - Jangan mengandalkan
warna saja; sertakan label atau ikon. - Hindari latar gradasi mencolok,
bayangan berat, dan efek kaca yang mengganggu keterbacaan.

### 3.2 Tipografi

Gunakan **Inter** atau font sans-serif sistem yang setara.

Skala yang disarankan: - Judul halaman: 24--28 px, semibold. - Judul
bagian: 18--20 px, semibold. - Judul kartu: 14--16 px, semibold. - Isi:
14--16 px, regular. - Label dan metadata: 12--13 px. - Angka penting:
24--32 px, semibold.

Gunakan angka tabular untuk nominal uang, jumlah stok, dan metrik agar
kolom angka terlihat sejajar.

### 3.3 Bentuk dan jarak

-   Grid dasar: kelipatan 4 atau 8 px.
-   Radius kartu: 12--16 px.
-   Radius tombol: 10--12 px.
-   Tinggi tombol utama mobile: minimal 48 px.
-   Area sentuh ikon: minimal 44 × 44 px.
-   Gunakan garis pembatas tipis; jangan memberi border pada setiap
    elemen jika grouping sudah jelas.
-   Bayangan sangat ringan hanya untuk elemen yang mengambang, seperti
    dropdown atau modal.

### 3.4 Ikon dan ilustrasi

Gunakan ikon outline yang konsisten, misalnya keluarga Lucide. Ikon
harus mudah dikenali dan selalu diberi label untuk navigasi utama.
Hindari emoji sebagai ikon sistem. Ilustrasi hanya digunakan pada empty
state atau onboarding, bukan sebagai dekorasi di setiap halaman.

------------------------------------------------------------------------

## 4. Arsitektur navigasi

Navigasi harus berorientasi pada pekerjaan harian, bukan struktur modul
akuntansi.

### Navigasi utama mobile

Gunakan bottom navigation dengan lima menu:

1.  **Beranda** --- ringkasan dan tindakan cepat.
2.  **Pesanan** --- seluruh order dan statusnya.
3.  **Produk** --- katalog dan stok.
4.  **Keuangan** --- pemasukan, pengeluaran, dan laporan.
5.  **Lainnya** --- pelanggan, pengaturan, tim, dan bantuan.

Tombol tambah pesanan dapat menjadi tombol aksi menonjol di halaman
Beranda dan Pesanan. Jangan menambahkan terlalu banyak menu di bottom
navigation.

### Navigasi desktop/web

Gunakan sidebar kiri yang dapat diciutkan: - Beranda - Pesanan - Produk
& Stok - Pelanggan - Keuangan - Laporan - Pengaturan

Area konten menggunakan header halaman dengan judul, deskripsi singkat,
pencarian atau filter kontekstual, serta satu tombol aksi utama.

------------------------------------------------------------------------

## 5. Struktur layar dan spesifikasi UX

## 5.1 Onboarding dan setup usaha

**Tujuan:** pengguna dapat mulai mencatat pesanan secepat mungkin.

Alur onboarding: 1. Buat akun atau masuk. 2. Masukkan nama usaha dan
jenis usaha. 3. Pilih metode pencatatan stok: sederhana atau per varian.
4. Tambahkan produk pertama atau impor daftar produk. 5. Tampilkan
contoh cara memasukkan pesanan dari WhatsApp.

Prinsip: - Maksimal satu keputusan utama per langkah. - Tampilkan
indikator progres. - Sediakan tombol "Lewati dulu" untuk data yang tidak
wajib. - Jangan meminta data akuntansi yang rumit di awal. - Jelaskan
manfaat setiap izin yang diminta.

**Empty state:** tampilkan pesan "Usaha Anda siap dicatat" dan tombol
"Tambah produk pertama". Jangan menampilkan dashboard kosong dengan
banyak angka nol tanpa arahan.

## 5.2 Beranda / dashboard

**Tujuan:** dalam beberapa detik pengguna memahami kondisi usaha dan
pekerjaan yang perlu dilakukan.

Susunan layar mobile: 1. Header: sapaan, nama usaha, notifikasi. 2.
Ringkasan hari ini: omzet tercatat, pesanan masuk, dan pembayaran
menunggu. 3. Tindakan cepat: Tambah Pesanan, Catat Pengeluaran, Tambah
Produk. 4. Daftar "Perlu ditangani": pesanan menunggu pembayaran, perlu
dikirim, atau stok menipis. 5. Ringkasan performa: penjualan 7 hari atau
bulan berjalan. 6. Aktivitas terbaru.

Contoh konten: - "Penjualan hari ini" --- Rp1.250.000 - "Pesanan baru"
--- 8 - "Menunggu pembayaran" --- 3 - "Perlu dikirim" --- 5

Aturan: - Bedakan **omzet**, **uang diterima**, dan **laba**. Jangan
menampilkan ketiganya sebagai metrik yang sama. - Cantumkan periode dan
waktu pembaruan. - Jika data belum lengkap, tampilkan penjelasan seperti
"Berdasarkan transaksi yang sudah dicatat". - Grafik harus memiliki
label dan rentang waktu yang jelas.

## 5.3 Pesanan

**Tujuan:** pengguna dapat menemukan dan memproses order tanpa membuka
banyak layar.

Tampilan daftar: - Pencarian nama pelanggan, nomor pesanan, atau
produk. - Filter status: Semua, Menunggu Bayar, Diproses, Siap Dikirim,
Dikirim, Selesai, Dibatalkan. - Setiap item menampilkan nomor order,
nama pelanggan, tanggal, total, dan status. - Urutkan secara default
berdasarkan aktivitas terbaru atau pekerjaan yang perlu ditangani.

Detail pesanan: - Ringkasan pelanggan dan alamat. - Daftar produk,
varian, jumlah, dan harga. - Subtotal, diskon, ongkir, total,
pembayaran, dan sisa tagihan. - Riwayat perubahan status. - Catatan
internal. - Tombol tindakan utama sesuai status.

Gunakan timeline untuk menunjukkan perjalanan pesanan. Hindari membuat
semua tindakan tersedia sekaligus; tampilkan tindakan yang relevan
dengan status saat ini.

## 5.4 Smart Paste

**Tujuan:** mengubah teks pesanan menjadi draft order yang dapat
diperiksa.

Alur ideal: 1. Pengguna menempelkan teks atau membagikan teks ke
aplikasi. 2. Sistem menampilkan hasil ekstraksi. 3. Data yang cocok
dengan katalog dipasangkan otomatis. 4. Data yang meragukan ditandai
untuk diperiksa. 5. Pengguna mengonfirmasi dan menyimpan pesanan.

Tata letak layar: - Area teks besar dengan placeholder contoh format
order. - Tombol utama "Baca pesanan". - Hasil ekstraksi dalam form yang
dapat diedit. - Penanda keyakinan atau status sederhana: "Cocok",
"Periksa", "Belum ditemukan". - Ringkasan perhitungan total di bagian
bawah. - Tombol "Simpan pesanan".

Prinsip penting: - Jangan membuat order final sebelum pengguna
mengonfirmasi. - Jangan menebak harga, varian, alamat, atau jumlah yang
ambigu. - Jika produk tidak ditemukan, tawarkan pencocokan manual atau
tambah produk. - Pertahankan teks sumber agar pengguna bisa
membandingkan hasil parsing. - Tampilkan alasan singkat jika ada kolom
yang perlu diperiksa.

Contoh microcopy: - "Kami menemukan 3 item. Periksa detailnya sebelum
menyimpan." - "Produk belum cocok dengan katalog." - "Jumlah belum
terbaca. Silakan isi jumlah produk."

## 5.5 Tambah pesanan manual

Sediakan alternatif bagi pengguna yang tidak memiliki format chat.

Urutan form: 1. Pilih atau tambah pelanggan. 2. Tambah produk dan
jumlah. 3. Masukkan diskon atau ongkir bila ada. 4. Pilih metode
pembayaran dan status awal. 5. Tinjau ringkasan. 6. Simpan.

Gunakan pencarian produk dengan autocomplete. Setelah produk dipilih,
tampilkan harga dan stok yang tersedia. Beri peringatan jika stok tidak
mencukupi, tetapi jelaskan pilihan yang tersedia.

## 5.6 Pembayaran

Tampilan pembayaran harus membedakan: - Total pesanan. - Total sudah
dibayar. - Sisa pembayaran. - Metode pembayaran. - Tanggal dan referensi
pembayaran.

Untuk DP, pengguna memasukkan nominal yang diterima. Aplikasi menghitung
sisa tagihan otomatis. Bukti transfer yang dikirim melalui WhatsApp
tidak boleh dianggap terverifikasi otomatis jika aplikasi tidak memiliki
integrasi yang sah; pengguna harus mengonfirmasi penerimaan uang.

Tombol "Konfirmasi pembayaran" harus menampilkan ringkasan nominal
sebelum disimpan. Perubahan pembayaran harus memiliki histori audit dan
tidak menghapus catatan sebelumnya.

## 5.7 Pengiriman dan pemenuhan pesanan

Tampilkan: - Nama penerima dan alamat. - Produk yang harus dipilih. -
Catatan packing. - Kurir dan nomor resi. - Status pengiriman.

Tombol tindakan utama: "Tandai dikirim". Setelah diklik, tampilkan
konfirmasi dan minta nomor resi jika relevan.

Jangan menyamakan status "dikirim" dengan "diterima". Status selesai
sebaiknya diperbarui setelah ada konfirmasi penerimaan atau kebijakan
operasional yang jelas.

## 5.8 Produk dan stok

Daftar produk menampilkan: - Foto atau thumbnail opsional. - Nama produk
dan SKU. - Harga jual. - Stok tersedia. - Status stok.

Detail produk: - Nama, SKU, kategori, dan deskripsi. - Varian seperti
ukuran atau warna. - Harga jual dan biaya perolehan/HPP. - Stok per
varian atau gudang. - Riwayat pergerakan stok.

Gunakan status teks: - Tersedia - Stok menipis - Habis

Sediakan pencarian dan filter. Hindari hanya mengandalkan warna badge.

## 5.9 Pelanggan / CRM

Tampilan daftar pelanggan: - Nama. - Nomor telepon. - Jumlah
transaksi. - Total belanja. - Tanggal transaksi terakhir.

Detail pelanggan: - Informasi kontak. - Alamat tersimpan. - Riwayat
pesanan. - Total belanja dan frekuensi transaksi. - Catatan layanan. -
Preferensi komunikasi jika diberikan pelanggan.

Fitur promosi atau pengiriman pesan massal harus mempertimbangkan
persetujuan pelanggan dan aturan platform komunikasi. Jangan membuat
tombol blast tanpa kontrol consent dan mekanisme berhenti berlangganan
yang sesuai.

## 5.10 Keuangan

Buat bahasa antarmuka sederhana. Pengguna melihat kategori seperti: -
Uang masuk - Uang keluar - Tagihan pelanggan - Tagihan pemasok - Saldo
kas dan bank

Pengguna tidak perlu memilih akun debit/kredit untuk transaksi rutin.
Mesin akuntansi memetakan transaksi ke jurnal di belakang layar.

Form pengeluaran: - Nominal. - Kategori. - Tanggal. - Sumber dana. -
Catatan. - Foto bukti opsional.

Jelaskan bahwa saldo kas/bank dalam aplikasi berdasarkan transaksi yang
dicatat dan mungkin berbeda dari saldo rekening aktual jika belum
direkonsiliasi.

## 5.11 Laporan

Sediakan ringkasan yang dapat dipahami pemilik usaha: - Penjualan. -
Laba kotor. - Beban. - Estimasi laba bersih. - Arus kas. - Persediaan. -
Piutang dan utang.

Filter periode harus mudah ditemukan: Hari ini, 7 hari, Bulan ini, Bulan
lalu, dan Rentang tanggal.

Berikan penjelasan singkat pada istilah yang lebih teknis. Misalnya,
tooltip "Laba kotor" menjelaskan bahwa angka tersebut merupakan
penjualan dikurangi HPP.

Untuk laporan yang mengacu pada SAK EMKM, pastikan struktur, pengakuan,
pengukuran, dan catatan laporan telah divalidasi oleh akuntan. Jangan
memberi label "sesuai SAK EMKM" sebelum implementasi benar-benar
memenuhi ketentuan yang relevan.

## 5.12 AI Business Assistant

Fitur ini sebaiknya hadir setelah kualitas data transaksi cukup baik.

Tampilan berupa percakapan sederhana dengan beberapa pertanyaan cepat: -
"Berapa penjualan bulan ini?" - "Produk apa yang paling laku?" -
"Pengeluaran terbesar saya apa?" - "Pesanan mana yang belum lunas?"

Setiap jawaban harus: - Menyebutkan periode data. - Menjelaskan sumber
angka secara ringkas. - Menunjukkan jika data belum lengkap. -
Menyediakan tautan ke transaksi atau laporan pendukung. - Tidak
mengarang angka atau memberi kepastian atas data yang belum dicatat.

Hindari memberi rekomendasi keuangan yang seolah-olah pasti. Gunakan
bahasa seperti "berdasarkan data yang tercatat".

------------------------------------------------------------------------

## 6. Pola interaksi dan microcopy

Gunakan bahasa Indonesia yang ringkas, ramah, dan tidak menggurui.

  Hindari               Gunakan
  --------------------- -------------------------------
  Create transaction    Tambah transaksi
  Accounts receivable   Tagihan pelanggan
  Journal entry         Catatan akuntansi (di detail)
  Reconcile             Cocokkan saldo
  Invalid payload       Data belum lengkap
  Submit                Simpan
  Delete permanently    Hapus permanen

### Aturan interaksi

-   Satu tombol utama per layar.
-   Tombol utama menggunakan kata kerja spesifik: "Simpan pesanan",
    bukan "OK".
-   Tampilkan hasil setelah tindakan berhasil.
-   Untuk tindakan berisiko, minta konfirmasi dan jelaskan dampaknya.
-   Hindari modal untuk setiap tindakan kecil.
-   Simpan input sementara jika pengguna berpindah layar.
-   Sediakan undo untuk tindakan yang aman dibatalkan.
-   Gunakan skeleton loading untuk pemuatan data dan empty state yang
    memberi arahan.
-   Tampilkan pesan error yang menjelaskan cara memperbaiki masalah.

### Contoh notifikasi

-   Berhasil: "Pesanan #ORD-1042 berhasil disimpan."
-   Peringatan: "Stok Daster Motif Bunga tersisa 2 pcs."
-   Validasi: "Nomor telepon belum diisi."
-   Gangguan jaringan: "Belum tersimpan. Periksa koneksi lalu coba
    lagi."
-   Pembayaran: "Pembayaran Rp100.000 berhasil dicatat. Sisa tagihan
    Rp140.000."

------------------------------------------------------------------------

## 7. Responsif dan adaptasi perangkat

### Mobile

-   Prioritaskan satu kolom.
-   Gunakan bottom navigation.
-   Tombol utama mudah dijangkau ibu jari.
-   Form panjang dibagi menjadi langkah yang logis.
-   Ringkasan total dapat dibuat sticky di bagian bawah, tanpa menutupi
    input.
-   Tabel kompleks diubah menjadi daftar kartu.

### Tablet

-   Gunakan dua kolom untuk dashboard dan form tertentu.
-   Daftar dan detail dapat tampil berdampingan.
-   Pertahankan ukuran teks yang nyaman disentuh.

### Desktop

-   Sidebar untuk navigasi.
-   Tabel dapat menampilkan lebih banyak kolom.
-   Detail order dapat menggunakan panel samping.
-   Filter dan pencarian berada dekat dengan daftar data.
-   Jangan sekadar memperbesar tampilan mobile; manfaatkan ruang layar
    untuk pekerjaan administrasi.

------------------------------------------------------------------------

## 8. Aksesibilitas, keamanan, dan kepercayaan

-   Pastikan kontras teks memenuhi WCAG 2.2 AA sebagai target desain.
-   Jangan menyampaikan status hanya melalui warna.
-   Semua input memiliki label yang terlihat.
-   Fokus keyboard jelas pada versi web.
-   Dukungan pembaca layar untuk tombol ikon.
-   Ukuran target sentuh minimal sekitar 44 × 44 px.
-   Masking informasi sensitif sesuai peran pengguna.
-   Sediakan kontrol hak akses untuk pemilik, admin, dan staf.
-   Catat audit untuk perubahan transaksi, pembayaran, stok, dan
    penghapusan.
-   Gunakan konfirmasi untuk tindakan yang berdampak pada laporan.
-   Sediakan ekspor data dan kebijakan backup yang jelas.
-   Jelaskan penggunaan data pelanggan dan minta persetujuan yang
    sesuai.

------------------------------------------------------------------------

## 9. Komponen UI yang perlu dibuat sebagai design system

Bangun komponen reusable berikut sebelum mendesain seluruh layar:

1.  Button: primary, secondary, outline, destructive, icon-only.
2.  Input: text, number, currency, phone, search, textarea.
3.  Select dan autocomplete produk/pelanggan.
4.  Status badge.
5.  Card dan metric card.
6.  Bottom navigation dan sidebar.
7.  Modal, bottom sheet, dan confirmation dialog.
8.  Toast notification.
9.  Tabs dan filter chips.
10. Data table dan list item.
11. Empty state, error state, loading skeleton.
12. Timeline status pesanan.
13. Payment summary.
14. Product selector.
15. Date range picker.

Setiap komponen perlu memiliki state default, hover, focus, pressed,
disabled, loading, error, dan success jika relevan.

------------------------------------------------------------------------

## 10. Prioritas desain MVP

Jangan mendesain semua modul secara mendalam sekaligus. Fokus pada alur
yang membuktikan nilai utama produk.

  Prioritas   Layar/fitur                     Alasan
  ----------- ------------------------------- ----------------------------------
  P0          Onboarding singkat              Pengguna bisa mulai
  P0          Beranda                         Menunjukkan pekerjaan utama
  P0          Smart Paste                     Diferensiasi inti
  P0          Konfirmasi draft order          Mencegah kesalahan ekstraksi
  P0          Daftar dan detail pesanan       Operasional harian
  P0          Produk dan stok dasar           Validasi item dan ketersediaan
  P0          Catat pembayaran                Memahami uang yang diterima
  P1          Pengeluaran                     Melengkapi pencatatan kas
  P1          Ringkasan penjualan             Memberi manfaat rutin
  P1          Pelanggan                       Menyimpan histori pembelian
  P2          Laporan akuntansi lengkap       Setelah fondasi transaksi stabil
  P2          AI Business Assistant           Setelah kualitas data memadai
  P2          Multi-gudang dan multi-cabang   Untuk pengguna yang berkembang

------------------------------------------------------------------------

## 11. Metrik keberhasilan UX

Ukur apakah desain benar-benar membuat pekerjaan pengguna lebih mudah.

### Aktivasi

-   Persentase pengguna yang menyelesaikan setup usaha.
-   Waktu sampai produk pertama ditambahkan.
-   Waktu sampai order pertama berhasil disimpan.

### Efisiensi

-   Median waktu dari paste sampai order tersimpan.
-   Jumlah edit manual per order.
-   Persentase hasil Smart Paste yang perlu koreksi.
-   Persentase order yang berhasil diproses tanpa bantuan support.

### Engagement dan retensi

-   Pengguna aktif mingguan.
-   Jumlah order tercatat per usaha per minggu.
-   Persentase pengguna yang kembali menggunakan Smart Paste.
-   Retensi minggu ke-4 dan bulan ke-3.

### Kepercayaan data

-   Jumlah transaksi yang dikoreksi setelah disimpan.
-   Jumlah selisih stok.
-   Jumlah jurnal yang perlu penyesuaian manual.
-   Jumlah laporan yang diekspor atau dibuka secara rutin.

Target awal harus ditetapkan setelah pengujian baseline. Jangan
menganggap angka target sebagai standar industri sebelum diuji pada
pengguna nyata.

------------------------------------------------------------------------

## 12. Rekomendasi prototipe dan usability testing

Buat prototipe high-fidelity untuk lima alur berikut:

1.  Pengguna baru menambahkan usaha dan produk.
2.  Pengguna menempelkan chat WhatsApp menjadi draft pesanan.
3.  Pengguna mengonfirmasi DP dan melihat sisa pembayaran.
4.  Pengguna memproses pesanan hingga dikirim.
5.  Pengguna melihat ringkasan penjualan dan pengeluaran.

Uji kepada 5--8 pengguna per putaran, terutama pemilik UMKM yang belum
terbiasa menggunakan software akuntansi.

Minta mereka menyelesaikan tugas tanpa diarahkan. Amati: - bagian yang
membuat mereka berhenti; - istilah yang tidak dipahami; - tombol yang
sulit ditemukan; - data yang mereka takut salah masukkan; - langkah yang
terasa berulang; - apakah mereka memahami perbedaan omzet, uang
diterima, dan laba.

Lakukan iterasi sebelum menambah fitur baru.

------------------------------------------------------------------------

## 13. Gambaran akhir pengalaman pengguna

Pengalaman ideal yang ingin dicapai:

1.  Pemilik usaha membuka aplikasi dan langsung melihat pesanan yang
    perlu ditangani.
2.  Ia menyalin chat order dari WhatsApp lalu menempelkannya ke Smart
    Paste.
3.  Aplikasi mengenali pelanggan, produk, jumlah, dan alamat.
4.  Pemilik memeriksa data yang belum pasti lalu menyimpan pesanan.
5.  Pembayaran DP dicatat dan sisa tagihan terlihat otomatis.
6.  Saat pesanan dikirim, status dan stok diperbarui sesuai aturan
    transaksi.
7.  Pengeluaran harian dicatat dalam beberapa ketukan.
8.  Di akhir hari, pemilik melihat penjualan, uang diterima, pesanan
    tertunda, dan pengeluaran.
9.  Di akhir bulan, laporan tersedia dari transaksi yang telah dicatat
    dan divalidasi.

**Ukuran keberhasilan desain bukan seberapa banyak layar atau animasi
yang dimiliki aplikasi, melainkan seberapa sedikit usaha yang diperlukan
pengguna untuk mengelola bisnisnya dengan benar.**

------------------------------------------------------------------------

## 14. Arahan singkat untuk UI designer

Desain produk sebagai SaaS modern dengan pendekatan mobile-first dan
dashboard desktop yang matang. Gunakan visual minimalis, latar netral,
aksen teal, tipografi sans-serif yang bersih, ruang kosong yang cukup,
dan komponen konsisten.

Utamakan alur WhatsApp-to-Order sebagai pengalaman utama. Dashboard
harus berorientasi pada tindakan, bukan dekorasi data. Setiap layar
harus memiliki hierarki visual yang jelas, satu CTA utama, bahasa
Indonesia yang mudah dipahami, dan feedback yang meyakinkan.

Hindari tampilan seperti software akuntansi lama: tabel padat, terlalu
banyak menu, istilah teknis, warna berlebihan, dan form panjang. Produk
harus terasa ringan bagi pemilik UMKM, tetapi tetap memiliki fondasi
data dan akuntansi yang profesional.
