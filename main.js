document.addEventListener("DOMContentLoaded", () => {
  // 1. Set current year in footer *if* the element exists
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // 2. Dark-mode toggle using localStorage
  const root = document.documentElement;
  const toggleBtn = document.querySelector(".theme-toggle");
  if (!toggleBtn) return; // no button on this page

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    root.setAttribute("data-theme", "dark");
  }

  // Update button icon based on theme
  function updateIcon() {
    const isDark = root.getAttribute("data-theme") === "dark";
    toggleBtn.textContent = isDark ? "☀︎" : "☾";
  }
  updateIcon();

  // Toggle on click
  toggleBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
    updateIcon();
  });
});

