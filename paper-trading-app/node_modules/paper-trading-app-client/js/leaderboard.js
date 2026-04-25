// Feature: paper-trading-app — Leaderboard module
// Requirements: 10.1, 10.2, 10.3

import { get } from './api.js';
import { formatCurrency } from './utils.js';

async function loadLeaderboard(currentUsername) {
  const data = await get('/leaderboard');
  const list = document.getElementById('leaderboard-list');
  if (!list) return;

  const entries = Array.isArray(data) ? data : [];

  if (entries.length === 0) {
    list.innerHTML = '<li>No leaderboard data yet.</li>';
    return;
  }

  list.innerHTML = entries.map((entry) => {
    const isCurrent = entry.username === currentUsername;
    const cls = isCurrent ? ' class="leaderboard-current-user"' : '';
    return `<li${cls}>${entry.rank}. ${entry.username} — ${formatCurrency(entry.totalValue)}</li>`;
  }).join('');
}

export { loadLeaderboard };
