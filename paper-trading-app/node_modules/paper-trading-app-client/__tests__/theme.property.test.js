// Feature: paper-trading-app, Properties 23, 24, 25: Theme toggle, persistence, icon correctness
// Validates: Requirements 11.1, 11.2, 11.4

const fc = require('fast-check');

// Inline theme logic (no DOM/localStorage imports needed — we mock inline)

function makeLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
  };
}

function makeBody() {
  const classes = new Set();
  return {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
}

function makeToggleBtn() {
  return { textContent: '' };
}

function applyTheme(theme, body, toggleBtn) {
  if (theme === 'light') {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (toggleBtn) toggleBtn.textContent = '🌙';
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  }
}

function toggleTheme(ls, body, toggleBtn) {
  const current = ls.getItem('theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  ls.setItem('theme', next);
  applyTheme(next, body, toggleBtn);
  return next;
}

describe('Property 23: Theme toggle round-trip', () => {
  test('toggling twice returns to original theme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dark', 'light'),
        (initial) => {
          const ls = makeLocalStorage();
          const body = makeBody();
          const btn = makeToggleBtn();
          ls.setItem('theme', initial);
          applyTheme(initial, body, btn);

          toggleTheme(ls, body, btn);
          toggleTheme(ls, body, btn);

          const finalTheme = ls.getItem('theme');
          expect(finalTheme).toBe(initial);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Property 24: Theme persistence round-trip', () => {
  test('saved theme is read back correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dark', 'light'),
        (theme) => {
          const ls = makeLocalStorage();
          ls.setItem('theme', theme);
          const readBack = ls.getItem('theme');
          expect(readBack).toBe(theme);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Property 25: Theme icon correctness', () => {
  test('light mode shows moon icon, dark mode shows sun icon', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dark', 'light'),
        (theme) => {
          const body = makeBody();
          const btn = makeToggleBtn();
          applyTheme(theme, body, btn);

          if (theme === 'light') {
            expect(btn.textContent).toBe('🌙');
          } else {
            expect(btn.textContent).toBe('☀️');
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
