/**
 * ENVITATION - Google Apps Script Backend
 * Deploy sebagai Web App: Execute as "Me", Access "Anyone"
 */

const SHEET_NAME = "Data_Tamu";
const ADMIN_PIN = "202608";

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter || {};
  const action = params.action || "";

  let result;
  try {
    switch (action) {
      case "verify":
        result = verifyGuest(params);
        break;
      case "rsvp":
        result = submitRSVP(params);
        break;
      case "checkin":
        result = checkIn(params);
        break;
      case "checkout":
        result = checkOut(params);
        break;
      case "checkin_return":
        result = checkInReturn(params);
        break;
      case "search":
        result = searchGuests(params);
        break;
      case "stats":
        result = getStats();
        break;
      case "addGuest":
        result = addGuest(params);
        break;
      case "importGuest":
        result = importGuest(params);
        break;
      case "getGuest":
        result = getGuest(params);
        break;
      case "updateAdminNote":
        result = updateAdminNote(params);
        break;
      case "verifyAdmin":
        result = verifyAdmin(params);
        break;
      default:
        result = { success: false, message: "Action tidak dikenali: " + action };
    }
  } catch (err) {
    result = { success: false, message: "Error: " + err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "id_tamu", "nama_tamu", "instansi_kategori", "no_hp", "email",
      "status_rsvp", "jumlah_pendamping", "qr_code_hash",
      "status_kehadiran", "status_lokasi", "waktu_checkin",
      "komentar_rsvp", "catatan_admin"
    ]);
  }
  return sheet;
}

function generateQRHash() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "QR_";
  for (let i = 0; i < 16; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

function generateIdTamu() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const count = data.length - 1;
  const num = String(count + 1).padStart(3, "0");
  return "TMU" + num;
}

function findRowByQRHash(qrHash) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === qrHash) {
      return i + 1;
    }
  }
  return -1;
}

function findRowByIdTamu(idTamu) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idTamu) {
      return i + 1;
    }
  }
  return -1;
}

function verifyGuest(params) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const idTamu = params.id;
  const nama = params.nama;
  const noHp = params.no_hp;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (idTamu && row[0] === idTamu) {
      return {
        success: true,
        guest: formatGuestRow(row, i + 1),
      };
    }
    if (nama && noHp && row[1].toLowerCase() === nama.toLowerCase() && row[3] === noHp) {
      return {
        success: true,
        guest: formatGuestRow(row, i + 1),
      };
    }
  }

  return { success: false, message: "Mohon maaf, nama Anda belum terdaftar dalam sistem." };
}

function formatGuestRow(row, rowNum) {
  return {
    rowNum: rowNum,
    id_tamu: row[0],
    nama_tamu: row[1],
    instansi_kategori: row[2],
    no_hp: row[3],
    email: row[4],
    status_rsvp: row[5],
    jumlah_pendamping: row[6] || 0,
    qr_code_hash: row[7],
    status_kehadiran: row[8],
    status_lokasi: row[9],
    waktu_checkin: row[10],
    komentar_rsvp: row[11] || "",
    catatan_admin: row[12] || "",
  };
}

function submitRSVP(params) {
  const idTamu = params.id_tamu;
  const statusRsvp = params.status_rsvp;
  const jumlahPendamping = parseInt(params.jumlah_pendamping) || 0;
  const komentar = params.komentar || "";

  const validStatus = ["Hadir", "Tidak Hadir", "Tentatif"];
  if (!validStatus.includes(statusRsvp)) {
    return { success: false, message: "Status RSVP tidak valid." };
  }

  const row = findRowByIdTamu(idTamu);
  if (row < 0) {
    return { success: false, message: "Tamu tidak ditemukan." };
  }

  const sheet = getSheet();
  sheet.getRange(row, 6).setValue(statusRsvp);
  sheet.getRange(row, 7).setValue(jumlahPendamping);
  sheet.getRange(row, 12).setValue(komentar);

  const qrHash = sheet.getRange(row, 8).getValue();

  return {
    success: true,
    message: "RSVP berhasil disimpan.",
    qr_code_hash: qrHash,
    status_rsvp: statusRsvp,
  };
}

function checkIn(params) {
  const qrHash = params.qr_hash;
  if (!qrHash) {
    return { success: false, message: "QR Hash tidak ditemukan." };
  }

  const row = findRowByQRHash(qrHash);
  if (row < 0) {
    return { success: false, message: "QR Code tidak valid." };
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const guestData = data[row - 1];
  const statusKehadiran = guestData[8];
  const statusLokasi = guestData[9];

  if (statusKehadiran === "Sudah Hadir" && statusLokasi === "Di Dalam") {
    return {
      success: false,
      message: "Tamu sudah terregistrasi dan berada di dalam ruangan.",
      guest: formatGuestRow(guestData, row),
      duplicate: true,
    };
  }

  const now = new Date();
  const timestamp = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");

  sheet.getRange(row, 9).setValue("Sudah Hadir");
  sheet.getRange(row, 10).setValue("Di Dalam");
  sheet.getRange(row, 11).setValue(timestamp);

  return {
    success: true,
    message: "Check-in berhasil!",
    guest: formatGuestRow(sheet.getDataRange().getValues()[row - 1], row),
    timestamp: timestamp,
  };
}

function checkOut(params) {
  const qrHash = params.qr_hash;
  if (!qrHash) {
    return { success: false, message: "QR Hash tidak ditemukan." };
  }

  const row = findRowByQRHash(qrHash);
  if (row < 0) {
    return { success: false, message: "QR Code tidak valid." };
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const guestData = data[row - 1];

  if (guestData[9] !== "Di Dalam") {
    return {
      success: false,
      message: "Tamu tidak sedang di dalam ruangan.",
      guest: formatGuestRow(guestData, row),
    };
  }

  sheet.getRange(row, 10).setValue("Di Luar");

  return {
    success: true,
    message: "Tamu diizinkan keluar.",
    guest: formatGuestRow(sheet.getDataRange().getValues()[row - 1], row),
  };
}

function checkInReturn(params) {
  const qrHash = params.qr_hash;
  if (!qrHash) {
    return { success: false, message: "QR Hash tidak ditemukan." };
  }

  const row = findRowByQRHash(qrHash);
  if (row < 0) {
    return { success: false, message: "QR Code tidak valid." };
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const guestData = data[row - 1];

  if (guestData[9] !== "Di Luar") {
    return {
      success: false,
      message: "Status lokasi tamu bukan 'Di Luar'.",
      guest: formatGuestRow(guestData, row),
    };
  }

  sheet.getRange(row, 10).setValue("Di Dalam");

  return {
    success: true,
    message: "Tamu masuk kembali ke ruangan.",
    guest: formatGuestRow(sheet.getDataRange().getValues()[row - 1], row),
  };
}

function searchGuests(params) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const query = (params.q || "").toLowerCase();

  if (!query) {
    const guests = [];
    for (let i = 1; i < data.length; i++) {
      guests.push(formatGuestRow(data[i], i + 1));
    }
    return { success: true, guests: guests, total: guests.length };
  }

  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nama = row[1].toLowerCase();
    const id = row[0].toLowerCase();
    const hp = row[3].toLowerCase();
    const instansi = row[2].toLowerCase();

    if (nama.includes(query) || id.includes(query) || hp.includes(query) || instansi.includes(query)) {
      results.push(formatGuestRow(row, i + 1));
    }
  }

  return { success: true, guests: results, total: results.length };
}

function getStats() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  let total = 0;
  let hadir = 0;
  let tidakHadir = 0;
  let tentatif = 0;
  let belumKonfirmasi = 0;
  let sudahCheckin = 0;
  let diDalam = 0;
  let diLuar = 0;
  let totalPendamping = 0;

  const kategoriCount = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    total++;

    const rsvp = row[5];
    if (rsvp === "Hadir") hadir++;
    else if (rsvp === "Tidak Hadir") tidakHadir++;
    else if (rsvp === "Tentatif") tentatif++;
    else belumKonfirmasi++;

    if (row[8] === "Sudah Hadir") sudahCheckin++;
    if (row[9] === "Di Dalam") diDalam++;
    if (row[9] === "Di Luar") diLuar++;

    totalPendamping += parseInt(row[6]) || 0;

    const kategori = row[2];
    kategoriCount[kategori] = (kategoriCount[kategori] || 0) + 1;
  }

  const komentarTerbaru = [];
  for (let i = data.length - 1; i >= 1 && komentarTerbaru.length < 10; i--) {
    if (data[i][11]) {
      komentarTerbaru.push({
        nama: data[i][1],
        komentar: data[i][11],
        status_rsvp: data[i][5],
        kategori: data[i][2],
      });
    }
  }

  return {
    success: true,
    stats: {
      total: total,
      hadir: hadir,
      tidak_hadir: tidakHadir,
      tentatif: tentatif,
      belum_konfirmasi: belumKonfirmasi,
      sudah_checkin: sudahCheckin,
      di_dalam: diDalam,
      di_luar: diLuar,
      total_pendamping: totalPendamping,
      estimasi_kehadiran: hadir + tentatif,
      kategori_count: kategoriCount,
      komentar_terbaru: komentarTerbaru,
    },
  };
}

function addGuest(params) {
  const pin = params.pin;
  if (pin !== ADMIN_PIN) {
    return { success: false, message: "PIN admin tidak valid." };
  }

  const nama = params.nama_tamu;
  const instansi = params.instansi_kategori || "Undangan Umum";
  const noHp = params.no_hp || "";
  const email = params.email || "";

  if (!nama) {
    return { success: false, message: "Nama tamu wajib diisi." };
  }

  const sheet = getSheet();
  const idTamu = generateIdTamu();
  const qrHash = generateQRHash();

  sheet.appendRow([
    idTamu, nama, instansi, noHp, email,
    "Belum Konfirmasi", 0, qrHash,
    "Belum Hadir", "Di Luar", "",
    "", "Tambahan on-the-spot"
  ]);

  return {
    success: true,
    message: "Tamu berhasil ditambahkan.",
    guest: {
      id_tamu: idTamu,
      nama_tamu: nama,
      instansi_kategori: instansi,
      no_hp: noHp,
      email: email,
      status_rsvp: "Belum Konfirmasi",
      jumlah_pendamping: 0,
      qr_code_hash: qrHash,
      status_kehadiran: "Belum Hadir",
      status_lokasi: "Di Luar",
      waktu_checkin: "",
      komentar_rsvp: "",
      catatan_admin: "Tambahan on-the-spot",
    },
  };
}

function importGuest(params) {
  const pin = params.pin;
  if (pin !== ADMIN_PIN) {
    return { success: false, message: "PIN admin tidak valid." };
  }

  const nama = params.nama_tamu;
  if (!nama) {
    return { success: false, message: "Nama tamu wajib diisi." };
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const existingIdTamu = params.id_tamu || "";

  for (let i = 1; i < data.length; i++) {
    if (existingIdTamu && data[i][0] === existingIdTamu) {
      return { success: false, message: 'Tamu "' + nama + '" (' + existingIdTamu + ') sudah ada.', skipped: true };
    }
  }

  const idTamu = existingIdTamu || generateIdTamu();
  const qrHash = params.qr_code_hash || generateQRHash();

  sheet.appendRow([
    idTamu,
    nama,
    params.instansi_kategori || "Undangan Umum",
    params.no_hp || "",
    params.email || "",
    params.status_rsvp || "Belum Konfirmasi",
    parseInt(params.jumlah_pendamping) || 0,
    qrHash,
    params.status_kehadiran || "Belum Hadir",
    params.status_lokasi || "Di Luar",
    params.waktu_checkin || "",
    params.komentar_rsvp || "",
    params.catatan_admin || "",
  ]);

  return {
    success: true,
    message: 'Tamu "' + nama + '" berhasil diimport.',
    guest: {
      id_tamu: idTamu,
      nama_tamu: nama,
      instansi_kategori: params.instansi_kategori || "Undangan Umum",
      no_hp: params.no_hp || "",
      email: params.email || "",
      status_rsvp: params.status_rsvp || "Belum Konfirmasi",
      jumlah_pendamping: parseInt(params.jumlah_pendamping) || 0,
      qr_code_hash: qrHash,
      status_kehadiran: params.status_kehadiran || "Belum Hadir",
      status_lokasi: params.status_lokasi || "Di Luar",
      waktu_checkin: params.waktu_checkin || "",
      komentar_rsvp: params.komentar_rsvp || "",
      catatan_admin: params.catatan_admin || "",
    },
  };
}

function getGuest(params) {
  const idTamu = params.id_tamu;
  const qrHash = params.qr_hash;

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if ((idTamu && data[i][0] === idTamu) || (qrHash && data[i][7] === qrHash)) {
      return { success: true, guest: formatGuestRow(data[i], i + 1) };
    }
  }

  return { success: false, message: "Tamu tidak ditemukan." };
}

function updateAdminNote(params) {
  const pin = params.pin;
  if (pin !== ADMIN_PIN) {
    return { success: false, message: "PIN admin tidak valid." };
  }

  const qrHash = params.qr_hash;
  const note = params.catatan || "";

  const row = findRowByQRHash(qrHash);
  if (row < 0) {
    return { success: false, message: "Tamu tidak ditemukan." };
  }

  const sheet = getSheet();
  sheet.getRange(row, 13).setValue(note);

  return { success: true, message: "Catatan admin diperbarui." };
}

function verifyAdmin(params) {
  const pin = params.pin;
  if (pin === ADMIN_PIN) {
    return { success: true, message: "PIN valid." };
  }
  return { success: false, message: "PIN tidak valid." };
}
