/**
 * SMART GROCERY - F-06 Riwayat dan Database Belanja
 * Menyimpan data belanja terstruktur pada penyimpanan lokal,
 * sebagai riwayat dan basis data pembanding harga (F-04) transaksi berikutnya
 */

const ShoppingHistory = {
  STORAGE_KEY: 'sg_shopping_history',

  // Riwayat belanja baru selalu mulai kosong
  defaultHistory: [],

  getHistory() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
    return [];
  },

  saveHistory(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    if (window.FirebaseSync && typeof FirebaseSync.syncHistory === 'function') {
      FirebaseSync.syncHistory(list);
    }
  },

  /**
   * Selesaikan Belanja & Arsipkan Transaksi
   * Sekaligus memperbarui basis data pembanding (F-04) untuk bulan berikutnya!
   */
  finishCurrentShopping(storeName) {
    const totals = GroceryEngine.getCartTotals();
    if (totals.items.length === 0) return null;

    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateFormatted = now.toLocaleDateString('id-ID', options);

    const session = {
      id: 'hist_' + Date.now(),
      date: now.toISOString(),
      dateFormatted: dateFormatted,
      storeName: (storeName || 'Supermarket').trim(),
      totalSpent: totals.totalExpenditure,
      totalSavings: totals.totalSavings,
      itemCount: totals.totalCount,
      items: totals.items.map(item => ({
        name: item.name,
        category: item.category,
        unit: item.unit,
        qty: item.qty,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        totalDiscount: item.totalDiscount,
        discountStr: item.discountStr
      }))
    };

    // 1. Simpan ke daftar riwayat transaksi
    const historyList = this.getHistory();
    historyList.unshift(session);
    this.saveHistory(historyList);

    // 2. F-06: Perbarui database acuan harga untuk pembanding bulan depan
    session.items.forEach(item => {
      PriceComparator.updateBenchmark(item.name, item.unitPrice, item.category, item.unit);
    });

    // 3. Kosongkan keranjang aktif
    GroceryEngine.clearCart();

    return session;
  },

  // Salin item dari transaksi lama kembali ke keranjang belanja saat ini
  cloneSessionToCart(sessionId) {
    const historyList = this.getHistory();
    const session = historyList.find(s => s.id === sessionId);
    if (!session) return false;

    const currentItems = GroceryEngine.getItems();
    session.items.forEach(item => {
      currentItems.push({
        id: 'cart_' + Date.now() + Math.random().toString(36).substr(2, 4),
        name: item.name,
        category: item.category,
        unit: item.unit,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discountStr: item.discountStr || '0',
        createdAt: Date.now()
      });
    });

    GroceryEngine.saveItems(currentItems);
    return true;
  },

  // Hapus transaksi riwayat
  deleteSession(sessionId) {
    let historyList = this.getHistory();
    historyList = historyList.filter(s => s.id !== sessionId);
    this.saveHistory(historyList);
  },

  // Export JSON Backup
  exportData() {
    const data = {
      cart: GroceryEngine.getItems(),
      history: this.getHistory(),
      benchmarks: PriceComparator.getDatabase(),
      budgetCap: BudgetSafetyCap.getCap(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  // Import JSON Backup
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.cart) GroceryEngine.saveItems(data.cart);
      if (data.history) this.saveHistory(data.history);
      if (data.benchmarks) PriceComparator.saveDatabase(data.benchmarks);
      if (data.budgetCap) BudgetSafetyCap.setCap(data.budgetCap);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
};

window.ShoppingHistory = ShoppingHistory;
