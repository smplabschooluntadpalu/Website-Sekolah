# SMP Labschool UNTAD Palu — Website Sekolah (Custom Static)

Website **SMP Labschool UNTAD** (Yayasan Bungamputi · Universitas Tadulako, Palu)
bergaya **Eduma (classic education)** — navy + orange sesuai logo sekolah, hero besar,
kartu program, berita, agenda, countdown SPMB — dibuat **custom HTML/CSS/JS**
tanpa WordPress/LMS, jadi ringan, cepat, dan bisa di-hosting gratis.

## Buka dulu

`index.html` — beranda. Semua tautan antarhalaman sudah berfungsi dari file lokal.

## Struktur

```
sekolah/
├─ index.html          Beranda (hero gedung sekolah, statistik, sambutan kepsek, program, seragam, berita, countdown)
├─ profil.html         Profil: identitas, visi-misi, sejarah, struktur, kepsek, guru, fasilitas
├─ program.html        Program unggulan, aturan seragam (putih biru/batik/pramuka), ekskul, prestasi
├─ berita.html         Berita utama, filter kategori (JS), pagination, agenda
├─ galeri.html         Grid galeri + lightbox
├─ ppdb.html           Jalur, alur 4 langkah, syarat, jadwal, biaya, formulir tervalidasi, FAQ
├─ kontak.html         Kontak, form pesan, peta (OpenStreetMap embed)
├─ css/style.css       Seluruh desain (design token di :root, responsif 360–1440px)
├─ js/main.js          Nav mobile, scroll reveal, counter, countdown, filter, validasi, lightbox
├─ assets/             logo.png, kepsek.png (cutout transparan), campus.jpg, siswa.jpg + foto kegiatan
└─ _src/               Sumber partial: header.html, footer.html, pages/*.html, build.py
```

### Mengedit header/footer/menu (penting)

Header & footer dipakai bersama 7 halaman. Jangan edit 7 file HTML satu-satu —
edit partialnya lalu build ulang:

```bash
cd sekolah
python3 _src/build.py      # menghasilkan ulang semua *.html
```

- Menu: `_src/header.html`
- Footer: `_src/footer.html`
- Isi tiap halaman: `_src/pages/*.html`

## Ganti konten contoh

| Yang diganti | Lokasi |
|---|---|
| Nama sekolah, alamat, telepon, email | `_src/header.html`, `_src/footer.html` |
| NPSN, akreditasi, nama wakasek | `_src/footer.html`, `_src/pages/profil.html` |
| Jadwal seragam | `_src/pages/program.html` (bagian "Seragam & Budaya Sekolah") + `_src/pages/index.html` (ringkasan) |
| Foto | timpa file di `assets/` dengan nama sama (hero.jpg, campus.jpg, dst.) |
| Data statistik | atribut `data-count` di `_src/pages/index.html` |
| Tanggal countdown SPMB | `data-target` pada `#countdown` (format ISO 8601 +08:00) |
| Peta | ganti `src` iframe di `_src/pages/kontak.html` dengan embed Google Maps |
| Warna brand | blok `:root` di `css/style.css` — navy `#00104f–#002080`, orange `#f7941d`, hijau `#6ba32a` |
| Logo | ganti `assets/logo.png` (PNG transparan) |
| Foto kepala sekolah | ganti `assets/kepsek.png` (cutout) dan `assets/kepsek-square.png` (profil); `assets/kepsek.jpg` untuk galeri |

## Formulir SPMB & kontak

Validasi sudah jalan di sisi klien, tapi **belum mengirim ke mana pun** (demo).
Untuk produksi, pilih salah satu:

1. **Google Forms / Microsoft Forms** — buat form, lalu ganti elemen `<form>` dengan iframe embed.
2. **Formspree / Getform** — gratis untuk volume kecil, cukup `action="https://formspree.io/f/xxxx"`.
3. **WhatsApp** — susun pesan dari input lalu buka `wa.me/62xxx?text=...` (tanpa backend).
4. **Backend sendiri** — PHP/Node endpoint di hosting yang sama.

## Deploy (gratis, tanpa server)

1. **Cloudflare Pages** — drag folder `sekolah` → online. Dukung domain `.sch.id`/custom.
2. **Netlify** — drag & drop ke app.netlify.com/drop.
3. **GitHub Pages** — push ke repo, aktifkan Pages.
4. **Hosting sekolah biasa (cPanel)** — upload isi folder ke `public_html`.

Domain **.sch.id** didaftarkan lewat registrar resmi PANDI dengan surat keterangan
kepala sekolah; arahkan DNS ke hosting di atas.

## Catatan kualitas

- Responsif diuji 360/390/768/1024/1280/1440 px tanpa overflow horizontal.
- Aksesibilitas: skip struktur heading, `aria-current` pada menu aktif, label form,
  fokus terlihat, `prefers-reduced-motion` dihormati.
- Tanpa framework/CDN — hanya 1 CSS + 1 JS, gambar JPEG teroptimasi (±1,2 MB total).
- Semua foto bersifat ilustrasi AI dan bisa diganti foto asli sekolah.

---

**Alternatif:** kalau nanti butuh login siswa, kursus online, kuis, dan sertifikat
(seperti demo Eduma), pilihan paling dekat adalah WordPress + theme Eduma
(±US$69 sekali bayar) + plugin LMS LearnPress. Website custom ini bisa tetap
dipakai sebagai halaman profil sekolah, dengan LMS di subdomain terpisah.

## Panel Admin (CMS)

Website ini sudah terhubung ke **Supabase** sebagai backend. Admin bisa mengelola
berita, agenda, galeri, dan info umum (kontak, statistik, tanggal penutupan SPMB)
lewat panel admin di:

```
/admin/          →  buka admin/index.html
```

### Membuat akun admin pertama (satu kali)

Pendaftaran publik dimatikan demi keamanan, jadi akun admin dibuat manual:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → proyek ini.
2. Masuk ke **Authentication → Users → Add user → Create new user**.
3. Isi email + kata sandi admin, centang **Auto Confirm User**, klik **Create user**.
4. Admin sekarang bisa masuk di `https://<domain-anda>/admin/`.

### Yang bisa dikelola admin

| Menu | Tampil di website |
|---|---|
| Berita | Halaman Berita (kartu + filter kategori) & Beranda |
| Agenda | Halaman Berita & Beranda |
| Galeri | Halaman Galeri & strip galeri Beranda |
| Pengaturan | Header, footer, halaman Kontak, statistik & countdown SPMB di Beranda |

Gambar bisa di-upload langsung dari formulir (tersimpan di Supabase Storage,
bucket `media`) atau diisi URL gambar.

### Berkas teknis CMS

```
├─ admin/
│  ├─ index.html       Panel admin (login + dashboard + CRUD)
│  ├─ css/admin.css    Tampilan panel admin
│  └─ js/admin.js      Logika admin (Supabase Auth, REST, Storage)
├─ js/config.js        Konfigurasi Supabase (URL + anon key — aman untuk publik)
├─ js/supabase.js      Klien Supabase tanpa dependensi
└─ js/cms.js           Loader konten dinamis untuk situs publik (dengan fallback statis)
```

Catatan keamanan: yang dipakai di frontend hanyalah **anon key** — aman karena
Row Level Security (RLS) aktif: publik hanya bisa membaca, menulis data wajib
login. **Jangan pernah** menaruh `service_role` key di berkas mana pun di repo ini.
