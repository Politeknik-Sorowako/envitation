/**
 * ENVITATION - Admin Panel Logic
 * Handles login, stats, QR scanner, search, add guest, in/out toggle
 */

const Admin = {
  scanner: null,
  scannerMode: "checkin",
  scanning: false,
  currentGuest: null,
  allGuests: [],

  init() {
    document.getElementById("event-subjek-header").textContent = CONFIG.EVENT.subjek;

    const pinInput = document.getElementById("admin-pin");
    if (pinInput) {
      pinInput.focus();
    }
  },

  async login() {
    const pin = document.getElementById("admin-pin").value.trim();
    if (!pin) {
      document.getElementById("login-error").classList.remove("hidden");
      return;
    }

    const result = await API.verifyAdmin(pin);
    if (result.success) {
      sessionStorage.setItem("admin_logged_in", "true");
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("admin-panel").classList.remove("hidden");
      this.loadAll();
    } else {
      document.getElementById("login-error").classList.remove("hidden");
      Utils.showToast("PIN tidak valid", "error");
    }
  },

  logout() {
    sessionStorage.removeItem("admin_logged_in");
    location.reload();
  },

  checkSession() {
    if (sessionStorage.getItem("admin_logged_in") === "true") {
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("admin-panel").classList.remove("hidden");
      this.loadAll();
    }
  },

  async loadAll() {
    await this.loadStats();
    await this.loadGuests();
  },

  async loadStats() {
    const result = await API.getStats();
    if (!result.success) return;

    const s = result.stats;

    document.getElementById("stat-total").textContent = s.total;
    document.getElementById("stat-hadir").textContent = s.hadir;
    document.getElementById("stat-tentatif").textContent = s.tentatif;
    document.getElementById("stat-tidak").textContent = s.tidak_hadir;
    document.getElementById("stat-checkin").textContent = s.sudah_checkin;
    document.getElementById("stat-di-dalam").textContent = s.di_dalam;
    document.getElementById("stat-di-luar").textContent = s.di_luar;

    const checkinRate = s.total > 0 ? Math.round((s.sudah_checkin / s.total) * 100) : 0;
    document.getElementById("checkin-rate").textContent = `${checkinRate}%`;
    document.getElementById("checkin-progress").style.width = `${checkinRate}%`;

    const estimasi = s.total > 0 ? Math.round((s.estimasi_kehadiran / s.total) * 100) : 0;
    document.getElementById("estimasi-text").textContent = `${s.estimasi_kehadiran} tamu`;
    document.getElementById("estimasi-progress").style.width = `${estimasi}%`;

    document.getElementById("pendamping-text").textContent = `${s.total_pendamping} orang`;

    // Kategori
    const kategoriList = document.getElementById("kategori-list");
    kategoriList.innerHTML = "";
    Object.entries(s.kategori_count).forEach(([kat, count]) => {
      kategoriList.innerHTML += `
        <div class="bg-slate-50 p-2 rounded text-center">
          <div class="font-bold text-lg">${count}</div>
          <div class="text-xs text-slate-500">${kat}</div>
        </div>
      `;
    });

    // Komentar
    const komentarList = document.getElementById("komentar-list");
    komentarList.innerHTML = "";
    if (s.komentar_terbaru.length === 0) {
      komentarList.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">Belum ada komentar</p>';
    } else {
      s.komentar_terbaru.forEach(k => {
        komentarList.innerHTML += `
          <div class="p-3 bg-slate-50 rounded-lg">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-sm">${k.nama}</span>
              ${Utils.getRSVPBadge(k.status_rsvp)}
            </div>
            <p class="text-sm text-slate-600">"${k.komentar}"</p>
          </div>
        `;
      });
    }
  },

  async loadGuests() {
    const result = await API.search("");
    if (!result.success) return;

    this.allGuests = result.guests;
    this.renderGuestTable(this.allGuests);
  },

  renderGuestTable(guests) {
    const tbody = document.getElementById("guest-table-body");

    if (guests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-8 text-slate-400">Tidak ada data tamu</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = guests.map(g => `
      <tr>
        <td class="text-xs font-mono">${g.id_tamu}</td>
        <td class="font-medium text-sm">${g.nama_tamu}</td>
        <td class="text-sm">${g.instansi_kategori}</td>
        <td>${Utils.getRSVPBadge(g.status_rsvp)}</td>
        <td class="text-sm text-center">${g.jumlah_pendamping}</td>
        <td>${Utils.getKehadiranBadge(g.status_kehadiran)}</td>
        <td>${Utils.getLokasiBadge(g.status_lokasi)}</td>
        <td class="text-xs">${Utils.formatDate(g.waktu_checkin)}</td>
        <td>
          <button class="btn btn-primary text-xs py-1 px-2" onclick="Admin.showGuestDetail('${g.qr_code_hash}')">Detail</button>
        </td>
      </tr>
    `).join("");
  },

  async searchGuests(query) {
    if (!query.trim()) {
      this.renderGuestTable(this.allGuests);
      return;
    }

    const result = await API.search(query);
    if (result.success) {
      this.renderGuestTable(result.guests);
    }
  },

  setScannerMode(mode) {
    this.scannerMode = mode;

    document.getElementById("mode-checkin").className = mode === "checkin" ? "btn btn-success text-sm flex-1" : "btn btn-outline text-sm flex-1";
    document.getElementById("mode-checkout").className = mode === "checkout" ? "btn btn-accent text-sm flex-1" : "btn btn-outline text-sm flex-1";
    document.getElementById("mode-return").className = mode === "return" ? "btn btn-primary text-sm flex-1" : "btn btn-outline text-sm flex-1";

    const statusText = {
      checkin: "Mode: Check-in Tamu",
      checkout: "Mode: Pass Keluar",
      return: "Mode: Masuk Kembali",
    };
    document.getElementById("scanner-status").textContent = statusText[mode];
  },

  startScanner() {
    const reader = document.getElementById("qr-reader");

    this.scanner = new Html5Qrcode("qr-reader");

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    this.scanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => this.onScanSuccess(decodedText),
      () => {}
    ).then(() => {
      this.scanning = true;
      document.getElementById("btn-start-scanner").classList.add("hidden");
      document.getElementById("btn-stop-scanner").classList.remove("hidden");
      document.getElementById("scanner-status").textContent = "Scanner aktif... Arahkan ke QR Code";
    }).catch((err) => {
      Utils.showToast("Gagal memulai kamera: " + err, "error");
    });
  },

  stopScanner() {
    if (this.scanner && this.scanning) {
      this.scanner.stop().then(() => {
        this.scanning = false;
        document.getElementById("btn-start-scanner").classList.remove("hidden");
        document.getElementById("btn-stop-scanner").classList.add("hidden");
        document.getElementById("scanner-status").textContent = "Scanner dihentikan";
      });
    }
  },

  async onScanSuccess(qrHash) {
    if (!this.scanning) return;

    let result;

    switch (this.scannerMode) {
      case "checkin":
        result = await API.checkIn(qrHash);
        break;
      case "checkout":
        result = await API.checkOut(qrHash);
        break;
      case "return":
        result = await API.checkInReturn(qrHash);
        break;
      default:
        result = { success: false, message: "Mode scanner tidak valid" };
    }

    this.showScanResult(result);

    if (result.success) {
      Utils.playSound("success");
      Utils.vibrate([100, 50, 100]);
      await this.loadStats();
      await this.loadGuests();
    } else {
      Utils.playSound("error");
      Utils.vibrate([200]);
    }
  },

  showScanResult(result) {
    const container = document.getElementById("scan-result");
    const icon = document.getElementById("scan-result-icon");
    const name = document.getElementById("scan-result-name");
    const detail = document.getElementById("scan-result-detail");
    const message = document.getElementById("scan-result-message");

    container.classList.remove("hidden");

    if (result.success) {
      icon.className = "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100";
      icon.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
      name.textContent = result.guest ? result.guest.nama_tamu : "Berhasil";
      detail.textContent = result.guest ? `${result.guest.instansi_kategori} • ${result.guest.status_lokasi}` : "";
      message.className = "text-sm mt-1 text-green-600 font-medium";
    } else {
      icon.className = "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100";
      icon.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
      name.textContent = result.guest ? result.guest.nama_tamu : "Gagal";
      detail.textContent = result.guest ? `${result.guest.instansi_kategori}` : "";
      message.className = "text-sm mt-1 text-red-600 font-medium";
    }

    message.textContent = result.message;

    setTimeout(() => {
      container.classList.add("hidden");
    }, 5000);
  },

  showAddGuestForm() {
    document.getElementById("add-guest-form").classList.remove("hidden");
  },

  hideAddGuestForm() {
    document.getElementById("add-guest-form").classList.add("hidden");
    document.getElementById("add-nama").value = "";
    document.getElementById("add-hp").value = "";
    document.getElementById("add-email").value = "";
  },

  async addGuest() {
    const nama = document.getElementById("add-nama").value.trim();
    const instansi = document.getElementById("add-kategori").value;
    const hp = document.getElementById("add-hp").value.trim();
    const email = document.getElementById("add-email").value.trim();

    if (!nama) {
      Utils.showToast("Nama tamu wajib diisi", "warning");
      return;
    }

    const result = await API.addGuest(CONFIG.ADMIN.pin, nama, instansi, hp, email);

    if (result.success) {
      Utils.showToast(`Tamu "${nama}" berhasil ditambahkan! ID: ${result.guest.id_tamu}`, "success");
      this.hideAddGuestForm();
      await this.loadStats();
      await this.loadGuests();
    } else {
      Utils.showToast(result.message, "error");
    }
  },

  async showGuestDetail(qrHash) {
    const result = await API.getGuest(null, qrHash);
    if (!result.success) {
      Utils.showToast("Gagal memuat detail tamu", "error");
      return;
    }

    this.currentGuest = result.guest;
    const g = this.currentGuest;

    const content = document.getElementById("guest-modal-content");
    content.innerHTML = `
      <div class="space-y-3">
        <div>
          <p class="text-xs text-slate-500">ID Tamu</p>
          <p class="font-mono font-semibold">${g.id_tamu}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500">Nama</p>
          <p class="font-semibold">${g.nama_tamu}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500">Kategori</p>
          <p>${g.instansi_kategori}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500">No. HP</p>
          <p>${g.no_hp || "-"}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500">Email</p>
          <p>${g.email || "-"}</p>
        </div>
        <div class="flex gap-4">
          <div class="flex-1">
            <p class="text-xs text-slate-500">Status RSVP</p>
            <p>${Utils.getRSVPBadge(g.status_rsvp)}</p>
          </div>
          <div class="flex-1">
            <p class="text-xs text-slate-500">Pendamping</p>
            <p class="font-semibold">${g.jumlah_pendamping}</p>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="flex-1">
            <p class="text-xs text-slate-500">Kehadiran</p>
            <p>${Utils.getKehadiranBadge(g.status_kehadiran)}</p>
          </div>
          <div class="flex-1">
            <p class="text-xs text-slate-500">Lokasi</p>
            <p>${Utils.getLokasiBadge(g.status_lokasi)}</p>
          </div>
        </div>
        ${g.waktu_checkin ? `
        <div>
          <p class="text-xs text-slate-500">Waktu Check-in</p>
          <p class="text-sm">${Utils.formatDate(g.waktu_checkin)}</p>
        </div>
        ` : ""}
        ${g.komentar_rsvp ? `
        <div>
          <p class="text-xs text-slate-500">Komentar Tamu</p>
          <p class="text-sm bg-slate-50 p-2 rounded">"${g.komentar_rsvp}"</p>
        </div>
        ` : ""}
        <div>
          <p class="text-xs text-slate-500">Catatan Admin</p>
          <textarea id="admin-note-input" class="form-input text-sm" rows="2" placeholder="Tambah catatan...">${g.catatan_admin || ""}</textarea>
          <button class="btn btn-primary text-xs mt-2" onclick="Admin.saveAdminNote()">Simpan Catatan</button>
        </div>
      </div>
    `;

    // Show/hide appropriate buttons
    const checkinBtn = document.getElementById("modal-checkin-btn");
    const checkoutBtn = document.getElementById("modal-checkout-btn");
    const returnBtn = document.getElementById("modal-return-btn");

    if (g.status_kehadiran === "Sudah Hadir" && g.status_lokasi === "Di Dalam") {
      checkinBtn.classList.add("hidden");
      checkoutBtn.classList.remove("hidden");
      returnBtn.classList.add("hidden");
    } else if (g.status_lokasi === "Di Luar") {
      checkinBtn.classList.add("hidden");
      checkoutBtn.classList.add("hidden");
      returnBtn.classList.remove("hidden");
    } else {
      checkinBtn.classList.remove("hidden");
      checkoutBtn.classList.add("hidden");
      returnBtn.classList.add("hidden");
    }

    document.getElementById("guest-modal").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("guest-modal").classList.add("hidden");
    this.currentGuest = null;
  },

  async modalCheckIn() {
    if (!this.currentGuest) return;
    const result = await API.checkIn(this.currentGuest.qr_code_hash);
    if (result.success) {
      Utils.showToast(`Check-in: ${this.currentGuest.nama_tamu}`, "success");
      Utils.playSound("success");
      this.closeModal();
      await this.loadStats();
      await this.loadGuests();
    } else {
      Utils.showToast(result.message, "error");
    }
  },

  async modalCheckOut() {
    if (!this.currentGuest) return;
    const result = await API.checkOut(this.currentGuest.qr_code_hash);
    if (result.success) {
      Utils.showToast(`${this.currentGuest.nama_tamu} diizinkan keluar`, "warning");
      this.closeModal();
      await this.loadStats();
      await this.loadGuests();
    } else {
      Utils.showToast(result.message, "error");
    }
  },

  async modalCheckInReturn() {
    if (!this.currentGuest) return;
    const result = await API.checkInReturn(this.currentGuest.qr_code_hash);
    if (result.success) {
      Utils.showToast(`${this.currentGuest.nama_tamu} masuk kembali`, "success");
      Utils.playSound("success");
      this.closeModal();
      await this.loadStats();
      await this.loadGuests();
    } else {
      Utils.showToast(result.message, "error");
    }
  },

  async saveAdminNote() {
    if (!this.currentGuest) return;
    const note = document.getElementById("admin-note-input").value.trim();
    const result = await API.updateAdminNote(CONFIG.ADMIN.pin, this.currentGuest.qr_code_hash, note);
    if (result.success) {
      Utils.showToast("Catatan disimpan", "success");
      this.currentGuest.catatan_admin = note;
    } else {
      Utils.showToast(result.message, "error");
    }
  },
};
