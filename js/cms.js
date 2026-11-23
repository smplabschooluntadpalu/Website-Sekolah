/* =========================================================
   cms.js — Memuat konten dinamis dari Supabase
   ---------------------------------------------------------
   Halaman publik membaca data dari tabel:
     berita, agenda, galeri, pengaturan
   Jika Supabase tidak terjangkau, konten statis bawaan
   HTML tetap ditampilkan (fallback otomatis).

   Muat setelah js/config.js + js/supabase.js, sebelum main.js
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const KATEGORI = {
    akademik: { label: "Akademik", warna: "#002080" },
    prestasi: { label: "Prestasi", warna: "#1f9d74" },
    kesiswaan: { label: "Kesiswaan", warna: "#e8a33d" },
    pengumuman: { label: "Pengumuman", warna: "#000080" },
  };

  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const BULAN_PANJANG = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtTanggal(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return iso;
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function badge(kategori) {
    const k = KATEGORI[kategori] || { label: kategori, warna: "#002080" };
    return `<span class="card__badge" style="background:${k.warna};color:#fff">${esc(k.label)}</span>`;
  }

  function pill(kategori) {
    const k = KATEGORI[kategori] || { label: kategori };
    return `<span class="pill">${esc(k.label)}</span>`;
  }

  /* Animasi reveal untuk elemen yang dirender dinamis */
  function observeReveal(scope) {
    const els = $$(".reveal:not(.is-visible)", scope);
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ================= PENGATURAN ================= */
  async function loadPengaturan() {
    const rows = await SupabaseDB.from("pengaturan").select("*");
    const P = {};
    rows.forEach((r) => (P[r.kunci] = r.nilai));

    // Telepon (topbar, footer, kontak)
    if (P.telepon) {
      $$("[data-cms-telepon]").forEach((el) => {
        el.textContent = P.telepon;
        if (el.tagName === "A") el.href = "tel:" + (P.telepon_link || P.telepon);
      });
    }
    // Email
    if (P.email) {
      $$("[data-cms-email]").forEach((el) => {
        el.textContent = P.email;
        if (el.tagName === "A") el.href = "mailto:" + P.email;
      });
    }
    // Alamat
    if (P.alamat) {
      $$("[data-cms-alamat]").forEach((el) => (el.textContent = P.alamat));
    }
    // Jam layanan
    if (P.jam_layanan) {
      $$("[data-cms-jam]").forEach((el) => (el.textContent = P.jam_layanan));
    }
    // NPSN
    if (P.npsn) {
      $$("[data-cms-npsn]").forEach((el) => (el.textContent = "NPSN " + P.npsn));
    }
    // Tautan media sosial (topbar & footer)
    ["instagram", "facebook", "youtube", "tiktok"].forEach((nama) => {
      const url = (P["sosial_" + nama] || "").trim();
      $$(`[data-cms-sosial="${nama}"]`).forEach((el) => {
        if (url) {
          el.href = url;
          el.target = "_blank";
          el.rel = "noopener";
          el.style.display = "";
        } else {
          // Ikon disembunyikan jika URL belum diisi admin
          el.style.display = "none";
        }
      });
    });
    // Teks halaman (judul & keterangan) — kunci di DB: teks_<halaman>.<bagian>
    $$("[data-cms-text]").forEach((el) => {
      const v = P["teks_" + el.dataset.cmsText];
      // innerHTML agar penekanan (em/strong) bawaan tetap tampil bila ada
      if (v && v.trim()) el.innerHTML = v;
    });
    // Angka statistik satuan (non-animasi) — kunci: stat_*
    $$("[data-cms-stat]").forEach((el) => {
      const v = P[el.dataset.cmsStat];
      if (v && v.trim()) el.textContent = v;
    });
    // Target countdown SPMB
    if (P.ppdb_target) {
      const cd = $("#countdown");
      if (cd) cd.dataset.target = P.ppdb_target;
    }
    // Statistik beranda
    const statMap = {
      stat_siswa: 0,
      stat_guru: 1,
      stat_ekskul: 2,
      stat_lulusan: 3,
    };
    Object.keys(statMap).forEach((key) => {
      if (!P[key]) return;
      const counters = $$("[data-count]");
      const el = counters[statMap[key]];
      if (el) {
        el.dataset.count = P[key];
        // Jika animasi counter sudah berjalan, langsung tampilkan nilai baru
        if (el.textContent && el.textContent !== "0") {
          el.textContent = Number(P[key]).toLocaleString("id-ID");
        }
      }
    });
  }

  /* ================= BERITA ================= */
  function kartuBerita(b) {
    return `
    <article class="card reveal" data-cat="${esc(b.kategori)}">
      <div class="card__media">
        <img src="${esc(b.gambar || "assets/hero.jpg")}" alt="${esc(b.judul)}" loading="lazy">
        ${badge(b.kategori)}
      </div>
      <div class="card__body">
        <div class="card__meta">
          ${pill(b.kategori)}
          <span>${fmtTanggal(b.tanggal)}</span>
        </div>
        <h3><a href="berita.html">${esc(b.judul)}</a></h3>
        <p>${esc(b.ringkasan)}</p>
        <a class="link-arrow" href="berita.html">Baca
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
        </a>
      </div>
    </article>`;
  }

  function beritaUnggulan(b) {
    return `
    <article class="card post--wide reveal" style="margin-bottom:44px">
      <div class="card__media">
        <img src="${esc(b.gambar || "assets/hero.jpg")}" alt="${esc(b.judul)}">
        <span class="card__badge">Utama</span>
      </div>
      <div class="card__body">
        <div class="card__meta">
          ${pill(b.kategori)}
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
            ${fmtTanggal(b.tanggal)}
          </span>
          <span>· ${esc(b.penulis || "Humas Sekolah")}</span>
        </div>
        <h2 style="font-size:clamp(1.5rem,2.6vw,2rem)">${esc(b.judul)}</h2>
        <p>${esc(b.ringkasan)}</p>
        <a class="link-arrow" href="berita.html">
          Baca selengkapnya
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
        </a>
      </div>
    </article>`;
  }

  async function loadBerita() {
    const data = await SupabaseDB.from("berita")
      .select("*")
      .order("tanggal", { ascending: false });
    if (!data || !data.length) return;

    // Halaman berita: artikel unggulan + daftar
    const wrapUnggulan = $("#berita-unggulan");
    const list = $("#news-list");
    if (wrapUnggulan && list) {
      const unggulan = data.find((b) => b.unggulan) || data[0];
      wrapUnggulan.innerHTML = beritaUnggulan(unggulan);
      const lainnya = data.filter((b) => b.id !== unggulan.id);
      list.innerHTML = lainnya.map(kartuBerita).join("");
      const count = $("#resultCount");
      if (count) count.textContent = `${lainnya.length} artikel`;
      observeReveal(document);
    }

    // Beranda: 3 berita terbaru
    const homeList = $("#home-news-list");
    if (homeList) {
      homeList.innerHTML = data
        .slice(0, 2)
        .map(
          (b) => `
        <article class="card reveal">
          <div class="card__media">
            <img src="${esc(b.gambar || "assets/hero.jpg")}" alt="${esc(b.judul)}" loading="lazy">
            ${badge(b.kategori)}
          </div>
          <div class="card__body">
            <div class="card__meta">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
                ${fmtTanggal(b.tanggal)}
              </span>
            </div>
            <h3><a href="berita.html">${esc(b.judul)}</a></h3>
            <p>${esc(b.ringkasan)}</p>
          </div>
        </article>`
        )
        .join("");
      const homeRow = $("#home-news-row");
      if (homeRow && data[2]) {
        const b = data[2];
        homeRow.innerHTML = `
          <article class="card card--row">
            <div class="card__media" style="max-width:220px">
              <img src="${esc(b.gambar || "assets/hero.jpg")}" alt="${esc(b.judul)}" loading="lazy">
            </div>
            <div class="card__body">
              <div class="card__meta">
                ${pill(b.kategori)}
                <span>${fmtTanggal(b.tanggal)}</span>
              </div>
              <h3 style="font-size:1.05rem"><a href="berita.html">${esc(b.judul)}</a></h3>
            </div>
          </article>`;
      }
      observeReveal(document);
    }
  }

  /* ================= AGENDA ================= */
  function itemAgenda(a, asLink) {
    const d = new Date(a.tanggal + "T00:00:00");
    const day = isNaN(d) ? "-" : d.getDate();
    const mon = isNaN(d) ? "" : BULAN[d.getMonth()];
    const pillClass =
      a.audiens === "Publik" ? "pill pill--gold" : a.audiens === "Calon siswa" ? "pill pill--green" : "pill";
    const inner = `
      <div class="agenda__date"><strong>${day}</strong><span>${mon}</span></div>
      <div class="agenda__body">
        <h4>${esc(a.judul)}</h4>
        <p>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          ${esc([a.waktu, a.tempat].filter(Boolean).join(" · "))}
        </p>
      </div>
      <span class="${pillClass}" style="margin-left:auto">${esc(a.audiens)}</span>`;
    return asLink
      ? `<a class="agenda__item" href="berita.html">${inner}</a>`
      : `<div class="agenda__item">${inner}</div>`;
  }

  async function loadAgenda() {
    const data = await SupabaseDB.from("agenda")
      .select("*")
      .order("tanggal", { ascending: true });
    if (!data || !data.length) return;

    const list = $("#agenda-list");
    if (list) list.innerHTML = data.map((a) => itemAgenda(a, false)).join("");

    const homeList = $("#home-agenda-list");
    if (homeList) homeList.innerHTML = data.slice(0, 3).map((a) => itemAgenda(a, true)).join("");
  }

  /* ================= GALERI ================= */
  async function loadGaleri() {
    const data = await SupabaseDB.from("galeri")
      .select("*")
      .order("urutan", { ascending: true });
    if (!data || !data.length) return;

    const gallery = $("#gallery");
    if (gallery) {
      gallery.innerHTML = data
        .map(
          (g) => `
        <a href="${esc(g.gambar)}" data-alt="${esc(g.keterangan)}">
          <img src="${esc(g.gambar)}" alt="${esc(g.keterangan)}" loading="lazy">
        </a>`
        )
        .join("");
    }

    const strip = $("#gal-strip");
    if (strip) {
      strip.innerHTML = data
        .slice(0, 4)
        .map(
          (g) => `<a href="galeri.html"><img src="${esc(g.gambar)}" alt="${esc(g.keterangan)}" loading="lazy"></a>`
        )
        .join("");
    }
  }

  /* ================= JALANKAN ================= */
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.SupabaseDB) return;
    // Semua dimuat paralel; kegagalan satu tidak menggagalkan yang lain
    loadPengaturan().catch((e) => console.warn("[cms] pengaturan:", e.message));
    loadBerita().catch((e) => console.warn("[cms] berita:", e.message));
    loadAgenda().catch((e) => console.warn("[cms] agenda:", e.message));
    loadGaleri().catch((e) => console.warn("[cms] galeri:", e.message));
  });
})();
