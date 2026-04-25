// app.js - PaperTrade Simulator Logic (frontend-only, localStorage)

// ── Global state ──────────────────────────────────────────────────────────────
let currentUser = null;
let userData = { balance: 10000, portfolio: {}, history: [], avgPrices: {} };
let currentStock = null;
let priceChart = null;
let portfolioChartInstance = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const el = {
  loginForm:      document.getElementById('loginForm'),
  signupForm:     document.getElementById('signupForm'),
  loginSection:   document.getElementById('login-section'),
  signupSection:  document.getElementById('signup-section'),
  nav:            document.getElementById('nav'),
  userInfo:       document.getElementById('userInfo'),
  balanceEl:      document.getElementById('dashboardBalance'),
  logoutBtn:      document.getElementById('logoutBtn'),
  dashSection:    document.getElementById('dashboard-section'),
  stockSearch:    document.getElementById('stockSearch'),
  stockSymbol:    document.getElementById('stockSymbol'),
  tradeForm:      document.getElementById('tradeForm'),
  chartCanvas:    document.getElementById('priceChart'),
  portfolioTable: document.getElementById('portfolioTable'),
  historyTable:   document.getElementById('historyTable'),
  themeToggle:    document.getElementById('themeToggle'),
  resetBtn:       document.getElementById('resetBtn')
};

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  loadTheme();
  loadUserData();
  if (currentUser) showDashboard();
  else showLogin();
  setupListeners();

  // Update prices every 3 seconds
  setInterval(updateStockPrices, 3000);

  // Update chart smoothly every 3 seconds
  setInterval(function() {
    populateStockSelect();
    if (!priceChart || !currentStock) return;

    var candles = currentStock.candles.slice(-40);
    var min = Math.min.apply(null, candles.map(function(c) { return c.l; }));
    var max = Math.max.apply(null, candles.map(function(c) { return c.h; }));
    var pad = Math.max((max - min) * 0.15, 1);

    priceChart.data.datasets[0].data = candles.map(function(c) {
      return { x: c.x, o: c.o, h: c.h, l: c.l, c: c.c };
    });
    priceChart.options.scales.y.min = parseFloat((min - pad).toFixed(2));
    priceChart.options.scales.y.max = parseFloat((max + pad).toFixed(2));
    priceChart.update('none');

    document.getElementById('currentPrice').textContent = '$' + currentStock.price.toFixed(2);
  }, 3000);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function login(username, password) {
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  if (users[username] && users[username].password === password) {
    currentUser = username;
    userData = users[username].data || { balance: 10000, portfolio: {}, history: [], avgPrices: {} };
    localStorage.setItem('pt_lastUser', username);
    saveUserData();
    showNotification('Welcome back, ' + username + '!', 'success');
    showDashboard();
    return true;
  }
  showNotification('Invalid username or password', 'error');
  return false;
}

function signup(username, password) {
  if (!username || username.length < 2) { showNotification('Username must be at least 2 characters', 'error'); return false; }
  if (!password || password.length < 6) { showNotification('Password must be at least 6 characters', 'error'); return false; }
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  if (users[username]) { showNotification('Username already taken', 'error'); return false; }
  users[username] = { password: password, data: { balance: 10000, portfolio: {}, history: [], avgPrices: {} } };
  localStorage.setItem('pt_users', JSON.stringify(users));
  currentUser = username;
  userData = users[username].data;
  localStorage.setItem('pt_lastUser', username);
  saveUserData();
  showNotification('Account created! Welcome, ' + username + '!', 'success');
  showDashboard();
  return true;
}

function saveUserData() {
  if (!currentUser) return;
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  if (users[currentUser]) {
    users[currentUser].data = userData;
    localStorage.setItem('pt_users', JSON.stringify(users));
  }
}

function loadUserData() {
  const last = localStorage.getItem('pt_lastUser');
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  if (last && users[last]) {
    currentUser = last;
    userData = users[last].data || { balance: 10000, portfolio: {}, history: [], avgPrices: {} };
  }
}

function logout() {
  localStorage.removeItem('pt_lastUser');
  currentUser = null;
  userData = { balance: 10000, portfolio: {}, history: [], avgPrices: {} };
  priceChart = null;
  showLogin();
  showNotification('Logged out', 'success');
}

// ── UI switching ──────────────────────────────────────────────────────────────
function showLogin() {
  hideAll();
  el.loginSection.classList.add('active');
  el.nav.style.display = 'none';
  el.logoutBtn.style.display = 'none';
}

function showSignup() {
  hideAll();
  el.signupSection.classList.add('active');
  el.nav.style.display = 'none';
  el.logoutBtn.style.display = 'none';
}

function showDashboard() {
  hideAll();
  el.dashSection.classList.add('active');
  el.nav.style.display = 'flex';
  el.logoutBtn.style.display = 'inline-block';
  el.userInfo.textContent = currentUser;
  updateBalance();
  initDashboard();
}

function showSection(sectionId, btn) {
  hideAll();
  document.getElementById(sectionId + '-section').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (sectionId === 'dashboard')   initDashboard();
  if (sectionId === 'portfolio')   renderPortfolio();
  if (sectionId === 'history')     renderHistory();
  if (sectionId === 'leaderboard') renderLeaderboard();
}

function hideAll() {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
}

// ── Event listeners ───────────────────────────────────────────────────────────
function setupListeners() {
  el.loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    login(
      document.getElementById('loginUsername').value.trim(),
      document.getElementById('loginPassword').value
    );
  });

  el.signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const pw  = document.getElementById('signupPassword').value;
    const cpw = document.getElementById('confirmPassword').value;
    if (pw !== cpw) { showNotification('Passwords do not match', 'error'); return; }
    signup(document.getElementById('signupUsername').value.trim(), pw);
  });

  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { showSection(btn.dataset.section, btn); });
  });

  el.tradeForm.addEventListener('submit', function(e) { e.preventDefault(); executeTrade(); });
  el.stockSearch.addEventListener('input', handleSearch);
  el.logoutBtn.addEventListener('click', logout);
  el.themeToggle.addEventListener('click', toggleTheme);

  el.resetBtn.addEventListener('click', function() {
    if (confirm('Reset account to $10,000? This cannot be undone.')) {
      userData = { balance: 10000, portfolio: {}, history: [], avgPrices: {} };
      saveUserData();
      updateBalance();
      showNotification('Account reset to $10,000', 'success');
      initDashboard();
    }
  });

  el.stockSymbol.addEventListener('change', function(e) {
    currentStock = stocks.find(function(s) { return s.symbol === e.target.value; });
    if (currentStock) {
      document.getElementById('currentPrice').textContent = '$' + currentStock.price.toFixed(2);
      initPriceChart(currentStock.symbol);
    }
  });

  new ResizeObserver(function() { if (priceChart) priceChart.resize(); }).observe(el.chartCanvas);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function initDashboard() {
  populateStockSelect();
  updateBalance();
  // Only init chart if not already showing one
  if (!priceChart) {
    var defaultStock = stocks.find(function(s) { return s.symbol === 'AAPL'; });
    if (defaultStock) {
      currentStock = defaultStock;
      el.stockSymbol.value = 'AAPL';
      document.getElementById('currentPrice').textContent = '$' + defaultStock.price.toFixed(2);
      initPriceChart('AAPL');
    }
  }
}

// ── Stock search ──────────────────────────────────────────────────────────────
function handleSearch(e) {
  const q = e.target.value.trim().toUpperCase();
  const box = document.getElementById('searchResults');
  if (!q) { box.style.display = 'none'; return; }
  const results = stocks.filter(function(s) {
    return s.symbol.includes(q) || s.name.toUpperCase().includes(q);
  }).slice(0, 5);
  if (!results.length) { box.style.display = 'none'; return; }
  box.innerHTML = results.map(function(s) {
    return '<div class="stock-item" onclick="selectStock(\'' + s.symbol + '\')">' +
      '<span><strong>' + s.symbol + '</strong> — ' + s.name + '</span>' +
      '<span>$' + s.price.toFixed(2) + '</span>' +
      '</div>';
  }).join('');
  box.style.display = 'block';
}

function selectStock(symbol) {
  currentStock = stocks.find(function(s) { return s.symbol === symbol; });
  if (!currentStock) return;
  el.stockSymbol.value = symbol;
  el.stockSearch.value = symbol;
  document.getElementById('currentPrice').textContent = '$' + currentStock.price.toFixed(2);
  document.getElementById('searchResults').style.display = 'none';
  initPriceChart(symbol);
}

function populateStockSelect() {
  const sel = el.stockSymbol;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Select stock</option>' +
    stocks.map(function(s) {
      return '<option value="' + s.symbol + '"' + (s.symbol === cur ? ' selected' : '') + '>' +
        s.symbol + ' — $' + s.price.toFixed(2) + '</option>';
    }).join('');
}

// ── Trading ───────────────────────────────────────────────────────────────────
function executeTrade() {
  if (!currentStock) { showNotification('Select a stock first', 'error'); return; }
  const action   = document.getElementById('tradeAction').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  if (!quantity || quantity <= 0) { showNotification('Quantity must be greater than zero', 'error'); return; }
  const total = quantity * currentStock.price;

  if (action === 'buy') {
    if (userData.balance < total) { showNotification('Insufficient balance', 'error'); return; }
    const existing    = userData.portfolio[currentStock.symbol] || 0;
    const existingAvg = userData.avgPrices[currentStock.symbol] || 0;
    userData.avgPrices[currentStock.symbol] =
      (existingAvg * existing + currentStock.price * quantity) / (existing + quantity);
    userData.balance -= total;
    userData.portfolio[currentStock.symbol] = existing + quantity;
  } else {
    const held = userData.portfolio[currentStock.symbol] || 0;
    if (held < quantity) { showNotification('Insufficient shares', 'error'); return; }
    userData.balance += total;
    userData.portfolio[currentStock.symbol] = held - quantity;
    if (userData.portfolio[currentStock.symbol] <= 0) {
      delete userData.portfolio[currentStock.symbol];
      delete userData.avgPrices[currentStock.symbol];
    }
  }

  userData.history.unshift({
    action: action,
    symbol: currentStock.symbol,
    quantity: quantity,
    price: currentStock.price,
    total: total,
    date: new Date().toLocaleString()
  });

  saveUserData();
  updateBalance();
  showNotification(action.toUpperCase() + ' ' + quantity + ' ' + currentStock.symbol + ' executed', 'success');
  el.tradeForm.reset();
  document.getElementById('currentPrice').textContent = '$0.00';
  currentStock = null;
  populateStockSelect();
}

// ── Price Chart (Candlestick) ─────────────────────────────────────────────────
function initPriceChart(symbol) {
  var stock = stocks.find(function(s) { return s.symbol === symbol; });
  if (!stock) return;

  if (priceChart) { priceChart.destroy(); priceChart = null; }

  var candles = stock.candles.slice(-40);
  var prices  = candles.map(function(c) { return c.c; });
  var min = Math.min.apply(null, candles.map(function(c) { return c.l; }));
  var max = Math.max.apply(null, candles.map(function(c) { return c.h; }));
  var pad = Math.max((max - min) * 0.15, 1);

  priceChart = new Chart(el.chartCanvas, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: symbol,
        data: candles.map(function(c) {
          return { x: c.x, o: c.o, h: c.h, l: c.l, c: c.c };
        }),
        color: {
          up:   '#00e676',
          down: '#ff4d6d',
          unchanged: '#aaaaaa'
        },
        borderColor: {
          up:   '#00e676',
          down: '#ff4d6d',
          unchanged: '#aaaaaa'
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          ticks: { color: 'rgba(0,200,255,0.4)', maxTicksLimit: 8, font: { size: 10 } },
          grid: { color: 'rgba(0,136,255,0.05)' }
        },
        y: {
          min: parseFloat((min - pad).toFixed(2)),
          max: parseFloat((max + pad).toFixed(2)),
          ticks: {
            color: 'rgba(0,200,255,0.4)',
            font: { size: 10 },
            callback: function(v) { return '$' + v.toFixed(0); }
          },
          grid: { color: 'rgba(0,136,255,0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var d = ctx.raw;
              return [
                'O: $' + d.o.toFixed(2),
                'H: $' + d.h.toFixed(2),
                'L: $' + d.l.toFixed(2),
                'C: $' + d.c.toFixed(2)
              ];
            }
          }
        }
      }
    }
  });
}

// ── Portfolio ─────────────────────────────────────────────────────────────────
function renderPortfolio() {
  const ctx = document.getElementById('portfolioChart') ? document.getElementById('portfolioChart').getContext('2d') : null;
  const holdings = Object.entries(userData.portfolio);

  if (ctx && holdings.length) {
    if (portfolioChartInstance) { portfolioChartInstance.destroy(); portfolioChartInstance = null; }
    const colors = ['#0088ff','#00c8ff','#0055cc','#00aaff','#3399ff','#0066dd'];
    portfolioChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: holdings.map(function(h) { return h[0]; }),
        datasets: [{
          data: holdings.map(function(h) {
            const s = stocks.find(function(x) { return x.symbol === h[0]; });
            return s ? h[1] * s.price : 0;
          }),
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#00c8ff' } } }
      }
    });
  }

  let html = '';
  let totalValue = 0;
  holdings.forEach(function(entry) {
    const symbol = entry[0];
    const qty    = entry[1];
    const stock  = stocks.find(function(s) { return s.symbol === symbol; });
    if (!stock) return;
    const avg   = userData.avgPrices[symbol] || stock.price;
    const value = qty * stock.price;
    const pl    = value - qty * avg;
    const plPct = avg > 0 ? ((stock.price - avg) / avg * 100) : 0;
    totalValue += value;
    html += '<tr>' +
      '<td><strong style="color:#00c8ff">' + symbol + '</strong></td>' +
      '<td>' + qty.toFixed(4) + '</td>' +
      '<td>$' + avg.toFixed(2) + '</td>' +
      '<td>$' + stock.price.toFixed(2) + '</td>' +
      '<td class="' + (pl >= 0 ? 'pl-positive' : 'pl-negative') + '">$' + pl.toFixed(2) + '</td>' +
      '<td class="' + (pl >= 0 ? 'pl-positive' : 'pl-negative') + '">' + plPct.toFixed(1) + '%</td>' +
      '<td><button class="quick-sell" onclick="quickSell(\'' + symbol + '\')">Sell All</button></td>' +
      '</tr>';
  });

  el.portfolioTable.innerHTML = html ||
    '<tr><td colspan="7" style="text-align:center;color:rgba(212,175,55,0.5);padding:2rem">No holdings yet</td></tr>';

  const tfoot = document.querySelector('.portfolio-table tfoot');
  if (tfoot) {
    tfoot.innerHTML = '<tr><td colspan="4"><strong>Total Value</strong></td>' +
      '<td colspan="3" style="color:#00c8ff;font-weight:700">$' + totalValue.toFixed(2) + '</td></tr>';
  }
}

function renderHistory() {
  const rows = userData.history.slice(0, 50).map(function(t) {
    return '<tr>' +
      '<td style="color:' + (t.action === 'buy' ? '#4ade80' : '#f87171') + ';font-weight:700">' + t.action.toUpperCase() + '</td>' +
      '<td><strong style="color:#00c8ff">' + t.symbol + '</strong></td>' +
      '<td>' + t.quantity + '</td>' +
      '<td>$' + t.price.toFixed(2) + '</td>' +
      '<td>$' + t.total.toFixed(2) + '</td>' +
      '<td>' + t.date + '</td>' +
      '</tr>';
  }).join('');
  el.historyTable.innerHTML = rows ||
    '<tr><td colspan="6" style="text-align:center;color:rgba(212,175,55,0.5);padding:2rem">No trades yet</td></tr>';
}

function renderLeaderboard() {
  const ol = document.querySelector('.leaderboard ol');
  const all = leaderboardUsers.concat([{ username: currentUser || 'You', balance: userData.balance }])
    .sort(function(a, b) { return b.balance - a.balance; });
  ol.innerHTML = all.map(function(u, i) {
    const isMe = u.username === currentUser;
    return '<li' + (isMe ? ' style="border-color:rgba(212,175,55,0.5);background:rgba(212,175,55,0.12)"' : '') + '>' +
      '<span>' + (isMe ? '⭐ ' : '#' + (i + 1) + ' ') + u.username + (isMe ? ' (You)' : '') + '</span>' +
      '<span style="color:#00c8ff;font-weight:700">$' + u.balance.toFixed(2) + '</span>' +
      '</li>';
  }).join('');
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function updateBalance() {
  if (el.balanceEl) el.balanceEl.textContent = '$' + userData.balance.toFixed(2);
}

function quickSell(symbol) {
  const stock = stocks.find(function(s) { return s.symbol === symbol; });
  if (!stock || !userData.portfolio[symbol]) return;
  const qty   = userData.portfolio[symbol];
  const total = qty * stock.price;
  userData.balance += total;
  userData.history.unshift({
    action: 'sell', symbol: symbol, quantity: qty,
    price: stock.price, total: total, date: new Date().toLocaleString()
  });
  delete userData.portfolio[symbol];
  delete userData.avgPrices[symbol];
  saveUserData();
  updateBalance();
  renderPortfolio();
  showNotification('Sold all ' + symbol, 'success');
}

function showNotification(message, type) {
  type = type || 'success';
  const n = document.createElement('div');
  n.className = 'notification ' + type;
  n.textContent = message;
  document.getElementById('notifications').appendChild(n);
  setTimeout(function() { n.classList.add('show'); }, 50);
  setTimeout(function() {
    n.classList.remove('show');
    setTimeout(function() { n.remove(); }, 300);
  }, 3000);
}

function toggleTheme() {
  const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  el.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
  localStorage.setItem('pt_theme', theme);
}

function loadTheme() {
  const theme = localStorage.getItem('pt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  if (el.themeToggle) el.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ── Start ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
