# ENVITATION - Sistem Undangan Resmi, RSVP & Buku Tamu Digital

Aplikasi web modular untuk manajemen undangan, RSVP, dan pencatatan kehadiran tamu dengan QR Code. Mendukung **Google Sheets** atau **SQLite** sebagai database.

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
- **Dual Backend**: Google Sheets (cloud) atau SQLite (lokal/offline)

---

## Struktur Proyek

```
envitation/
├── src/
│   ├── config/
│   │   └── config.js              # Konfigurasi terpusat (event, warna, backend selection)
│   ├── backend/
│   │   └── Code.gs                # Google Apps Script (REST API)
│   ├── backend-sqlite/
│   │   ├── server.js              # Express server
│   │   ├── database.js            # DB init & query helpers
│   │   ├── routes.js              # API endpoints
│   │   ├── import.js              # CSV/JSON import CLI
│   │   ├── package.json           # Dependencies
│   │   ├── .env.example           # Template konfigurasi
│   │   └── .gitignore             # Ignore *.db, node_modules
│   └── frontend/
│       ├── index.html             # Undangan Digital + RSVP
│       ├── admin.html             # Panel Admin/Resepsionis
│       ├── ecard.html             # E-Card + QR Code standalone
│       ├── css/
│       │   └── style.css          # Custom styles
│       └── js/
│           ├── api.js             # API client (dynamic backend selection)
│           ├── rsvp.js            # RSVP logic
│           ├── admin.js           # Admin panel logic
│           └── utils.js           # Helper functions
── dev.sh                         # Development server (GAS mode)
├── dev-sqlite.sh                  # Development server (SQLite mode)
├── .gitignore                     # Ignore SQLite files
└── README.md                      # Dokumentasi ini
```

---

## Pilihan Backend

ENVITATION mendukung 2 jenis backend. Pilih sesuai kebutuhan:

| Fitur | Google Sheets | SQLite |
|-------|--------------|--------|
| **Setup** | Medium (Google deploy) | Low (`npm install`) |
| **Portability** | Cloud-only | Single `.db` file |
| **Offline** | Tidak | Ya |
| **Multi-device sync** | Otomatis | Manual copy `.db` |
| **Concurrent scans** | Ya | Ya (async sqlite3) |
| **Performa** | ~500ms/request | ~5ms/request |
| **Backup** | Google auto-backup | Manual copy `.db` |
| **Best untuk** | Multi-admin, remote | Single lokasi, offline |

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
2. Set `CONFIG.BACKEND.type = "gas"`
3. Update `CONFIG.BACKEND.gas.url` dengan Web App URL dari langkah 3
4. Update `ADMIN.pin` sesuai PIN yang Anda set di Code.gs
5. Update parameter `EVENT` sesuai kegiatan Anda

### 5. Jalankan Development Server
```bash
./dev.sh
```
Atau manual:
```bash
cd src
python3 -m http.server 8081
# Buka http://localhost:8081/frontend/index.html
```

---

## Setup SQLite Backend

### 1. Install Dependencies
```bash
cd src/backend-sqlite
npm install
```

### 2. Setup Konfigurasi
```bash
cp .env.example .env
# Edit .env sesuai kebutuhan:
#   ADMIN_PIN=202608
#   SQLITE_DB_PATH=./data/envitation.db
#   PORT=3000
```

### 3. Import Data (Opsional)
Jika sudah punya data dari Google Sheets atau file lain:

```bash
# Import dari CSV (export dari Google Sheets)
node import.js --csv data.csv

# Import dari JSON
node import.js --json data.json

# Custom database path
node import.js --csv data.csv --db ./custom/path.db
```

**Format CSV yang diharapkan:**
```csv
id_tamu,nama_tamu,instansi_kategori,no_hp,email,status_rsvp,jumlah_pendamping,qr_code_hash,status_kehadiran,status_lokasi,waktu_checkin,komentar_rsvp,catatan_admin
TMU001,Budi Santoso,VIP,081234567890,budi@email.com,Belum Konfirmasi,0,,Belum Hadir,Di Luar,,,
```

**Format JSON yang diharapkan:**
```json
[
  {
    "id_tamu": "TMU001",
    "nama_tamu": "Budi Santoso",
    "instansi_kategori": "VIP",
    ...
  }
]
```

Catatan: `qr_code_hash` akan auto-generate jika kosong.

### 4. Konfigurasi Frontend
1. Buka `src/config/config.js`
2. Set `CONFIG.BACKEND.type = "sqlite"`
3. Update `CONFIG.BACKEND.sqlite.url` jika port berbeda dari default (3000)
4. Update `ADMIN.pin` sesuai PIN di `.env`
5. Update parameter `EVENT` sesuai kegiatan Anda

### 5. Jalankan Development Server
```bash
./dev-sqlite.sh
```

Script akan otomatis:
- Install dependencies jika belum ada
- Copy `.env.example` → `.env` jika belum ada
- Start backend di port 3000
- Start frontend di port 8081

Akses:
- **Invitation**: http://localhost:8081/frontend/index.html
- **Admin**: http://localhost:8081/frontend/admin.html
- **E-Card**: http://localhost:8081/frontend/ecard.html
- **Backend API**: http://localhost:3000

---

## Switching Backend

Untuk berpindah antara Google Sheets dan SQLite:

1. Edit `src/config/config.js`:
   ```javascript
   // Untuk Google Sheets:
   CONFIG.BACKEND.type = "gas";

   // Untuk SQLite:
   CONFIG.BACKEND.type = "sqlite";
   ```

2. Restart development server

Frontend tidak perlu diubah — API client otomatis membaca konfigurasi backend.

---

## Cara Menggunakan

### Untuk Tamu
1. Buka link undangan: `https://your-domain.com/frontend/index.html?id=TMU001`
2. Atau masukkan Nama + No HP untuk verifikasi
3. Pilih status RSVP: Hadir / Tentatif / Tidak Hadir
4. Isi jumlah pendamping (jika hadir) dan komentar (opsional)
5. Submit → E-Card + QR Code akan tampil
6. Download E-Card sebagai PNG atau PDF

### Untuk Panitia (Admin)
1. Buka `https://your-domain.com/frontend/admin.html`
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
  BACKEND: {
    type: "gas", // atau "sqlite"
    // ...
  },
  // ... sisanya tetap sama
};
```

**Untuk Google Sheets**: Buat sheet baru atau reset sheet `Data_Tamu` (hapus data, sisakan header).

**Untuk SQLite**: Hapus file `.db` lama, import data baru dengan `import.js`.

---

## Teknologi

| Komponen | Library |
|----------|---------|
| CSS Framework | Tailwind CSS (CDN) |
| QR Scanner | html5-qrcode |
| QR Generator | qrcode.js |
| E-Card Export | html2canvas + jsPDF |
| Backend (GAS) | Google Apps Script |
| Backend (SQLite) | Node.js + Express + sqlite3 |
| Database | Google Sheets / SQLite |
| Fonts | Playfair Display + Inter (Google Fonts) |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Koneksi gagal" (GAS) | Periksa Web App URL di config.js, pastikan GAS deployed sebagai "Anyone" |
| "Koneksi gagal" (SQLite) | Pastikan backend server berjalan (`./dev-sqlite.sh`) |
| QR Scanner tidak jalan | Pastikan HTTPS atau localhost, browser mengizinkan akses kamera |
| "Tamu tidak ditemukan" | Pastikan ID/nama/no_hp sesuai data di database |
| CORS error (GAS) | GAS Web App otomatis handle CORS, pastikan URL benar |
| CORS error (SQLite) | CORS sudah enabled di server.js |
| PIN admin salah | Cek `ADMIN_PIN` di Code.gs atau `.env` dan `ADMIN.pin` di config.js |
| Port 3000 sudah dipakai | Ubah `PORT` di `.env` atau jalankan `./dev-sqlite.sh 3001` |
| Database locked (SQLite) | Pastikan tidak ada proses lain yang mengakses `.db` file |

---

## Migrasi Google Sheets → SQLite

1. **Export data dari Google Sheets:**
   - File → Download → CSV

2. **Setup SQLite backend:**
   ```bash
   cd src/backend-sqlite
   npm install
   cp .env.example .env
   ```

3. **Import data:**
   ```bash
   node import.js --csv ../exports/data.csv
   ```

4. **Switch config:**
   - Edit `src/config/config.js`: `type: "gas"` → `type: "sqlite"`

5. **Start:**
   ```bash
   ./dev-sqlite.sh
   ```

---

## Lisensi

MIT License - Bebas digunakan untuk event pribadi maupun komersial.
