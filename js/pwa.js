/**
 * SMART GROCERY - Progressive Web App (PWA) Handler
 * Mengelola instalasi Add to Home Screen (A2HS) dan Service Worker
 */

const PWAHandler = {
  deferredPrompt: null,

  init() {
    // 1. Daftarkan Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker terdaftar dengan scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker gagal didaftarkan:', err);
          });
      });
    }

    // 2. Tangkap event beforeinstallprompt untuk custom install banner
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.style.display = 'flex';
      }
    });

    // 3. Tangani klik tombol install
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) {
          alert('Untuk memasang di iPhone/Safari: Ketuk tombol Bagikan (Share) lalu pilih "Tambah ke Layar Utama" (Add to Home Screen).');
          return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`[PWA] Keputusan pengguna: ${outcome}`);
        this.deferredPrompt = null;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      });
    }

    // 4. Deteksi apakah sudah terpasang (standalone mode)
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplikasi Smart Grocery berhasil dipasang ke Home Screen!');
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    });

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    }
  }
};

window.PWAHandler = PWAHandler;
