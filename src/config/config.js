/**
 * ENVITATION - Konfigurasi Terpusat
 * Ubah parameter di sini untuk menggunakan ulang di event lain.
 */

const CONFIG = {
  EVENT: {
    subjek: "WISUDA Diploma III Angkatan XXXIII",
    penyelenggara: "Politeknik Sorowako",
    tanggal: "Senin, 24 Agustus 2026",
    tanggalISO: "2026-08-24T07:00:00+08:00",
    waktu: "Pkl. 07.00 WITA - selesai",
    tempat: "Gedung Ontaeluwu Sorowako",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4956.499576503582!2d121.34023167587378!3d-2.5200119382210002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2d90660fd59f2f81%3A0xe19138ac635a8ac0!2sOntaeluwu%20Meeting%20Hall!5e1!3m2!1sen!2sid!4v1786191149085!5m2!1sen!2sid",
    mapsUrl: "https://www.google.com/maps/search/Ontaeluwu+Meeting+Hall+Sorowako/@-2.5200119,121.3402317,17z",
    deskripsi: "Dengan hormatnya kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara Wisuda Diploma III Angkatan XXXIII Politeknik Sorowako.",
    dresscode: "Pakaian Formal / Batik / Jas",
  },

  THEME: {
    primary: "#0f172a",
    primaryLight: "#1e293b",
    accent: "#d97706",
    accentLight: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    textMuted: "#64748b",
    success: "#22c55e",
    warning: "#eab308",
    danger: "#ef4444",
    info: "#3b82f6",
  },

  API: {
    baseUrl: "https://envitation.politekniksorowako.ac.id/api",
    timeout: 15000,
    retries: 2,
  },

  BACKEND: {
    type: "sqlite",
    gas: {
      url: "https://script.google.com/macros/s/AKfycbwqM793JFjKmZRCdvYAUBRGHpB_EfmI4AsqOS9aQ2Xva6tTFZ66uvBdHsuuqpj57jUU/exec",
    },
    sqlite: {
      url: "https://envitation.politekniksorowako.ac.id/api",
    },
  },

  ADMIN: {
    // SECURITY: PIN admin TIDAK disimpan di frontend.
    // PIN hanya ada di backend (.env) dan diminta dari user saat login.
    // Setelah login berhasil, PIN disimpan di session storage dan digunakan
    // untuk semua operasi admin. PIN dihapus saat logout.
    pinLabel: "Masukkan PIN Panitia",
  },

  SHARE: {
    messageTemplate: "🎓 Undangan {EVENT_SUBJECT}\n\nIni E-Card undangan {GUEST_NAME} untuk acara {EVENT_SUBJECT}.\n\n📅 {EVENT_DATE}\n📍 {EVENT_LOCATION}\n\nTunjukkan QR Code ini saat check-in di lokasi.\n\n{ECARD_LINK}",
  },

  SHEET: {
    dataTamu: "Data_Tamu",
    columns: {
      id_tamu: 0,
      nama_tamu: 1,
      instansi_kategori: 2,
      no_hp: 3,
      email: 4,
      status_rsvp: 5,
      jumlah_pendamping: 6,
      qr_code_hash: 7,
      status_kehadiran: 8,
      status_lokasi: 9,
      waktu_checkin: 10,
      komentar_rsvp: 11,
      catatan_admin: 12,
    },
  },

  RSVP_STATUS: {
    BELUM: "Belum Konfirmasi",
    HADIR: "Hadir",
    TIDAK_HADIR: "Tidak Hadir",
    TENTATIF: "Tentatif",
  },

  KEHADIRAN_STATUS: {
    BELUM: "Belum Hadir",
    SUDAH: "Sudah Hadir",
  },

  LOKASI_STATUS: {
    DI_LUAR: "Di Luar",
    DI_DALAM: "Di Dalam",
  },

  KATEGORI: ["VIP", "Dosen", "Orang Tua", "Wisudawan", "Undangan Umum"],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
