/**
 * ENVITATION - Guestbook Logic
 * Handles guestbook feed display and submission
 */

const Guestbook = {
  messages: [],
  refreshInterval: null,

  init() {
    this.loadMessages();
    this.startAutoRefresh();
  },

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadMessages(true);
    }, 30000);
  },

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  async loadMessages(silent = false) {
    const result = await API.getUcapan();

    if (!result.success) {
      if (!silent) {
        document.getElementById("guestbook-feed").innerHTML = `
          <div class="text-center py-8 text-red-400">
            <p>Gagal memuat ucapan</p>
          </div>
        `;
      }
      return;
    }

    this.messages = result.messages || [];
    this.renderFeed();
  },

  renderFeed() {
    const feed = document.getElementById("guestbook-feed");
    const empty = document.getElementById("guestbook-empty");

    if (this.messages.length === 0) {
      feed.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");

    feed.innerHTML = this.messages.map((msg, i) => `
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

  async submit() {
    if (!RSVP.guest) {
      Utils.showToast("Silakan verifikasi undangan terlebih dahulu", "warning");
      return;
    }

    const message = document.getElementById("guestbook-message").value.trim();

    if (!message) {
      Utils.showToast("Tulis ucapan terlebih dahulu", "warning");
      return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> Mengirim...';

    const result = await API.addUcapan(
      RSVP.guest.id_tamu,
      RSVP.guest.nama_tamu,
      message
    );

    if (result.success) {
      Utils.showToast("Ucapan berhasil dikirim!", "success");
      document.getElementById("guestbook-message").value = "";
      await this.loadMessages();
    } else {
      Utils.showToast(result.message || "Gagal mengirim ucapan", "error");
    }

    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
      Kirim Ucapan
    `;
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },
};
