/**
 * SMART GROCERY - Firebase Cloud Sync & Google Auth Integration
 * Project ID: gro-pilot
 * Database: Cloud Firestore (Per-User Realtime Isolation & Offline Persistence)
 * Authentication: Google Sign-In (Firebase Auth)
 */

const firebaseConfig = {
  apiKey: "AIzaSyAFJAdYFa72nqzCFzI6RFztcuvwiU8rBbk",
  authDomain: "gro-pilot.firebaseapp.com",
  projectId: "gro-pilot",
  storageBucket: "gro-pilot.firebasestorage.app",
  messagingSenderId: "1001272668381",
  appId: "1:1001272668381:web:17f27994a1ea4919bb6b34"
};

const FirebaseSync = {
  config: firebaseConfig,
  db: null,
  app: null,
  auth: null,
  currentUser: null,
  isInitialized: false,
  isConnected: false,
  isSyncing: false,
  lastSyncedAt: null,
  clientId: 'client_' + Math.random().toString(36).substring(2, 9),
  unsubscribeSnapshot: null,
  syncDebounceTimer: null,
  HOUSEHOLD_KEY: 'sg_household_id',
  DEFAULT_HOUSEHOLD: 'troli_utama',

  // Ambil ID / Kode Sinkronisasi Ruang Tamu (Jika belum login)
  getHouseholdId() {
    let id = localStorage.getItem(this.HOUSEHOLD_KEY);
    if (!id || id.trim() === '') {
      id = this.DEFAULT_HOUSEHOLD;
      localStorage.setItem(this.HOUSEHOLD_KEY, id);
    }
    return id.trim();
  },

  setHouseholdId(newId) {
    if (!newId || newId.trim() === '') return false;
    const cleanId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    localStorage.setItem(this.HOUSEHOLD_KEY, cleanId);
    console.log('[FirebaseSync] Household ID diubah ke:', cleanId);

    // Restart snapshot listener jika sedang mode guest/ruang bersama
    if (!this.currentUser) {
      this.startRealtimeListener();
    }
    return cleanId;
  },

  // Mendapatkan dokumen referensi Firestore saat ini (HANYA jika user sudah LOGIN Google)
  getTargetDocRef() {
    if (!this.db) return null;
    if (this.currentUser && this.currentUser.uid) {
      // PER-USER: Setiap user memiliki dokumen tersendiri yang terisolasi aman
      return this.db.collection('users').doc(this.currentUser.uid);
    }
    // GUEST / BELUM LOGIN: Jangan konek / jangan sinkron ke cloud sama sekali!
    return null;
  },

  // Inisialisasi Firebase, Firestore & Auth
  init() {
    if (this.isInitialized) return;

    if (typeof firebase === 'undefined') {
      console.warn('[FirebaseSync] Firebase SDK belum termuat. Berjalan dalam mode LocalStorage murni.');
      this.updateStatusBadge('offline', 'Firebase SDK tidak tersedia');
      return;
    }

    try {
      console.log('[FirebaseSync] Menginisialisasi Firebase (gro-pilot) dengan Auth...');
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.app();
      }

      this.db = firebase.firestore();
      this.auth = firebase.auth();

      // Aktifkan offline persistence jika didukung browser
      this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[FirebaseSync] Multiple tabs open, persistence enabled in first tab only.');
        } else if (err.code === 'unimplemented') {
          console.warn('[FirebaseSync] Browser tidak mendukung offline persistence.');
        }
      });

      this.isInitialized = true;
      this.updateStatusBadge('online', 'Terhubung ke Firebase (gro-pilot)');

      // Handle redirect login result jika popup diblokir browser
      this.auth.getRedirectResult().then((result) => {
        if (result && result.user) {
          console.log('[FirebaseSync] Berhasil masuk via redirect:', result.user.email);
        }
      }).catch((err) => {
        console.warn('[FirebaseSync] Redirect result error:', err);
      });

      // Pasang Auth State Listener
      this.auth.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });

      // Pasang listener status koneksi browser
      window.addEventListener('online', () => {
        console.log('[FirebaseSync] Browser Online.');
        this.updateStatusBadge('online', 'Terhubung ke Firebase');
        this.pushToCloud();
      });

      window.addEventListener('offline', () => {
        console.log('[FirebaseSync] Browser Offline.');
        this.updateStatusBadge('offline', 'Offline (Disimpan di HP/PC)');
      });

    } catch (err) {
      console.error('[FirebaseSync] Inisialisasi gagal:', err);
      this.updateStatusBadge('error', 'Gagal inisialisasi: ' + err.message);
    }
  },

  // Handler saat status login user berubah
  async handleAuthStateChange(user) {
    this.currentUser = user;
    this.updateAuthUI(user);

    if (user) {
      console.log(`[FirebaseSync] 👤 Login sebagai User: ${user.displayName || user.email} (UID: ${user.uid})`);
      this.updateStatusBadge('online', `Akun: ${user.displayName || user.email}`);

      // Mulai realtime sync HANYA untuk user yang sudah login
      this.startRealtimeListener();

      if (window.App && typeof App.showToast === 'function') {
        App.showToast(`👋 Masuk sebagai <strong>${user.displayName || user.email}</strong>`, 'success');
      }
    } else {
      console.log('[FirebaseSync] Mode Lokal Perangkat (Belum Login). Data tersimpan mandiri di HP/Laptop ini saja.');
      this.updateStatusBadge('offline', 'Mode Lokal Perangkat');

      // Hentikan listener realtime agar tidak terhubung ke perangkat lain
      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
        this.unsubscribeSnapshot = null;
      }
    }
  },

  // Login dengan Google
  async loginWithGoogle() {
    if (!this.auth) {
      throw new Error('Firebase Auth belum siap.');
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      this.updateStatusBadge('syncing', 'Menghubungkan ke Google...');
      const result = await this.auth.signInWithPopup(provider);
      console.log('[FirebaseSync] Google Sign-In Sukses:', result.user.email);
      return result.user;
    } catch (error) {
      console.warn('[FirebaseSync] Popup Google gagal/ditutup:', error.code, error.message);
      if (error.code === 'auth/popup-blocked') {
        console.log('[FirebaseSync] Mengalihkan ke redirect sign-in...');
        return this.auth.signInWithRedirect(provider);
      }
      throw error;
    }
  },

  // Logout Akun
  async logout() {
    if (!this.auth) return;
    try {
      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
        this.unsubscribeSnapshot = null;
      }
      await this.auth.signOut();
      this.currentUser = null;
      this.updateAuthUI(null);
      if (window.App && typeof App.showToast === 'function') {
        App.showToast('Berhasil keluar dari akun Google', 'info');
      }
    } catch (err) {
      console.error('[FirebaseSync] Logout gagal:', err);
    }
  },

  // Update Tampilan UI Akun (Header, Modal Sync, dan Tab Anggaran)
  updateAuthUI(user) {
    const loggedOutCards = document.querySelectorAll('.auth-logged-out');
    const loggedInCards = document.querySelectorAll('.auth-logged-in');
    const headerAvatar = document.getElementById('header-user-avatar');
    const homeGuest = document.getElementById('home-auth-guest');
    const homeUser = document.getElementById('home-auth-user');

    if (user) {
      // Sembunyikan form login, tampilkan profil user
      loggedOutCards.forEach(el => el.style.display = 'none');
      loggedInCards.forEach(el => el.style.display = 'block');
      if (homeGuest) homeGuest.style.display = 'none';
      if (homeUser) homeUser.style.display = 'flex';

      // Update data profil di UI
      document.querySelectorAll('.user-display-name').forEach(el => {
        el.textContent = user.displayName || 'Pengguna Google';
      });

      document.querySelectorAll('.user-display-email').forEach(el => {
        el.textContent = user.email || '';
      });

      document.querySelectorAll('.user-uid-short').forEach(el => {
        el.textContent = user.uid.substring(0, 12) + '...';
      });

      // Update foto profil atau inisial
      const photoUrls = user.photoURL;
      const initial = (user.displayName || user.email || 'U')[0].toUpperCase();

      document.querySelectorAll('.user-profile-photo').forEach(img => {
        if (photoUrls) {
          img.src = photoUrls;
          img.style.display = 'block';
        } else {
          img.style.display = 'none';
        }
      });

      document.querySelectorAll('.user-avatar-fallback').forEach(el => {
        el.textContent = initial;
        el.style.display = photoUrls ? 'none' : 'flex';
      });

      // Header button avatar
      if (headerAvatar) {
        if (photoUrls) {
          headerAvatar.innerHTML = `<img src="${photoUrls}" alt="${user.displayName || 'User'}" class="header-avatar-img"><span class="avatar-online-dot"></span>`;
        } else {
          headerAvatar.innerHTML = `<div class="header-avatar-initial">${initial}</div><span class="avatar-online-dot"></span>`;
        }
      }
    } else {
      // Tampilkan tombol Google Sign-In
      loggedOutCards.forEach(el => el.style.display = 'block');
      loggedInCards.forEach(el => el.style.display = 'none');
      if (homeGuest) homeGuest.style.display = 'flex';
      if (homeUser) homeUser.style.display = 'none';

      // Reset avatar header
      if (headerAvatar) {
        headerAvatar.innerHTML = `<i data-lucide="user" style="width: 18px; height: 18px;"></i>`;
        if (window.App && typeof App.initLucideIcons === 'function') {
          App.initLucideIcons();
        }
      }
    }

    if (window.App && typeof App.initLucideIcons === 'function') {
      App.initLucideIcons();
    }
  },

  // Realtime Snapshot Listener: HANYA aktif jika user sudah login
  startRealtimeListener() {
    if (!this.db) return;

    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    // JIKA BELUM LOGIN, JANGAN PERNAH PASANG LISTENER CLOUD
    if (!this.currentUser || !this.currentUser.uid) {
      console.log('[FirebaseSync] Belum login: Listener Cloud dimatikan (Penyimpanan Lokal Mandiri).');
      return;
    }

    const docRef = this.getTargetDocRef();
    if (!docRef) return;

    const pathDesc = `users/${this.currentUser.uid} (${this.currentUser.email})`;
    console.log(`[FirebaseSync] Memulai realtime listener pada: ${pathDesc}`);

    this.unsubscribeSnapshot = docRef.onSnapshot({ includeMetadataChanges: false }, (doc) => {
      this.isConnected = true;

      if (!doc.exists) {
        console.log(`[FirebaseSync] Data cloud belum ada pada ${pathDesc}. Mengunggah data awal lokal...`);
        this.pushToCloud(true);
        return;
      }

      const data = doc.data();
      if (!data) return;

      // Cegah loop jika perubahan berasal dari aksi tulis client lokal ini
      if (data.updatedBy === this.clientId) {
        this.lastSyncedAt = new Date();
        this.updateStatusBadge('online', this.currentUser ? 'Tersimpan di Akun Google' : 'Sinkron dengan Cloud');
        return;
      }

      console.log('[FirebaseSync] Menerima data terbaru dari Cloud Firestore:', data);

      let hasChanged = false;

      // 1. Update Keranjang Belanja
      if (Array.isArray(data.cartItems)) {
        const currentCart = localStorage.getItem('sg_cart_items');
        const newCartStr = JSON.stringify(data.cartItems);
        if (currentCart !== newCartStr) {
          localStorage.setItem('sg_cart_items', newCartStr);
          hasChanged = true;
        }
      }

      // 2. Update Budget Cap
      if (data.budgetCap !== undefined && data.budgetCap !== null) {
        const currentCap = localStorage.getItem('sg_budget_cap');
        if (String(currentCap) !== String(data.budgetCap)) {
          localStorage.setItem('sg_budget_cap', data.budgetCap);
          hasChanged = true;
        }
      }

      // 3. Update Riwayat Belanja
      if (Array.isArray(data.shoppingHistory)) {
        const currentHist = localStorage.getItem('sg_shopping_history');
        const newHistStr = JSON.stringify(data.shoppingHistory);
        if (currentHist !== newHistStr) {
          localStorage.setItem('sg_shopping_history', newHistStr);
          hasChanged = true;
        }
      }

      this.lastSyncedAt = new Date();
      this.updateStatusBadge('online', this.currentUser ? 'Data Akun Google Terkini' : 'Data cloud terbaru diterapkan');

      // Render ulang tampilan jika ada perubahan data dari cloud
      if (hasChanged && window.App) {
        console.log('[FirebaseSync] Memperbarui UI dari data akun cloud...');
        if (typeof App.renderCart === 'function') App.renderCart();
        if (typeof App.renderSafetyCap === 'function') App.renderSafetyCap();
        if (typeof App.renderHistory === 'function') App.renderHistory();
        if (typeof App.updateStats === 'function') App.updateStats();

        if (typeof App.showToast === 'function') {
          const userText = this.currentUser ? `Akun Google (${this.currentUser.displayName || 'User'})` : 'Cloud';
          App.showToast(`☁️ Troli disinkronkan dari ${userText}`, 'success');
        }
      }
    }, (error) => {
      console.error('[FirebaseSync] Firestore Snapshot Error:', error);
      this.isConnected = false;
      this.updateStatusBadge('error', 'Koneksi Firestore: ' + (error.message || 'Error'));
    });
  },

  // Push Data Lokal ke Dokumen Firestore (Debounced 350ms) - HANYA jika sudah LOGIN
  pushToCloud(immediate = false) {
    if (!this.db) return;
    if (!this.currentUser || !this.currentUser.uid) return; // JANGAN PUSH JIKA BELUM LOGIN!

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    const executePush = async () => {
      try {
        this.isSyncing = true;
        this.updateStatusBadge('syncing', 'Menyimpan ke Cloud...');

        const docRef = this.getTargetDocRef();
        if (!docRef) return;

        // Ambil data lokal
        let cartItems = [];
        try {
          cartItems = JSON.parse(localStorage.getItem('sg_cart_items') || '[]');
        } catch (e) {
          cartItems = [];
        }

        let budgetCap = 500000;
        try {
          budgetCap = parseFloat(localStorage.getItem('sg_budget_cap')) || 500000;
        } catch (e) {
          budgetCap = 500000;
        }

        let shoppingHistory = [];
        try {
          shoppingHistory = JSON.parse(localStorage.getItem('sg_shopping_history') || '[]');
        } catch (e) {
          shoppingHistory = [];
        }

        const payload = {
          cartItems: cartItems,
          budgetCap: budgetCap,
          shoppingHistory: shoppingHistory,
          updatedBy: this.clientId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          deviceInfo: navigator.userAgent.substring(0, 80),
          userId: this.currentUser ? this.currentUser.uid : null,
          userEmail: this.currentUser ? this.currentUser.email : null,
          userName: this.currentUser ? (this.currentUser.displayName || 'User') : 'Guest',
          userPhoto: this.currentUser ? this.currentUser.photoURL : null
        };

        await docRef.set(payload, { merge: true });

        this.isConnected = true;
        this.isSyncing = false;
        this.lastSyncedAt = new Date();
        const successMsg = this.currentUser ? 'Tersimpan di Akun Google Anda' : 'Tersimpan di Cloud Firebase';
        this.updateStatusBadge('online', successMsg);
        console.log(`[FirebaseSync] Berhasil menyimpan data ke ${docRef.path}!`);
      } catch (err) {
        this.isSyncing = false;
        console.error('[FirebaseSync] Gagal push ke cloud:', err);
        this.updateStatusBadge('error', 'Gagal simpan ke cloud: ' + err.message);
      }
    };

    if (immediate) {
      executePush();
    } else {
      this.syncDebounceTimer = setTimeout(executePush, 350);
    }
  },

  // Trigger sync saat keranjang belanja berubah (Hanya jika user login)
  syncCart(items) {
    if (!this.currentUser) return;
    this.pushToCloud(false);
  },

  // Trigger sync saat batas budget berubah (Hanya jika user login)
  syncBudget(cap) {
    if (!this.currentUser) return;
    this.pushToCloud(false);
  },

  // Trigger sync saat riwayat transaksi bertambah (Hanya jika user login)
  syncHistory(history) {
    if (!this.currentUser) return;
    this.pushToCloud(true);
  },

  // Tes Koneksi / Ping Firestore
  async testConnection() {
    if (!this.db) {
      return { success: false, message: 'Firebase belum terinisialisasi' };
    }

    const start = Date.now();
    try {
      this.updateStatusBadge('syncing', 'Mengetes koneksi Firestore...');
      const pingRef = this.db.collection('groceries').doc('_ping_test');
      await pingRef.set({
        pingAt: firebase.firestore.FieldValue.serverTimestamp(),
        clientId: this.clientId,
        userEmail: this.currentUser ? this.currentUser.email : 'guest'
      }, { merge: true });

      const latency = Date.now() - start;
      this.isConnected = true;
      const target = this.currentUser ? `Akun ${this.currentUser.email}` : 'gro-pilot';
      this.updateStatusBadge('online', `Terhubung (${latency}ms)`);
      return { success: true, latency: latency, message: `Berhasil terhubung ke ${target} (${latency}ms)` };
    } catch (err) {
      this.isConnected = false;
      this.updateStatusBadge('error', err.message);
      return { success: false, error: err, message: `Gagal: ${err.message}` };
    }
  },

  // Update Status UI (Badge di header dan Modal)
  updateStatusBadge(status, message) {
    const dot = document.getElementById('cloud-status-dot');
    const label = document.getElementById('cloud-status-text');
    const btn = document.getElementById('btn-open-cloud-sync');
    const lastSyncEl = document.getElementById('cloud-last-sync-time');

    if (dot) {
      dot.className = 'cloud-status-dot ' + status;
    }

    if (label) {
      label.textContent = message || (status === 'online' ? 'Online' : 'Offline');
      label.className = 'cloud-status-badge ' + status;
    }

    if (btn) {
      btn.title = `Firebase (gro-pilot): ${message}`;
    }

    if (lastSyncEl && this.lastSyncedAt) {
      const timeStr = this.lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      lastSyncEl.textContent = `Terakhir sinkron: ${timeStr}`;
    }
  }
};

window.FirebaseSync = FirebaseSync;
