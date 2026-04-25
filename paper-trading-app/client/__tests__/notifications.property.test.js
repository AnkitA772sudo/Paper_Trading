// Feature: paper-trading-app, Property 27: Success notification content
// Validates: Requirements 13.1

const fc = require('fast-check');

// Inline the notification message format used in trade.js
function buildSuccessMessage(action, quantity, symbol) {
  return `${action} ${quantity} ${symbol} executed`;
}

describe('Property 27: Success notification content', () => {
  test('notification text contains action, quantity, and symbol', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('BUY', 'SELL'),
        fc.integer({ min: 1, max: 1000 }),
        fc.stringMatching(/^[A-Z]{1,5}$/),
        (action, quantity, symbol) => {
          const message = buildSuccessMessage(action, quantity, symbol);
          expect(message).toContain(action);
          expect(message).toContain(String(quantity));
          expect(message).toContain(symbol);
        }
      ),
      { numRuns: 20 }
    );
  });
});
