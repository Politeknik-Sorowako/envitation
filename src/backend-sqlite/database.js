const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS data_tamu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tamu TEXT UNIQUE NOT NULL,
  nama_tamu TEXT NOT NULL,
  instansi_kategori TEXT DEFAULT 'Undangan Umum',
  no_hp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status_rsvp TEXT DEFAULT 'Belum Konfirmasi',
  jumlah_pendamping INTEGER DEFAULT 0,
  qr_code_hash TEXT UNIQUE,
  status_kehadiran TEXT DEFAULT 'Belum Hadir',
  status_lokasi TEXT DEFAULT 'Di Luar',
  waktu_checkin TEXT DEFAULT '',
  komentar_rsvp TEXT DEFAULT '',
  catatan_admin TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_id_tamu ON data_tamu(id_tamu);
CREATE INDEX IF NOT EXISTS idx_qr_hash ON data_tamu(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_status_rsvp ON data_tamu(status_rsvp);
`;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(SCHEMA);
  });

  return db;
}

function generateQRHash() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let hash = 'QR_';
  for (let i = 0; i < 16; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

async function generateIdTamu(db) {
  const row = await get(db, 'SELECT COUNT(*) as count FROM data_tamu');
  const num = String(row.count + 1).padStart(3, '0');
  return 'TMU' + num;
}

function formatGuestRow(row) {
  return {
    rowNum: row.id,
    id_tamu: row.id_tamu,
    nama_tamu: row.nama_tamu,
    instansi_kategori: row.instansi_kategori,
    no_hp: row.no_hp,
    email: row.email,
    status_rsvp: row.status_rsvp,
    jumlah_pendamping: row.jumlah_pendamping || 0,
    qr_code_hash: row.qr_code_hash,
    status_kehadiran: row.status_kehadiran,
    status_lokasi: row.status_lokasi,
    waktu_checkin: row.waktu_checkin,
    komentar_rsvp: row.komentar_rsvp || '',
    catatan_admin: row.catatan_admin || '',
  };
}

function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

module.exports = {
  run,
  get,
  all,
  initDatabase,
  generateQRHash,
  generateIdTamu,
  formatGuestRow,
  getTimestamp,
};
