'use strict';

const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.30, history: [] },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.50, history: [] },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 415.20, history: [] },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 177.80, history: [] },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.60, history: [] },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.40, history: [] },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 505.30, history: [] },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 628.90, history: [] },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', price: 165.70, history: [] },
  { symbol: 'CRM', name: 'Salesforce Inc.', price: 274.50, history: [] },
];

function tick() {
  for (const stock of stocks) {
    const newPrice = stock.price * (1 + (Math.random() * 0.04 - 0.02));
    stock.price = Math.max(1.00, newPrice);
    stock.history.push(stock.price);
    if (stock.history.length > 50) {
      stock.history.shift();
    }
  }
}

function start() {
  setInterval(tick, 3000);
}

function getAll() {
  return stocks;
}

function getPrice(symbol) {
  const stock = stocks.find(s => s.symbol === symbol);
  return stock ? stock.price : null;
}

module.exports = { start, getAll, getPrice, tick };
