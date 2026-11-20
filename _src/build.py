#!/usr/bin/env python3
"""
Build sederhana: gabungkan partial header/footer + isi halaman menjadi HTML final.
Jalankan:  python3 _src/build.py
Output:    index.html, profil.html, program.html, berita.html, galeri.html,
           spmb.html, kontak.html  (di root folder project)
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_src"

HEADER = (SRC / "header.html").read_text(encoding="utf-8")
FOOTER = (SRC / "footer.html").read_text(encoding="utf-8")

TEMPLATE = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#081a33">
<link rel="icon" type="image/png" href="assets/logo.png">
<link rel="apple-touch-icon" href="assets/logo.png">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/hero.jpg">
<script>document.documentElement.classList.add("js");</script>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
{header}

<main>
{body}
</main>

{footer}

<div class="lightbox" id="lightbox" role="dialog" aria-label="Pratinjau gambar" aria-modal="true">
  <button class="lightbox__close" aria-label="Tutup">&times;</button>
  <img alt="" id="lightboxImg">
</div>

<script src="js/config.js"></script>
<script src="js/supabase.js"></script>
<script src="js/cms.js"></script>
<script src="js/main.js"></script>
</body>
</html>
"""

PAGES = [
    ("index",   "SMP Labschool UNTAD Palu — Sekolah Laboratorium Yayasan Bungamputi",
                "SMP Labschool UNTAD Palu: sekolah menengah pertama di bawah Yayasan Bungamputi Universitas Tadulako. Informasi SPMB 2026/2027, program, seragam, berita, dan profil sekolah."),
    ("profil",  "Profil Sekolah — SMP Labschool UNTAD Palu",
                "Sejarah, visi misi, struktur organisasi, kepala sekolah, dan fasilitas SMP Labschool UNTAD Palu."),
    ("program", "Program, Seragam & Kegiatan — SMP Labschool UNTAD Palu",
                "Program unggulan, aturan seragam (putih biru, batik, pramuka), ekstrakurikuler, dan prestasi siswa."),
    ("berita",  "Berita & Pengumuman — SMP Labschool UNTAD Palu",
                "Kabar terbaru, prestasi, agenda, dan pengumuman resmi SMP Labschool UNTAD Palu."),
    ("galeri",  "Galeri Kegiatan — SMP Labschool UNTAD Palu",
                "Dokumentasi kegiatan akademik, seni, olahraga, pramuka, dan momen siswa SMP Labschool UNTAD."),
    ("spmb",    "SPMB 2026/2027 — SMP Labschool UNTAD Palu",
                "Informasi penerimaan peserta didik baru kelas VII: jalur pendaftaran, syarat, jadwal, biaya, dan formulir online."),
    ("kontak",  "Kontak & Lokasi — SMP Labschool UNTAD Palu",
                "Alamat, telepon, email, jam layanan, dan formulir kontak SMP Labschool UNTAD Palu."),
]

NAV_ACTIVE = {
    "index": "index.html", "profil": "profil.html", "program": "program.html",
    "berita": "berita.html", "galeri": "galeri.html", "spmb": "spmb.html",
    "kontak": "kontak.html",
}


def mark_active(header_html: str, page: str) -> str:
    target = f'href="{NAV_ACTIVE[page]}"'
    # hanya tautan di nav utama, bukan dropdown / drawer
    return header_html.replace(
        f'<a class="nav__link" {target}>', f'<a class="nav__link" aria-current="page" {target}>'
    )


def build():
    for page, title, desc in PAGES:
        body_path = SRC / "pages" / f"{page}.html"
        body = body_path.read_text(encoding="utf-8")
        html = TEMPLATE.format(
            title=title, desc=desc,
            header=mark_active(HEADER, page), footer=FOOTER, body=body,
        )
        out = ROOT / f"{page}.html"
        out.write_text(html, encoding="utf-8")
        print(f"  ✓ {out.name}  ({len(html)/1024:.1f} KB)")


if __name__ == "__main__":
    build()
