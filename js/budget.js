/**
 * SMART GROCERY - F-05 Pengendali Anggaran (Safety Cap)
 * Mengontrol batas maksimal uang belanja, memberikan peringatan visual dan audio/haptik
 * saat mendekati atau melampaui limit anggaran anak rantau
 */

const BudgetSafetyCap = {
  STORAGE_KEY: 'sg_budget_cap',
  DEFAULT_CAP: 500000, // Rp 500.000 standar belanja bulanan anak rantau

  getCap() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return Math.max(10000, parseFloat(stored) || this.DEFAULT_CAP);
      }
    } catch (e) {
      console.error('Error loading budget cap:', e);
    }
    localStorage.setItem(this.STORAGE_KEY, this.DEFAULT_CAP);
    return this.DEFAULT_CAP;
  },

  setCap(newCap) {
    const cap = Math.max(10000, parseFloat(newCap) || this.DEFAULT_CAP);
    localStorage.setItem(this.STORAGE_KEY, cap);
    return cap;
  },

  /**
   * Status Anggaran (F-05):
   * 1. 'safe' (Aman): total <= 75% limit
   * 2. 'warning' (Waspada): 75% < total <= 95% limit
   * 3. 'danger' (Bahaya / Overbudget): total > 95% limit (terutama > 100%)
   */
  evaluateStatus(totalExpenditure) {
    const cap = this.getCap();
    const spent = Math.max(0, parseFloat(totalExpenditure) || 0);
    const percentage = cap > 0 ? (spent / cap) * 100 : 0;
    const remaining = cap - spent;

    let status = 'safe';
    let label = 'Aman';
    let message = 'Troli dalam kendali aman';
    let icon = 'shield-check';

    if (percentage > 100) {
      status = 'danger';
      label = 'Overbudget!';
      const over = spent - cap;
      message = `WASPADA: Belanja melampaui limit Rp ${over.toLocaleString('id-ID')}!`;
      icon = 'alert-octagon';
    } else if (percentage >= 95) {
      status = 'danger';
      label = 'Kritis (95%+)';
      message = `Kritis! Sisa uang belanja tinggal Rp ${remaining.toLocaleString('id-ID')}`;
      icon = 'alert-triangle';
    } else if (percentage >= 75) {
      status = 'warning';
      label = 'Mendekati Limit';
      message = `Perhatian: Sudah ${percentage.toFixed(0)}% anggaran terpakai. Sisa Rp ${remaining.toLocaleString('id-ID')}`;
      icon = 'alert-circle';
    } else {
      status = 'safe';
      label = 'Anggaran Aman';
      message = `Sisa kuota belanja anak rantau: Rp ${remaining.toLocaleString('id-ID')}`;
      icon = 'shield-check';
    }

    return {
      cap,
      spent,
      remaining,
      percentage: Math.min(100, Math.round(percentage)),
      rawPercentage: percentage,
      status,
      label,
      message,
      icon
    };
  }
};

window.BudgetSafetyCap = BudgetSafetyCap;
