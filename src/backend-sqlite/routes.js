const { run, get, all, generateQRHash, generateIdTamu, formatGuestRow, getTimestamp } = require('./database');

function sanitize(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
    .trim()
    .slice(0, maxLength);
}

function sanitizeId(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
}

function sanitizePhone(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^0-9+\-() ]/g, '').slice(0, 20);
}

function sanitizeEmail(str) {
  if (typeof str !== 'string') return '';
  const cleaned = str.replace(/[<>&"']/g, '').trim().slice(0, 100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';
  return cleaned;
}

function auditLog(action, ip, detail = '') {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | ${action} | ${ip} | ${detail}`);
}

function verifyGuest(db, params) {
  const idTamu = sanitizeId(params.id);
  const nama = sanitize(params.nama || '', 100);
  const noHp = sanitizePhone(params.no_hp);

  if (idTamu) {
    return get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]).then(row => {
      if (row) return { success: true, guest: formatGuestRow(row) };
      return { success: false, message: 'Mohon maaf, nama Anda belum terdaftar dalam sistem.' };
    });
  }

  if (nama && noHp) {
    return get(db, 'SELECT * FROM data_tamu WHERE LOWER(nama_tamu) = LOWER(?) AND no_hp = ?', [nama, noHp]).then(row => {
      if (row) return { success: true, guest: formatGuestRow(row) };
      return { success: false, message: 'Mohon maaf, nama Anda belum terdaftar dalam sistem.' };
    });
  }

  return Promise.resolve({ success: false, message: 'Masukkan ID undangan atau Nama + No HP' });
}

async function submitRSVP(db, params) {
  const idTamu = sanitizeId(params.id_tamu);
  const statusRsvp = params.status_rsvp;
  const jumlahPendamping = Math.min(parseInt(params.jumlah_pendamping) || 0, 10);
  const komentar = sanitize(params.komentar || '', 500);

  const validStatus = ['Hadir', 'Tidak Hadir', 'Tentatif'];
  if (!validStatus.includes(statusRsvp)) {
    return { success: false, message: 'Status RSVP tidak valid.' };
  }

  if (!idTamu) {
    return { success: false, message: 'ID tamu tidak valid.' };
  }

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]);
  if (!guest) {
    return { success: false, message: 'Tamu tidak ditemukan.' };
  }

  await run(db, 'UPDATE data_tamu SET status_rsvp = ?, jumlah_pendamping = ?, komentar_rsvp = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id_tamu = ?', [statusRsvp, jumlahPendamping, komentar, idTamu]);

  const updated = await get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]);
  return {
    success: true,
    message: 'RSVP berhasil disimpan.',
    qr_code_hash: updated.qr_code_hash,
    status_rsvp: updated.status_rsvp,
  };
}

async function checkIn(db, params) {
  const qrHash = params.qr_hash;
  if (!qrHash || typeof qrHash !== 'string' || qrHash.length > 50) {
    return { success: false, message: 'QR Hash tidak valid.' };
  }

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  if (!guest) {
    return { success: false, message: 'QR Code tidak valid.' };
  }

  if (guest.status_kehadiran === 'Sudah Hadir' && guest.status_lokasi === 'Di Dalam') {
    return {
      success: false,
      message: 'Tamu sudah terregistrasi dan berada di dalam ruangan.',
      guest: formatGuestRow(guest),
      duplicate: true,
    };
  }

  const timestamp = getTimestamp();
  await run(db, 'UPDATE data_tamu SET status_kehadiran = ?, status_lokasi = ?, waktu_checkin = ?, updated_at = datetime(\'now\', \'localtime\') WHERE qr_code_hash = ?', ['Sudah Hadir', 'Di Dalam', timestamp, qrHash]);

  const updated = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  return {
    success: true,
    message: 'Check-in berhasil!',
    guest: formatGuestRow(updated),
    timestamp,
  };
}

async function checkOut(db, params) {
  const qrHash = params.qr_hash;
  if (!qrHash || typeof qrHash !== 'string' || qrHash.length > 50) {
    return { success: false, message: 'QR Hash tidak valid.' };
  }

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  if (!guest) {
    return { success: false, message: 'QR Code tidak valid.' };
  }

  if (guest.status_lokasi !== 'Di Dalam') {
    return {
      success: false,
      message: 'Tamu tidak sedang di dalam ruangan.',
      guest: formatGuestRow(guest),
    };
  }

  await run(db, 'UPDATE data_tamu SET status_lokasi = ?, updated_at = datetime(\'now\', \'localtime\') WHERE qr_code_hash = ?', ['Di Luar', qrHash]);

  const updated = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  return {
    success: true,
    message: 'Tamu diizinkan keluar.',
    guest: formatGuestRow(updated),
  };
}

async function checkInReturn(db, params) {
  const qrHash = params.qr_hash;
  if (!qrHash || typeof qrHash !== 'string' || qrHash.length > 50) {
    return { success: false, message: 'QR Hash tidak valid.' };
  }

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  if (!guest) {
    return { success: false, message: 'QR Code tidak valid.' };
  }

  if (guest.status_lokasi !== 'Di Luar') {
    return {
      success: false,
      message: 'Status lokasi tamu bukan \'Di Luar\'.',
      guest: formatGuestRow(guest),
    };
  }

  await run(db, 'UPDATE data_tamu SET status_lokasi = ?, updated_at = datetime(\'now\', \'localtime\') WHERE qr_code_hash = ?', ['Di Dalam', qrHash]);

  const updated = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  return {
    success: true,
    message: 'Tamu masuk kembali ke ruangan.',
    guest: formatGuestRow(updated),
  };
}

async function searchGuests(db, params, adminPin) {
  const pin = params.pin;
  if (pin !== adminPin) {
    return { success: false, message: 'Akses ditolak. PIN admin diperlukan.' };
  }

  const query = (params.q || '').toLowerCase().slice(0, 100);

  if (!query) {
    const guests = await all(db, 'SELECT * FROM data_tamu ORDER BY id ASC');
    return { success: true, guests: guests.map(formatGuestRow), total: guests.length };
  }

  const guests = await all(db, 'SELECT * FROM data_tamu WHERE LOWER(nama_tamu) LIKE ? OR LOWER(id_tamu) LIKE ? OR LOWER(no_hp) LIKE ? OR LOWER(instansi_kategori) LIKE ? ORDER BY id ASC', [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
  return { success: true, guests: guests.map(formatGuestRow), total: guests.length };
}

async function getStats(db) {
  const totalRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu');
  const hadirRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_rsvp = ?', ['Hadir']);
  const tidakHadirRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_rsvp = ?', ['Tidak Hadir']);
  const tentatifRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_rsvp = ?', ['Tentatif']);
  const belumRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_rsvp = ? OR status_rsvp = \'\' OR status_rsvp IS NULL', ['Belum Konfirmasi']);
  const sudahCheckinRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_kehadiran = ?', ['Sudah Hadir']);
  const diDalamRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_lokasi = ?', ['Di Dalam']);
  const diLuarRow = await get(db, 'SELECT COUNT(*) as count FROM data_tamu WHERE status_lokasi = ?', ['Di Luar']);
  const pendampingRow = await get(db, 'SELECT COALESCE(SUM(jumlah_pendamping), 0) as total FROM data_tamu');

  const kategoriRows = await all(db, 'SELECT instansi_kategori, COUNT(*) as count FROM data_tamu GROUP BY instansi_kategori');
  const kategoriCount = {};
  kategoriRows.forEach(r => {
    kategoriCount[r.instansi_kategori] = r.count;
  });

  const komentarRows = await all(db, 'SELECT nama_tamu as nama, komentar_rsvp as komentar, status_rsvp, instansi_kategori as kategori FROM data_tamu WHERE komentar_rsvp IS NOT NULL AND komentar_rsvp != \'\' ORDER BY id DESC LIMIT 10');

  return {
    success: true,
    stats: {
      total: totalRow.count,
      hadir: hadirRow.count,
      tidak_hadir: tidakHadirRow.count,
      tentatif: tentatifRow.count,
      belum_konfirmasi: belumRow.count,
      sudah_checkin: sudahCheckinRow.count,
      di_dalam: diDalamRow.count,
      di_luar: diLuarRow.count,
      total_pendamping: pendampingRow.total,
      estimasi_kehadiran: hadirRow.count + tentatifRow.count,
      kategori_count: kategoriCount,
      komentar_terbaru: komentarRows,
    },
  };
}

async function addGuest(db, params, adminPin) {
  const pin = params.pin;
  if (pin !== adminPin) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const nama = sanitize(params.nama_tamu, 100);
  const instansi = sanitize(params.instansi_kategori || 'Undangan Umum', 50);
  const noHp = sanitizePhone(params.no_hp);
  const email = sanitizeEmail(params.email);

  if (!nama) {
    return { success: false, message: 'Nama tamu wajib diisi.' };
  }

  const idTamu = await generateIdTamu(db);
  const qrHash = generateQRHash();

  await run(db, 'INSERT INTO data_tamu (id_tamu, nama_tamu, instansi_kategori, no_hp, email, qr_code_hash, catatan_admin) VALUES (?, ?, ?, ?, ?, ?, ?)', [idTamu, nama, instansi, noHp, email, qrHash, 'Tambahan on-the-spot']);

  auditLog('ADD_GUEST', params._ip || 'unknown', `nama=${nama}, id=${idTamu}`);

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]);
  return {
    success: true,
    message: 'Tamu berhasil ditambahkan.',
    guest: formatGuestRow(guest),
  };
}

async function importGuest(db, params, adminPin) {
  const pin = params.pin;
  if (pin !== adminPin) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const nama = sanitize(params.nama_tamu, 100);
  if (!nama) {
    return { success: false, message: 'Nama tamu wajib diisi.' };
  }

  const existingIdTamu = sanitizeId(params.id_tamu);
  const existing = existingIdTamu ? await get(db, 'SELECT id FROM data_tamu WHERE id_tamu = ?', [existingIdTamu]) : null;

  if (existing) {
    return { success: false, message: `Tamu "${nama}" (${existingIdTamu}) sudah ada.`, skipped: true };
  }

  const idTamu = existingIdTamu || await generateIdTamu(db);
  const qrHash = params.qr_code_hash && typeof params.qr_code_hash === 'string' && params.qr_code_hash.length <= 50 ? params.qr_code_hash : generateQRHash();

  await run(db, `INSERT INTO data_tamu (
    id_tamu, nama_tamu, instansi_kategori, no_hp, email,
    status_rsvp, jumlah_pendamping, qr_code_hash,
    status_kehadiran, status_lokasi, waktu_checkin,
    komentar_rsvp, catatan_admin
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    idTamu,
    nama,
    sanitize(params.instansi_kategori || 'Undangan Umum', 50),
    sanitizePhone(params.no_hp),
    sanitizeEmail(params.email),
    ['Hadir', 'Tidak Hadir', 'Tentatif', 'Belum Konfirmasi'].includes(params.status_rsvp) ? params.status_rsvp : 'Belum Konfirmasi',
    Math.min(parseInt(params.jumlah_pendamping) || 0, 10),
    qrHash,
    ['Sudah Hadir', 'Belum Hadir'].includes(params.status_kehadiran) ? params.status_kehadiran : 'Belum Hadir',
    ['Di Dalam', 'Di Luar'].includes(params.status_lokasi) ? params.status_lokasi : 'Di Luar',
    params.waktu_checkin || '',
    sanitize(params.komentar_rsvp || '', 500),
    sanitize(params.catatan_admin || '', 500),
  ]);

  auditLog('IMPORT_GUEST', params._ip || 'unknown', `nama=${nama}, id=${idTamu}`);

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]);
  return {
    success: true,
    message: `Tamu "${nama}" berhasil diimport.`,
    guest: formatGuestRow(guest),
  };
}

async function getGuest(db, params) {
  const idTamu = sanitizeId(params.id_tamu);
  const qrHash = params.qr_hash && typeof params.qr_hash === 'string' && params.qr_hash.length <= 50 ? params.qr_hash : '';

  if (!idTamu && !qrHash) {
    return { success: false, message: 'ID tamu atau QR hash diperlukan.' };
  }

  let guest;
  if (idTamu) {
    guest = await get(db, 'SELECT * FROM data_tamu WHERE id_tamu = ?', [idTamu]);
  } else if (qrHash) {
    guest = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  }

  if (guest) {
    return { success: true, guest: formatGuestRow(guest) };
  }

  return { success: false, message: 'Tamu tidak ditemukan.' };
}

async function updateAdminNote(db, params, adminPin) {
  const pin = params.pin;
  if (pin !== adminPin) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const qrHash = params.qr_hash;
  if (!qrHash || typeof qrHash !== 'string' || qrHash.length > 50) {
    return { success: false, message: 'QR hash tidak valid.' };
  }

  const note = sanitize(params.catatan || '', 500);

  const guest = await get(db, 'SELECT * FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
  if (!guest) {
    return { success: false, message: 'Tamu tidak ditemukan.' };
  }

  await run(db, 'UPDATE data_tamu SET catatan_admin = ?, updated_at = datetime(\'now\', \'localtime\') WHERE qr_code_hash = ?', [note, qrHash]);

  auditLog('UPDATE_NOTE', params._ip || 'unknown', `qr=${qrHash.slice(0, 10)}...`);

  return { success: true, message: 'Catatan admin diperbarui.' };
}

async function addUcapan(db, params) {
  const nama = sanitize(params.nama, 100);
  const ucapan = sanitize(params.ucapan, 500);

  if (!nama || nama.length < 2) {
    return { success: false, message: 'Nama wajib diisi (minimal 2 karakter).' };
  }

  if (!ucapan || ucapan.length < 2) {
    return { success: false, message: 'Ucapan wajib diisi (minimal 2 karakter).' };
  }

  const idTamu = sanitizeId(params.id_tamu || '');

  await run(db, 'INSERT INTO data_ucapan (id_tamu, nama, ucapan) VALUES (?, ?, ?)', [idTamu, nama, ucapan]);

  return { success: true, message: 'Ucapan berhasil dikirim.' };
}

async function getUcapan(db) {
  const messages = await all(db, 'SELECT * FROM data_ucapan ORDER BY id DESC LIMIT 50');
  return { success: true, messages: messages };
}

function verifyPin(params, adminPin) {
  return params.pin === adminPin;
}

function parseIds(raw) {
  if (Array.isArray(raw)) return raw.map(id => sanitizeId(id)).filter(Boolean);
  if (typeof raw === 'string' && raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(id => sanitizeId(id)).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

async function resetStatus(db, params, adminPin) {
  if (!verifyPin(params, adminPin)) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  await run(db, `UPDATE data_tamu SET
    status_rsvp = 'Belum Konfirmasi',
    jumlah_pendamping = 0,
    status_kehadiran = 'Belum Hadir',
    status_lokasi = 'Di Luar',
    waktu_checkin = '',
    komentar_rsvp = '',
    updated_at = datetime('now', 'localtime')
  WHERE 1`);

  auditLog('RESET_STATUS', params._ip || 'unknown', 'all guests');

  return { success: true, message: 'Status semua undangan telah direset.' };
}

async function deleteGuest(db, params, adminPin) {
  if (!verifyPin(params, adminPin)) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const idTamu = sanitizeId(params.id_tamu || '');
  const qrHash = params.qr_hash && typeof params.qr_hash === 'string' && params.qr_hash.length <= 50 ? params.qr_hash : '';
  if (!idTamu && !qrHash) {
    return { success: false, message: 'ID tamu atau QR hash wajib diisi.' };
  }

  let deleted = 0;
  if (idTamu) {
    const r = await run(db, 'DELETE FROM data_tamu WHERE id_tamu = ?', [idTamu]);
    deleted = r.changes;
    auditLog('DELETE_GUEST', params._ip || 'unknown', `id=${idTamu}`);
  } else {
    const r = await run(db, 'DELETE FROM data_tamu WHERE qr_code_hash = ?', [qrHash]);
    deleted = r.changes;
    auditLog('DELETE_GUEST', params._ip || 'unknown', `qr=${qrHash.slice(0, 10)}...`);
  }

  if (deleted === 0) {
    return { success: false, message: 'Tamu tidak ditemukan.' };
  }
  return { success: true, message: 'Undangan berhasil dihapus.', deleted: deleted };
}

async function deleteGuests(db, params, adminPin) {
  if (!verifyPin(params, adminPin)) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const ids = parseIds(params.ids);
  if (ids.length === 0) {
    return { success: false, message: 'Tidak ada tamu yang dipilih.' };
  }

  let total = 0;
  for (const idTamu of ids) {
    const r = await run(db, 'DELETE FROM data_tamu WHERE id_tamu = ?', [idTamu]);
    total += r.changes;
  }

  auditLog('DELETE_GUESTS', params._ip || 'unknown', `count=${total}`);

  return { success: true, message: `${total} undangan berhasil dihapus.`, deleted: total };
}

async function deleteAllGuests(db, params, adminPin) {
  if (!verifyPin(params, adminPin)) {
    return { success: false, message: 'PIN admin tidak valid.' };
  }

  const r = await run(db, 'DELETE FROM data_tamu WHERE 1');
  auditLog('DELETE_ALL', params._ip || 'unknown', `count=${r.changes}`);
  return { success: true, message: 'Semua undangan telah dihapus.', deleted: r.changes };
}

function verifyAdmin(params, adminPin) {
  const pin = params.pin;
  if (pin === adminPin) {
    return { success: true, message: 'PIN valid.' };
  }
  return { success: false, message: 'PIN tidak valid.' };
}

function registerRoutes(app, db, adminLimiter) {
  const ADMIN_PIN = process.env.ADMIN_PIN || '202608';

  app.get('/', (req, res) => {
    const action = req.query.action || '';
    if (!action) {
      return res.json({ success: true, message: 'ENVITATION SQLite Backend is running.' });
    }

    handleGetRequest(req, res, db, ADMIN_PIN, adminLimiter);
  });

  app.post('/', (req, res) => {
    handlePostRequest(req, res, db, ADMIN_PIN);
  });
}

async function handleGetRequest(req, res, db, ADMIN_PIN, adminLimiter) {
  const action = req.query.action || '';

  const adminActions = ['search', 'verifyAdmin'];
  if (adminActions.includes(action)) {
    adminLimiter(req, res, async () => {
      await processGetAction(req, res, db, ADMIN_PIN, action);
    });
  } else {
    await processGetAction(req, res, db, ADMIN_PIN, action);
  }
}

async function processGetAction(req, res, db, ADMIN_PIN, action) {
  let result;

  try {
    switch (action) {
      case 'verify':
        result = await verifyGuest(db, req.query);
        break;
      case 'search':
        result = await searchGuests(db, req.query, ADMIN_PIN);
        break;
      case 'stats':
        result = await getStats(db);
        break;
      case 'getGuest':
        result = await getGuest(db, req.query);
        break;
      case 'verifyAdmin':
        result = verifyAdmin(req.query, ADMIN_PIN);
        break;
      case 'getUcapan':
        result = await getUcapan(db);
        break;
      default:
        result = { success: false, message: 'Action tidak dikenali.' };
    }
  } catch (err) {
    console.error(`[ERROR] GET ${action}:`, err.message);
    result = { success: false, message: 'Terjadi kesalahan pada server.' };
  }

  res.json(result);
}

async function handlePostRequest(req, res, db, ADMIN_PIN) {
  const action = req.body.action || '';
  let result;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  req.body._ip = ip;

  try {
    switch (action) {
      case 'rsvp':
        result = await submitRSVP(db, req.body);
        break;
      case 'checkin':
        result = await checkIn(db, req.body);
        break;
      case 'checkout':
        result = await checkOut(db, req.body);
        break;
      case 'checkin_return':
        result = await checkInReturn(db, req.body);
        break;
      case 'addGuest':
        result = await addGuest(db, req.body, ADMIN_PIN);
        break;
      case 'importGuest':
        result = await importGuest(db, req.body, ADMIN_PIN);
        break;
      case 'updateAdminNote':
        result = await updateAdminNote(db, req.body, ADMIN_PIN);
        break;
      case 'resetStatus':
        result = await resetStatus(db, req.body, ADMIN_PIN);
        break;
      case 'deleteGuest':
        result = await deleteGuest(db, req.body, ADMIN_PIN);
        break;
      case 'deleteGuests':
        result = await deleteGuests(db, req.body, ADMIN_PIN);
        break;
      case 'deleteAllGuests':
        result = await deleteAllGuests(db, req.body, ADMIN_PIN);
        break;
      case 'addUcapan':
        result = await addUcapan(db, req.body);
        break;
      default:
        result = { success: false, message: 'Action tidak dikenali.' };
    }
  } catch (err) {
    console.error(`[ERROR] POST ${action}:`, err.message);
    result = { success: false, message: 'Terjadi kesalahan pada server.' };
  }

  res.json(result);
}

module.exports = { registerRoutes };
