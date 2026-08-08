/**
 * ENVITATION - Admin Panel Logic
 * Session management, tab state, QR scanner, search, import, guestbook
 */

const Admin = {
  scanner: null,
  scannerMode: "checkin",
  scanning: false,
  currentGuest: null,
  allGuests: [],
  sessionExpiry: 12 * 60 * 60 * 1000,

  init() {
    document.getElementById("sidebar-event-subjek").textContent = CONFIG.EVENT.subjek;
    this.checkSession();
  },

  // ===== SESSION MANAGEMENT =====
  checkSession() {
    const session = this.getSession();
    if (session && session.valid) {
      this.showPanel();
      const hash = window.location.hash.replace("#", "") || "dashboard";
      this.switchTab(hash, true);
    } else {
      this.showLogin();
    }
  },

  getSession() {
    try {
      const data = JSON.parse(localStorage.getItem("admin_session") || "{}");
      if (!data.token || !data.expiry) return null;
      const valid = Date.now() < data.expiry;
      return { ...data, valid };
    } catch {
      return null;
    }
  },

  saveSession() {
    const session = {
      token: "admin_" + Date.now(),
      expiry: Date.now() + this.sessionExpiry,
      tab: this.getCurrentTab(),
    };
    localStorage.setItem("admin_session", JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem("admin_session");
  },

  getCurrentTab() {
    const active = document.querySelector(".admin-nav-item.active, .admin-bottom-nav-item.active");
    return active ? active.dataset.tab : "dashboard";
  },

  showLogin() {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("admin-panel").classList.add("hidden");
    const pinInput = document.getElementById("admin-pin");
    if (pinInput) pinInput.focus();
  },

  showPanel() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
    this.updateSessionInfo();
    this.loadAll();
  },

  updateSessionInfo() {
    const session = this.getSession();
    if (session) {
      const remaining = Math.round((session.expiry - Date.now()) / 3600000);
      document.getElementById("admin-session-info").textContent = `Sesi: ${remaining}h tersisa`;
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
      this.saveSession();
      this.showPanel();
    } else {
      document.getElementById("login-error").classList.remove("hidden");
      Utils.showToast("PIN tidak valid", "error");
    }
  },

  logout() {
    this.stopScanner();
    this.clearSession();
    window.location.hash = "";
    location.reload();
  },

  // ===== TAB MANAGEMENT =====
  switchTab(tab, skipSave = false) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".admin-nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".admin-bottom-nav-item").forEach(n => n.classList.remove("active"));

    const panel = document.getElementById(`tab-${tab}`);
    if (panel) panel.classList.add("active");

    document.querySelectorAll(`[data-tab="${tab}"]`).forEach(n => n.classList.add("active"));

    const titles = {
      dashboard: ["Dashboard", "Ringkasan data acara"],
      scanner: ["Scanner QR", "Scan QR Code tamu"],
      datatamu: ["Data Tamu", "Kelola data undangan"],
      buktamu: ["Buku Tamu", "Ucapan dan harapan tamu"],
    };

    const [title, subtitle] = titles[tab] || ["", ""];
    document.getElementById("header-title").textContent = title;
    document.getElementById("header-subtitle").textContent = subtitle;

    if (!skipSave) {
      window.location.hash = tab;
      this.saveSession();
    }

    if (tab === "scanner" && !this.scanning) {
      this.stopScanner();
    }

    if (tab === "bukutamu") {
      this.loadGuestbook();
    }
  },

  // ===== DATA LOADING =====
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

    const kategoriList = document.getElementById("kategori-list");
    kategoriList.innerHTML = "";
    Object.entries(s.kategori_count).forEach(([kat, count]) => {
      kategoriList.innerHTML += `<div class="bg-slate-50 p-2 rounded text-center"><div class="font-bold text-lg">${count}</div><div class="text-xs text-slate-500">${kat}</div></div>`;
    });

    const komentarList = document.getElementById("komentar-list");
    komentarList.innerHTML = "";
    if (s.komentar_terbaru.length === 0) {
      komentarList.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">Belum ada komentar</p>';
    } else {
      s.komentar_terbaru.forEach(k => {
        komentarList.innerHTML += `<div class="p-3 bg-slate-50 rounded-lg"><div class="flex items-center gap-2 mb-1"><span class="font-semibold text-sm">${k.nama}</span>${Utils.getRSVPBadge(k.status_rsvp)}</div><p class="text-sm text-slate-600">"${k.komentar}"</p></div>`;
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
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400">Tidak ada data tamu</td></tr>';
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
        <td><button class="btn btn-primary text-xs py-1 px-2" onclick="Admin.showGuestDetail('${g.qr_code_hash}')">Detail</button></td>
      </tr>
    `).join("");
  },

  async searchGuests(query) {
    if (!query.trim()) { this.renderGuestTable(this.allGuests); return; }
    const result = await API.search(query);
    if (result.success) this.renderGuestTable(result.guests);
  },

  // ===== SCANNER =====
  setScannerMode(mode) {
    this.scannerMode = mode;
    document.getElementById("mode-checkin").className = mode === "checkin" ? "btn btn-success text-sm flex-1" : "btn btn-outline text-sm flex-1";
    document.getElementById("mode-checkout").className = mode === "checkout" ? "btn btn-accent text-sm flex-1" : "btn btn-outline text-sm flex-1";
    document.getElementById("mode-return").className = mode === "return" ? "btn btn-primary text-sm flex-1" : "btn btn-outline text-sm flex-1";

    const statusText = { checkin: "Mode: Check-in Tamu", checkout: "Mode: Pass Keluar", return: "Mode: Masuk Kembali" };
    document.getElementById("scanner-status").textContent = statusText[mode];
  },

  startScanner() {
    this.scanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    this.scanner.start({ facingMode: "environment" }, config,
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
      }).catch(() => {});
    }
  },

  async onScanSuccess(qrHash) {
    if (!this.scanning) return;

    let result;
    switch (this.scannerMode) {
      case "checkin": result = await API.checkIn(qrHash); break;
      case "checkout": result = await API.checkOut(qrHash); break;
      case "return": result = await API.checkInReturn(qrHash); break;
      default: result = { success: false, message: "Mode scanner tidak valid" };
    }

    this.showScanFeedback(result);
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

  showScanFeedback(result) {
    const feedback = document.getElementById("scanner-feedback");
    const icon = document.getElementById("scanner-feedback-icon");

    feedback.className = `scanner-feedback ${result.success ? "success" : "error"}`;
    icon.innerHTML = result.success
      ? '<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>'
      : '<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>';

    setTimeout(() => {
      feedback.className = "scanner-feedback";
    }, 1500);
  },

  showScanResult(result) {
    const container = document.getElementById("scan-result");
    container.classList.remove("hidden");

    const type = result.success ? "success" : (result.duplicate ? "warning" : "error");
    const icon = result.success
      ? '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
      : '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';

    container.innerHTML = `
      <div class="scan-result-card ${type}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${result.success ? 'bg-green-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}">${icon}</div>
          <div>
            <h3 class="font-bold">${result.guest ? result.guest.nama_tamu : (result.success ? "Berhasil" : "Gagal")}</h3>
            <p class="text-sm text-slate-600">${result.guest ? `${result.guest.instansi_kategori} • ${result.guest.status_lokasi}` : ""}</p>
            <p class="text-sm mt-1 ${result.success ? 'text-green-600' : type === 'warning' ? 'text-yellow-600' : 'text-red-600'} font-medium">${result.message}</p>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => { container.classList.add("hidden"); }, 5000);
  },

  // ===== ADD GUEST =====
  showAddGuestForm() { document.getElementById("add-guest-form").classList.remove("hidden"); },
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

    if (!nama) { Utils.showToast("Nama tamu wajib diisi", "warning"); return; }

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

  // ===== IMPORT =====
  showImportForm() {
    document.getElementById("import-form").classList.remove("hidden");
    document.getElementById("import-file").value = "";
    document.getElementById("import-preview").classList.add("hidden");
    document.getElementById("import-progress").classList.add("hidden");
    document.getElementById("import-result").classList.add("hidden");
    document.getElementById("btn-import").disabled = true;
  },
  hideImportForm() { document.getElementById("import-form").classList.add("hidden"); },

  importRecords: [],

  previewImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      try {
        if (ext === 'csv') this.importRecords = this.parseCSV(e.target.result);
        else if (ext === 'json') this.importRecords = this.parseJSON(e.target.result);
        else { Utils.showToast("Format file tidak didukung. Gunakan CSV atau JSON.", "error"); return; }

        document.getElementById("import-file-name").textContent = file.name;
        document.getElementById("import-record-count").textContent = this.importRecords.length;
        document.getElementById("import-preview").classList.remove("hidden");
        document.getElementById("btn-import").disabled = this.importRecords.length === 0;
      } catch (err) { Utils.showToast("Gagal membaca file: " + err.message, "error"); }
    };
    reader.readAsText(file);
  },

  parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = this.parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const record = {};
      headers.forEach((h, i) => { record[h.trim()] = values[i] || ''; });
      return record;
    });
  },

  parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
      else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += c; }
    }
    result.push(current.trim());
    return result;
  },

  parseJSON(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("JSON harus berupa array");
    return data;
  },

  async importGuests() {
    if (this.importRecords.length === 0) return;

    const btn = document.getElementById("btn-import");
    btn.disabled = true; btn.textContent = "Mengimport...";

    const progressDiv = document.getElementById("import-progress");
    const progressBar = document.getElementById("import-progress-bar");
    const progressText = document.getElementById("import-progress-text");
    const resultDiv = document.getElementById("import-result");

    progressDiv.classList.remove("hidden");
    resultDiv.classList.add("hidden");

    let inserted = 0, skipped = 0, errors = 0;
    const total = this.importRecords.length;

    for (let i = 0; i < total; i++) {
      const rec = this.importRecords[i];
      const nama = rec.nama_tamu || rec.NAMA_TAMU || rec.nama || '';
      if (!nama) { skipped++; continue; }

      const progress = Math.round(((i + 1) / total) * 100);
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${i + 1}/${total}`;

      try {
        const result = await API.importGuest(CONFIG.ADMIN.pin, nama,
          rec.instansi_kategori || 'Undangan Umum', rec.no_hp || '', rec.email || '',
          rec.status_rsvp || 'Belum Konfirmasi', parseInt(rec.jumlah_pendamping || 0) || 0,
          rec.qr_code_hash || '', rec.status_kehadiran || 'Belum Hadir',
          rec.status_lokasi || 'Di Luar', rec.waktu_checkin || '',
          rec.komentar_rsvp || '', rec.catatan_admin || '');

        if (result.success) inserted++;
        else if (result.skipped) skipped++;
        else errors++;
      } catch { errors++; }
    }

    progressDiv.classList.add("hidden");
    const resultClass = errors > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800';
    resultDiv.className = `mb-4 p-3 rounded-lg border ${resultClass}`;
    resultDiv.innerHTML = `<p class="font-semibold mb-2">Import Selesai!</p><div class="grid grid-cols-3 gap-2 text-sm"><div><span class="font-bold">${inserted}</span> berhasil</div><div><span class="font-bold">${skipped}</span> dilewati</div><div><span class="font-bold">${errors}</span> error</div></div>`;
    resultDiv.classList.remove("hidden");

    btn.disabled = false; btn.textContent = "Import";
    if (inserted > 0) { Utils.showToast(`${inserted} tamu berhasil diimport!`, "success"); await this.loadStats(); await this.loadGuests(); }
  },

  // ===== GUEST DETAIL MODAL =====
  async showGuestDetail(qrHash) {
    const result = await API.getGuest(null, qrHash);
    if (!result.success) { Utils.showToast("Gagal memuat detail tamu", "error"); return; }

    this.currentGuest = result.guest;
    const g = this.currentGuest;

    document.getElementById("guest-modal-content").innerHTML = `
      <div class="space-y-3">
        <div><p class="text-xs text-slate-500">ID Tamu</p><p class="font-mono font-semibold">${g.id_tamu}</p></div>
        <div><p class="text-xs text-slate-500">Nama</p><p class="font-semibold">${g.nama_tamu}</p></div>
        <div><p class="text-xs text-slate-500">Kategori</p><p>${g.instansi_kategori}</p></div>
        <div><p class="text-xs text-slate-500">No. HP</p><p>${g.no_hp || "-"}</p></div>
        <div><p class="text-xs text-slate-500">Email</p><p>${g.email || "-"}</p></div>
        <div class="flex gap-4">
          <div class="flex-1"><p class="text-xs text-slate-500">Status RSVP</p><p>${Utils.getRSVPBadge(g.status_rsvp)}</p></div>
          <div class="flex-1"><p class="text-xs text-slate-500">Pendamping</p><p class="font-semibold">${g.jumlah_pendamping}</p></div>
        </div>
        <div class="flex gap-4">
          <div class="flex-1"><p class="text-xs text-slate-500">Kehadiran</p><p>${Utils.getKehadiranBadge(g.status_kehadiran)}</p></div>
          <div class="flex-1"><p class="text-xs text-slate-500">Lokasi</p><p>${Utils.getLokasiBadge(g.status_lokasi)}</p></div>
        </div>
        ${g.waktu_checkin ? `<div><p class="text-xs text-slate-500">Waktu Check-in</p><p class="text-sm">${Utils.formatDate(g.waktu_checkin)}</p></div>` : ""}
        ${g.komentar_rsvp ? `<div><p class="text-xs text-slate-500">Komentar Tamu</p><p class="text-sm bg-slate-50 p-2 rounded">"${g.komentar_rsvp}"</p></div>` : ""}
        <div>
          <p class="text-xs text-slate-500">Catatan Admin</p>
          <textarea id="admin-note-input" class="form-input text-sm" rows="2" placeholder="Tambah catatan...">${g.catatan_admin || ""}</textarea>
          <button class="btn btn-primary text-xs mt-2" onclick="Admin.saveAdminNote()">Simpan Catatan</button>
        </div>
      </div>
    `;

    const checkinBtn = document.getElementById("modal-checkin-btn");
    const checkoutBtn = document.getElementById("modal-checkout-btn");
    const returnBtn = document.getElementById("modal-return-btn");

    if (g.status_kehadiran === "Sudah Hadir" && g.status_lokasi === "Di Dalam") {
      checkinBtn.classList.add("hidden"); checkoutBtn.classList.remove("hidden"); returnBtn.classList.add("hidden");
    } else if (g.status_lokasi === "Di Luar") {
      checkinBtn.classList.add("hidden"); checkoutBtn.classList.add("hidden"); returnBtn.classList.remove("hidden");
    } else {
      checkinBtn.classList.remove("hidden"); checkoutBtn.classList.add("hidden"); returnBtn.classList.add("hidden");
    }

    document.getElementById("guest-modal").classList.remove("hidden");
  },

  closeModal() { document.getElementById("guest-modal").classList.add("hidden"); this.currentGuest = null; },

  async modalCheckIn() {
    if (!this.currentGuest) return;
    const result = await API.checkIn(this.currentGuest.qr_code_hash);
    if (result.success) { Utils.showToast(`Check-in: ${this.currentGuest.nama_tamu}`, "success"); Utils.playSound("success"); this.closeModal(); await this.loadStats(); await this.loadGuests(); }
    else Utils.showToast(result.message, "error");
  },

  async modalCheckOut() {
    if (!this.currentGuest) return;
    const result = await API.checkOut(this.currentGuest.qr_code_hash);
    if (result.success) { Utils.showToast(`${this.currentGuest.nama_tamu} diizinkan keluar`, "warning"); this.closeModal(); await this.loadStats(); await this.loadGuests(); }
    else Utils.showToast(result.message, "error");
  },

  async modalCheckInReturn() {
    if (!this.currentGuest) return;
    const result = await API.checkInReturn(this.currentGuest.qr_code_hash);
    if (result.success) { Utils.showToast(`${this.currentGuest.nama_tamu} masuk kembali`, "success"); Utils.playSound("success"); this.closeModal(); await this.loadStats(); await this.loadGuests(); }
    else Utils.showToast(result.message, "error");
  },

  async saveAdminNote() {
    if (!this.currentGuest) return;
    const note = document.getElementById("admin-note-input").value.trim();
    const result = await API.updateAdminNote(CONFIG.ADMIN.pin, this.currentGuest.qr_code_hash, note);
    if (result.success) { Utils.showToast("Catatan disimpan", "success"); this.currentGuest.catatan_admin = note; }
    else Utils.showToast(result.message, "error");
  },

  // ===== GUESTBOOK (Admin View) =====
  async loadGuestbook() {
    const result = await API.getUcapan();
    const feed = document.getElementById("admin-guestbook-feed");
    const empty = document.getElementById("admin-guestbook-empty");

    if (!result.success || !result.messages || result.messages.length === 0) {
      feed.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    feed.innerHTML = result.messages.map((msg, i) => `
      <div class="guestbook-card" style="animation-delay: ${i * 0.1}s">
        <div class="guestbook-header">
          <div class="guestbook-avatar">${msg.nama.charAt(0).toUpperCase()}</div>
          <div>
            <div class="guestbook-name">${this.escapeHtml(msg.nama)}</div>
            <div class="guestbook-time">${this.formatTime(msg.created_at)}</div>
          </div>
        </div>
        <p class="guestbook-message">"${this.escapeHtml(msg.ucapan)}"</p>
      </div>
    `).join("");
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const diff = Date.now() - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  },
};
