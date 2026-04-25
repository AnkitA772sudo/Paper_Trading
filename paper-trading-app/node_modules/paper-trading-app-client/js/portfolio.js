// Feature: paper-trading-app — Portfolio module
// Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 6.8, 16.1, 16.3

import { get, post } from './api.js';
import { formatCurrency } from './utils.js';
import { showNotification } from './notifications.js';

let doughnutChart = null;
let trendChart = null;

async function loadPortfolio() {
  const data = await get('/user/portfolio');
  if (!data) return;

  const { holdings = [], balance = 0, snapshots = [] } = data;

  const table = document.getElementById('holdings-table');
  if (table) {
    if (holdings.length === 0) {
      table.innerHTML = '<tr><td colspan="7">No holdings yet.</td></tr>';
    } else {
      table.innerHTML = holdings.map((h) => {
        const pl = (h.currentPrice - h.avgPrice) * h.quantity;
        const plPct = h.avgPrice !== 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
        const plClass = pl >= 0 ? 'pl-positive' : 'pl-negative';
        return `<tr>
          <td>${h.symbol}</td>
          <td>${h.quantity}</td>
          <td>${formatCurrency(h.avgPrice)}</td>
          <td>${formatCurrency(h.currentPrice)}</td>
          <td class="${plClass}">${formatCurrency(pl)}</td>
          <td class="${plClass}">${plPct.toFixed(2)}%</td>
          <td><button class="sell-all-btn" data-symbol="${h.symbol}" data-quantity="${h.quantity}" style="min-height:44px;min-width:44px;">Sell All</button></td>
        </tr>`;
      }).join('');

      table.querySelectorAll('.sell-all-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const symbol = btn.dataset.symbol;
          const quantity = Number(btn.dataset.quantity);
          const result = await post('/trade', { action: 'SELL', symbol, quantity });
          if (result && result.error) {
            showNotification(result.error, 'error');
          } else {
            showNotification(`SELL ALL ${symbol} executed`, 'success');
            await loadPortfolio();
          }
        });
      });
    }
  }

  const totalValueEl = document.getElementById('total-value');
  if (totalValueEl) {
    const total = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
    totalValueEl.textContent = formatCurrency(total + balance);
  }

  const chartCanvas = document.getElementById('portfolio-chart');
  if (chartCanvas && window.Chart) {
    if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
    if (holdings.length > 0) {
      doughnutChart = new window.Chart(chartCanvas, {
        type: 'doughnut',
        data: {
          labels: holdings.map((h) => h.symbol),
          datasets: [{ data: holdings.map((h) => h.quantity * h.currentPrice), backgroundColor: holdings.map((_, i) => `hsl(${(i * 47) % 360}, 65%, 55%)`) }],
        },
        options: { responsive: true },
      });
    }
  }

  const trendCanvas = document.getElementById('trend-chart');
  const trendMessage = document.getElementById('trend-message');
  if (snapshots.length < 2) {
    if (trendCanvas) trendCanvas.style.display = 'none';
    if (trendMessage) { trendMessage.style.display = ''; trendMessage.textContent = 'Make your first trade to see performance data'; }
  } else {
    if (trendCanvas) trendCanvas.style.display = '';
    if (trendMessage) trendMessage.style.display = 'none';
    if (trendCanvas && window.Chart) {
      if (trendChart) { trendChart.destroy(); trendChart = null; }
      trendChart = new window.Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: snapshots.map((_, i) => i + 1),
          datasets: [{ label: 'Portfolio Value', data: snapshots.map(s => s.value), fill: false, tension: 0.3 }],
        },
        options: { responsive: true },
      });
    }
  }
}

export { loadPortfolio };
