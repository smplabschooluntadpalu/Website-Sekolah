/* =========================================================
   SMA Cendekia Nusantara — main.js
   Navigasi, animasi, countdown, filter, form, lightbox
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- 1. Header shadow saat scroll ---------- */
  const header = $("#header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 2. Drawer mobile ---------- */
  const drawer = $("#drawer");
  const burger = $("#burger");
  if (drawer && burger) {
    const open = () => {
      drawer.classList.add("is-open");
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => drawer.classList.add("is-visible"));
      burger.setAttribute("aria-expanded", "true");
      burger.classList.add("is-open");
    };
    const close = () => {
      drawer.classList.remove("is-visible");
      document.body.style.overflow = "";
      burger.setAttribute("aria-expanded", "false");
      burger.classList.remove("is-open");
      setTimeout(() => drawer.classList.remove("is-open"), 320);
    };
    burger.addEventListener("click", () =>
      drawer.classList.contains("is-open") ? close() : open()
    );
    $("#drawerClose")?.addEventListener("click", close);
    $(".drawer__backdrop")?.addEventListener("click", close);
    $$("a", drawer).forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) close();
    });
  }

  /* ---------- 3. Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- 4. Angka statistik ---------- */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = Math.round(target * eased);
        el.textContent = value.toLocaleString("id-ID") + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target);
            cio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => {
      c.textContent = "0";
      cio.observe(c);
    });
  }

  /* ---------- 5. Back to top ---------- */
  const toTop = $("#toTop");
  if (toTop) {
    window.addEventListener(
      "scroll",
      () => toTop.classList.toggle("is-visible", window.scrollY > 600),
      { passive: true }
    );
    toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  /* ---------- 6. Accordion ---------- */
  $$(".acc__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".acc");
      const wasOpen = item.classList.contains("is-open");
      $$(".acc", item.parentElement).forEach((s) => {
        s.classList.remove("is-open");
        $(".acc__btn", s)?.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- 7. Countdown PPDB ---------- */
  const cd = $("#countdown");
  if (cd) {
    const target = new Date(cd.dataset.target || "2027-06-30T23:59:59+08:00");
    const cells = {
      d: $("#cd-days", cd),
      h: $("#cd-hours", cd),
      m: $("#cd-mins", cd),
      s: $("#cd-secs", cd),
    };
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) {
        Object.values(cells).forEach((c) => c && (c.textContent = "00"));
        return;
      }
      const sec = Math.floor(diff / 1000);
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (cells.d) cells.d.textContent = d.toLocaleString("id-ID");
      if (cells.h) cells.h.textContent = pad(h);
      if (cells.m) cells.m.textContent = pad(m);
      if (cells.s) cells.s.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 8. Filter berita ---------- */
  const filterWrap = $("#filters");
  if (filterWrap) {
    const items = $$("[data-cat]");
    filterWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      $$(".filter-btn", filterWrap).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const cat = btn.dataset.filter;
      items.forEach((item) => {
        const show = cat === "all" || item.dataset.cat.split(" ").includes(cat);
        item.style.display = show ? "" : "none";
      });
      const count = $("#resultCount");
      if (count) {
        count.textContent = cat === "all"
          ? `${items.length} artikel`
          : `${items.filter((i) => i.dataset.cat.split(" ").includes(cat)).length} artikel`;
      }
    });
  }

  /* ---------- 9. Form: validasi + pesan sukses ---------- */
  $$("form[data-validate]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      $$("[required]", form).forEach((field) => {
        const wrap = field.closest(".field");
        const ok =
          field.type === "checkbox" ? field.checked : field.value.trim() !== "";
        wrap?.classList.toggle("has-error", !ok);
        if (!ok) valid = false;
      });
      const email = $('input[type="email"]', form);
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.closest(".field")?.classList.add("has-error");
        valid = false;
      }
      if (!valid) {
        form.querySelector(".has-error input, .has-error select, .has-error textarea")?.focus();
        return;
      }
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
      const success = form.parentElement.querySelector(".form-success");
      if (success) {
        success.classList.add("is-visible");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reset();
    });
    form.addEventListener("input", (e) => {
      if (e.target.matches("input, select, textarea")) {
        e.target.closest(".field")?.classList.remove("has-error");
      }
    });
  });

  /* ---------- 10. Lightbox galeri ---------- */
  const gallery = $("#gallery");
  const lightbox = $("#lightbox");
  if (gallery && lightbox) {
    const img = $("img", lightbox);
    gallery.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;
      e.preventDefault();
      img.src = link.getAttribute("href");
      img.alt = link.dataset.alt || "";
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
    const closeLb = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    };
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lightbox__close")) closeLb();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLb();
    });
  }

  /* ---------- 11. Tahun otomatis ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
