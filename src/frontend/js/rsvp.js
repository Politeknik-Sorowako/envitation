/**
 * ENVITATION - RSVP Logic
 * Handles verification, countdown, form, submit, and QR rendering
 */

const RSVP = {
  guest: null,
  countdownInterval: null,

  init() {
    this.populateEventDetails();
    this.startCountdown();
    this.setupPendampingToggle();
    this.checkUrlParam();
  },

  populateEventDetails() {
    const e = CONFIG.EVENT;
    document.getElementById("penyelenggara").textContent = e.penyelenggara;
    document.getElementById("subjek").textContent = e.subjek;
    document.getElementById("deskripsi").textContent = e.deskripsi;
    document.getElementById("tanggal").textContent = `${e.tanggal} • ${e.waktu}`;
    document.getElementById("waktu").textContent = e.waktu;
    document.getElementById("tempat").textContent = e.tempat;
    document.getElementById("dresscode").textContent = e.dresscode;
    document.getElementById("map-embed").src = e.mapsEmbedUrl;
  },

  startCountdown() {
    const target = new Date(CONFIG.EVENT.tanggalISO).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        document.getElementById("days").textContent = "00";
        document.getElementById("hours").textContent = "00";
        document.getElementById("minutes").textContent = "00";
        document.getElementById("seconds").textContent = "00";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById("days").textContent = String(days).padStart(2, "0");
      document.getElementById("hours").textContent = String(hours).padStart(2, "0");
      document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
      document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
    };

    update();
    this.countdownInterval = setInterval(update, 1000);
  },

  setupPendampingToggle() {
    const radios = document.querySelectorAll('input[name="rsvp-status"]');
    const field = document.getElementById("pendamping-field");

    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        if (radio.value === "Hadir" || radio.value === "Tentatif") {
          field.classList.remove("hidden");
        } else {
          field.classList.add("hidden");
        }
      });
    });
  },

  async checkUrlParam() {
    const id = Utils.getQueryParam("id");
    if (id) {
      document.getElementById("input-id").value = id;
      await this.verifyGuest();
    } else {
      this.hideLoading();
    }
  },

  hideLoading() {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("main-content").classList.remove("hidden");
  },

  async verifyGuest() {
    const btn = document.getElementById("btn-verify");
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner w-5 h-5 border-2"></div> Memverifikasi...';

    const id = document.getElementById("input-id").value.trim();
    const nama = document.getElementById("input-nama").value.trim();
    const hp = document.getElementById("input-hp").value.trim();

    if (!id && (!nama || !hp)) {
      Utils.showToast("Masukkan ID undangan atau Nama + No HP", "warning");
      btn.disabled = false;
      btn.textContent = "Verifikasi & Buka Undangan";
      return;
    }

    const result = await API.verify(id || null, nama || null, hp || null);

    if (result.success) {
      this.guest = result.guest;
      document.getElementById("verify-error").classList.add("hidden");
      this.showInvitation();
      Utils.showToast(`Selamat datang, ${this.guest.nama_tamu}!`, "success");
    } else {
      document.getElementById("verify-error").classList.remove("hidden");
      document.getElementById("verify-error-msg").textContent = result.message;
      Utils.showToast(result.message, "error");
    }

    btn.disabled = false;
    btn.textContent = "Verifikasi & Buka Undangan";
  },

  showInvitation() {
    document.getElementById("verify-section").classList.add("hidden");
    document.getElementById("invitation-section").classList.remove("hidden");
    document.getElementById("rsvp-section").classList.remove("hidden");

    document.getElementById("guest-name").textContent = this.guest.nama_tamu;
    document.getElementById("guest-category").textContent = this.guest.instansi_kategori;

    if (this.guest.jumlah_pendamping > 0) {
      document.getElementById("pendamping-count").value = this.guest.jumlah_pendamping;
    }

    document.getElementById("invitation-section").scrollIntoView({ behavior: "smooth" });
  },

  async submitRSVP() {
    const selectedStatus = document.querySelector('input[name="rsvp-status"]:checked');
    if (!selectedStatus) {
      Utils.showToast("Pilih status kehadiran Anda", "warning");
      return;
    }

    const btn = document.getElementById("btn-submit-rsvp");
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner w-5 h-5 border-2"></div> Menyimpan...';

    const status = selectedStatus.value;
    const pendamping = document.getElementById("pendamping-field").classList.contains("hidden")
      ? 0
      : parseInt(document.getElementById("pendamping-count").value) || 0;
    const komentar = document.getElementById("komentar").value.trim();

    const result = await API.submitRSVP(this.guest.id_tamu, status, pendamping, komentar);

    if (result.success) {
      this.guest.status_rsvp = result.status_rsvp;
      this.guest.jumlah_pendamping = pendamping;
      this.guest.komentar_rsvp = komentar;
      this.guest.qr_code_hash = result.qr_code_hash;

      Utils.showToast("Konfirmasi berhasil disimpan!", "success");
      this.renderECard();
    } else {
      Utils.showToast(result.message, "error");
    }

    btn.disabled = false;
    btn.textContent = "Kirim Konfirmasi";
  },

  renderECard() {
    document.getElementById("rsvp-section").classList.add("hidden");
    document.getElementById("ecard-section").classList.remove("hidden");

    document.getElementById("ec-event-subjek").textContent = CONFIG.EVENT.subjek;
    document.getElementById("ec-guest-name").textContent = this.guest.nama_tamu;
    document.getElementById("ec-guest-category").textContent = this.guest.instansi_kategori;
    document.getElementById("ec-guest-id").textContent = `ID: ${this.guest.id_tamu}`;
    document.getElementById("ec-rsvp-badge").innerHTML = Utils.getRSVPBadge(this.guest.status_rsvp);
    document.getElementById("ec-event-detail").textContent = `${CONFIG.EVENT.tanggal} • ${CONFIG.EVENT.tempat}`;

    const qrContainer = document.getElementById("ec-qr-code");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: this.guest.qr_code_hash,
      width: 180,
      height: 180,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });

    document.getElementById("ecard-section").scrollIntoView({ behavior: "smooth" });
  },
};
