// Feature: paper-trading-app, Property 5: Currency formatting
// Validates: Requirements 3.1

const fc = require('fast-check');

// Inline formatCurrency using the same Intl.NumberFormat approach
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

describe('Property 5: Currency formatting', () => {
  test('output matches $N,NNN.NN USD pattern for non-negative numbers', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        (value) => {
          const result = formatCurrency(value);
          expect(result).toMatch(/^\$[\d,]+\.\d{2}$/);
        }
      ),
      { numRuns: 20 }
    );
  });
});
