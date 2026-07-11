(function () {
  const root = document.documentElement;
  root.classList.add("js");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let storedTheme = null;

  try {
    storedTheme = localStorage.getItem("theme");
  } catch (_) {
    storedTheme = null;
  }

  root.setAttribute("data-theme", storedTheme || (systemDark ? "dark" : "light"));

  function setupTheme() {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;

    function updateThemeControl() {
      const dark = root.getAttribute("data-theme") === "dark";
      const icon = button.querySelector(".theme-icon");
      if (icon) icon.textContent = dark ? "☼" : "◐";
      button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }

    updateThemeControl();
    button.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (_) {
        // The theme still works when browser storage is unavailable.
      }
      updateThemeControl();
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
    });
  }

  function setupNavigation() {
    const burger = document.querySelector(".nav-burger");
    const nav = document.querySelector(".nav-links");
    if (!burger || !nav) return;

    function closeNavigation() {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open navigation");
    }

    burger.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        closeNavigation();
        burger.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (nav.classList.contains("open") && !nav.contains(event.target) && !burger.contains(event.target)) {
        closeNavigation();
      }
    });
  }

  function setupHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    function updateHeader() {
      header.classList.toggle("is-scrolled", window.scrollY > 16);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  function setupReveals() {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (!elements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    elements.forEach(function (element) { observer.observe(element); });
  }

  function setupNoteFilters() {
    const search = document.getElementById("notes-search");
    const cards = Array.from(document.querySelectorAll("[data-note-card]"));
    const buttons = Array.from(document.querySelectorAll("[data-filter]"));
    const count = document.getElementById("visible-note-count");
    const empty = document.getElementById("notes-empty");
    if (!cards.length || !search || !buttons.length) return;

    let activeFilter = "all";

    function applyFilters() {
      const query = search.value.trim().toLowerCase();
      let visible = 0;

      cards.forEach(function (card) {
        const categories = (card.getAttribute("data-category") || "").split(/\s+/);
        const haystack = (card.getAttribute("data-search") || "").toLowerCase();
        const categoryMatch = activeFilter === "all" || categories.includes(activeFilter);
        const searchMatch = !query || haystack.includes(query) || card.textContent.toLowerCase().includes(query);
        const show = categoryMatch && searchMatch;
        card.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.getAttribute("data-filter") || "all";
        buttons.forEach(function (item) {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        applyFilters();
      });
    });

    search.addEventListener("input", applyFilters);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupTheme();
    setupNavigation();
    setupHeader();
    setupReveals();
    setupNoteFilters();
  });
})();
