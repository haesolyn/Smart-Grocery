/**
 * SMART GROCERY - F-04 Komparator Harga Realtime vs Bulan Lalu
 * Membandingkan harga satuan barang saat ini dengan harga belanja bulan lalu
 */

const PriceComparator = {
  STORAGE_KEY: 'sg_benchmark_prices',
  MAX_PRICE: 100000000,
  MAX_ITEMS_PER_SECTION: 15,

  clampPrice(val) {
    const num = parseFloat(val);
    if (!isFinite(num) || isNaN(num) || num < 0) return 0;
    return Math.min(this.MAX_PRICE, num);
  },

  deduplicateDatabase(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Map();
    list.forEach(item => {
      if (!item || !item.name) return;
      const key = this.normalize(item.name);
      if (!key) return;
      const sanitized = {
        ...item,
        name: item.name.trim(),
        prevPrice: this.clampPrice(item.prevPrice)
      };
      if (seen.has(key)) {
        const prev = seen.get(key);
        // Pertahankan entri yang lebih baru / punya harga valid
        if (sanitized.lastUpdated === 'Transaksi Terakhir' || (prev.prevPrice <= 0 && sanitized.prevPrice > 0)) {
          seen.set(key, { ...prev, ...sanitized });
        }
      } else {
        seen.set(key, sanitized);
      }
    });
    return Array.from(seen.values());
  },

  getCatalogSections(list) {
    const items = this.deduplicateDatabase(list || this.getDatabase());
    const sections = [];
    for (let i = 0; i < items.length; i += this.MAX_ITEMS_PER_SECTION) {
      sections.push({
        index: sections.length + 1,
        title: `Bagian ${sections.length + 1}`,
        max: this.MAX_ITEMS_PER_SECTION,
        items: items.slice(i, i + this.MAX_ITEMS_PER_SECTION)
      });
    }
    return sections;
  },

  // Database harga acuan bulan lalu (Default untuk anak rantau)
  defaultDatabase: [
    { id: 'p1', name: 'Minyak Goreng Sania 2L', category: 'staples', unit: 'liter', prevPrice: 43000, lastUpdated: 'Bulan Lalu' },
    { id: 'p2', name: 'Beras Rojolele 5kg', category: 'staples', unit: 'kg', prevPrice: 68000, lastUpdated: 'Bulan Lalu' },
    { id: 'p3', name: 'Telur Ayam Negeri 1kg', category: 'protein', unit: 'kg', prevPrice: 32000, lastUpdated: 'Bulan Lalu' },
    { id: 'p4', name: 'Garam Dapur Halus 500g', category: 'seasoning', unit: 'pack', prevPrice: 5000, lastUpdated: 'Bulan Lalu' },
    { id: 'p5', name: 'Indomie Goreng (Pack 5 pcs)', category: 'staples', unit: 'pack', prevPrice: 15500, lastUpdated: 'Bulan Lalu' },
    { id: 'p6', name: 'Susu UHT Ultra Milk 1L', category: 'beverage', unit: 'liter', prevPrice: 19500, lastUpdated: 'Bulan Lalu' },
    { id: 'p7', name: 'Sabun Mandi Lifebuoy Refill 450ml', category: 'toiletries', unit: 'pcs', prevPrice: 21000, lastUpdated: 'Bulan Lalu' },
    { id: 'p8', name: 'Pasta Gigi Pepsodent 190g', category: 'toiletries', unit: 'pcs', prevPrice: 14500, lastUpdated: 'Bulan Lalu' },
    { id: 'p9', name: 'Deterjen Bubuk Rinso 770g', category: 'toiletries', unit: 'pack', prevPrice: 22500, lastUpdated: 'Bulan Lalu' },
    { id: 'p10', name: 'Nugget Fiesta Crispy 500g', category: 'protein', unit: 'pack', prevPrice: 45000, lastUpdated: 'Bulan Lalu' },
    { id: 'p11', name: 'Kopi Kapal Api Mix 10s', category: 'beverage', unit: 'pack', prevPrice: 13500, lastUpdated: 'Bulan Lalu' },
    { id: 'p12', name: 'Roti Tawar Kupas', category: 'staples', unit: 'pack', prevPrice: 15000, lastUpdated: 'Bulan Lalu' },
    { id: 'p13', name: 'Biskuit Roma Kelapa 300g', category: 'snacks', unit: 'pack', prevPrice: 11500, lastUpdated: 'Bulan Lalu' },
    { id: 'p14', name: 'Saus Sambal ABC 275ml', category: 'seasoning', unit: 'pcs', prevPrice: 12000, lastUpdated: 'Bulan Lalu' },
    { id: 'p15', name: 'Sampo Pantene Anti Dandruff 160ml', category: 'toiletries', unit: 'pcs', prevPrice: 24000, lastUpdated: 'Bulan Lalu' },
    { id: 'p16', name: 'Bawang Merah Segar 250g', category: 'produce', unit: 'pack', prevPrice: 10000, lastUpdated: 'Bulan Lalu' },
    { id: 'p17', name: 'Wajan Penggorengan Anti Lengket', category: 'others', unit: 'pcs', prevPrice: 105000, lastUpdated: 'Bulan Lalu' }
  ],

  getDatabase() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const dt2Keys = ['telur', 'garam', 'beras', 'wajan'];
        const hasAllDt2 = dt2Keys.every(k => parsed.some(p => this.normalize(p.name).includes(k)));
        if (hasAllDt2) {
          const clean = this.deduplicateDatabase(parsed);
          if (clean.length !== parsed.length) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch (e) {
      console.error('Error loading price database:', e);
    }
    // Set default if empty or missing DT2 items
    const defaults = this.deduplicateDatabase(this.defaultDatabase);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  },

  saveDatabase(db) {
    const clean = this.deduplicateDatabase(db);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
  },

  normalize(str) {
    return (str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  },

  // Cari barang pembanding dari nama
  findBenchmarkItem(name) {
    if (!name || name.trim() === '') return null;
    const db = this.getDatabase();
    const queryNorm = this.normalize(name);

    // Exact or direct includes match
    let match = db.find(item => this.normalize(item.name) === queryNorm);
    if (match) return match;

    // Substring match
    match = db.find(item => {
      const itemNorm = this.normalize(item.name);
      return itemNorm.includes(queryNorm) || queryNorm.includes(itemNorm);
    });

    return match || null;
  },

  // F-04: Kalkulasi Komparasi Harga Realtime vs Bulan Lalu
  comparePrice(name, currentUnitPrice, unit) {
    const current = this.clampPrice(currentUnitPrice);
    if (current <= 0 || !name) {
      return {
        status: 'empty',
        diff: 0,
        diffPercent: 0,
        prevPrice: 0,
        arrow: '',
        label: 'Masukkan harga untuk komparasi',
        badgeClass: 'equal'
      };
    }

    const benchmark = this.findBenchmarkItem(name);

    if (!benchmark) {
      return {
        status: 'new',
        diff: 0,
        diffPercent: 0,
        prevPrice: 0,
        arrow: '🆕',
        label: 'Item Baru',
        detailText: 'Belum ada data bln lalu',
        badgeClass: 'new',
        benchmarkName: name
      };
    }

    const prev = this.clampPrice(benchmark.prevPrice);
    const diff = current - prev;
    const diffPercent = prev > 0 ? (diff / prev) * 100 : 0;
    const absDiff = Math.abs(diff);
    const formattedDiff = Math.round(absDiff).toLocaleString('id-ID');
    const formattedPrev = Math.round(prev).toLocaleString('id-ID');
    const pctText = diffPercent > 9999 ? '>9.999' : diffPercent.toFixed(1);

    if (diff > 0) {
      return {
        status: 'higher',
        diff: diff,
        diffPercent: diffPercent,
        prevPrice: prev,
        arrow: '↑',
        label: `Naik Rp ${formattedDiff} (+${pctText}%)`,
        badgeClass: 'higher',
        detailText: `Bln lalu Rp ${formattedPrev}`,
        benchmarkName: benchmark.name
      };
    } else if (diff < 0) {
      return {
        status: 'lower',
        diff: diff,
        diffPercent: diffPercent,
        prevPrice: prev,
        arrow: '↓',
        label: `Turun Rp ${formattedDiff} (${diffPercent.toFixed(1)}%)`,
        badgeClass: 'lower',
        detailText: `Bln lalu Rp ${formattedPrev}`,
        benchmarkName: benchmark.name
      };
    } else {
      return {
        status: 'equal',
        diff: 0,
        diffPercent: 0,
        prevPrice: prev,
        arrow: '=',
        label: `Sama persis (Rp ${formattedPrev})`,
        badgeClass: 'equal',
        detailText: `Bln lalu Rp ${formattedPrev}`,
        benchmarkName: benchmark.name
      };
    }
  },

  // Autocomplete suggestions saat user mengetik nama barang
  getSuggestions(query) {
    if (!query || query.trim().length < 2) return [];
    const db = this.getDatabase();
    const q = query.toLowerCase().trim();
    return db.filter(item => item.name.toLowerCase().includes(q)).slice(0, 5);
  },

  // Perbarui atau tambahkan harga acuan (ketika selesai belanja)
  updateBenchmark(name, unitPrice, category, unit) {
    const db = this.getDatabase();
    const queryNorm = this.normalize(name);
    if (!queryNorm) return;
    const existingIndex = db.findIndex(item => this.normalize(item.name) === queryNorm);

    const price = this.clampPrice(unitPrice);
    if (price <= 0) return;

    if (existingIndex >= 0) {
      db[existingIndex].name = name.trim();
      db[existingIndex].prevPrice = price;
      db[existingIndex].category = category || db[existingIndex].category;
      db[existingIndex].unit = unit || db[existingIndex].unit;
      db[existingIndex].lastUpdated = 'Transaksi Terakhir';
    } else {
      db.push({
        id: 'p_' + Date.now() + Math.random().toString(36).substr(2, 4),
        name: name.trim(),
        category: category || 'others',
        unit: unit || 'pcs',
        prevPrice: price,
        lastUpdated: 'Transaksi Baru'
      });
    }

    this.saveDatabase(db);
  }
};

window.PriceComparator = PriceComparator;
