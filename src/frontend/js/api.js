/**
 * ENVITATION - API Client
 * Handles all communication with Google Apps Script Web App
 */

const API = {
  baseUrl: (function() {
    const type = CONFIG.BACKEND.type;
    return type === "sqlite" ? CONFIG.BACKEND.sqlite.url : CONFIG.BACKEND.gas.url;
  })(),

  async call(action, params = {}, method = "GET") {
    const url = new URL(this.baseUrl);
    url.searchParams.set("action", action);

    Object.keys(params).forEach(key => {
      url.searchParams.set(key, params[key]);
    });

    let attempts = 0;
    const maxAttempts = CONFIG.API.retries + 1;

    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.timeout);

        const response = await fetch(url.toString(), {
          method: method,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("API call failed:", error);
          return { success: false, message: "Koneksi gagal. Periksa jaringan Anda." };
        }
        await this.delay(1000 * attempts);
      }
    }
  },

  async post(action, params = {}) {
    const formData = new URLSearchParams();
    formData.set("action", action);
    Object.keys(params).forEach(key => {
      formData.set(key, params[key]);
    });

    let attempts = 0;
    const maxAttempts = CONFIG.API.retries + 1;

    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.timeout);

        const response = await fetch(this.baseUrl, {
          method: "POST",
          body: formData,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("API POST failed:", error);
          return { success: false, message: "Koneksi gagal. Periksa jaringan Anda." };
        }
        await this.delay(1000 * attempts);
      }
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  verify(id, nama, noHp) {
    const params = {};
    if (id) params.id = id;
    if (nama) params.nama = nama;
    if (noHp) params.no_hp = noHp;
    return this.call("verify", params);
  },

  submitRSVP(idTamu, statusRsvp, jumlahPendamping, komentar) {
    return this.post("rsvp", {
      id_tamu: idTamu,
      status_rsvp: statusRsvp,
      jumlah_pendamping: jumlahPendamping,
      komentar: komentar,
    });
  },

  checkIn(qrHash) {
    return this.post("checkin", { qr_hash: qrHash });
  },

  checkOut(qrHash) {
    return this.post("checkout", { qr_hash: qrHash });
  },

  checkInReturn(qrHash) {
    return this.post("checkin_return", { qr_hash: qrHash });
  },

  search(query, pin) {
    if (!pin) return Promise.resolve({ success: false, message: "PIN diperlukan" });
    return this.call("search", { q: query, pin: pin });
  },

  getStats() {
    return this.call("stats");
  },

  addGuest(pin, nama, instansi, noHp, email) {
    return this.post("addGuest", {
      pin: pin,
      nama_tamu: nama,
      instansi_kategori: instansi,
      no_hp: noHp,
      email: email,
    });
  },

  getGuest(idTamu, qrHash) {
    const params = {};
    if (idTamu) params.id_tamu = idTamu;
    if (qrHash) params.qr_hash = qrHash;
    return this.call("getGuest", params);
  },

  updateAdminNote(pin, qrHash, catatan) {
    return this.post("updateAdminNote", {
      pin: pin,
      qr_hash: qrHash,
      catatan: catatan,
    });
  },

  verifyAdmin(pin) {
    return this.call("verifyAdmin", { pin: pin });
  },

  importGuest(pin, nama, instansi, noHp, email, statusRsvp, jumlahPendamping, qrHash, statusKehadiran, statusLokasi, waktuCheckin, komentar, catatan) {
    return this.post("importGuest", {
      pin: pin,
      nama_tamu: nama,
      instansi_kategori: instansi,
      no_hp: noHp,
      email: email,
      status_rsvp: statusRsvp,
      jumlah_pendamping: jumlahPendamping,
      qr_code_hash: qrHash,
      status_kehadiran: statusKehadiran,
      status_lokasi: statusLokasi,
      waktu_checkin: waktuCheckin,
      komentar_rsvp: komentar,
      catatan_admin: catatan,
    });
  },

  addUcapan(idTamu, nama, ucapan) {
    return this.post("addUcapan", {
      id_tamu: idTamu,
      nama: nama,
      ucapan: ucapan,
    });
  },

  getUcapan() {
    return this.call("getUcapan");
  },

  resetStatus(pin) {
    return this.post("resetStatus", { pin: pin });
  },

  deleteGuest(pin, idTamu) {
    return this.post("deleteGuest", {
      pin: pin,
      id_tamu: idTamu,
    });
  },

  deleteGuests(pin, ids) {
    return this.post("deleteGuests", {
      pin: pin,
      ids: JSON.stringify(ids),
    });
  },

  deleteAllGuests(pin) {
    return this.post("deleteAllGuests", { pin: pin });
  },
};
