# Bubble Inspeksi (Windows)

Aplikasi desktop Windows untuk memberi nomor bubble pada gambar PDF
(inspection ballooning) dan mengekspor hasilnya ke PDF.

## Cara pakai

1. Buka PDF gambar (menu File → Buka PDF, atau seret file PDF ke jendela).
2. Klik pada gambar untuk memasang bubble — nomornya otomatis berurutan.
3. Geser bubble untuk memindahkan, klik lalu tekan Delete untuk menghapus.
   Tombol ↑ / ↓ di daftar bubble mengubah urutan (nomor menyesuaikan sendiri).
4. Atur nomor awal, awalan nomor, ukuran dan warna bubble di panel kanan.
5. Zoom: tombol +/−, slider, Ctrl+scroll, atau cubit (pinch) di layar sentuh.
6. Ekspor PDF (Ctrl+E) — gambar asli dengan bubble nomor tercetak di
   posisinya, tersimpan sebagai `<nama-file>-bubble.pdf`.

Bubble tersimpan otomatis di komputer (per nama file PDF): buka lagi PDF
yang sama dan bubble sebelumnya akan dipulihkan.

## Unduh installer

Buka tab **Actions** di repo ini → jalankan workflow **Build Windows** yang
terbaru → unduh artifact **Bubble-Inspeksi-Windows** → jalankan file
`Bubble Inspeksi Setup 1.0.0.exe`.

## Bangun sendiri (Windows)

Butuh Node.js 20+.

```bat
npm ci
npm test
npm run dist
```

Installer ada di folder `dist/`.

## Teknologi

Electron + PDF.js (tampil PDF) + pdf-lib (gambar bubble ke PDF hasil).
Tidak butuh internet saat dipakai — semua berjalan lokal.
