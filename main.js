// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Simple dark-mode toggle using localStorage
const root = document.documentElement;
const toggleBtn = document.querySelector(".theme-toggle");

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
