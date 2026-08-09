/**
 * ENVITATION - Utility Functions
 */

const Utils = {
  showToast(message, type = "info", duration = 3000) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  },

  playSound(type = "success") {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === "success") {
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
    } else if (type === "error") {
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime + 0.15);
    } else if (type === "warning") {
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    }

    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  },

  vibrate(pattern = [100]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  getRSVPBadge(status) {
    const map = {
      "Hadir": '<span class="badge badge-hadir">✅ Hadir</span>',
      "Tentatif": '<span class="badge badge-tentatif">🟡 Tentatif</span>',
      "Tidak Hadir": '<span class="badge badge-tidak-hadir">❌ Tidak Hadir</span>',
      "Belum Konfirmasi": '<span class="badge badge-belum">⚪ Belum</span>',
    };
    return map[status] || '<span class="badge badge-belum">-</span>';
  },

  getKehadiranBadge(status) {
    if (status === "Sudah Hadir") {
      return '<span class="badge badge-sudah-checkin">✅ Check-in</span>';
    }
    return '<span class="badge badge-belum-checkin">⏳ Belum</span>';
  },

  getLokasiBadge(status) {
    if (status === "Di Dalam") {
      return '<span class="badge badge-di-dalam">🟢 Di Dalam</span>';
    }
    if (status === "Di Luar") {
      return '<span class="badge badge-di-luar">🟡 Di Luar</span>';
    }
    return '<span class="badge badge-belum">-</span>';
  },

  showSkeleton(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:80%"></div>
        <div class="skeleton skeleton-card"></div>
      `;
    }
  },

  hideSkeleton(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.querySelectorAll(".skeleton").forEach(s => s.remove());
    }
  },

  getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast("Berhasil disalin!", "success");
    });
  },

  _savePNG(canvas, filename) {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  },

  _savePDF(canvas, filename) {
    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jspdf.jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [105, 148],
    });

    const maxWidth = 105;
    const maxHeight = 148;
    const dpi = 96;
    const imgWidth = (canvas.width * 25.4) / dpi;
    const imgHeight = (canvas.height * 25.4) / dpi;
    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    const finalWidth = imgWidth * scale;
    const finalHeight = imgHeight * scale;

    pdf.addImage(imgData, "PNG", (maxWidth - finalWidth) / 2, (maxHeight - finalHeight) / 2, finalWidth, finalHeight, undefined, "FAST");
    pdf.save(`${filename}.pdf`);
  },

  async _capture(elementId, filename, format) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add("ecard-export");

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const canvas = await html2canvas(element, {
        scale: 4,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll(".ecard-export, .ecard-export *").forEach(el => {
            el.style.opacity = "1";
            el.style.filter = "none";
            el.style.animation = "none";
          });
        },
      });
      if (format === "png") {
        this._savePNG(canvas, filename);
        this.showToast("E-Card berhasil diunduh!", "success");
      } else {
        this._savePDF(canvas, filename);
        this.showToast("E-Card PDF berhasil diunduh!", "success");
      }
    } catch (err) {
      this.showToast("Gagal mengunduh E-Card", "error");
    } finally {
      element.classList.remove("ecard-export");
    }
  },

  downloadAsPNG(elementId, filename = "ecard") {
    this._capture(elementId, filename, "png");
  },

  downloadAsPDF(elementId, filename = "ecard") {
    this._capture(elementId, filename, "pdf");
  },

  getShareUrl(guest) {
    const base = window.location.origin + "/frontend/ecard.html";
    return `${base}?id=${encodeURIComponent(guest.id_tamu)}&qr=${encodeURIComponent(guest.qr_code_hash)}`;
  },

  shareToWhatsApp(guest) {
    if (!guest || !guest.id_tamu) {
      this.showToast("Data tamu tidak ditemukan", "error");
      return;
    }

    const ecardUrl = this.getShareUrl(guest);
    const template = (CONFIG.SHARE && CONFIG.SHARE.messageTemplate) ||
      "🎓 Undangan {EVENT_SUBJECT}\n\nIni E-Card undangan {GUEST_NAME}.\n\n{ECARD_LINK}";

    const applied = template
      .replace(/\{EVENT_SUBJECT\}/g, CONFIG.EVENT.subjek)
      .replace(/\{EVENT_DATE\}/g, CONFIG.EVENT.tanggal)
      .replace(/\{EVENT_LOCATION\}/g, CONFIG.EVENT.tempat)
      .replace(/\{GUEST_NAME\}/g, guest.nama_tamu)
      .replace(/\{ECARD_LINK\}/g, ecardUrl);

    window.open(`https://wa.me/?text=${encodeURIComponent(applied)}`, "_blank");
  },
};
