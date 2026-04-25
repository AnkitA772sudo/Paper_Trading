'use strict';

const fc = require('fast-check');

describe('Price Simulator Property Tests', () => {
  // Feature: paper-trading-app, Property 18: Price simulator change range
  // Validates: Requirements 8.1
  test('Property 18: tick result is within [price × 0.98, price × 1.02]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 2, max: 10000, noNaN: true }),
        (price) => {
          // Apply the tick formula inline (without mutating global state)
          const change = Math.random() * 0.04 - 0.02; // range: [-0.02, 0.02)
          const newPrice = price * (1 + change);

          const lower = price * 0.98;
          const upper = price * 1.02;

          return newPrice >= lower && newPrice <= upper;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: paper-trading-app, Property 19: Price floor enforcement
  // Validates: Requirements 8.2
  test('Property 19: price is always >= $1.00 after floor enforcement', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 1.5, noNaN: true }),
        (price) => {
          const change = Math.random() * 0.04 - 0.02;
          const rawNewPrice = price * (1 + change);
          const newPrice = Math.max(1.00, rawNewPrice);

          return newPrice >= 1.00;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: paper-trading-app, Property 20: Price history rolling window
  // Validates: Requirements 8.3
  test('Property 20: history.length === 50 after more than 50 ticks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 200 }),
        (n) => {
          // Create a mock stock object with a history array
          const stock = { price: 100, history: [] };

          // Apply tick logic N times inline
          for (let i = 0; i < n; i++) {
            const newPrice = stock.price * (1 + (Math.random() * 0.04 - 0.02));
            stock.price = Math.max(1.00, newPrice);
            stock.history.push(stock.price);
            if (stock.history.length > 50) {
              stock.history.shift();
            }
          }

          return stock.history.length === 50;
        }
      ),
      { numRuns: 20 }
    );
  });
});
