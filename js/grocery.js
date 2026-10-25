/**
 * SMART GROCERY - F-01, F-02, F-03 Grocery Engine
 * F-01: Pencatatan Item Belanja Lengkap (nama, kategori, satuan, kuantitas, harga satuan)
 * F-02: Perhitungan Kuantitas Otomatis (Realtime Subtotal)
 * F-03: Kalkulator Diskon Bertingkat (Compound / Tiered Discount Formula)
 */

const GroceryEngine = {
  STORAGE_KEY: 'sg_cart_items',

  // Kategori yang didukung
  CATEGORIES: {
    staples: { name: 'Bahan Pokok', icon: '🌾', color: '#10b981' },
    protein: { name: 'Daging & Telur', icon: '🥩', color: '#f43f5e' },
    produce: { name: 'Sayur & Buah', icon: '🥦', color: '#22c55e' },
    beverage: { name: 'Minuman', icon: '🧃', color: '#06b6d4' },
    toiletries: { name: 'Kebersihan', icon: '🧼', color: '#3b82f6' },
    snacks: { name: 'Camilan', icon: '🍪', color: '#f59e0b' },
    seasoning: { name: 'Bumbu Dapur', icon: '🧂', color: '#d97706' },
    others: { name: 'Lainnya', icon: '📦', color: '#8b5cf6' }
  },

  // Satuan yang didukung
  UNITS: ['pcs', 'kg', 'liter', 'pack'],

  // Keranjang belanja baru selalu mulai kosong
  defaultItems: [],

  getItems() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading cart items:', e);
    }
    return [];
  },

  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    if (window.FirebaseSync && typeof FirebaseSync.syncCart === 'function') {
      FirebaseSync.syncCart(items);
    }
  },

  /**
   * F-03: Kalkulator Diskon Bertingkat (Tiered / Compound Discount Formula)
   * Rumus Matematis:
   * Setiap persentase diterapkan berurutan terhadap harga yang sudah didiskon sebelumnya.
   * Contoh: 50% + 20% pada Rp 100.000:
   * Tahap 1: Rp 100.000 - (50% x 100.000) = Rp 50.000
   * Tahap 2: Rp 50.000 - (20% x 50.000) = Rp 40.000
   * Total Hemat: Rp 60.000 | Persentase Efektif: 60% (BUKAN 70%!)
   */
  calculateTieredDiscount(basePrice, discountStr) {
    const base = Math.max(0, parseFloat(basePrice) || 0);
    const result = {
      basePrice: base,
      finalPrice: base,
      totalDiscount: 0,
      effectivePercent: 0,
      isTiered: false,
      steps: [],
      displayText: 'Tanpa Diskon'
    };

    if (base === 0 || !discountStr || discountStr.toString().trim() === '' || discountStr.toString().trim() === '0') {
      return result;
    }

    const rawStr = discountStr.toString().trim().toLowerCase();

    // 1. Cek Potongan Nominal Langsung (contoh: "Rp 5000", "5000", "-5000")
    if (!rawStr.includes('+') && (rawStr.startsWith('rp') || (parseFloat(rawStr.replace(/[^\d.]/g, '')) > 100 && !rawStr.includes('%')))) {
      const nominal = parseFloat(rawStr.replace(/[^\d.]/g, '')) || 0;
      const discount = Math.min(base, nominal);
      const finalP = Math.max(0, base - discount);
      const effPct = base > 0 ? (discount / base) * 100 : 0;

      result.finalPrice = Math.round(finalP);
      result.totalDiscount = Math.round(discount);
      result.effectivePercent = Math.round(effPct * 10) / 10;
      result.displayText = `Potongan Rp ${Math.round(discount).toLocaleString('id-ID')}`;
      result.steps = [
        {
          step: 1,
          description: `Potongan Langsung Tunai`,
          priceBefore: base,
          discountAmount: discount,
          priceAfter: finalP
        }
      ];
      return result;
    }

    // 2. Parse Diskon Persentase Bertingkat (contoh: "50% + 20%", "30%+10%", "25%")
    const parts = rawStr
      .split('+')
      .map(part => parseFloat(part.replace(/[^\d.]/g, '')))
      .filter(num => !isNaN(num) && num > 0);

    if (parts.length === 0) {
      return result;
    }

    result.isTiered = parts.length > 1;
    let currentPrice = base;

    parts.forEach((pct, index) => {
      // Diskon diterapkan terhadap currentPrice (harga yang telah dikurangi diskon sebelumnya)
      const stepDiscount = currentPrice * (pct / 100);
      const nextPrice = currentPrice - stepDiscount;

      result.steps.push({
        step: index + 1,
        percent: pct,
        description: `Diskon ke-${index + 1} (${pct}%)`,
        priceBefore: Math.round(currentPrice),
        discountAmount: Math.round(stepDiscount),
        priceAfter: Math.round(nextPrice)
      });

      currentPrice = nextPrice;
    });

    const totalDiscount = base - currentPrice;
    const effectivePercent = base > 0 ? (totalDiscount / base) * 100 : 0;

    result.finalPrice = Math.max(0, Math.round(currentPrice));
    result.totalDiscount = Math.round(totalDiscount);
    result.effectivePercent = Math.round(effectivePercent * 10) / 10;

    if (result.isTiered) {
      result.displayText = `Diskon Bertingkat ${parts.join('% + ')}% (Efektif ${result.effectivePercent}%)`;
    } else {
      result.displayText = `Diskon ${parts[0]}%`;
    }

    return result;
  },

  /**
   * F-02: Kalkulasi Item Lengkap
   * Total = (Harga Satuan x Qty) - Diskon Bertingkat
   */
  calculateItem(item) {
    const qty = Math.max(0.1, parseFloat(item.qty) || 1);
    const unitPrice = Math.max(0, parseFloat(item.unitPrice) || 0);
    const rawSubtotal = qty * unitPrice;

    const discountInfo = this.calculateTieredDiscount(rawSubtotal, item.discountStr);

    return {
      ...item,
      qty,
      unitPrice,
      rawSubtotal: Math.round(rawSubtotal),
      finalPrice: discountInfo.finalPrice,
      totalDiscount: discountInfo.totalDiscount,
      effectivePercent: discountInfo.effectivePercent,
      discountInfo: discountInfo
    };
  },

  // Ambil semua item beserta kalkulasi realtime
  getAllCalculatedItems() {
    const rawItems = this.getItems();
    return rawItems.map(item => this.calculateItem(item));
  },

  // Hitung total belanja keranjang realtime
  getCartTotals() {
    const calculated = this.getAllCalculatedItems();
    let totalExpenditure = 0;
    let totalSavings = 0;
    let totalRaw = 0;
    let totalCount = 0;

    calculated.forEach(item => {
      totalExpenditure += item.finalPrice;
      totalSavings += item.totalDiscount;
      totalRaw += item.rawSubtotal;
      totalCount += 1;
    });

    return {
      totalExpenditure,
      totalSavings,
      totalRaw,
      totalCount,
      items: calculated
    };
  },

  // Tambah barang baru ke keranjang
  addItem(itemData) {
    const items = this.getItems();
    const newItem = {
      id: 'cart_' + Date.now() + Math.random().toString(36).substr(2, 4),
      name: itemData.name.trim(),
      category: itemData.category || 'others',
      unit: itemData.unit || 'pcs',
      qty: Math.max(0.1, parseFloat(itemData.qty) || 1),
      unitPrice: Math.max(0, parseFloat(itemData.unitPrice) || 0),
      discountStr: (itemData.discountStr || '0').trim(),
      createdAt: Date.now()
    };

    items.unshift(newItem);
    this.saveItems(items);
    return newItem;
  },

  // Update barang yang sudah ada
  updateItem(id, itemData) {
    const items = this.getItems();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      name: itemData.name ? itemData.name.trim() : items[index].name,
      category: itemData.category || items[index].category,
      unit: itemData.unit || items[index].unit,
      qty: itemData.qty !== undefined ? Math.max(0.1, parseFloat(itemData.qty)) : items[index].qty,
      unitPrice: itemData.unitPrice !== undefined ? Math.max(0, parseFloat(itemData.unitPrice)) : items[index].unitPrice,
      discountStr: itemData.discountStr !== undefined ? itemData.discountStr.trim() : items[index].discountStr
    };

    this.saveItems(items);
    return items[index];
  },

  // Quick Stepper Qty (+1 atau -1)
  changeQty(id, delta) {
    const items = this.getItems();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;

    let currentQty = parseFloat(items[index].qty) || 1;
    let newQty = currentQty + delta;

    if (newQty <= 0) {
      // Hapus jika kuantitas mencapai 0
      items.splice(index, 1);
      this.saveItems(items);
      return { deleted: true };
    }

    // Bulatkan jika desimal
    if (newQty < 1 && newQty > 0) {
      newQty = Math.round(newQty * 10) / 10;
    } else {
      newQty = Math.round(newQty);
    }

    items[index].qty = newQty;
    this.saveItems(items);
    return { item: items[index], deleted: false };
  },

  // Hapus item dari keranjang
  deleteItem(id) {
    let items = this.getItems();
    items = items.filter(i => i.id !== id);
    this.saveItems(items);
  },

  // Kosongkan keranjang setelah selesai belanja
  clearCart() {
    this.saveItems([]);
  }
};

window.GroceryEngine = GroceryEngine;
