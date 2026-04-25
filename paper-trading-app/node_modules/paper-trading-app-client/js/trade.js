// Feature: paper-trading-app — Trade module
// Requirements: 4.1, 4.2, 4.3, 4.4, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 13.1

import { pricesMap } from './pricePoller.js';
import { searchStocks } from './searchStocks.js';
import { showNotification } from './notifications.js';
import { post } from './api.js';
import { formatCurrency } from './utils.js';

let currentChart = null;
let selectedSymbol = null;

function renderDropdown(results) {
  const dropdown = document.getElementById('search-results');
  if (!dropdown) return;

  dropdown.innerHTML = '';

  if (results.length === 0) {
    const item = document.createElement('div');
    item.className = 'search-result-item search-result-empty';
    item.textContent = 'No results found';
    dropdown.appendChild(item);
  } else {
    for (const stock of results) {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.dataset.symbol = stock.symbol;
      item.textContent = `${stock.symbol} — ${formatCurrency(stock.price)}`;
      item.addEventListener('click', () => selectStock(stock.symbol));
      dropdown.appendChild(item);
    }
  }

  dropdown.style.display = 'block';
}

function selectStock(symbol) {
  const stock = pricesMap.get(symbol);
  if (!stock) return;

  selectedSymbol = symbol;

  const symbolInput = document.getElementById('selected-symbol');
  if (symbolInput) symbolInput.value = symbol;

  const priceEl = document.getElementById('selected-price');
  if (priceEl) priceEl.textContent = formatCurrency(stock.price);

  const searchInput = document.getElementById('stock-search');
  if (searchInput) searchInput.value = symbol;

  const dropdown = document.getElementById('search-results');
  if (dropdown) dropdown.style.display = 'none';

  renderChart(stock);
}

function renderChart(stock) {
  const canvas = document.getElementById('price-chart');
  if (!canvas) return;

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const history = Array.isArray(stock.history) ? stock.history : [];
  const labels = history.map((_, i) => i + 1);

  currentChart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: stock.symbol,
        data: [...history],
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

function updateDropdownPrices() {
  const dropdown = document.getElementById('search-results');
  if (!dropdown || dropdown.style.display === 'none') return;

  const items = dropdown.querySelectorAll('.search-result-item[data-symbol]');
  for (const item of items) {
    const sym = item.dataset.symbol;
    const stock = pricesMap.get(sym);
    if (stock) {
      item.textContent = `${sym} — ${formatCurrency(stock.price)}`;
      item.addEventListener('click', () => selectStock(sym));
    }
  }
}

function updateChartInPlace() {
  if (!currentChart || !selectedSymbol) return;

  const stock = pricesMap.get(selectedSymbol);
  if (!stock || !Array.isArray(stock.history)) return;

  const history = stock.history;
  currentChart.data.labels = history.map((_, i) => i + 1);
  currentChart.data.datasets[0].data = [...history];
  currentChart.update();
}

function initTradeModule() {
  const searchInput = document.getElementById('stock-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      const dropdown = document.getElementById('search-results');

      if (!query) {
        if (dropdown) dropdown.style.display = 'none';
        return;
      }

      const stocks = Array.from(pricesMap.values());
      const results = searchStocks(query, stocks);
      renderDropdown(results);
    });
  }

  window.addEventListener('pricesUpdated', () => {
    updateDropdownPrices();
    updateChartInPlace();
  });

  const tradeForm = document.getElementById('trade-form');
  if (tradeForm) {
    tradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const action = document.getElementById('trade-action')?.value;
      const symbol = document.getElementById('selected-symbol')?.value;
      const quantity = Number(document.getElementById('trade-quantity')?.value);

      const data = await post('/trade', { action, symbol, quantity });
      if (!data) return;

      if (data.error) {
        showNotification(data.error, 'error');
      } else {
        showNotification(`${action} ${quantity} ${symbol} executed`, 'success');
        window.dispatchEvent(new CustomEvent('tradeExecuted'));
      }
    });
  }
}

export { initTradeModule };
