// Feature: paper-trading-app — Dark/light mode toggle
// Requirements: 11.1, 11.2, 11.3, 11.4

function applyTheme(theme, toggleBtn) {
  if (theme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    if (toggleBtn) toggleBtn.textContent = '🌙';
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  }
}

function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  const toggleBtn = document.getElementById('theme-toggle');
  applyTheme(theme, toggleBtn);
}

function toggleTheme() {
  const current = localStorage.getItem('theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  const toggleBtn = document.getElementById('theme-toggle');
  applyTheme(next, toggleBtn);
}

export { initTheme, toggleTheme };
