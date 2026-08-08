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

  downloadAsPNG(elementId, filename = "ecard") {
    const element = document.getElementById(elementId);
    if (!element) return;

    const textElements = element.querySelectorAll(".text-slate-400, .text-slate-500, .text-slate-300");
    const originalStyles = [];
    textElements.forEach(el => {
      originalStyles.push(el.style.cssText);
      el.style.color = "#1e293b";
      el.style.opacity = "1";
    });

    const qrCanvas = element.querySelector("#ec-qr-code canvas");
    let qrImgEl = null;
    if (qrCanvas) {
      qrImgEl = document.createElement("img");
      qrImgEl.src = qrCanvas.toDataURL("image/png");
      qrImgEl.style.width = "100%";
      qrImgEl.style.height = "100%";
      qrImgEl.style.display = "block";
      qrCanvas.style.visibility = "hidden";
      qrCanvas.parentNode.insertBefore(qrImgEl, qrCanvas);
    }

    const logoEl = element.querySelector(".ecard-logo");
    const logoOriginal = { filter: "", animation: "" };
    if (logoEl) {
      logoOriginal.filter = logoEl.style.filter;
      logoOriginal.animation = logoEl.style.animation;
      logoEl.style.filter = "none";
      logoEl.style.animation = "none";
    }

    html2canvas(element, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      imageSmoothingEnabled: false,
      logging: false,
    }).then(canvas => {
      textElements.forEach((el, i) => {
        el.style.cssText = originalStyles[i];
      });
      if (qrImgEl) qrImgEl.remove();
      if (qrCanvas) qrCanvas.style.visibility = "";
      if (logoEl) {
        logoEl.style.filter = logoOriginal.filter;
        logoEl.style.animation = logoOriginal.animation;
      }

      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      this.showToast("E-Card berhasil diunduh!", "success");
    }).catch(() => {
      textElements.forEach((el, i) => {
        el.style.cssText = originalStyles[i];
      });
      if (qrImgEl) qrImgEl.remove();
      if (qrCanvas) qrCanvas.style.visibility = "";
      if (logoEl) {
        logoEl.style.filter = logoOriginal.filter;
        logoEl.style.animation = logoOriginal.animation;
      }
      this.showToast("Gagal mengunduh E-Card", "error");
    });
  },

  downloadAsPDF(elementId, filename = "ecard") {
    const element = document.getElementById(elementId);
    if (!element) return;

    const textElements = element.querySelectorAll(".text-slate-400, .text-slate-500, .text-slate-300");
    const originalStyles = [];
    textElements.forEach(el => {
      originalStyles.push(el.style.cssText);
      el.style.color = "#1e293b";
      el.style.opacity = "1";
    });

    const qrCanvas = element.querySelector("#ec-qr-code canvas");
    let qrImgEl = null;
    if (qrCanvas) {
      qrImgEl = document.createElement("img");
      qrImgEl.src = qrCanvas.toDataURL("image/png");
      qrImgEl.style.width = "100%";
      qrImgEl.style.height = "100%";
      qrImgEl.style.display = "block";
      qrCanvas.style.visibility = "hidden";
      qrCanvas.parentNode.insertBefore(qrImgEl, qrCanvas);
    }

    const logoEl = element.querySelector(".ecard-logo");
    const logoOriginal = { filter: "", animation: "" };
    if (logoEl) {
      logoOriginal.filter = logoEl.style.filter;
      logoOriginal.animation = logoEl.style.animation;
      logoEl.style.filter = "none";
      logoEl.style.animation = "none";
    }

    html2canvas(element, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      imageSmoothingEnabled: false,
      logging: false,
    }).then(canvas => {
      textElements.forEach((el, i) => {
        el.style.cssText = originalStyles[i];
      });
      if (qrImgEl) qrImgEl.remove();
      if (qrCanvas) qrCanvas.style.visibility = "";
      if (logoEl) {
        logoEl.style.filter = logoOriginal.filter;
        logoEl.style.animation = logoOriginal.animation;
      }

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jspdf.jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      pdf.save(`${filename}.pdf`);
      this.showToast("E-Card PDF berhasil diunduh!", "success");
    }).catch(() => {
      textElements.forEach((el, i) => {
        el.style.cssText = originalStyles[i];
      });
      if (qrImgEl) qrImgEl.remove();
      if (qrCanvas) qrCanvas.style.visibility = "";
      if (logoEl) {
        logoEl.style.filter = logoOriginal.filter;
        logoEl.style.animation = logoOriginal.animation;
      }
      this.showToast("Gagal mengunduh E-Card", "error");
    });
  },
};
