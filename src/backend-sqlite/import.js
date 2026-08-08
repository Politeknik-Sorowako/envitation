require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { initDatabase, generateQRHash, generateIdTamu, run, get, all } = require('./database');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { type: null, file: null, dbPath: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      opts.type = 'csv';
      opts.file = args[++i];
    } else if (args[i] === '--json' && args[i + 1]) {
      opts.type = 'json';
      opts.file = args[++i];
    } else if (args[i] === '--db' && args[i + 1]) {
      opts.dbPath = args[++i];
    } else if (args[i] === '--help') {
      console.log('Usage: node import.js --csv <file.csv> [--db <path>]');
      console.log('       node import.js --json <file.json> [--db <path>]');
      process.exit(0);
    }
  }

  if (!opts.type || !opts.file) {
    console.error('Error: Specify --csv or --json with a file path.');
    console.error('Use --help for usage info.');
    process.exit(1);
  }

  return opts;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    console.error('Error: CSV file is empty or has no data rows.');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, idx) => {
      record[header.trim()] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    console.error('Error: JSON file must contain an array of guest objects.');
    process.exit(1);
  }

  return data;
}

async function importData(db, records) {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const idTamu = rec.id_tamu || rec.ID_TAMU || '';
    const nama = rec.nama_tamu || rec.NAMA_TAMU || rec.nama || '';

    if (!nama) {
      console.log(`  [${i + 1}/${records.length}] SKIP: No name`);
      skipped++;
      continue;
    }

    try {
      const existing = await get(db, 'SELECT id FROM data_tamu WHERE id_tamu = ?', [idTamu]);

      if (existing) {
        console.log(`  [${i + 1}/${records.length}] SKIP: ${nama} (${idTamu}) already exists`);
        skipped++;
        continue;
      }

      const finalIdTamu = idTamu || await generateIdTamu(db);
      const qrHash = (rec.qr_code_hash || rec.QR_CODE_HASH || '') || generateQRHash();

      await run(db, `INSERT INTO data_tamu (
        id_tamu, nama_tamu, instansi_kategori, no_hp, email,
        status_rsvp, jumlah_pendamping, qr_code_hash,
        status_kehadiran, status_lokasi, waktu_checkin,
        komentar_rsvp, catatan_admin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        finalIdTamu,
        nama,
        rec.instansi_kategori || rec.INSTANSI_KATEGORI || rec.kategori || 'Undangan Umum',
        rec.no_hp || rec.NO_HP || rec.hp || '',
        rec.email || rec.EMAIL || '',
        rec.status_rsvp || rec.STATUS_RSVP || 'Belum Konfirmasi',
        parseInt(rec.jumlah_pendamping || rec.JUMLAH_PENDAMPING || rec.pendamping || 0) || 0,
        qrHash,
        rec.status_kehadiran || rec.STATUS_KEHADIRAN || 'Belum Hadir',
        rec.status_lokasi || rec.STATUS_LOKASI || 'Di Luar',
        rec.waktu_checkin || rec.WAKTU_CHECKIN || '',
        rec.komentar_rsvp || rec.KOMENTAR_RSVP || rec.komentar || '',
        rec.catatan_admin || rec.CATATAN_ADMIN || rec.catatan || '',
      ]);

      inserted++;
      console.log(`  [${i + 1}/${records.length}] OK: ${nama} (${finalIdTamu})`);
    } catch (err) {
      errors++;
      console.error(`  [${i + 1}/${records.length}] ERROR: ${nama} - ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

async function main() {
  const opts = parseArgs();
  const dbPath = opts.dbPath || process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'envitation.db');

  console.log('=========================================');
  console.log('  ENVITATION - Data Import Tool');
  console.log('=========================================');
  console.log(`  Type:     ${opts.type.toUpperCase()}`);
  console.log(`  File:     ${opts.file}`);
  console.log(`  Database: ${dbPath}`);
  console.log('=========================================');
  console.log('');

  if (!fs.existsSync(opts.file)) {
    console.error(`Error: File not found: ${opts.file}`);
    process.exit(1);
  }

  let records;
  try {
    if (opts.type === 'csv') {
      records = parseCSV(opts.file);
    } else {
      records = parseJSON(opts.file);
    }
  } catch (err) {
    console.error(`Error parsing file: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${records.length} records. Importing...\n`);

  const db = initDatabase(dbPath);

  try {
    const result = await importData(db, records);

    console.log('');
    console.log('=========================================');
    console.log('  Import Summary');
    console.log('=========================================');
    console.log(`  Inserted: ${result.inserted}`);
    console.log(`  Skipped:  ${result.skipped}`);
    console.log(`  Errors:   ${result.errors}`);
    console.log('=========================================');
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
