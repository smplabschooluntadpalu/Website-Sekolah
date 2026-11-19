/* =========================================================
   supabase.js — Client Supabase mini berbasis fetch
   Tanpa dependensi/CDN. Dipakai oleh cms.js (publik, baca saja)
   dan admin/js/admin.js (login + CRUD + upload gambar).

   Cara pakai:
     SupabaseDB.from("berita").select("*").order("tanggal", { ascending: false })
     SupabaseDB.from("berita").insert({ judul: "..." })
     SupabaseDB.from("berita").update({ judul: "..." }).eq("id", id)
     SupabaseDB.from("berita").delete().eq("id", id)
     SupabaseDB.auth.signIn(email, password)
     SupabaseDB.auth.signOut()
     SupabaseDB.storage.upload("media", path, file) -> { publicUrl }
   ========================================================= */
(function () {
  "use strict";

  const BASE = window.SUPABASE_URL;
  const ANON = window.SUPABASE_ANON_KEY;
  const SESSION_KEY = "sb-admin-session";

  if (!BASE || !ANON) {
    console.warn("[supabase] SUPABASE_URL / SUPABASE_ANON_KEY belum diatur di js/config.js");
  }

  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (e) {
    session = null;
  }

  function saveSession(s) {
    session = s;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }

  function authHeader() {
    return session && session.access_token ? session.access_token : ANON;
  }

  async function rest(path, { method = "GET", body, prefer } = {}) {
    const headers = {
      apikey: ANON,
      Authorization: `Bearer ${authHeader()}`,
      "Content-Type": "application/json",
    };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(`${BASE}/rest/v1/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        msg = JSON.parse(text).message || text;
      } catch (e) {}
      throw new Error(`Supabase ${res.status}: ${msg}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /* ---------- Query builder sederhana ---------- */
  function from(table) {
    const builder = {
      _table: table,
      _filters: [],
      _order: null,
      _limit: null,
      _single: false,

      select(cols = "*") {
        this._cols = cols;
        return this;
      },
      eq(col, val) {
        this._filters.push(`${col}=eq.${encodeURIComponent(val)}`);
        return this;
      },
      order(col, { ascending = true } = {}) {
        this._order = `${col}.${ascending ? "asc" : "desc"}`;
        return this;
      },
      limit(n) {
        this._limit = n;
        return this;
      },
      single() {
        this._single = true;
        return this;
      },
      _query() {
        const parts = [`select=${this._cols || "*"}`];
        parts.push(...this._filters);
        if (this._order) parts.push(`order=${this._order}`);
        if (this._limit) parts.push(`limit=${this._limit}`);
        return parts.join("&");
      },
      async _exec() {
        const data = await rest(`${this._table}?${this._query()}`);
        return this._single ? data[0] || null : data;
      },
      // thenable agar bisa langsung: await from("berita").select()
      then(resolve, reject) {
        this._exec().then(resolve, reject);
      },
      async insert(row) {
        return rest(this._table, {
          method: "POST",
          body: row,
          prefer: "return=representation",
        });
      },
      async update(row) {
        const parts = [...this._filters];
        if (this._order) parts.push(`order=${this._order}`);
        return rest(`${this._table}?${parts.join("&")}`, {
          method: "PATCH",
          body: row,
          prefer: "return=representation",
        });
      },
      async upsert(row, { onConflict } = {}) {
        const headers = {};
        const res = await fetch(
          `${BASE}/rest/v1/${this._table}?on_conflict=${onConflict || "kunci"}`,
          {
            method: "POST",
            headers: {
              apikey: ANON,
              Authorization: `Bearer ${authHeader()}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify(row),
          }
        );
        if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        return res.json();
      },
      async delete() {
        const parts = [...this._filters];
        return rest(`${this._table}?${parts.join("&")}`, { method: "DELETE" });
      },
    };
    return builder;
  }

  /* ---------- Auth ---------- */
  const auth = {
    get session() {
      return session;
    },
    get user() {
      return session && session.user ? session.user : null;
    },
    async signIn(email, password) {
      const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.msg || data.message || "Email atau kata sandi salah.");
      }
      const data = await res.json();
      saveSession(data);
      return data.user;
    },
    async signOut() {
      try {
        await fetch(`${BASE}/auth/v1/logout`, {
          method: "POST",
          headers: { apikey: ANON, Authorization: `Bearer ${authHeader()}` },
        });
      } catch (e) {}
      saveSession(null);
    },
    async refresh() {
      if (!session || !session.refresh_token) return null;
      const res = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!res.ok) {
        saveSession(null);
        return null;
      }
      const data = await res.json();
      saveSession(data);
      return data;
    },
  };

  /* ---------- Storage ---------- */
  const storage = {
    async upload(bucket, path, file) {
      const res = await fetch(`${BASE}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${authHeader()}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload gagal (${res.status}): ${await res.text()}`);
      return { publicUrl: this.publicUrl(bucket, path) };
    },
    publicUrl(bucket, path) {
      return `${BASE}/storage/v1/object/public/${bucket}/${path}`;
    },
    async remove(bucket, path) {
      const res = await fetch(`${BASE}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${authHeader()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [path] }),
      });
      if (!res.ok) throw new Error(`Hapus file gagal (${res.status})`);
      return true;
    },
  };

  window.SupabaseDB = { from, auth, storage, url: BASE };
})();
