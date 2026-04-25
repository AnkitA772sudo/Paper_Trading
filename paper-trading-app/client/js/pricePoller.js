// Feature: paper-trading-app — Price poller
// Requirements: 8.4, 8.5

import { get } from './api.js';

const pricesMap = new Map();

async function poll() {
  const data = await get('/stocks/prices');
  if (!data) return;

  const stocks = Array.isArray(data) ? data : (data.stocks || []);
  for (const stock of stocks) {
    pricesMap.set(stock.symbol, stock);
  }

  window.dispatchEvent(new CustomEvent('pricesUpdated', { detail: pricesMap }));
}

function startPolling() {
  poll();
  setInterval(poll, 3000);
}

export { startPolling, pricesMap };
