document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const toggleBtn = document.querySelector(".theme-toggle");

  // 1. Safely access localStorage (Brave/privacy modes can throw)
  function getStoredTheme() {
    try {
      return window.localStorage.getItem("theme");
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(value) {
    try {
      window.localStorage.setItem("theme", value);
    } catch (e) {
      // ignore if storage not available
    }
  }

  // 2. Set current year in footer if present (optional)
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  if (!toggleBtn) return;

  // 3. Load saved theme
  const savedTheme = getStoredTheme();
  if (savedTheme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (savedTheme === "light") {
    root.removeAttribute("data-theme");
  }

  // 4. Update button icon
  function updateIcon() {
    const isDark = root.getAttribute("data-theme") === "dark";
    toggleBtn.textContent = isDark ? "☀︎" : "☾";
  }
  updateIcon();

  // 5. Toggle on click
  toggleBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      setStoredTheme("light");
    } else {
      root.setAttribute("data-theme", "dark");
      setStoredTheme("dark");
    }
    updateIcon();
  });
});

