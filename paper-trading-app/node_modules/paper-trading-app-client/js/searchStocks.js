// Feature: paper-trading-app — Stock search
// Requirements: 4.1

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

export { searchStocks };
