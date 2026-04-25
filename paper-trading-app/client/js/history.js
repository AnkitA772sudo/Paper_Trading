// Feature: paper-trading-app — Transaction history module
// Requirements: 7.1, 7.2, 7.4

import { get } from './api.js';
import { formatCurrency } from './utils.js';

async function loadHistory() {
  const data = await get('/user/history');
  const table = document.getElementById('history-table');
  if (!table) return;

  const transactions = Array.isArray(data) ? data : [];

  if (transactions.length === 0) {
    table.innerHTML = '<tr><td colspan="6">No trades yet.</td></tr>';
    return;
  }

  table.innerHTML = transactions.map((t) => {
    const date = new Date(t.timestamp).toLocaleString();
    return `<tr>
      <td>${t.action}</td>
      <td>${t.symbol}</td>
      <td>${t.quantity}</td>
      <td>${formatCurrency(t.price)}</td>
      <td>${formatCurrency(t.total)}</td>
      <td>${date}</td>
    </tr>`;
  }).join('');
}

export { loadHistory };
