/**
 * SMART GROCERY - F-04 Komparator Harga Realtime vs Bulan Lalu
 * Membandingkan harga satuan barang saat ini dengan harga belanja bulan lalu
 */

const PriceComparator = {
  STORAGE_KEY: 'sg_benchmark_prices',

  // Database harga acuan bulan lalu (Default untuk anak rantau)
  defaultDatabase: [
    { id: 'p1', name: 'Minyak Goreng Sania 2L', category: 'staples', unit: 'liter', prevPrice: 34000, lastUpdated: 'Bulan Lalu' },
    { id: 'p2', name: 'Beras Rojolele 5kg', category: 'staples', unit: 'kg', prevPrice: 68000, lastUpdated: 'Bulan Lalu' },
    { id: 'p3', name: 'Telur Ayam Negeri 1kg', category: 'protein', unit: 'kg', prevPrice: 28000, lastUpdated: 'Bulan Lalu' },
    { id: 'p4', name: 'Indomie Goreng (Pack 5 pcs)', category: 'staples', unit: 'pack', prevPrice: 15500, lastUpdated: 'Bulan Lalu' },
    { id: 'p5', name: 'Susu UHT Ultra Milk 1L', category: 'beverage', unit: 'liter', prevPrice: 19500, lastUpdated: 'Bulan Lalu' },
    { id: 'p6', name: 'Sabun Mandi Lifebuoy Refill 450ml', category: 'toiletries', unit: 'pcs', prevPrice: 21000, lastUpdated: 'Bulan Lalu' },
    { id: 'p7', name: 'Pasta Gigi Pepsodent 190g', category: 'toiletries', unit: 'pcs', prevPrice: 14500, lastUpdated: 'Bulan Lalu' },
    { id: 'p8', name: 'Deterjen Bubuk Rinso 770g', category: 'toiletries', unit: 'pack', prevPrice: 22500, lastUpdated: 'Bulan Lalu' },
    { id: 'p9', name: 'Nugget Fiesta Crispy 500g', category: 'protein', unit: 'pack', prevPrice: 45000, lastUpdated: 'Bulan Lalu' },
    { id: 'p10', name: 'Kopi Kapal Api Mix 10s', category: 'beverage', unit: 'pack', prevPrice: 13500, lastUpdated: 'Bulan Lalu' },
    { id: 'p11', name: 'Roti Tawar Kupas', category: 'staples', unit: 'pack', prevPrice: 15000, lastUpdated: 'Bulan Lalu' },
    { id: 'p12', name: 'Biskuit Roma Kelapa 300g', category: 'snacks', unit: 'pack', prevPrice: 11500, lastUpdated: 'Bulan Lalu' },
    { id: 'p13', name: 'Saus Sambal ABC 275ml', category: 'seasoning', unit: 'pcs', prevPrice: 12000, lastUpdated: 'Bulan Lalu' },
    { id: 'p14', name: 'Sampo Pantene Anti Dandruff 160ml', category: 'toiletries', unit: 'pcs', prevPrice: 24000, lastUpdated: 'Bulan Lalu' },
    { id: 'p15', name: 'Bawang Merah Segar 250g', category: 'produce', unit: 'pack', prevPrice: 10000, lastUpdated: 'Bulan Lalu' }
  ],

  getDatabase() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading price database:', e);
    }
    // Set default if empty
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.defaultDatabase));
    return this.defaultDatabase;
  },

  saveDatabase(db) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));
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
    const current = parseFloat(currentUnitPrice) || 0;
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
        label: 'Item Baru (Belum ada data bln lalu)',
        badgeClass: 'new',
        benchmarkName: name
      };
    }

    const prev = benchmark.prevPrice;
    const diff = current - prev;
    const diffPercent = prev > 0 ? (diff / prev) * 100 : 0;
    const absDiff = Math.abs(diff);
    const formattedDiff = absDiff.toLocaleString('id-ID');
    const formattedPrev = prev.toLocaleString('id-ID');

    if (diff > 0) {
      return {
        status: 'higher',
        diff: diff,
        diffPercent: diffPercent,
        prevPrice: prev,
        arrow: '↑',
        label: `↑ Naik Rp ${formattedDiff} (+${diffPercent.toFixed(1)}%)`,
        badgeClass: 'higher',
        detailText: `Bulan lalu Rp ${formattedPrev}. Sekarang lebih mahal Rp ${formattedDiff}.`,
        benchmarkName: benchmark.name
      };
    } else if (diff < 0) {
      return {
        status: 'lower',
        diff: diff,
        diffPercent: diffPercent,
        prevPrice: prev,
        arrow: '↓',
        label: `↓ Turun Rp ${formattedDiff} (${diffPercent.toFixed(1)}%)`,
        badgeClass: 'lower',
        detailText: `Bulan lalu Rp ${formattedPrev}. Hemat Rp ${formattedDiff}!`,
        benchmarkName: benchmark.name
      };
    } else {
      return {
        status: 'equal',
        diff: 0,
        diffPercent: 0,
        prevPrice: prev,
        arrow: '=',
        label: `= Sama persis (Rp ${formattedPrev})`,
        badgeClass: 'equal',
        detailText: `Harga persis sama dengan belanja bulan lalu (Rp ${formattedPrev}).`,
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
    const existingIndex = db.findIndex(item => this.normalize(item.name) === queryNorm);

    const price = parseFloat(unitPrice) || 0;
    if (price <= 0) return;

    if (existingIndex >= 0) {
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
