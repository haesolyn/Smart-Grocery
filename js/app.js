/**
 * SMART GROCERY - Main Application Controller
 * Menghubungkan seluruh modul UI, Navigasi Tab, Ergonomi Mobile, dan Kebutuhan SRS F-01 s/d F-06
 */

const App = {
  activeTab: 'view-belanja',
  selectedCategory: 'staples',
  selectedUnit: 'pcs',
  currentThemeColor: 'emerald',
  currentThemeMode: 'dark',
  THEME_CONFIG: {
    emerald: { name: 'Emerald Fresh', color: '#10b981' },
    cyan: { name: 'Ocean Cyan', color: '#06b6d4' },
    violet: { name: 'Amethyst Violet', color: '#8b5cf6' },
    amber: { name: 'Sunset Amber', color: '#f59e0b' },
    rose: { name: 'Rose Berry', color: '#f43f5e' }
  },

  init() {
    console.log('[App] Initializing Smart Grocery PWA...');
    SoundEngine.init();
    PWAHandler.init();

    this.initTheme();
    this.initClock();
    this.initLucideIcons();
    this.setupCategoryPills();
    this.setupUnitPills();
    this.setupDiscountChips();
    this.setupEventListeners();
    this.setupInputCalculators();

    // Render initial views
    this.renderCart();
    this.renderSafetyCap();
    this.renderHistory();
    this.renderCatalog();
    this.updateStats();

    // Setup sound toggle button state
    this.updateSoundButtonUI();
  },

  // Helper untuk format Rupiah
  formatRupiah(number) {
    const num = Math.round(parseFloat(number) || 0);
    return 'Rp ' + num.toLocaleString('id-ID');
  },

  // Inisialisasi ikon Lucide secara aman dengan fallback SVG offline
  initLucideIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try {
        lucide.createIcons();
        return;
      } catch (e) {
        console.warn('Lucide icon render warning:', e);
      }
    }

    // Fallback SVG icons jika Lucide CDN belum termuat atau sedang offline
    const svgMap = {
      'shopping-cart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
      'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      'shield-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
      'receipt': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M14 16h-4"/></svg>',
      'wallet': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
      'volume-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
      'volume-x': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>',
      'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
      'chevron-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      'check-circle-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
      'check-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
      'check-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
      'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      'plus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
      'plus-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
      'trash-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
      'tag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r=".5" fill="currentColor"/></svg>',
      'x': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      'alert-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
      'alert-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
      'alert-octagon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
      'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
      'copy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
      'list': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
      'signal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V4"/></svg>',
      'wifi': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/></svg>',
      'battery': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>',
      'download': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
      'upload': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
      'palette': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
      'moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
      'sun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
      'sliders': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>'
    };

    document.querySelectorAll('[data-lucide]').forEach(el => {
      const name = el.getAttribute('data-lucide');
      if (svgMap[name]) {
        el.innerHTML = svgMap[name];
      }
    });
  },

  // Jam status bar digital ala iOS/Android
  initClock() {
    const clock = document.getElementById('clock-display');
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      if (clock) clock.textContent = `${hours}:${minutes}`;
    };
    updateTime();
    setInterval(updateTime, 30000);
  },

  // Render Kategori Pills Selector pada Form Tambah Barang
  setupCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    container.innerHTML = '';
    Object.keys(GroceryEngine.CATEGORIES).forEach((key) => {
      const cat = GroceryEngine.CATEGORIES[key];
      const pill = document.createElement('div');
      pill.className = `cat-pill ${key === this.selectedCategory ? 'active' : ''}`;
      pill.dataset.category = key;
      pill.innerHTML = `
        <span class="cat-pill-icon">${cat.icon}</span>
        <span class="cat-pill-label">${cat.name}</span>
      `;
      pill.addEventListener('click', () => {
        container.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedCategory = key;
        SoundEngine.playTick();
      });
      container.appendChild(pill);
    });
  },

  // Setup Unit (Satuan) Selector Pills
  setupUnitPills() {
    const container = document.getElementById('unit-pills-container');
    if (!container) return;

    container.querySelectorAll('.unit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedUnit = btn.dataset.unit;
        SoundEngine.playTick();
        this.recalculateModalItem();
      });
    });
  },

  // Setup Preset Chips Diskon F-03
  setupDiscountChips() {
    const chips = document.querySelectorAll('.discount-chip');
    const discountInput = document.getElementById('input-item-discount');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const discVal = chip.dataset.disc;
        if (discountInput) {
          discountInput.value = discVal === '0' ? '' : discVal;
        }
        SoundEngine.playTick();
        this.recalculateModalItem();
      });
    });
  },

  // Sound Toggle UI
  updateSoundButtonUI() {
    const btn = document.getElementById('btn-toggle-sound');
    const icon = document.getElementById('sound-icon');
    if (!btn || !icon) return;

    if (SoundEngine.isMuted) {
      btn.classList.remove('active');
      icon.setAttribute('data-lucide', 'volume-x');
    } else {
      btn.classList.add('active');
      icon.setAttribute('data-lucide', 'volume-2');
    }
    this.initLucideIcons();
  },

  // Inisialisasi Tema & Tampilan Layar
  initTheme() {
    try {
      const savedColor = localStorage.getItem('sg_theme_color');
      const savedMode = localStorage.getItem('sg_theme_mode');
      if (savedColor && this.THEME_CONFIG[savedColor]) {
        this.currentThemeColor = savedColor;
      }
      if (savedMode === 'light' || savedMode === 'dark') {
        this.currentThemeMode = savedMode;
      }
    } catch (e) {}

    this.applyTheme(false);
  },

  // Terapkan Tema ke Dokumen dan Komponen
  applyTheme(showToast = true) {
    document.documentElement.setAttribute('data-theme-color', this.currentThemeColor);
    document.documentElement.setAttribute('data-theme-mode', this.currentThemeMode);

    // Update meta theme-color di header
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const themeColor = this.THEME_CONFIG[this.currentThemeColor] ? this.THEME_CONFIG[this.currentThemeColor].color : '#10b981';
      metaTheme.setAttribute('content', themeColor);
    }

    // Update label tema di card pengaturan
    const themeLabel = document.getElementById('current-theme-label');
    if (themeLabel) {
      const cfg = this.THEME_CONFIG[this.currentThemeColor];
      themeLabel.textContent = cfg ? cfg.name : 'Emerald Fresh';
    }

    // Update active state swatches di modal
    document.querySelectorAll('.theme-color-item').forEach(item => {
      if (item.dataset.theme === this.currentThemeColor) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active state quick swatches di tab pengaturan
    document.querySelectorAll('.quick-swatch').forEach(swatch => {
      if (swatch.dataset.theme === this.currentThemeColor) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });

    // Update active state tombol mode terang / gelap
    const btnDark = document.getElementById('btn-mode-dark');
    const btnLight = document.getElementById('btn-mode-light');
    if (btnDark && btnLight) {
      if (this.currentThemeMode === 'light') {
        btnLight.classList.add('active');
        btnDark.classList.remove('active');
      } else {
        btnDark.classList.add('active');
        btnLight.classList.remove('active');
      }
    }

    // Simpan ke localStorage
    try {
      localStorage.setItem('sg_theme_color', this.currentThemeColor);
      localStorage.setItem('sg_theme_mode', this.currentThemeMode);
    } catch (e) {}

    if (showToast) {
      const cfg = this.THEME_CONFIG[this.currentThemeColor];
      const modeText = this.currentThemeMode === 'light' ? 'Mode Terang' : 'Mode Gelap';
      this.showToast(`Tema ${cfg ? cfg.name : ''} (${modeText})`);
    }
  },

  setThemeColor(color, showToast = true) {
    if (this.THEME_CONFIG[color]) {
      this.currentThemeColor = color;
      this.applyTheme(showToast);
      SoundEngine.playTick();
    }
  },

  setThemeMode(mode, showToast = true) {
    if (mode === 'light' || mode === 'dark') {
      this.currentThemeMode = mode;
      this.applyTheme(showToast);
      SoundEngine.playTick();
    }
  },

  openThemeModal() {
    const modal = document.getElementById('modal-theme');
    if (modal) {
      modal.classList.add('active');
      SoundEngine.playTick();
    }
  },

  closeThemeModal() {
    const modal = document.getElementById('modal-theme');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Event Listeners Utama
  setupEventListeners() {
    // 1. Bottom Navigation Tabs
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.dataset.tab;
        this.switchTab(targetViewId);
        SoundEngine.playTick();
      });
    });

    // 2. Sound Toggle
    const soundToggle = document.getElementById('btn-toggle-sound');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isEnabled = SoundEngine.toggleMute();
        this.updateSoundButtonUI();
        this.showToast(isEnabled ? 'Bunyi diaktifkan' : 'Bunyi dibisukan');
      });
    }

    // 3. Floating Action Button (FAB) -> Buka modal tambah barang
    const fabBtn = document.getElementById('fab-add-grocery');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        this.openItemModal(null); // Mode tambah baru
        SoundEngine.playScanBeep();
      });
    }

    // 4. Modal Item Close Buttons
    const btnCloseItem = document.getElementById('btn-close-item-modal');
    const btnCancelItem = document.getElementById('btn-cancel-item-modal');
    if (btnCloseItem) btnCloseItem.addEventListener('click', () => this.closeItemModal());
    if (btnCancelItem) btnCancelItem.addEventListener('click', () => this.closeItemModal());

    // 5. Modal Item Form Submit
    const formItem = document.getElementById('form-grocery-item');
    if (formItem) {
      formItem.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveGroceryItem();
      });
    }

    // 6. Stepper pada Modal Qty
    const btnQtyMinus = document.getElementById('modal-qty-minus');
    const btnQtyPlus = document.getElementById('modal-qty-plus');
    const inputQty = document.getElementById('input-item-qty');

    if (btnQtyMinus && inputQty) {
      btnQtyMinus.addEventListener('click', () => {
        let val = parseFloat(inputQty.value) || 1;
        if (val > 1) {
          inputQty.value = Math.round(val - 1);
        } else if (val > 0.1) {
          inputQty.value = (Math.max(0.1, val - 0.5)).toFixed(1);
        }
        SoundEngine.playTick();
        this.recalculateModalItem();
      });
    }

    if (btnQtyPlus && inputQty) {
      btnQtyPlus.addEventListener('click', () => {
        let val = parseFloat(inputQty.value) || 1;
        inputQty.value = Math.round(val + 1);
        SoundEngine.playTick();
        this.recalculateModalItem();
      });
    }

    // 7. Selesai Belanja / Checkout Button
    const btnFinish = document.getElementById('btn-finish-shopping');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        const totals = GroceryEngine.getCartTotals();
        if (totals.totalCount === 0) {
          this.showToast('Troli belanja masih kosong!', 'error');
          return;
        }
        this.openCheckoutModal();
        SoundEngine.playTick();
      });
    }

    // 8. Checkout Modal Confirm & Close
    const btnCloseCheckout = document.getElementById('btn-close-checkout-modal');
    const btnCancelCheckout = document.getElementById('btn-cancel-checkout');
    const btnConfirmCheckout = document.getElementById('btn-confirm-checkout');

    if (btnCloseCheckout) btnCloseCheckout.addEventListener('click', () => this.closeCheckoutModal());
    if (btnCancelCheckout) btnCancelCheckout.addEventListener('click', () => this.closeCheckoutModal());
    if (btnConfirmCheckout) {
      btnConfirmCheckout.addEventListener('click', () => {
        this.processCheckout();
      });
    }

    // 9. Quick Budget Edit dari Header Safety Cap
    const btnOpenBudget = document.getElementById('btn-open-budget-modal');
    if (btnOpenBudget) {
      btnOpenBudget.addEventListener('click', () => {
        this.switchTab('view-anggaran');
        const inputSetting = document.getElementById('input-budget-setting');
        if (inputSetting) {
          inputSetting.value = BudgetSafetyCap.getCap();
          inputSetting.focus();
        }
      });
    }

    // 10. Save Budget Limit di Tab Anggaran
    const btnSaveBudget = document.getElementById('btn-save-budget-setting');
    if (btnSaveBudget) {
      btnSaveBudget.addEventListener('click', () => {
        const inputSetting = document.getElementById('input-budget-setting');
        const val = parseFloat(inputSetting.value) || 500000;
        BudgetSafetyCap.setCap(val);
        this.renderSafetyCap();
        this.showToast(`Batas limit diatur ke <strong>${this.formatRupiah(val)}</strong>`);
        SoundEngine.playSuccessChime();
      });
    }

    // 11. Modal Detail Komparasi Tutup
    const btnClosePriceDetail = document.getElementById('btn-close-price-detail');
    const btnDismissPriceDetail = document.getElementById('btn-dismiss-price-detail');
    if (btnClosePriceDetail) btnClosePriceDetail.addEventListener('click', () => this.closePriceDetailModal());
    if (btnDismissPriceDetail) btnDismissPriceDetail.addEventListener('click', () => this.closePriceDetailModal());

    // 12. Pilihan Tema & Tampilan
    const btnOpenTheme = document.getElementById('btn-open-theme-modal');
    const btnCloseTheme = document.getElementById('btn-close-theme-modal');
    const btnSaveTheme = document.getElementById('btn-save-theme-modal');
    const btnOpenThemeSettings = document.getElementById('btn-open-theme-settings');

    if (btnOpenTheme) btnOpenTheme.addEventListener('click', () => this.openThemeModal());
    if (btnCloseTheme) btnCloseTheme.addEventListener('click', () => this.closeThemeModal());
    if (btnSaveTheme) btnSaveTheme.addEventListener('click', () => this.closeThemeModal());
    if (btnOpenThemeSettings) btnOpenThemeSettings.addEventListener('click', () => this.openThemeModal());

    // Mode Terang / Gelap buttons
    const btnModeDark = document.getElementById('btn-mode-dark');
    const btnModeLight = document.getElementById('btn-mode-light');
    if (btnModeDark) btnModeDark.addEventListener('click', () => this.setThemeMode('dark'));
    if (btnModeLight) btnModeLight.addEventListener('click', () => this.setThemeMode('light'));

    // Theme color items in modal
    document.querySelectorAll('.theme-color-item').forEach(item => {
      item.addEventListener('click', () => {
        const theme = item.dataset.theme;
        if (theme) this.setThemeColor(theme);
      });
    });

    // Quick swatches in settings card
    document.querySelectorAll('.quick-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const theme = swatch.dataset.theme;
        if (theme) this.setThemeColor(theme);
      });
    });

    // 13. Pencarian Katalog Acuan
    const inputSearchCatalog = document.getElementById('catalog-search-input');
    if (inputSearchCatalog) {
      inputSearchCatalog.addEventListener('input', (e) => {
        this.renderCatalog(e.target.value);
      });
    }

    // 13. Backup Data Export & Import
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const json = ShoppingHistory.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartGrocery_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data berhasil diexport!');
      });
    }

    const btnImport = document.getElementById('btn-import-data');
    const fileImport = document.getElementById('file-import-input');
    if (btnImport && fileImport) {
      btnImport.addEventListener('click', () => fileImport.click());
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = ShoppingHistory.importData(evt.target.result);
          if (success) {
            this.renderCart();
            this.renderSafetyCap();
            this.renderHistory();
            this.renderCatalog();
            this.showToast('Data berhasil diimpor!');
            SoundEngine.playSuccessChime();
          } else {
            this.showToast('Format data tidak valid!', 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  },

  // Setup input listener untuk perhitungan realtime dan autocomplete
  setupInputCalculators() {
    const inputName = document.getElementById('input-item-name');
    const inputPrice = document.getElementById('input-item-price');
    const inputQty = document.getElementById('input-item-qty');
    const inputDiscount = document.getElementById('input-item-discount');
    const suggestionsBox = document.getElementById('item-name-suggestions');

    // Autocomplete nama produk
    if (inputName && suggestionsBox) {
      inputName.addEventListener('input', (e) => {
        const query = e.target.value;
        const matches = PriceComparator.getSuggestions(query);
        if (matches.length > 0) {
          suggestionsBox.innerHTML = '';
          matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `
              <span>${item.name}</span>
              <span class="autocomplete-prev-price">Bln lalu: ${this.formatRupiah(item.prevPrice)}</span>
            `;
            div.addEventListener('click', () => {
              inputName.value = item.name;
              suggestionsBox.style.display = 'none';

              // Auto-fill category & unit & harga jika kosong
              if (item.category) this.selectCategory(item.category);
              if (item.unit) this.selectUnit(item.unit);
              if (!inputPrice.value || inputPrice.value === '0') {
                inputPrice.value = item.prevPrice;
              }

              this.recalculateModalItem();
              SoundEngine.playTick();
            });
            suggestionsBox.appendChild(div);
          });
          suggestionsBox.style.display = 'block';
        } else {
          suggestionsBox.style.display = 'none';
        }

        this.recalculateModalItem();
      });

      // Tutup suggestions jika klik di luar
      document.addEventListener('click', (e) => {
        if (!inputName.contains(e.target) && !suggestionsBox.contains(e.target)) {
          suggestionsBox.style.display = 'none';
        }
      });
    }

    // Live recalculation F-02, F-03, F-04 saat input berubah
    [inputPrice, inputQty, inputDiscount].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.recalculateModalItem();
        });
      }
    });
  },

  // Switch Tab View
  switchTab(viewId) {
    this.activeTab = viewId;

    // Sembunyikan semua tab view
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });

    // Tampilkan view target
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    // Update state bottom nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Tampilkan / sembunyikan FAB (Hanya di tab Belanja)
    const fab = document.getElementById('fab-add-grocery');
    if (fab) {
      fab.style.display = viewId === 'view-belanja' ? 'flex' : 'none';
    }

    // Refresh konten jika pindah ke tab terkait
    if (viewId === 'view-riwayat') this.renderHistory();
    if (viewId === 'view-anggaran') {
      this.renderCatalog();
      this.updateStats();
    }
  },

  // =========================================================================
  // F-01, F-02, F-03, F-04: RENDER CART ITEMS
  // =========================================================================
  renderCart() {
    const listContainer = document.getElementById('cart-items-list');
    const badgeCount = document.getElementById('cart-count-badge');
    const navBadge = document.getElementById('nav-cart-badge');
    const summaryBox = document.getElementById('trolley-summary-box');

    const totals = GroceryEngine.getCartTotals();
    const items = totals.items;

    // Update badge counter
    if (badgeCount) badgeCount.textContent = `${totals.totalCount} Barang`;
    if (navBadge) {
      navBadge.textContent = totals.totalCount;
      navBadge.style.display = totals.totalCount > 0 ? 'flex' : 'none';
    }

    // Update Summary Box
    const elSubtotal = document.getElementById('summary-subtotal');
    const elSavings = document.getElementById('summary-savings');
    const elFinal = document.getElementById('summary-final-total');

    if (elSubtotal) elSubtotal.textContent = this.formatRupiah(totals.totalRaw);
    if (elSavings) elSavings.textContent = totals.totalSavings > 0 ? `-${this.formatRupiah(totals.totalSavings)}` : 'Rp 0';
    if (elFinal) elFinal.textContent = this.formatRupiah(totals.totalExpenditure);

    if (items.length === 0) {
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="empty-cart-state">
            <div class="empty-cart-icon">
              <i data-lucide="shopping-cart" style="width: 32px; height: 32px;"></i>
            </div>
            <div class="empty-cart-title">Troli Belanja Kosong</div>
            <div class="empty-cart-subtitle">
              Dorong troli dan ketuk tombol <strong>(+)</strong> di kanan bawah untuk mencatat barang belanjaan kamu.
            </div>
            <button type="button" class="btn-primary" onclick="App.openItemModal(null)" style="margin: 0 auto; max-width: 220px;">
              <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
              <span>Mulai Belanja</span>
            </button>
          </div>
        `;
      }
      if (summaryBox) summaryBox.style.display = 'none';
      this.initLucideIcons();
      this.renderSafetyCap();
      return;
    }

    if (summaryBox) summaryBox.style.display = 'block';
    if (!listContainer) return;

    listContainer.innerHTML = '';

    items.forEach(item => {
      const cat = GroceryEngine.CATEGORIES[item.category] || GroceryEngine.CATEGORIES.others;

      // F-04: Kalkulasi Komparasi vs Bulan Lalu
      const comp = PriceComparator.comparePrice(item.name, item.unitPrice, item.unit);

      const card = document.createElement('div');
      card.className = 'grocery-card';
      card.dataset.id = item.id;

      let discountBadgeHtml = '';
      if (item.totalDiscount > 0) {
        discountBadgeHtml = `
          <div class="item-discount-pill">
            <i data-lucide="tag" style="width: 12px; height: 12px;"></i>
            <span>${item.discountInfo.displayText} (Hemat ${this.formatRupiah(item.totalDiscount)})</span>
          </div>
        `;
      }

      // Format unit display
      const unitText = item.unit || 'pcs';

      card.innerHTML = `
        <div class="grocery-card-header">
          <div class="item-main-info" onclick="App.openItemModal('${item.id}')" style="cursor: pointer;">
            <div class="item-category-tag">
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
            </div>
            <div class="item-name">${item.name}</div>
          </div>
          <button type="button" class="item-delete-btn" title="Hapus Barang" onclick="App.deleteCartItem('${item.id}')">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>

        <!-- F-04: Komparator Harga vs Bulan Lalu Badge -->
        <div>
          <span class="comparator-badge ${comp.badgeClass}" onclick="App.openPriceDetail('${item.name}', ${item.unitPrice}, '${item.unit}')" title="Ketuk untuk melihat detail tren harga">
            <span>${comp.arrow}</span>
            <span>${comp.label}</span>
          </span>
        </div>

        <!-- F-03: Diskon Bertingkat Pill jika ada -->
        ${discountBadgeHtml}

        <!-- Card Footer: Stepper Ergonomis & Total Harga -->
        <div class="grocery-card-footer">
          <!-- Stepper Kuantitas (Ramah Jempol) -->
          <div class="stepper-control">
            <button type="button" class="stepper-btn" onclick="App.stepCartQty('${item.id}', -1)" aria-label="Kurangi">-</button>
            <div class="stepper-val-wrap">
              <span>${item.qty}</span>
              <span class="unit">${unitText}</span>
            </div>
            <button type="button" class="stepper-btn" onclick="App.stepCartQty('${item.id}', 1)" aria-label="Tambah">+</button>
          </div>

          <!-- Total Harga Realtime (F-02) -->
          <div class="item-price-column" onclick="App.openItemModal('${item.id}')" style="cursor: pointer;">
            <div class="item-unit-calc">@ ${this.formatRupiah(item.unitPrice)} / ${unitText}</div>
            ${item.totalDiscount > 0 ? `<div class="item-original-striked">${this.formatRupiah(item.rawSubtotal)}</div>` : ''}
            <div class="item-final-price">${this.formatRupiah(item.finalPrice)}</div>
          </div>
        </div>
      `;

      listContainer.appendChild(card);
    });

    this.initLucideIcons();
    this.renderSafetyCap();
  },

  // Stepper Qty langsung dari Card Belanja
  stepCartQty(id, delta) {
    const res = GroceryEngine.changeQty(id, delta);
    if (res && res.deleted) {
      this.showToast('Barang dikeluarkan dari troli');
    }
    SoundEngine.playTick();
    this.renderCart();
  },

  // Hapus item dari Cart
  deleteCartItem(id) {
    GroceryEngine.deleteItem(id);
    SoundEngine.playTick();
    this.renderCart();
    this.showToast('Barang dihapus dari troli');
  },

  // =========================================================================
  // F-05: PENGENDALI ANGGARAN (SAFETY CAP)
  // =========================================================================
  renderSafetyCap() {
    const totals = GroceryEngine.getCartTotals();
    const evaluation = BudgetSafetyCap.evaluateStatus(totals.totalExpenditure);

    const widget = document.getElementById('safety-cap-widget');
    const badge = document.getElementById('safety-badge');
    const badgeText = document.getElementById('safety-badge-text');
    const badgeIcon = document.getElementById('safety-badge-icon');
    const spentText = document.getElementById('cart-total-spent');
    const remainingText = document.getElementById('cart-remaining-budget');
    const barFill = document.getElementById('safety-bar-fill');
    const msgText = document.getElementById('safety-msg-text');
    const msgIcon = document.getElementById('safety-msg-icon');
    const capText = document.getElementById('cap-display-text');

    if (spentText) spentText.textContent = this.formatRupiah(evaluation.spent);
    if (capText) capText.textContent = this.formatRupiah(evaluation.cap);
    if (remainingText) {
      if (evaluation.remaining >= 0) {
        remainingText.textContent = this.formatRupiah(evaluation.remaining);
        remainingText.style.color = 'var(--text-main)';
      } else {
        remainingText.textContent = `-${this.formatRupiah(Math.abs(evaluation.remaining))}`;
        remainingText.style.color = 'var(--color-danger-light)';
      }
    }

    if (barFill) {
      barFill.style.width = `${Math.min(100, evaluation.percentage)}%`;
    }

    if (widget) {
      widget.classList.remove('state-safe', 'state-warn', 'state-danger');
      widget.classList.add(`state-${evaluation.status}`);
    }

    if (badgeText) badgeText.textContent = evaluation.label;
    if (badgeIcon) badgeIcon.setAttribute('data-lucide', evaluation.icon);
    if (msgText) msgText.textContent = evaluation.message;
    if (msgIcon) {
      msgIcon.setAttribute('data-lucide', evaluation.status === 'safe' ? 'check-circle-2' : (evaluation.status === 'warning' ? 'alert-circle' : 'alert-octagon'));
    }

    // Audio / Haptic alert jika kondisi bahaya / overbudget
    if (evaluation.status === 'danger' && totals.totalExpenditure > evaluation.cap) {
      SoundEngine.playWarningBuzz();
    }

    // Highlight matching preset chip di tab anggaran
    document.querySelectorAll('.budget-setting-card .quick-chip').forEach(chip => {
      const chipVal = parseFloat(chip.textContent.replace(/[^\d]/g, '')) || 0;
      if (chipVal === evaluation.cap) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    this.initLucideIcons();
  },

  // Preset Anggaran Cepat
  setBudgetPreset(amount) {
    const input = document.getElementById('input-budget-setting');
    if (input) input.value = amount;
    BudgetSafetyCap.setCap(amount);
    this.renderSafetyCap();
    this.showToast(`Batas limit diatur ke <strong>${this.formatRupiah(amount)}</strong>`);
    SoundEngine.playSuccessChime();
  },

  // =========================================================================
  // MODAL BOTTOM SHEET: TAMBAH & EDIT BARANG (F-01, F-02, F-03, F-04)
  // =========================================================================
  openItemModal(itemId) {
    const modal = document.getElementById('modal-grocery-item');
    const title = document.getElementById('modal-item-title');
    const btnText = document.getElementById('btn-save-item-text');
    const editIdInput = document.getElementById('item-edit-id');

    const inputName = document.getElementById('input-item-name');
    const inputQty = document.getElementById('input-item-qty');
    const inputPrice = document.getElementById('input-item-price');
    const inputDiscount = document.getElementById('input-item-discount');

    if (!modal) return;

    if (itemId) {
      // Edit existing item
      const items = GroceryEngine.getItems();
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      if (title) title.textContent = 'Edit Barang Belanja';
      if (btnText) btnText.textContent = 'Simpan Perubahan';
      if (editIdInput) editIdInput.value = item.id;

      if (inputName) inputName.value = item.name;
      if (inputQty) inputQty.value = item.qty;
      if (inputPrice) inputPrice.value = item.unitPrice;
      if (inputDiscount) inputDiscount.value = item.discountStr || '';

      this.selectCategory(item.category);
      this.selectUnit(item.unit || 'pcs');
    } else {
      // New item
      if (title) title.textContent = 'Catat Barang Belanja';
      if (btnText) btnText.textContent = 'Tambah ke Troli';
      if (editIdInput) editIdInput.value = '';

      if (inputName) inputName.value = '';
      if (inputQty) inputQty.value = '1';
      if (inputPrice) inputPrice.value = '';
      if (inputDiscount) inputDiscount.value = '';

      this.selectCategory('staples');
      this.selectUnit('pcs');
    }

    this.recalculateModalItem();
    modal.classList.add('active');

    // Auto-focus pada input nama jika barang baru
    setTimeout(() => {
      if (!itemId && inputName) inputName.focus();
    }, 200);
  },

  closeItemModal() {
    const modal = document.getElementById('modal-grocery-item');
    if (modal) modal.classList.remove('active');
    const suggestionsBox = document.getElementById('item-name-suggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
  },

  selectCategory(catKey) {
    this.selectedCategory = catKey || 'others';
    const container = document.getElementById('category-pills-container');
    if (container) {
      container.querySelectorAll('.cat-pill').forEach(pill => {
        if (pill.dataset.category === this.selectedCategory) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }
  },

  selectUnit(unit) {
    this.selectedUnit = unit || 'pcs';
    const container = document.getElementById('unit-pills-container');
    if (container) {
      container.querySelectorAll('.unit-btn').forEach(btn => {
        if (btn.dataset.unit === this.selectedUnit) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  },

  // Tambah harga dengan tombol chip cepat
  addPriceChip(amount) {
    const input = document.getElementById('input-item-price');
    if (!input) return;
    const current = parseFloat(input.value) || 0;
    input.value = current + amount;
    SoundEngine.playTick();
    this.recalculateModalItem();
  },

  // Tambah "000" pada harga
  appendPriceZeros() {
    const input = document.getElementById('input-item-price');
    if (!input) return;
    const val = input.value.trim();
    if (val && !isNaN(val)) {
      input.value = val + '000';
    } else {
      input.value = '1000';
    }
    SoundEngine.playTick();
    this.recalculateModalItem();
  },

  // Realtime recalculation inside Modal (F-02, F-03, F-04)
  recalculateModalItem() {
    const inputName = document.getElementById('input-item-name');
    const inputPrice = document.getElementById('input-item-price');
    const inputQty = document.getElementById('input-item-qty');
    const inputDiscount = document.getElementById('input-item-discount');

    const name = inputName ? inputName.value.trim() : '';
    const unitPrice = parseFloat(inputPrice ? inputPrice.value : 0) || 0;
    const qty = parseFloat(inputQty ? inputQty.value : 1) || 1;
    const discountStr = inputDiscount ? inputDiscount.value.trim() : '0';

    // 1. F-04: Komparator Harga Preview vs Bulan Lalu
    const compBox = document.getElementById('comparator-preview-box');
    const compBadge = document.getElementById('modal-comp-badge');
    const compArrow = document.getElementById('modal-comp-arrow');
    const compText = document.getElementById('modal-comp-text');
    const compDetail = document.getElementById('modal-comp-detail');
    const benchmarkTag = document.getElementById('modal-benchmark-tag');

    if (name && unitPrice > 0) {
      const comp = PriceComparator.comparePrice(name, unitPrice, this.selectedUnit);
      if (compBox) compBox.style.display = 'flex';
      if (compBadge) {
        compBadge.className = `comparator-badge ${comp.badgeClass}`;
      }
      if (compArrow) compArrow.textContent = comp.arrow;
      if (compText) compText.textContent = comp.label;
      if (compDetail) compDetail.textContent = comp.detailText || comp.label;
      if (benchmarkTag && comp.prevPrice > 0) {
        benchmarkTag.textContent = `Bln lalu: ${this.formatRupiah(comp.prevPrice)}`;
      } else if (benchmarkTag) {
        benchmarkTag.textContent = '';
      }
    } else {
      if (compBox) compBox.style.display = 'none';
      if (benchmarkTag) benchmarkTag.textContent = '';
    }

    // 2. F-02 & F-03: Kalkulasi Diskon Bertingkat
    const rawSubtotal = qty * unitPrice;
    const discountInfo = GroceryEngine.calculateTieredDiscount(rawSubtotal, discountStr);

    const effBadge = document.getElementById('discount-effective-badge');
    const breakdownBox = document.getElementById('discount-breakdown-box');
    const calcStriked = document.getElementById('modal-calc-striked');
    const calcFinal = document.getElementById('modal-calc-final');

    if (effBadge) {
      if (discountInfo.totalDiscount > 0) {
        effBadge.textContent = `${discountInfo.effectivePercent}% (Hemat ${this.formatRupiah(discountInfo.totalDiscount)})`;
      } else {
        effBadge.textContent = '0%';
      }
    }

    // Render step-by-step breakdown jika diskon bertingkat (F-03)
    if (breakdownBox) {
      if (discountInfo.steps.length > 0) {
        let html = '';
        discountInfo.steps.forEach(step => {
          html += `
            <div class="step-row">
              <span>${step.description || `Tahap ${step.step}`}:</span>
              <span>-${this.formatRupiah(step.discountAmount)} &rarr; ${this.formatRupiah(step.priceAfter)}</span>
            </div>
          `;
        });
        html += `
          <div class="effective-row step-row">
            <span>Total Diskon Efektif:</span>
            <span>Hemat ${this.formatRupiah(discountInfo.totalDiscount)} (${discountInfo.effectivePercent}%)</span>
          </div>
        `;
        breakdownBox.innerHTML = html;
        breakdownBox.style.display = 'block';
      } else {
        breakdownBox.style.display = 'none';
      }
    }

    // Update Preview Total Akhir Item (F-02)
    if (calcFinal) calcFinal.textContent = this.formatRupiah(discountInfo.finalPrice);
    if (calcStriked) {
      if (discountInfo.totalDiscount > 0) {
        calcStriked.textContent = this.formatRupiah(rawSubtotal);
        calcStriked.style.display = 'inline';
      } else {
        calcStriked.style.display = 'none';
      }
    }
  },

  // Simpan barang ke Cart (F-01)
  saveGroceryItem() {
    const editIdInput = document.getElementById('item-edit-id');
    const inputName = document.getElementById('input-item-name');
    const inputQty = document.getElementById('input-item-qty');
    const inputPrice = document.getElementById('input-item-price');
    const inputDiscount = document.getElementById('input-item-discount');

    const name = inputName.value.trim();
    const qty = parseFloat(inputQty.value) || 1;
    const unitPrice = parseFloat(inputPrice.value) || 0;
    const discountStr = inputDiscount.value.trim();

    if (!name) {
      this.showToast('Nama produk tidak boleh kosong!', 'error');
      return;
    }
    if (unitPrice <= 0) {
      this.showToast('Masukkan harga satuan yang valid!', 'error');
      return;
    }

    const itemData = {
      name,
      category: this.selectedCategory,
      unit: this.selectedUnit,
      qty,
      unitPrice,
      discountStr
    };

    const editId = editIdInput ? editIdInput.value : '';

    if (editId) {
      GroceryEngine.updateItem(editId, itemData);
      this.showToast('Barang berhasil diperbarui');
    } else {
      // Periksa apakah penambahan ini akan melampaui limit anggaran (F-05)
      const currentTotals = GroceryEngine.getCartTotals();
      const rawSub = qty * unitPrice;
      const disc = GroceryEngine.calculateTieredDiscount(rawSub, discountStr);
      const projectedTotal = currentTotals.totalExpenditure + disc.finalPrice;
      const cap = BudgetSafetyCap.getCap();

      if (projectedTotal > cap) {
        SoundEngine.playWarningBuzz();
        const overBy = projectedTotal - cap;
        const confirmAdd = confirm(`⚠️ PERINGATAN ANGGARAN:\nBarang ini akan membuat belanja melebihi batas limit sebesar ${this.formatRupiah(overBy)}!\n\nTetap tambahkan ke troli?`);
        if (!confirmAdd) return;
      }

      GroceryEngine.addItem(itemData);
      SoundEngine.playScanBeep();
      this.showToast('Barang dimasukkan ke troli!');
    }

    this.closeItemModal();
    this.renderCart();
  },

  // =========================================================================
  // DETAIL KOMPARASI HARGA BOTTOM SHEET (F-04)
  // =========================================================================
  openPriceDetail(productName, currentUnitPrice, unit) {
    const modal = document.getElementById('modal-price-detail');
    const content = document.getElementById('price-detail-content');
    if (!modal || !content) return;

    const comp = PriceComparator.comparePrice(productName, currentUnitPrice, unit);
    const benchmark = PriceComparator.findBenchmarkItem(productName);

    let html = `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 16px; font-weight: 800; margin-bottom: 4px;">${productName}</div>
        <div style="font-size: 12px; color: var(--text-muted);">Satuan: ${unit || 'pcs'}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <div style="background: var(--bg-surface-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Harga Bulan Lalu</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--text-main);">
            ${comp.prevPrice > 0 ? this.formatRupiah(comp.prevPrice) : 'Tidak ada data'}
          </div>
        </div>
        <div style="background: var(--bg-surface-elevated); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Harga Saat Ini</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--color-safe-light);">
            ${this.formatRupiah(currentUnitPrice)}
          </div>
        </div>
      </div>

      <div style="padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px; ${comp.status === 'higher' ? 'background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);' : (comp.status === 'lower' ? 'background: var(--color-safe-bg); border: 1px solid var(--color-safe-border);' : 'background: rgba(255,255,255,0.05);')}">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>${comp.arrow}</span>
          <span>${comp.label}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
          ${comp.detailText || 'Data harga otomatis tersimpan untuk kalkulasi inflasi bulanan.'}
        </div>
      </div>
    `;

    content.innerHTML = html;
    modal.classList.add('active');
  },

  closePriceDetailModal() {
    const modal = document.getElementById('modal-price-detail');
    if (modal) modal.classList.remove('active');
  },

  // =========================================================================
  // CHECKOUT & RIWAYAT (F-06)
  // =========================================================================
  openCheckoutModal() {
    const modal = document.getElementById('modal-checkout');
    const totalDisplay = document.getElementById('checkout-total-display');
    const savingsDisplay = document.getElementById('checkout-savings-display');
    const totals = GroceryEngine.getCartTotals();

    if (totalDisplay) totalDisplay.textContent = this.formatRupiah(totals.totalExpenditure);
    if (savingsDisplay) {
      if (totals.totalSavings > 0) {
        savingsDisplay.textContent = `Kamu menghemat ${this.formatRupiah(totals.totalSavings)} berkat diskon!`;
      } else {
        savingsDisplay.textContent = 'Semua barang tanpa promo diskon.';
      }
    }

    if (modal) modal.classList.add('active');
  },

  closeCheckoutModal() {
    const modal = document.getElementById('modal-checkout');
    if (modal) modal.classList.remove('active');
  },

  setStoreChip(storeName) {
    const input = document.getElementById('checkout-store-name');
    if (input) input.value = storeName;
    SoundEngine.playTick();
  },

  processCheckout() {
    const storeInput = document.getElementById('checkout-store-name');
    const storeName = storeInput ? storeInput.value.trim() : 'Superindo';

    const session = ShoppingHistory.finishCurrentShopping(storeName);
    this.closeCheckoutModal();

    if (session) {
      SoundEngine.playSuccessChime();
      this.showToast(`Belanja disimpan! Total: ${this.formatRupiah(session.totalSpent)}`);
      this.renderCart();
      this.switchTab('view-riwayat');
    }
  },

  // Render Riwayat Transaksi (F-06)
  renderHistory() {
    const container = document.getElementById('history-items-list');
    const badge = document.getElementById('history-count-badge');
    const historyList = ShoppingHistory.getHistory();

    if (badge) badge.textContent = `${historyList.length} Transaksi`;
    if (!container) return;

    if (historyList.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon"><i data-lucide="receipt" style="width: 32px; height: 32px;"></i></div>
          <div class="empty-cart-title">Belum Ada Riwayat Belanja</div>
          <div class="empty-cart-subtitle">Selesaikan transaksi belanja di supermarket untuk menyimpan riwayat dan data pembanding.</div>
        </div>
      `;
      this.initLucideIcons();
      return;
    }

    container.innerHTML = '';
    historyList.forEach((session, idx) => {
      const card = document.createElement('div');
      card.className = 'history-card';

      // Items list accordion HTML
      let itemsHtml = '';
      session.items.forEach(it => {
        const cat = GroceryEngine.CATEGORIES[it.category] || GroceryEngine.CATEGORIES.others;
        itemsHtml += `
          <div class="history-item-row">
            <div>
              <span>${cat.icon} <strong>${it.name}</strong></span>
              <span style="font-size: 11px; color: var(--text-faint); display: block;">${it.qty} ${it.unit || 'pcs'} @ ${this.formatRupiah(it.unitPrice)}</span>
            </div>
            <div style="font-weight: 700; color: var(--text-main);">${this.formatRupiah(it.finalPrice)}</div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="history-card-header">
          <div>
            <div class="history-store">${session.storeName}</div>
            <div class="history-date">${session.dateFormatted}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 800; color: var(--color-safe-light);">${this.formatRupiah(session.totalSpent)}</div>
            ${session.totalSavings > 0 ? `<div style="font-size: 11px; color: var(--color-warn-light);">Hemat: ${this.formatRupiah(session.totalSavings)}</div>` : ''}
          </div>
        </div>

        <div class="history-meta-row">
          <div class="history-meta-item">
            <div class="label">Total Barang</div>
            <div class="value">${session.itemCount || session.items.length} item</div>
          </div>
          <div class="history-meta-item">
            <div class="label">Status Anggaran</div>
            <div class="value" style="color: var(--color-safe-light);">Tercatat</div>
          </div>
        </div>

        <!-- Accordion Toggle Barang Belanja -->
        <div class="history-items-accordion">
          <button type="button" class="history-accordion-toggle" onclick="App.toggleHistoryDetails('hist-detail-${session.id}')">
            <i data-lucide="list" style="width: 13px; height: 13px;"></i>
            <span>Lihat ${session.items.length} Barang Belanjaan</span>
            <i data-lucide="chevron-down" style="width: 13px; height: 13px;"></i>
          </button>
          <div id="hist-detail-${session.id}" style="display: none; margin-top: 8px;">
            ${itemsHtml}
          </div>
        </div>

        <div class="history-card-actions">
          <button type="button" class="btn-small-outline" onclick="App.cloneHistoryToCart('${session.id}')" title="Salin semua barang ke keranjang belanja saat ini">
            <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
            <span>Belanja Lagi dari Sini</span>
          </button>
          <button type="button" class="btn-small-outline" onclick="App.deleteHistorySession('${session.id}')" style="max-width: 44px; color: var(--color-danger);" title="Hapus Riwayat">
            <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    this.initLucideIcons();
  },

  toggleHistoryDetails(elemId) {
    const el = document.getElementById(elemId);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  cloneHistoryToCart(sessionId) {
    const ok = ShoppingHistory.cloneSessionToCart(sessionId);
    if (ok) {
      SoundEngine.playScanBeep();
      this.showToast('Barang riwayat berhasil disalin ke troli!');
      this.renderCart();
      this.switchTab('view-belanja');
    }
  },

  deleteHistorySession(sessionId) {
    if (confirm('Hapus arsip transaksi belanja ini?')) {
      ShoppingHistory.deleteSession(sessionId);
      this.renderHistory();
      this.updateStats();
      this.showToast('Riwayat dihapus');
    }
  },

  // =========================================================================
  // KATALOG ACUAN & STATISTIK (F-04, F-05, F-06)
  // =========================================================================
  renderCatalog(filterQuery) {
    const container = document.getElementById('catalog-list-container');
    const badge = document.getElementById('catalog-count-badge');
    const db = PriceComparator.getDatabase();

    let items = db;
    if (filterQuery && filterQuery.trim() !== '') {
      const q = filterQuery.toLowerCase().trim();
      items = db.filter(item => item.name.toLowerCase().includes(q));
    }

    if (badge) badge.textContent = `${items.length} Produk`;
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px; font-size: 13px;">Tidak ada barang yang cocok.</div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach(item => {
      const cat = GroceryEngine.CATEGORIES[item.category] || GroceryEngine.CATEGORIES.others;
      const row = document.createElement('div');
      row.className = 'catalog-item-row';
      row.innerHTML = `
        <div>
          <div class="catalog-item-name">${cat.icon} ${item.name}</div>
          <div class="catalog-item-cat">Satuan: ${item.unit || 'pcs'} &bull; ${item.lastUpdated || 'Bulan Lalu'}</div>
        </div>
        <div class="catalog-item-price">${this.formatRupiah(item.prevPrice)}</div>
      `;
      container.appendChild(row);
    });
  },

  updateStats() {
    const historyList = ShoppingHistory.getHistory();
    const statAvg = document.getElementById('stat-avg-spent');
    const statSaved = document.getElementById('stat-total-saved');

    if (historyList.length === 0) {
      if (statAvg) statAvg.textContent = 'Rp 0';
      if (statSaved) statSaved.textContent = 'Rp 0';
      return;
    }

    let totalSpent = 0;
    let totalSaved = 0;
    historyList.forEach(s => {
      totalSpent += s.totalSpent;
      totalSaved += (s.totalSavings || 0);
    });

    const avg = totalSpent / historyList.length;
    if (statAvg) statAvg.textContent = this.formatRupiah(avg);
    if (statSaved) statSaved.textContent = this.formatRupiah(totalSaved);
  },

  // Toast Notification (Menyesuaikan Tema Dinamis)
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notice');
    const text = document.getElementById('toast-text');
    const icon = document.getElementById('toast-icon');

    if (!toast || !text) return;

    text.innerHTML = message;
    toast.className = 'toast-notice show' + (type === 'error' ? ' error' : '');

    if (icon) {
      icon.setAttribute('data-lucide', type === 'error' ? 'alert-triangle' : 'check');
      this.initLucideIcons();
    }

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
};

// Expose globally
window.App = App;

// Jalankan ketika DOM sudah siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
