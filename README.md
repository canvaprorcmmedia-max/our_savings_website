# Our Savings — Website Pencatatan Tabungan

Website sederhana untuk mencatat tabungan bersama pasangan, dengan akses dan penyimpanan lokal pada browser.

## Cara menjalankan
1. Ekstrak ZIP.
2. Buka folder `our_savings_website`.
3. Klik dua kali `index.html` untuk membukanya di browser modern (Chrome, Edge, Firefox).
4. Buka menu **Pengaturan** untuk mengganti nama penyetor dan mengisi saldo awal.
5. Tambahkan setoran atau penarikan melalui tombol **Tambah transaksi**.
6. Tambahkan target melalui menu **Target Tabungan**.

Tidak perlu instalasi atau server untuk versi dasar ini.

## Fitur
- Dashboard saldo gabungan dan total kontribusi masing-masing.
- Pencatatan setoran dan penarikan.
- Edit dan pembatalan transaksi.
- Target tabungan dan progres.
- Laporan grafik setoran enam bulan terakhir.
- Ekspor data JSON dan ekspor transaksi CSV.
- Pulihkan data dari file JSON.
- Responsif untuk desktop dan ponsel.

## Penting: batasan privasi dan penyimpanan
Versi ini menyimpan data dengan `localStorage` di browser/perangkat yang digunakan. Data tidak otomatis tersinkron ke perangkat lain dan bisa hilang jika data situs/browser dibersihkan atau profil browser dihapus. Orang lain yang memakai profil browser yang sama berpotensi mengaksesnya. Ekspor cadangan JSON secara berkala dan simpan di tempat aman.

Website ini **belum** memiliki autentikasi/login, database online, sinkronisasi lintas perangkat, atau enkripsi khusus. Jika akan dipublikasikan online atau memerlukan privasi yang lebih kuat, integrasikan autentikasi dan database server (misalnya Supabase dengan Row Level Security) sebelum memasukkan data sensitif. Jangan menyimpan PIN, password bank, atau kredensial rekening.

## Struktur file
- `index.html` — aplikasi lengkap (HTML, CSS, JavaScript)
- `README.md` — panduan penggunaan
- `LICENSE.txt` — lisensi penggunaan

## Catatan
Saldo awal dimasukkan di Pengaturan. Setoran/penarikan setelahnya akan dihitung dari riwayat transaksi. Saldo kontribusi per orang menampilkan jumlah setoran kotor; penarikan mengurangi saldo gabungan.
