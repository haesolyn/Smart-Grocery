/**
 * SMART GROCERY - Progressive Web App (PWA) Handler
 * Mengelola instalasi Add to Home Screen (A2HS) dan Service Worker
 */

const PWAHandler = {
  deferredPrompt: null,
  DISMISS_KEY: 'sg_pwa_banner_dismissed',

  isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  },

  isIOSBrowser() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  hideInstallUI() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  },

  showInstallUI() {
    if (this.isStandaloneMode()) {
      this.hideInstallUI();
      return;
    }

    const banner = document.getElementById('pwa-install-banner');
    const isDismissed = localStorage.getItem(this.DISMISS_KEY) === '1';

    if (banner && !isDismissed && this.deferredPrompt) {
      banner.style.display = 'flex';
    }
    if (window.App && typeof App.initLucideIcons === 'function') {
      App.initLucideIcons();
    }
  },

  async triggerInstall() {
    if (!this.deferredPrompt) {
      if (window.App && typeof App.showToast === 'function') {
        App.showToast('📱 Pasang di iPhone: Ketuk Bagikan lalu "Tambah ke Layar Utama"');
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] Keputusan pengguna: ${outcome}`);
    this.deferredPrompt = null;
    this.hideInstallUI();
  },

  init() {
    // 1. Daftarkan Service Worker dengan auto-update
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker terdaftar dengan scope:', reg.scope);
            reg.update();
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker gagal didaftarkan:', err);
          });
      });
    }

    // 2. Tangkap event beforeinstallprompt untuk custom install banner & tombol di Anggaran
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallUI();
    });

    // 3. Tangani klik tombol install
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.addEventListener('click', () => this.triggerInstall());
    }

    // 4. Tangani klik tombol tutup banner
    const dismissBtn = document.getElementById('btn-pwa-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        localStorage.setItem(this.DISMISS_KEY, '1');
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      });
    }

    // 5. Deteksi apakah sudah terpasang (standalone mode) atau iOS Safari
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplikasi Smart Grocery berhasil dipasang ke Home Screen!');
      this.deferredPrompt = null;
      this.hideInstallUI();
    });

    if (this.isStandaloneMode()) {
      this.hideInstallUI();
    } else if (this.isIOSBrowser()) {
      this.showInstallUI();
    }
  }
};

window.PWAHandler = PWAHandler;
