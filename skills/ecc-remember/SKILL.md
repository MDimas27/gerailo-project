---
name: ecc-remember
description: >
  SOP menutup sesi: menulis LESSONS-LEARNED.md, memperbarui status AGENTS.md,
  menandai deviasi SSoT, dan menyiapkan konteks sesi berikutnya. Jalankan di
  AKHIR setiap sesi atau saat founder bilang "remember"/"simpan pelajaran".
---

# Skill: ecc-remember (memori proyek)

## Input
Ringkasan sesi: modul/potongan yang dikerjakan, task selesai/belum, keputusan kecil
yang diambil, hal yang makan waktu, bug yang menarik.

## Langkah
1. **LESSONS-LEARNED.md** — tambahkan entri bernomor dengan format:
   `#<no> · <tanggal> · <modul> · <temuan/keputusan> · <tindakan berikut>`.
   Aturan isi:
   - Pelajaran teknis (mis. "label 'ongkir' sering di baris akhir → parser cek juga").
   - Keputusan kecil yang tidak pantas jadi ADR (mis. "pakai enum string, bukan int").
   - Ide fitur baru dari founder/agent → masuk bagian BACKLOG, bukan dikerjakan.
   - Bug berulang → tulis penawar permanen (biasanya: tambah golden test).
2. **AGENTS.md §Status proyek** — perbarui: sprint aktif, modul selesai (checkbox),
   deploy staging terakhir, halangan.
3. **plans/W<n>-*.md** — tandai task selesai [x], sisakan belum selesai beserta catatan.
4. **Deteksi deviasi SSoT** — jika sesi ini mengubah scope/keputusan arsitektur/harga:
   tulis entri "PERLU SSoT v1.x" berisi apa yang berubah dan mengapa; JANGAN mengedit
   blueprint langsung.
5. **Antrian sesi berikutnya** — tulis 1 paragraf: target berikutnya + prasyaratnya,
   agar `/prep` esok langsung akurat.

## Aturan
- Tulis FAKTA, bukan perasaan ("parser salah baca ongkir saat singkatan", bukan "agak ribet").
- Maksimal ~10 baris per entri; LESSONS-LEARNED adalah memori kerja, bukan novel.
- Jika hari itu tidak ada pelajaran baru, tetap perbarui status AGENTS.md.
- Pelajaran yang berlaku lintas sesi dan bersifat aturan → usulkan masuk `rules/`.
