export function initTheme() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem("scribble-theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggleBtn.textContent = "🌙";
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      localStorage.setItem("scribble-theme", "light");
      themeToggleBtn.textContent = "🌙"; // Show moon icon when in light mode
    } else {
      localStorage.setItem("scribble-theme", "dark");
      themeToggleBtn.textContent = "☀️"; // Show sun icon when in dark mode
    }
  });
}
