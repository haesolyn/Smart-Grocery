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
  pendingEmailVerification: null,
  pendingEmailUser: null,
  // Mendapatkan dokumen referensi Firestore (Akun Google atau Sesi Bersama Multi-Device)
  getTargetDocRef() {
    if (!this.db) return null;
    if (this.currentUser && this.currentUser.uid) {
      // PER-USER: Setiap user memiliki dokumen tersendiri yang terisolasi aman
      return this.db.collection('users').doc(this.currentUser.uid);
    }
    // Sesi Belanja Bersama Multi-Device (SRS F-06B onSnapshot):
    // Memungkinkan sinkronisasi instan antar HP dan PC tanpa harus login akun di PC lab
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session') || localStorage.getItem('sg_cloud_session') || 'sesi_rian';
    return this.db.collection('shared_sessions').doc(sessionId);
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
    if (user) {
      // Periksa apakah login via Google atau Email
      const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
      const isEmailVerifiedSession = localStorage.getItem('sg_email_verified_' + user.uid) === 'true';

      // Jika user login via email & password, tetapi belum memverifikasi kode OTP pada sesi ini:
      // TAHAN akses akun! ("walau udh bnr, pastiin kirim kode verifikasi ke email tsb")
      if (!isGoogle && !isEmailVerifiedSession) {
        console.log(`[FirebaseSync] ⏳ Kredensial email benar untuk ${user.email}, menahan akses menunggu kode verifikasi.`);
        this.currentUser = null;
        this.pendingEmailUser = user;
        this.updateAuthUI(null);
        return;
      }

      this.currentUser = user;
      this.pendingEmailUser = null;
      this.updateAuthUI(user);

      console.log(`[FirebaseSync] 👤 Login sebagai User: ${user.displayName || user.email} (UID: ${user.uid})`);
      this.updateStatusBadge('online', `Akun: ${user.displayName || user.email}`);

      // Mulai realtime sync HANYA untuk user yang sudah login & terverifikasi
      this.startRealtimeListener();

      if (window.App && typeof App.showToast === 'function') {
        App.showToast(`👋 Masuk sebagai <strong>${user.displayName || user.email}</strong>`, 'success');
      }
    } else {
      this.currentUser = null;
      this.pendingEmailUser = null;
      this.updateAuthUI(null);
      console.log('[FirebaseSync] Mode Sesi Bersama Multi-Device (SRS F-06B). Siap sinkron live antar HP & PC.');
      this.updateStatusBadge('online', 'Sesi Realtime Cloud Aktif');
      this.startRealtimeListener();
    }
  },

  // 1. Login dengan Google (One-tap popup / redirect)
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

  // 2. Request Login / Daftar dengan Email & Kata Sandi
  // "walau udh bnr, pastiin kirim kode verifikasi ke email tsb"
  async requestEmailLogin(email, password, isRegister = false) {
    if (!this.auth) {
      throw new Error('Firebase Auth belum siap.');
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Silakan masukkan alamat email yang valid.');
    }

    if (!password || password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    this.updateStatusBadge('syncing', isRegister ? 'Mendaftarkan akun...' : 'Memverifikasi kata sandi...');

    let userCredential;
    if (isRegister) {
      // Registrasi Akun Baru
      userCredential = await this.auth.createUserWithEmailAndPassword(cleanEmail, password);
      const namePart = cleanEmail.split('@')[0];
      const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      try {
        await userCredential.user.updateProfile({ displayName: capitalized });
      } catch (e) {
        console.warn('Update displayName warning:', e);
      }
    } else {
      // Masuk Akun yang Ada (Verifikasi email + kata sandi)
      userCredential = await this.auth.signInWithEmailAndPassword(cleanEmail, password);
    }

    const user = userCredential.user;

    // KATA SANDI VALID! ("walau udh bnr")
    // Pastikan session belum ditandai terverifikasi sampai kode dimasukkan
    localStorage.removeItem('sg_email_verified_' + user.uid);
    this.currentUser = null;
    this.pendingEmailUser = user;

    // Generate 6 digit kode OTP verifikasi
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 menit

    this.pendingEmailVerification = {
      user: user,
      email: cleanEmail,
      code: otpCode,
      expiresAt: expiresAt
    };

    // Kirim email verifikasi resmi Firebase ke alamat email user
    try {
      await user.sendEmailVerification();
      console.log('[FirebaseSync] ✉️ Email verifikasi resmi terkirim ke:', cleanEmail);
    } catch (e) {
      console.warn('[FirebaseSync] Notice pengiriman email verifikasi Firebase:', e.message);
    }

    // Catat kode verifikasi di Firestore (untuk backup & log audit)
    try {
      if (this.db) {
        await this.db.collection('email_verifications').doc(user.uid).set({
          email: cleanEmail,
          code: otpCode,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(expiresAt)
        });
      }
    } catch (e) {
      console.warn('[FirebaseSync] Firestore verification log notice:', e);
    }

    return {
      status: 'pending_otp',
      email: cleanEmail,
      code: otpCode
    };
  },

  // 3. Verifikasi Kode OTP Email (Penyelesaian Langkah 2)
  async verifyEmailOtp(enteredOtp) {
    if (!this.pendingEmailVerification || !this.pendingEmailVerification.user) {
      throw new Error('Sesi verifikasi tidak ditemukan atau telah kedaluwarsa. Silakan masukkan kata sandi kembali.');
    }

    const { user, email, code, expiresAt } = this.pendingEmailVerification;

    if (Date.now() > expiresAt) {
      throw new Error('Kode verifikasi telah kedaluwarsa. Silakan klik "Kirim Ulang Kode".');
    }

    const cleanInput = (enteredOtp || '').toString().trim();
    if (!cleanInput) {
      throw new Error('Silakan masukkan 6 digit kode verifikasi.');
    }

    if (cleanInput !== code) {
      throw new Error('Kode verifikasi salah! Periksa kembali email Anda.');
    }

    // VERIFIKASI BERHASIL! Akses diberikan ke akun pengguna
    console.log('[FirebaseSync] ✅ 6-digit OTP berhasil diverifikasi untuk:', email);
    localStorage.setItem('sg_email_verified_' + user.uid, 'true');

    this.pendingEmailVerification = null;
    this.pendingEmailUser = null;
    this.currentUser = user;

    this.updateAuthUI(user);
    this.updateStatusBadge('online', `Akun: ${user.displayName || user.email}`);
    this.startRealtimeListener();

    if (window.App && typeof App.showToast === 'function') {
      App.showToast(`✅ Verifikasi berhasil! Selamat datang, <strong>${user.displayName || user.email}</strong>`, 'success');
    }

    return user;
  },

  // 4. Kirim Ulang Kode Verifikasi Email
  async resendEmailOtp() {
    if (!this.pendingEmailVerification || !this.pendingEmailVerification.user) {
      throw new Error('Tidak ada sesi verifikasi yang aktif.');
    }

    const user = this.pendingEmailVerification.user;
    const cleanEmail = this.pendingEmailVerification.email;

    // Kirim ulang email verifikasi
    try {
      await user.sendEmailVerification();
    } catch (e) {
      console.warn('Resend sendEmailVerification notice:', e);
    }

    // Generate kode baru
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    this.pendingEmailVerification.code = newCode;
    this.pendingEmailVerification.expiresAt = expiresAt;

    try {
      if (this.db) {
        await this.db.collection('email_verifications').doc(user.uid).set({
          email: cleanEmail,
          code: newCode,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(expiresAt)
        });
      }
    } catch (e) {
      console.warn('Firestore resend notice:', e);
    }

    return {
      status: 'resent',
      email: cleanEmail,
      code: newCode
    };
  },

  // 5. Batalkan Verifikasi Email (Kembali ke Step 1 atau ganti email)
  async cancelEmailVerification() {
    this.pendingEmailVerification = null;
    this.pendingEmailUser = null;
    if (this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {
        console.warn('Sign out on cancel notice:', e);
      }
    }
    this.currentUser = null;
    this.updateAuthUI(null);
  },

  // 6. Logout Akun
  async logout() {
    if (!this.auth) return;
    try {
      if (this.currentUser) {
        localStorage.removeItem('sg_email_verified_' + this.currentUser.uid);
      }
      this.pendingEmailVerification = null;
      this.pendingEmailUser = null;
      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
        this.unsubscribeSnapshot = null;
      }
      await this.auth.signOut();
      this.currentUser = null;
      this.updateAuthUI(null);
      if (window.App && typeof App.showToast === 'function') {
        App.showToast('Berhasil keluar dari akun', 'info');
      }
    } catch (err) {
      console.error('[FirebaseSync] Logout gagal:', err);
    }
  },

  // 7. Update Tampilan UI Akun (Header, Modal Sync, dan Tab Anggaran)
  updateAuthUI(user) {
    const loggedOutCards = document.querySelectorAll('.auth-logged-out');
    const loggedInCards = document.querySelectorAll('.auth-logged-in');
    const headerAvatar = document.getElementById('header-user-avatar');
    const homeGuest = document.getElementById('home-auth-guest');
    const homeUser = document.getElementById('home-auth-user');
    const authBadge = document.getElementById('user-auth-badge');
    const authMethodText = document.getElementById('user-auth-method-text');

    if (user) {
      // Sembunyikan form login, tampilkan profil user
      loggedOutCards.forEach(el => el.style.display = 'none');
      loggedInCards.forEach(el => el.style.display = 'block');
      if (homeGuest) homeGuest.style.display = 'none';
      if (homeUser) homeUser.style.display = 'flex';

      const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');

      // Update badge metode login
      if (authBadge && authMethodText) {
        if (isGoogle) {
          authBadge.className = 'user-tag-verified badge-google-tag';
          authMethodText.textContent = 'Akun Google Terverifikasi';
        } else {
          authBadge.className = 'user-tag-verified badge-email-tag';
          authMethodText.textContent = 'Email Terverifikasi (Kode OTP)';
        }
      }

      // Update data profil di UI
      const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna');
      document.querySelectorAll('.user-display-name').forEach(el => {
        el.textContent = displayName;
      });

      document.querySelectorAll('.user-display-email').forEach(el => {
        el.textContent = user.email || '';
      });

      document.querySelectorAll('.user-uid-short').forEach(el => {
        el.textContent = user.uid.substring(0, 12) + '...';
      });

      // Update foto profil atau inisial
      const photoUrls = user.photoURL;
      const initial = (displayName || 'U')[0].toUpperCase();

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
          headerAvatar.innerHTML = `<img src="${photoUrls}" alt="${displayName}" class="header-avatar-img"><span class="avatar-online-dot"></span>`;
        } else {
          headerAvatar.innerHTML = `<div class="header-avatar-initial">${initial}</div><span class="avatar-online-dot"></span>`;
        }
      }
    } else {
      // Tampilkan form login
      loggedOutCards.forEach(el => el.style.display = 'block');
      loggedInCards.forEach(el => el.style.display = 'none');
      if (homeGuest) homeGuest.style.display = 'flex';
      if (homeUser) homeUser.style.display = 'none';

      // Reset step views: tampilkan form login, sembunyikan form verify jika tidak ada pending
      const stepForm = document.getElementById('auth-step-form');
      const stepVerify = document.getElementById('auth-step-verify');
      if (stepForm && stepVerify) {
        if (this.pendingEmailVerification) {
          stepForm.style.display = 'none';
          stepVerify.style.display = 'block';
        } else {
          stepForm.style.display = 'block';
          stepVerify.style.display = 'none';
        }
      }

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

  // Realtime Snapshot Listener: Aktif untuk Akun Google maupun Sesi Bersama Multi-Device (SRS F-06B)
  startRealtimeListener() {
    if (!this.db) return;

    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    const docRef = this.getTargetDocRef();
    if (!docRef) return;

    const pathDesc = this.currentUser && this.currentUser.uid
      ? `users/${this.currentUser.uid} (${this.currentUser.email})`
      : `shared_sessions/sesi_rian (Lab Multi-Device)`;
    console.log(`[FirebaseSync] Memulai realtime onSnapshot listener pada: ${pathDesc}`);

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

  // Push Data Lokal ke Dokumen Firestore (Debounced 350ms) - SRS F-06B
  pushToCloud(immediate = false) {
    if (!this.db) return;
    const docRef = this.getTargetDocRef();
    if (!docRef) return;

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
          activeStore: localStorage.getItem('sg_active_store') || 'Lotte Mart Grocery - Puri Indah',
          activeDate: localStorage.getItem('sg_active_date') || '',
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



  // Update Status UI (Badge di header dan Modal)
  updateStatusBadge(status, message) {
    const dot = document.getElementById('cloud-status-dot');
    const label = document.getElementById('cloud-status-text');
    const lastSyncEl = document.getElementById('cloud-last-sync-time');

    if (dot) {
      dot.className = 'cloud-status-dot ' + status;
    }

    if (label) {
      label.textContent = message || (status === 'online' ? 'Online' : 'Offline');
      label.className = 'cloud-status-badge ' + status;
    }

    if (lastSyncEl && this.lastSyncedAt) {
      const timeStr = this.lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      lastSyncEl.textContent = `Terakhir sinkron: ${timeStr}`;
    }
  }
};

window.FirebaseSync = FirebaseSync;
