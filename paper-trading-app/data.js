// data.js - Mock stock data with OHLC candlestick support

const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.',             price: 189.30, history: [], candles: [], volume: 100000 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',          price: 175.50, history: [], candles: [], volume: 80000  },
  { symbol: 'MSFT', name: 'Microsoft Corp.',         price: 415.20, history: [], candles: [], volume: 120000 },
  { symbol: 'TSLA', name: 'Tesla Inc.',              price: 177.80, history: [], candles: [], volume: 150000 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.',         price: 185.60, history: [], candles: [], volume: 90000  },
  { symbol: 'NVDA', name: 'NVIDIA Corp.',            price: 875.40, history: [], candles: [], volume: 200000 },
  { symbol: 'META', name: 'Meta Platforms Inc.',     price: 505.30, history: [], candles: [], volume: 70000  },
  { symbol: 'NFLX', name: 'Netflix Inc.',            price: 628.90, history: [], candles: [], volume: 50000  },
  { symbol: 'AMD',  name: 'Advanced Micro Devices', price: 165.70, history: [], candles: [], volume: 110000 },
  { symbol: 'CRM',  name: 'Salesforce Inc.',         price: 274.50, history: [], candles: [], volume: 60000  }
];

// Generate one OHLC candle from a starting price
function makeCandle(open, index) {
  var change = open * (Math.random() * 0.02);  // up to 2% body
  var isUp   = Math.random() > 0.45;           // slight bullish bias
  var close  = isUp ? open + change : open - change;
  close = Math.max(1, parseFloat(close.toFixed(2)));
  var high  = Math.max(open, close) * (1 + Math.random() * 0.008);
  var low   = Math.min(open, close) * (1 - Math.random() * 0.008);
  return {
    x: index,
    o: parseFloat(open.toFixed(2)),
    h: parseFloat(high.toFixed(2)),
    l: parseFloat(low.toFixed(2)),
    c: parseFloat(close.toFixed(2))
  };
}

// Seed 30 candles per stock
stocks.forEach(function(stock) {
  var price = stock.price;
  for (var i = 0; i < 30; i++) {
    var candle = makeCandle(price, i);
    stock.candles.push(candle);
    stock.history.push(candle.c);
    price = candle.c;
  }
  stock.price = price;
});

// Leaderboard mock data
var leaderboardUsers = [
  { username: 'GoldTrader', balance: 18500 },
  { username: 'NavyBull',   balance: 15200 },
  { username: 'StockKing',  balance: 13800 },
  { username: 'MarketAce',  balance: 12100 }
];

// Called every 3 seconds — adds a new candle, removes oldest if > 50
function updateStockPrices() {
  stocks.forEach(function(stock) {
    var lastCandle = stock.candles[stock.candles.length - 1];
    var newCandle  = makeCandle(lastCandle.c, stock.candles.length);
    stock.candles.push(newCandle);
    stock.history.push(newCandle.c);
    stock.price = newCandle.c;
    if (stock.candles.length > 50) stock.candles.shift();
    if (stock.history.length > 50) stock.history.shift();
    // Re-index x values
    stock.candles.forEach(function(c, i) { c.x = i; });
  });
}

console.log('📊 Candlestick data loaded');
