# Smart Grocery & Budget Safety Tracker (Mobile PWA)

Aplikasi Progressive Web App (PWA) bergaya mobile native untuk melacak belanja bulanan dan mengamankan anggaran anak rantau saat mendorong troli di supermarket.

## 🚀 Fitur Utama (Sesuai Checklist SRS)
- **F-01**: Pencatatan Item Belanja Lengkap (Nama, 8 Kategori, Satuan kg/liter/pcs/pack, Kuantitas, Harga Satuan Rupiah).
- **F-02**: Perhitungan Kuantitas Otomatis secara Realtime saat kuantitas atau harga diubah.
- **F-03**: Kalkulator Diskon Bertingkat (Compound Discount, misal 50% + 20% dihitung berurutan, bukan dijumlahkan 70%).
- **F-04**: Komparator Harga Realtime vs Bulan Lalu (Indikator ↑ Merah / Naik, ↓ Hijau / Turun, = Stabil).
- **F-05**: Pengendali Anggaran (Safety Cap) dengan status visual dinamis (Aman, Waspada, Bahaya/Overbudget berdenyut dan peringatan haptik).
- **F-06**: Riwayat dan Basis Data Belanja Terstruktur (Menyimpan sesi belanja, memperbarui harga acuan bulan depan, salin troli, serta Export/Import JSON).

## 📱 Standar Mobile UI & PWA
- Layar khusus smartphone (lebar maksimal 430px, centered di desktop).
- Floating Bottom Navigation Bar (Tab: Belanja, Riwayat, Anggaran) dengan ikon Lucide.
- Komponen ergonomis jempol (Touch target >= 48px, Stepper besar, Chips harga cepat, Bottom Sheet modal).
- PWA terintegrasi: `manifest.json`, `sw.js` (offline caching), dan Add to Home Screen.

## 💻 Menjalankan Aplikasi
Server lokal berjalan di:
```bash
node server.js
```
Akses di browser: `http://localhost:3000/` atau buka di browser HP pada jaringan WiFi yang sama.
