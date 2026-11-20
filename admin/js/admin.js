/* =========================================================
   Panel Admin — SMP Labschool UNTAD Palu
   Login via Supabase Auth, CRUD via Supabase REST,
   upload gambar via Supabase Storage (bucket "media").
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

  const loginView = $("#loginView");
  const appView = $("#appView");
  const toastEl = $("#toast");

  /* ---------- Util ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtTanggal(iso) {
    if (!iso) return "-";
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return isNaN(d) ? iso : `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("is-error", !!isError);
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.hidden = true), 3200);
  }
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function uniquePath(file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const rand = Math.random().toString(36).slice(2, 9);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${stamp}-${rand}.${ext || "jpg"}`;
  }

  // Path gambar relatif (mis. "assets/gen-1.jpg") mengacu ke situs publik
  // di root; panel admin berada di /admin/ sehingga perlu naik satu level.
  function resolveImg(url) {
    if (!url) return "";
    if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("/")) return url;
    return "../" + url.replace(/^\.?\//, "");
  }

  /* ---------- Sesi & tampilan ---------- */
  function showApp(user) {
    loginView.hidden = true;
    appView.hidden = false;
    loadDashboard();
    switchView("dashboard");
  }
  function showLogin() {
    appView.hidden = true;
    loginView.hidden = false;
  }

  async function init() {
    let session = SupabaseDB.auth.session;
    if (session && session.expires_at && session.expires_at * 1000 < Date.now()) {
      session = await SupabaseDB.auth.refresh();
    }
    if (session && session.user) showApp(session.user);
    else showLogin();
  }

  /* ---------- Toggle tampil/sembunyi password ---------- */
  const togglePw = $("#togglePassword");
  if (togglePw) {
    togglePw.addEventListener("click", () => {
      const input = $("#loginPassword");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      togglePw.querySelector(".eye-open").style.display = show ? "none" : "";
      togglePw.querySelector(".eye-closed").style.display = show ? "" : "none";
      togglePw.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
      input.focus();
    });
  }

  /* ---------- Login / Logout ---------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    const err = $("#loginError");
    const btn = $("#loginBtn");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Memproses...";
    try {
      const user = await SupabaseDB.auth.signIn(email, password);
      $("#loginForm").reset(); // bersihkan email & password setelah login
      showApp(user);
      toast("Berhasil masuk. Selamat datang!");
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "LOGIN";
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await SupabaseDB.auth.signOut();
    $("#loginForm").reset(); // bersihkan isian saat keluar
    showLogin();
    toast("Anda telah keluar.");
  });

  /* ---------- Navigasi ---------- */
  const TITLES = {
    dashboard: "Dashboard",
    berita: "Kelola Berita",
    agenda: "Kelola Agenda",
    galeri: "Kelola Galeri",
    teks: "Teks Halaman",
    pengaturan: "Pengaturan Website",
  };
  function switchView(name) {
    $$(".nav-item[data-view]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.view === name)
    );
    $$(".view").forEach((v) => (v.hidden = v.id !== "view-" + name));
    $("#pageTitle").textContent = TITLES[name] || name;
    closeSidebar();
    if (name === "berita") loadBerita();
    if (name === "agenda") loadAgenda();
    if (name === "galeri") loadGaleri();
    if (name === "pengaturan") loadPengaturan();
    if (name === "teks") loadTeks($("#teksPage").value);
    if (name === "dashboard") loadDashboard();
  }
  $$(".nav-item[data-view]").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );
  $$("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => {
      switchView(b.dataset.goto);
      if (b.dataset.action === "new") {
        // buka form baru setelah view dimuat
        setTimeout(() => {
          if (b.dataset.goto === "berita") openBeritaForm();
          if (b.dataset.goto === "agenda") openAgendaForm();
          if (b.dataset.goto === "galeri") openGaleriForm();
        }, 60);
      }
    })
  );

  /* Sidebar mobile */
  const sidebar = $("#sidebar");
  const backdrop = $("#sidebarBackdrop");
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
  }
  $("#burger").addEventListener("click", () => {
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
  });
  backdrop.addEventListener("click", closeSidebar);

  /* ---------- Dashboard ---------- */
  async function loadDashboard() {
    try {
      const [b, a, g, p] = await Promise.all([
        SupabaseDB.from("berita").select("id"),
        SupabaseDB.from("agenda").select("id"),
        SupabaseDB.from("galeri").select("id"),
        SupabaseDB.from("pengaturan").select("kunci"),
      ]);
      $("#statBerita").textContent = b.length;
      $("#statAgenda").textContent = a.length;
      $("#statGaleri").textContent = g.length;
      $("#statPengaturan").textContent = p.length;
    } catch (e) {
      console.warn(e);
    }
  }

  /* ---------- Modal ---------- */
  const modalBackdrop = $("#modalBackdrop");
  const modalForm = $("#modalForm");
  function openModal(title, html) {
    $("#modalTitle").textContent = title;
    modalForm.innerHTML = html;
    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modalBackdrop.hidden = true;
    modalForm.innerHTML = "";
    document.body.style.overflow = "";
  }
  $("#modalClose").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* Komponen upload gambar di dalam form */
  function uploadFieldHTML(id, value) {
    return `
      <div class="field">
        <label>Gambar</label>
        <div class="upload-box">
          <input type="file" id="${id}-file" accept="image/*">
          <label for="${id}-file">Klik untuk memilih gambar dari perangkat</label>
          <div>atau tempel URL gambar pada kolom di bawah</div>
        </div>
        <input type="text" id="${id}" placeholder="https://... (URL gambar)" value="${esc(value || "")}" style="margin-top:10px">
        <div class="img-preview" id="${id}-preview">${value ? `<img src="${esc(resolveImg(value))}" alt="">` : ""}</div>
      </div>`;
  }
  function bindUploadField(id, onDone) {
    const fileInput = $("#" + id + "-file");
    const urlInput = $("#" + id);
    const preview = $("#" + id + "-preview");
    if (!fileInput) return;
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("File harus berupa gambar.", true);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast("Ukuran gambar maksimal 5 MB.", true);
        return;
      }
      urlInput.value = "Mengunggah...";
      try {
        const { publicUrl } = await SupabaseDB.storage.upload("media", uniquePath(file), file);
        urlInput.value = publicUrl;
        preview.innerHTML = `<img src="${esc(publicUrl)}" alt="">`;
        toast("Gambar berhasil diunggah.");
        if (onDone) onDone(publicUrl);
      } catch (ex) {
        urlInput.value = "";
        toast("Gagal mengunggah: " + ex.message, true);
      }
    });
    urlInput.addEventListener("input", () => {
      preview.innerHTML = urlInput.value ? `<img src="${esc(resolveImg(urlInput.value))}" alt="">` : "";
    });
  }

  /* ================= BERITA ================= */
  let beritaCache = [];
  async function loadBerita() {
    const tbody = $("#beritaTable");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-3)">Memuat...</td></tr>`;
    try {
      beritaCache = await SupabaseDB.from("berita")
        .select("*")
        .order("tanggal", { ascending: false });
      $("#beritaEmpty").hidden = beritaCache.length > 0;
      tbody.innerHTML = beritaCache
        .map((b) => {
          const k = KATEGORI[b.kategori] || { label: b.kategori, warna: "#002080" };
          return `<tr>
            <td><strong>${esc(b.judul)}</strong></td>
            <td><span class="badge-cat" style="background:${k.warna}">${esc(k.label)}</span></td>
            <td>${fmtTanggal(b.tanggal)}</td>
            <td>${b.unggulan ? '<span class="badge-star">★ Unggulan</span>' : "-"}</td>
            <td class="col-action"><span class="row-actions">
              <button class="btn btn-outline btn-sm" data-edit-berita="${b.id}">Ubah</button>
              <button class="btn btn-danger btn-sm" data-del-berita="${b.id}">Hapus</button>
            </span></td>
          </tr>`;
        })
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red)">Gagal memuat: ${esc(e.message)}</td></tr>`;
    }
  }

  function openBeritaForm(item) {
    const isEdit = !!item;
    const b = item || { judul: "", kategori: "pengumuman", tanggal: todayISO(), ringkasan: "", isi: "", gambar: "", penulis: "Humas Sekolah", unggulan: false };
    openModal(
      isEdit ? "Ubah Berita" : "Berita Baru",
      `
      <div class="field">
        <label for="f_judul">Judul *</label>
        <input id="f_judul" type="text" required value="${esc(b.judul)}">
      </div>
      <div class="form-grid-2">
        <div class="field">
          <label for="f_kategori">Kategori</label>
          <select id="f_kategori">
            ${Object.entries(KATEGORI).map(([key, v]) => `<option value="${key}" ${b.kategori === key ? "selected" : ""}>${v.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="f_tanggal">Tanggal</label>
          <input id="f_tanggal" type="date" value="${esc(b.tanggal)}">
        </div>
      </div>
      <div class="field">
        <label for="f_ringkasan">Ringkasan (tampil di kartu berita) *</label>
        <textarea id="f_ringkasan" rows="3" required>${esc(b.ringkasan)}</textarea>
      </div>
      <div class="field">
        <label for="f_isi">Isi lengkap (opsional)</label>
        <textarea id="f_isi" rows="5">${esc(b.isi || "")}</textarea>
      </div>
      ${uploadFieldHTML("f_gambar", b.gambar)}
      <div class="form-grid-2">
        <div class="field">
          <label for="f_penulis">Penulis</label>
          <input id="f_penulis" type="text" value="${esc(b.penulis)}">
        </div>
        <div class="field field-check" style="align-self:end;padding-bottom:10px">
          <input id="f_unggulan" type="checkbox" ${b.unggulan ? "checked" : ""}>
          <label for="f_unggulan" style="margin:0">Tandai sebagai berita unggulan</label>
        </div>
      </div>
      <p class="form-error" id="f_error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" id="f_cancel">Batal</button>
        <button type="submit" class="btn btn-primary">${isEdit ? "Simpan Perubahan" : "Terbitkan Berita"}</button>
      </div>`
    );
    bindUploadField("f_gambar");
    $("#f_cancel").addEventListener("click", closeModal);
    modalForm.onsubmit = async (e) => {
      e.preventDefault();
      const err = $("#f_error");
      err.hidden = true;
      const payload = {
        judul: $("#f_judul").value.trim(),
        kategori: $("#f_kategori").value,
        tanggal: $("#f_tanggal").value || todayISO(),
        ringkasan: $("#f_ringkasan").value.trim(),
        isi: $("#f_isi").value.trim() || null,
        gambar: $("#f_gambar").value.trim() || null,
        penulis: $("#f_penulis").value.trim() || "Humas Sekolah",
        unggulan: $("#f_unggulan").checked,
        updated_at: new Date().toISOString(),
      };
      if (!payload.judul || !payload.ringkasan) {
        err.textContent = "Judul dan ringkasan wajib diisi.";
        err.hidden = false;
        return;
      }
      try {
        if (isEdit) {
          await SupabaseDB.from("berita").update(payload).eq("id", item.id);
          toast("Berita berhasil diperbarui.");
        } else {
          await SupabaseDB.from("berita").insert(payload);
          toast("Berita berhasil diterbitkan.");
        }
        closeModal();
        loadBerita();
        loadDashboard();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    };
  }

  $("#btnNewBerita").addEventListener("click", () => openBeritaForm());
  $("#beritaTable").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-berita]");
    const delBtn = e.target.closest("[data-del-berita]");
    if (editBtn) {
      const item = beritaCache.find((b) => b.id === editBtn.dataset.editBerita);
      if (item) openBeritaForm(item);
    }
    if (delBtn) {
      const item = beritaCache.find((b) => b.id === delBtn.dataset.delBerita);
      if (item && confirm(`Hapus berita "${item.judul}"?`)) {
        try {
          await SupabaseDB.from("berita").delete().eq("id", item.id);
          toast("Berita dihapus.");
          loadBerita();
          loadDashboard();
        } catch (ex) {
          toast("Gagal menghapus: " + ex.message, true);
        }
      }
    }
  });

  /* ================= AGENDA ================= */
  let agendaCache = [];
  async function loadAgenda() {
    const tbody = $("#agendaTable");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-3)">Memuat...</td></tr>`;
    try {
      agendaCache = await SupabaseDB.from("agenda")
        .select("*")
        .order("tanggal", { ascending: true });
      $("#agendaEmpty").hidden = agendaCache.length > 0;
      tbody.innerHTML = agendaCache
        .map((a) => `<tr>
          <td><strong>${esc(a.judul)}</strong></td>
          <td>${fmtTanggal(a.tanggal)}</td>
          <td>${esc(a.waktu)}</td>
          <td>${esc(a.tempat)}</td>
          <td>${esc(a.audiens)}</td>
          <td class="col-action"><span class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit-agenda="${a.id}">Ubah</button>
            <button class="btn btn-danger btn-sm" data-del-agenda="${a.id}">Hapus</button>
          </span></td>
        </tr>`)
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red)">Gagal memuat: ${esc(e.message)}</td></tr>`;
    }
  }

  function openAgendaForm(item) {
    const isEdit = !!item;
    const a = item || { judul: "", tanggal: todayISO(), waktu: "", tempat: "", audiens: "Publik" };
    openModal(
      isEdit ? "Ubah Agenda" : "Agenda Baru",
      `
      <div class="field">
        <label for="f_judul">Nama kegiatan *</label>
        <input id="f_judul" type="text" required value="${esc(a.judul)}">
      </div>
      <div class="form-grid-2">
        <div class="field">
          <label for="f_tanggal">Tanggal *</label>
          <input id="f_tanggal" type="date" required value="${esc(a.tanggal)}">
        </div>
        <div class="field">
          <label for="f_audiens">Audiens</label>
          <select id="f_audiens">
            ${["Publik", "Siswa", "Calon siswa", "Orang tua", "Guru"].map((x) => `<option ${a.audiens === x ? "selected" : ""}>${x}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="f_waktu">Waktu</label>
          <input id="f_waktu" type="text" placeholder="08.00 – 12.00 WITA" value="${esc(a.waktu)}">
        </div>
        <div class="field">
          <label for="f_tempat">Tempat</label>
          <input id="f_tempat" type="text" placeholder="Aula Sekolah" value="${esc(a.tempat)}">
        </div>
      </div>
      <p class="form-error" id="f_error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" id="f_cancel">Batal</button>
        <button type="submit" class="btn btn-primary">${isEdit ? "Simpan Perubahan" : "Tambah Agenda"}</button>
      </div>`
    );
    $("#f_cancel").addEventListener("click", closeModal);
    modalForm.onsubmit = async (e) => {
      e.preventDefault();
      const err = $("#f_error");
      err.hidden = true;
      const payload = {
        judul: $("#f_judul").value.trim(),
        tanggal: $("#f_tanggal").value,
        waktu: $("#f_waktu").value.trim(),
        tempat: $("#f_tempat").value.trim(),
        audiens: $("#f_audiens").value,
      };
      if (!payload.judul || !payload.tanggal) {
        err.textContent = "Nama kegiatan dan tanggal wajib diisi.";
        err.hidden = false;
        return;
      }
      try {
        if (isEdit) {
          await SupabaseDB.from("agenda").update(payload).eq("id", item.id);
          toast("Agenda berhasil diperbarui.");
        } else {
          await SupabaseDB.from("agenda").insert(payload);
          toast("Agenda berhasil ditambahkan.");
        }
        closeModal();
        loadAgenda();
        loadDashboard();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    };
  }

  $("#btnNewAgenda").addEventListener("click", () => openAgendaForm());
  $("#agendaTable").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-agenda]");
    const delBtn = e.target.closest("[data-del-agenda]");
    if (editBtn) {
      const item = agendaCache.find((a) => a.id === editBtn.dataset.editAgenda);
      if (item) openAgendaForm(item);
    }
    if (delBtn) {
      const item = agendaCache.find((a) => a.id === delBtn.dataset.delAgenda);
      if (item && confirm(`Hapus agenda "${item.judul}"?`)) {
        try {
          await SupabaseDB.from("agenda").delete().eq("id", item.id);
          toast("Agenda dihapus.");
          loadAgenda();
          loadDashboard();
        } catch (ex) {
          toast("Gagal menghapus: " + ex.message, true);
        }
      }
    }
  });

  /* ================= GALERI ================= */
  let galeriCache = [];
  async function loadGaleri() {
    const grid = $("#galeriGrid");
    grid.innerHTML = `<p style="color:var(--ink-3)">Memuat...</p>`;
    try {
      galeriCache = await SupabaseDB.from("galeri")
        .select("*")
        .order("urutan", { ascending: true });
      $("#galeriEmpty").hidden = galeriCache.length > 0;
      grid.innerHTML = galeriCache
        .map((g, i) => `
        <div class="gallery-card">
          <img src="${esc(resolveImg(g.gambar))}" alt="${esc(g.keterangan)}" loading="lazy">
          <div class="gc-body">
            <p class="gc-cap">${esc(g.keterangan)}</p>
            <div class="gc-actions">
              <button class="btn btn-outline btn-sm" data-gal-up="${g.id}" ${i === 0 ? "disabled" : ""}>↑ Naik</button>
              <button class="btn btn-outline btn-sm" data-gal-down="${g.id}" ${i === galeriCache.length - 1 ? "disabled" : ""}>↓ Turun</button>
              <button class="btn btn-outline btn-sm" data-edit-galeri="${g.id}">Ubah</button>
              <button class="btn btn-danger btn-sm" data-del-galeri="${g.id}">Hapus</button>
            </div>
          </div>
        </div>`)
        .join("");
    } catch (e) {
      grid.innerHTML = `<p style="color:var(--red)">Gagal memuat: ${esc(e.message)}</p>`;
    }
  }

  function openGaleriForm(item) {
    const isEdit = !!item;
    const g = item || { gambar: "", keterangan: "" };
    openModal(
      isEdit ? "Ubah Foto" : "Tambah Foto",
      `
      ${uploadFieldHTML("f_gambar", g.gambar)}
      <div class="field">
        <label for="f_keterangan">Keterangan foto</label>
        <input id="f_keterangan" type="text" placeholder="cth: Kegiatan pramuka siswa" value="${esc(g.keterangan)}">
      </div>
      <p class="form-error" id="f_error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" id="f_cancel">Batal</button>
        <button type="submit" class="btn btn-primary">${isEdit ? "Simpan Perubahan" : "Tambah Foto"}</button>
      </div>`
    );
    bindUploadField("f_gambar");
    $("#f_cancel").addEventListener("click", closeModal);
    modalForm.onsubmit = async (e) => {
      e.preventDefault();
      const err = $("#f_error");
      err.hidden = true;
      const gambar = $("#f_gambar").value.trim();
      if (!gambar) {
        err.textContent = "Pilih gambar atau tempel URL gambar terlebih dahulu.";
        err.hidden = false;
        return;
      }
      try {
        if (isEdit) {
          await SupabaseDB.from("galeri")
            .update({ gambar, keterangan: $("#f_keterangan").value.trim() })
            .eq("id", item.id);
          toast("Foto berhasil diperbarui.");
        } else {
          const maxUrutan = galeriCache.reduce((m, x) => Math.max(m, x.urutan || 0), 0);
          await SupabaseDB.from("galeri").insert({
            gambar,
            keterangan: $("#f_keterangan").value.trim(),
            urutan: maxUrutan + 1,
          });
          toast("Foto berhasil ditambahkan.");
        }
        closeModal();
        loadGaleri();
        loadDashboard();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    };
  }

  $("#btnNewGaleri").addEventListener("click", () => openGaleriForm());
  $("#galeriGrid").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-galeri]");
    const delBtn = e.target.closest("[data-del-galeri]");
    const upBtn = e.target.closest("[data-gal-up]");
    const downBtn = e.target.closest("[data-gal-down]");
    if (editBtn) {
      const item = galeriCache.find((g) => g.id === editBtn.dataset.editGaleri);
      if (item) openGaleriForm(item);
    }
    if (delBtn) {
      const item = galeriCache.find((g) => g.id === delBtn.dataset.delGaleri);
      if (item && confirm("Hapus foto ini dari galeri?")) {
        try {
          await SupabaseDB.from("galeri").delete().eq("id", item.id);
          toast("Foto dihapus.");
          loadGaleri();
          loadDashboard();
        } catch (ex) {
          toast("Gagal menghapus: " + ex.message, true);
        }
      }
    }
    if (upBtn || downBtn) {
      const id = (upBtn || downBtn).dataset.galUp || (upBtn || downBtn).dataset.galDown;
      const idx = galeriCache.findIndex((g) => g.id === id);
      const swapIdx = upBtn ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= galeriCache.length) return;
      const a = galeriCache[idx];
      const b = galeriCache[swapIdx];
      try {
        await SupabaseDB.from("galeri").update({ urutan: b.urutan }).eq("id", a.id);
        await SupabaseDB.from("galeri").update({ urutan: a.urutan }).eq("id", b.id);
        loadGaleri();
      } catch (ex) {
        toast("Gagal mengubah urutan: " + ex.message, true);
      }
    }
  });

  /* ================= PENGATURAN ================= */
  async function loadPengaturan() {
    try {
      const rows = await SupabaseDB.from("pengaturan").select("*");
      const P = {};
      rows.forEach((r) => (P[r.kunci] = r.nilai));
      $$("#pengaturanForm [data-key]").forEach((input) => {
        const key = input.dataset.key;
        let val = P[key] || "";
        if (key === "ppdb_target" && val) {
          // ubah ISO -> format datetime-local
          const d = new Date(val);
          if (!isNaN(d)) {
            const pad = (n) => String(n).padStart(2, "0");
            val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          }
        }
        input.value = val;
      });
    } catch (e) {
      toast("Gagal memuat pengaturan: " + e.message, true);
    }
  }

  $("#pengaturanForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#btnSavePengaturan");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
    try {
      const inputs = $$("#pengaturanForm [data-key]");
      for (const input of inputs) {
        let val = input.value.trim();
        if (input.dataset.key === "ppdb_target" && val) {
          // datetime-local -> ISO dengan zona WITA (+08:00)
          val = val.length === 16 ? val + ":00+08:00" : val + "+08:00";
        }
        await SupabaseDB.from("pengaturan").upsert(
          { kunci: input.dataset.key, nilai: val },
          { onConflict: "kunci" }
        );
      }
      toast("Pengaturan berhasil disimpan.");
    } catch (ex) {
      toast("Gagal menyimpan: " + ex.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Pengaturan";
    }
  });

  /* ================= TEKS HALAMAN ================= */
  // Default teks diambil langsung dari HTML statis (selalu sinkron)
  const teksDefaults = {};   // "index" -> { "index.hero_judul": "..." }
  let teksPengaturan = null; // cache tabel pengaturan

  function labelTeks(key) {
    const part = key.split(".")[1] || key;
    const segs = part.split("_");
    const jenis = segs.pop();
    const JENIS = { judul: "Judul", sub: "Keterangan", eyebrow: "Teks kecil", kicker: "Teks kecil" };
    const bagian = segs.join(" ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Umum";
    return `${bagian} · ${JENIS[jenis] || jenis}`;
  }

  async function muatDefaultTeks(page) {
    if (teksDefaults[page]) return teksDefaults[page];
    const res = await fetch(`../${page}.html`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal membaca ${page}.html`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const map = {};
    doc.querySelectorAll("[data-cms-text]").forEach((el) => {
      map[el.dataset.cmsText] = el.textContent.replace(/\s+/g, " ").trim();
    });
    teksDefaults[page] = map;
    return map;
  }

  async function loadTeks(page) {
    const wrap = $("#teksFields");
    wrap.innerHTML = `<p style="color:var(--ink-3)">Memuat teks halaman...</p>`;
    try {
      if (!teksPengaturan) {
        const rows = await SupabaseDB.from("pengaturan").select("*");
        teksPengaturan = {};
        rows.forEach((r) => (teksPengaturan[r.kunci] = r.nilai));
      }
      const defaults = await muatDefaultTeks(page);
      const keys = Object.keys(defaults);
      if (!keys.length) {
        wrap.innerHTML = `<p style="color:var(--ink-3)">Tidak ada teks yang bisa diedit di halaman ini.</p>`;
        return;
      }
      wrap.innerHTML = keys
        .map((key) => {
          const def = defaults[key];
          const val = teksPengaturan["teks_" + key];
          const effective = val && val.trim() ? val : def;
          const field =
            def.length > 90
              ? `<textarea data-teks="${esc(key)}" rows="3">${esc(effective)}</textarea>`
              : `<input data-teks="${esc(key)}" type="text" value="${esc(effective)}">`;
          return `<div class="field">
            <label>${esc(labelTeks(key))}</label>
            ${field}
            <small class="hint">Bawaan: ${esc(def.length > 120 ? def.slice(0, 120) + "…" : def)}</small>
          </div>`;
        })
        .join("");
    } catch (e) {
      wrap.innerHTML = `<p style="color:var(--red)">Gagal memuat: ${esc(e.message)}</p>`;
    }
  }

  $("#teksPage").addEventListener("change", (e) => loadTeks(e.target.value));
  $("#teksForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#btnSaveTeks");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
    try {
      const inputs = $$("#teksFields [data-teks]");
      for (const input of inputs) {
        const key = input.dataset.teks;
        const page = key.split(".")[0];
        const def = ((teksDefaults[page] || {})[key] || "").trim();
        const val = input.value.trim();
        const kunci = "teks_" + key;
        if (val && val !== def) {
          // simpan hanya yang benar-benar diubah
          await SupabaseDB.from("pengaturan").upsert({ kunci, nilai: val }, { onConflict: "kunci" });
          teksPengaturan[kunci] = val;
        } else if (teksPengaturan[kunci] !== undefined) {
          // kembali ke teks bawaan -> hapus override
          await SupabaseDB.from("pengaturan").delete().eq("kunci", kunci);
          delete teksPengaturan[kunci];
        }
      }
      toast("Teks halaman berhasil disimpan.");
    } catch (ex) {
      toast("Gagal menyimpan: " + ex.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Teks";
    }
  });

  /* ---------- Mulai ---------- */
  init();
})();
