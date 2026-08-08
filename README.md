# ENVITATION - Sistem Undangan Resmi, RSVP & Buku Tamu Digital

Aplikasi web modular berbasis **Google Sheets** sebagai database untuk manajemen undangan, RSVP, dan pencatatan kehadiran tamu dengan QR Code.

---

## Fitur Utama

- **Undangan Digital** dengan countdown timer, detail acara, dan peta lokasi
- **RSVP 3 Status**: Hadir, Tentatif, Tidak Hadir + kolom komentar
- **E-Card + QR Code** untuk semua status RSVP (dapat diunduh PNG/PDF)
- **Admin Panel** dengan PIN untuk panitia
- **QR Scanner** (3 mode: Check-in, Pass Keluar, Masuk Kembali)
- **Pencarian Manual** tamu by nama/ID/no HP
- **Tambah Tamu On-the-Spot** dari panel admin
- **Dashboard Real-time**: statistik RSVP, check-in, lokasi
- **In/Out Logic**: tracking tamu di dalam/keluar ruangan tanpa duplikasi check-in

---

## Struktur Proyek

```
envitation/
├── src/
│   ├── config/
│   │   └── config.js              # Konfigurasi terpusat (event, warna, API URL)
│   ├── backend/
│   │   └── Code.gs                # Google Apps Script (REST API)
│   └── frontend/
│       ├── index.html             # Undangan Digital + RSVP
│       ├── admin.html             # Panel Admin/Resepsionis
│       ├── ecard.html             # E-Card + QR Code standalone
│       ├── css/
│       │   └── style.css          # Custom styles
│       └── js/
│           ├── api.js             # API client
│           ├── rsvp.js            # RSVP logic
│           ├── admin.js           # Admin panel logic
│           └── utils.js           # Helper functions
├── README.md                      # Dokumentasi ini
└── setup-guide.md                 # Panduan setup Google Sheets
```

---

## Setup Google Sheets Backend

### 1. Buat Google Sheet Baru
1. Buka [sheets.google.com](https://sheets.google.com)
2. Klik **"+ Blank"** untuk membuat sheet baru
3. Beri nama, misal: `Envitation - Wisuda 2026`

### 2. Setup Sheet `Data_Tamu`
1. Rename sheet tab menjadi `Data_Tamu`
2. Buat header di baris 1 (kolom A-M):

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id_tamu | nama_tamu | instansi_kategori | no_hp | email | status_rsvp | jumlah_pendamping | qr_code_hash | status_kehadiran | status_lokasi | waktu_checkin | komentar_rsvp | catatan_admin |

3. Isi data tamu di baris 2 dst. Contoh:

| id_tamu | nama_tamu | instansi_kategori | no_hp | email | status_rsvp | jumlah_pendamping | qr_code_hash | status_kehadiran | status_lokasi | waktu_checkin | komentar_rsvp | catatan_admin |
|---------|-----------|-------------------|-------|-------|-------------|-------------------|--------------|------------------|---------------|---------------|---------------|---------------|
| TMU001 | Budi Santoso | VIP | 081234567890 | budi@email.com | Belum Konfirmasi | 0 | QR_abc123def456 | Belum Hadir | Di Luar | | | |
| TMU002 | Siti Aminah | Dosen | 089876543210 | siti@email.com | Belum Konfirmasi | 1 | QR_xyz789ghi012 | Belum Hadir | Di Luar | | | |

### 3. Deploy Google Apps Script
1. Di Google Sheet, klik **Extensions** → **Apps Script**
2. Hapus kode default, paste isi file `src/backend/Code.gs`
3. Ubah `ADMIN_PIN` di baris 8 sesuai keinginan (default: `202608`)
4. Klik **Deploy** → **New deployment**
5. Pilih type: **Web app**
6. Configure:
   - **Execute as**: Me (email Anda)
   - **Who has access**: Anyone
7. Klik **Deploy**
8. **Copy Web App URL** (berformat `https://script.google.com/macros/s/.../exec`)

### 4. Konfigurasi Frontend
1. Buka `src/config/config.js`
2. Update `API.baseUrl` dengan Web App URL dari langkah 3
3. Update `ADMIN.pin` sesuai PIN yang Anda set di Code.gs
4. Update parameter `EVENT` sesuai kegiatan Anda

### 5. Deploy Frontend
Pilih salah satu:

**Opsi A: Static Hosting (GitHub Pages / Vercel / Netlify)**
```bash
# Copy semua file dari src/frontend/ ke hosting Anda
# Pastikan struktur folder css/ dan js/ tetap sama
```

**Opsi B: Local Testing**
```bash
# Gunakan simple HTTP server
cd src/frontend
python -m http.server 8080
# Buka http://localhost:8080
```

---

## Cara Menggunakan

### Untuk Tamu
1. Buka link undangan: `https://your-domain.com/index.html?id=TMU001`
2. Atau masukkan Nama + No HP untuk verifikasi
3. Pilih status RSVP: Hadir / Tentatif / Tidak Hadir
4. Isi jumlah pendamping (jika hadir) dan komentar (opsional)
5. Submit → E-Card + QR Code akan tampil
6. Download E-Card sebagai PNG atau PDF

### Untuk Panitia (Admin)
1. Buka `https://your-domain.com/admin.html`
2. Masukkan PIN admin (default: `202608`)
3. **Dashboard**: Lihat statistik real-time
4. **Scan QR**:
   - Pilih mode: Check-in / Pass Keluar / Masuk Kembali
   - Klik "Mulai Scanner" → arahkan kamera ke QR Code
5. **Pencarian Manual**: Ketik nama/ID di search bar
6. **Tambah Tamu**: Klik "Tambah Tamu On-the-Spot"
7. **Detail Tamu**: Klik "Detail" untuk lihat info lengkap + catatan admin

---

## In/Out Logic (Keluar-Masuk Ruangan)

| Aksi | Status Sebelum | Status Sesudah | Catatan |
|------|----------------|----------------|---------|
| First Check-in | Belum Hadir, Di Luar | Sudah Hadir, Di Dalam | Catat timestamp |
| Scan lagi (sudah Di Dalam) | Sudah Hadir, Di Dalam | - | Warning: "Sudah check-in" |
| Pass Keluar | Sudah Hadir, Di Dalam | Sudah Hadir, Di Luar | Statistik TIDAK berubah |
| Masuk Kembali (scan) | Sudah Hadir, Di Luar | Sudah Hadir, Di Dalam | Bukan check-in baru |

---

## Reuse untuk Event Lain

Untuk menggunakan ulang di event berbeda, cukup ubah `src/config/config.js`:

```javascript
const CONFIG = {
  EVENT: {
    subjek: "NAMA EVENT BARU",
    penyelenggara: "NAMA PENYELENGGARA",
    tanggal: "Hari, DD Bulan YYYY",
    tanggalISO: "YYYY-MM-DDTHH:MM:SS+08:00",
    waktu: "Pkl. XX.XX WITA - selesai",
    tempat: "Nama Lokasi",
    mapsEmbedUrl: "https://maps.google.com/...",
    deskripsi: "Deskripsi event...",
    dresscode: "Pakaian Formal",
  },
  ADMIN: {
    pin: "PIN_BARU",
  },
  // ... sisanya tetap sama
};
```

Untuk database, buat sheet baru atau reset sheet `Data_Tamu` (hapus data, sisakan header).

---

## Teknologi

| Komponen | Library |
|----------|---------|
| CSS Framework | Tailwind CSS (CDN) |
| QR Scanner | html5-qrcode |
| QR Generator | qrcode.js |
| E-Card Export | html2canvas + jsPDF |
| Backend | Google Apps Script |
| Database | Google Sheets |
| Fonts | Playfair Display + Inter (Google Fonts) |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Koneksi gagal" | Periksa Web App URL di config.js, pastikan GAS deployed sebagai "Anyone" |
| QR Scanner tidak jalan | Pastikan HTTPS atau localhost, browser mengizinkan akses kamera |
| "Tamu tidak ditemukan" | Pastikan ID/nama/no_hp sesuai data di sheet |
| CORS error | GAS Web App otomatis handle CORS, pastikan URL benar |
| PIN admin salah | Cek `ADMIN_PIN` di Code.gs dan `ADMIN.pin` di config.js |

---

## Lisensi

MIT License - Bebas digunakan untuk event pribadi maupun komersial.
