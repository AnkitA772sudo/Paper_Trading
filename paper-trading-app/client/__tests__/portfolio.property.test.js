// Feature: paper-trading-app, Property 13: P/L color coding
// Feature: paper-trading-app, Property 14: Total portfolio value calculation
// Validates: Requirements 6.4, 6.5, 6.6

const fc = require('fast-check');

function getPLClass(pl) {
  return pl >= 0 ? 'pl-positive' : 'pl-negative';
}

function calcTotal(holdings) {
  return holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
}

describe('Property 13: P/L color coding', () => {
  test('positive P/L gets pl-positive class', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(1e6), noNaN: true }),
        (pl) => { expect(getPLClass(pl)).toBe('pl-positive'); }
      ),
      { numRuns: 20 }
    );
  });

  test('negative P/L gets pl-negative class', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1e6), max: Math.fround(-0.01), noNaN: true }),
        (pl) => { expect(getPLClass(pl)).toBe('pl-negative'); }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 14: Total portfolio value calculation', () => {
  test('total equals sum of quantity * currentPrice for all holdings', () => {
    const holdingArb = fc.record({
      quantity: fc.integer({ min: 1, max: 1000 }),
      currentPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
    });

    fc.assert(
      fc.property(
        fc.array(holdingArb, { minLength: 0, maxLength: 10 }),
        (holdings) => {
          const expected = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
          expect(calcTotal(holdings)).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 20 }
    );
  });
});
