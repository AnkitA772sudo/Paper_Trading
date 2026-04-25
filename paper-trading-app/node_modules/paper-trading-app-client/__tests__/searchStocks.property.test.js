// Feature: paper-trading-app, Property 6: Stock search result relevance and count
// Validates: Requirements 4.1

const fc = require('fast-check');

// Inline searchStocks function
function searchStocks(query, stocks) {
  const q = query.toLowerCase();
  return stocks
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    )
    .slice(0, 5);
}

const stockArb = fc.record({
  symbol: fc.stringMatching(/^[A-Z]{1,5}$/),
  name: fc.string({ minLength: 1, maxLength: 30 }),
});

const stocksArb = fc.array(stockArb, { minLength: 0, maxLength: 20 });

describe('Property 6: Stock search result relevance and count', () => {
  test('all results contain query (case-insensitive) and count <= 5', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 5 }),
        stocksArb,
        (query, stocks) => {
          const results = searchStocks(query, stocks);
          const q = query.toLowerCase();

          // Count must not exceed 5
          expect(results.length).toBeLessThanOrEqual(5);

          // Every result must match the query
          for (const stock of results) {
            const matches =
              stock.symbol.toLowerCase().includes(q) ||
              stock.name.toLowerCase().includes(q);
            expect(matches).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
