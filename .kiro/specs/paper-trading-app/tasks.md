# Implementation Plan: PaperTrade Full-Stack Upgrade

## Overview

Upgrade the existing frontend-only PaperTrade app to a full-stack application. The implementation proceeds in layers: project scaffolding → backend (auth, trade, portfolio, leaderboard, price simulator) → frontend refactor → integration wiring. Each task builds directly on the previous one with no orphaned code.

## Tasks

- [x] 1. Scaffold project structure and install dependencies
  - Create `paper-trading-app/package.json` with workspaces for `server` and `client`
  - Create `paper-trading-app/server/package.json` with dependencies: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `cors`, `dotenv`
  - Create `paper-trading-app/server/package.json` devDependencies: `jest`, `supertest`, `@jest/globals`, `fast-check`, `mongodb-memory-server`, `nodemon`
  - Create `paper-trading-app/client/package.json` (minimal, for future bundler support)
  - Create `paper-trading-app/server/.env.example` with `MONGO_URI`, `JWT_SECRET`, `PORT`
  - Create `paper-trading-app/server/jest.config.js` configured for Node environment
  - _Requirements: 15.1–15.10_

- [x] 2. Define MongoDB data models
  - [x] 2.1 Create `server/models/User.js` with the User schema (username, passwordHash, balance, portfolio array, portfolioSnapshots array, createdAt)
    - Add unique index on `username`
    - Cap `portfolioSnapshots` at 30 entries in the pre-save hook
    - _Requirements: 1.1, 15.10_
  - [x] 2.2 Create `server/models/Transaction.js` with the Transaction schema (userId ref, action, symbol, quantity, price, total, timestamp)
    - Add indexes on `userId` and `timestamp`
    - _Requirements: 5.6, 7.1, 7.2_

- [x] 3. Implement the Price Simulator service
  - [x] 3.1 Create `server/services/priceSimulator.js`
    - Seed initial stock data from the 10 mock stocks (AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META, NFLX, AMD, CRM) with prices and empty history arrays
    - Implement `tick()`: apply random ±2% change to each stock, enforce $1.00 floor, push new price to history, trim history to 50 entries
    - Export `start()` (calls `setInterval(tick, 3000)`), `getAll()`, and `getPrice(symbol)`
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 3.2 Write property tests for Price Simulator
    - **Property 18: Price simulator change range** — generate random starting prices; verify each tick result is within [price × 0.98, price × 1.02]
    - **Validates: Requirements 8.1**
    - **Property 19: Price floor enforcement** — generate prices near $1.00; verify result is always ≥ $1.00
    - **Validates: Requirements 8.2**
    - **Property 20: Price history rolling window** — apply N > 50 ticks; verify `history.length === 50`
    - **Validates: Requirements 8.3**

- [x] 4. Implement authentication middleware and helpers
  - [x] 4.1 Create `server/middleware/auth.js`
    - Read JWT from `req.cookies.token`; verify with `jsonwebtoken`; attach decoded payload to `req.user`; return 401 on failure
    - _Requirements: 2.4, 2.5, 15.9_
  - [x] 4.2 Create `server/utils/jwt.js` with `signToken(userId, username)` and `verifyToken(token)` helpers
    - Token expiry: 24 hours
    - _Requirements: 15.2_
  - [x] 4.3 Create `server/utils/password.js` with `hashPassword(plain)` and `comparePassword(plain, hash)` helpers using bcryptjs
    - _Requirements: 1.1, 2.1_
  - [x] 4.4 Write unit tests for JWT and password helpers
    - Test `signToken` produces a verifiable token; test `verifyToken` rejects tampered tokens
    - Test `hashPassword` produces a different string; test `comparePassword` returns true/false correctly
    - _Requirements: 2.1, 2.5_
  - [x] 4.5 Write property test for invalid token rejection
    - **Property 4: Invalid token rejection on protected endpoints** — generate random strings as JWT; send to a protected test route; verify all return 401
    - **Validates: Requirements 2.5, 15.9**

- [x] 5. Implement AuthController and auth routes
  - [x] 5.1 Create `server/controllers/auth.js` with `register`, `login`, and `logout` handlers
    - `register`: validate username uniqueness and password length ≥ 6; hash password; create User with balance 10000; sign JWT; set HttpOnly cookie; return 201
    - `login`: find user; compare password; sign JWT; set HttpOnly cookie; return 200
    - `logout`: clear cookie; return 200
    - Use `express-validator` for input validation
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_
  - [x] 5.2 Create `server/routes/auth.js` and wire to `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
    - _Requirements: 15.1, 15.2, 15.3_
  - [x] 5.3 Write property test for new account starting capital
    - **Property 1: New account starting capital** — generate random valid (username, password ≥ 6 chars) pairs; call register; verify `balance === 10000`
    - **Validates: Requirements 1.1**
  - [x] 5.4 Write property test for short password rejection
    - **Property 2: Short password rejection** — generate passwords of length 0–5; call register; verify all return 400 and no user is created
    - **Validates: Requirements 1.3**
  - [x] 5.5 Write property test for invalid credential error message consistency
    - **Property 3: Invalid credential error message consistency** — generate random (username, password) pairs not matching any user; call login; verify error message is always "Invalid username or password"
    - **Validates: Requirements 2.2**

- [x] 6. Implement TradeController and trade route
  - [x] 6.1 Create `server/controllers/trade.js` with `executeTrade` handler
    - Validate action (BUY/SELL), symbol (must exist in price simulator), quantity > 0
    - Open a MongoDB session/transaction
    - BUY: check balance ≥ price × quantity; deduct balance; upsert portfolio entry with weighted average price
    - SELL: check holdings ≥ quantity; add proceeds to balance; reduce holding; remove entry if quantity reaches 0
    - Create Transaction record
    - Record portfolio value snapshot (balance + sum of holdings at current prices); trim snapshots to 30
    - Commit transaction; return updated balance and portfolio
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 16.2_
  - [x] 6.2 Create `server/routes/trade.js` and wire to `POST /api/trade` (protected by `authMiddleware`) 
    - _Requirements: 15.5_
  - [x] 6.3 Write property test for buy order balance conservation
    - **Property 7: Buy order balance conservation** — generate random (balance, price, quantity) tuples where balance ≥ price × quantity and quantity > 0; execute buy; verify `newBalance === balance − price × quantity` and holding increased by quantity
    - **Validates: Requirements 5.1**
  - [x] 6.4 Write property test for sell order balance conservation
    - **Property 8: Sell order balance conservation** — generate random (holdings, price, quantity) tuples where holdings ≥ quantity and quantity > 0; execute sell; verify `newBalance === oldBalance + price × quantity` and holding decreased by quantity
    - **Validates: Requirements 5.2**
  - [x] 6.5 Write property test for invalid trade rejection preserving state
    - **Property 9: Invalid trade rejection preserves state** — generate invalid orders (over-budget, over-shares, zero/negative qty); verify 400 response and user state is unchanged
    - **Validates: Requirements 5.3, 5.4, 5.5**
  - [x] 6.6 Write property test for transaction recorded on successful trade
    - **Property 10: Transaction recorded on successful trade** — execute random valid trades; verify Transaction document created with correct action, symbol, quantity, price, total, and timestamp within current second
    - **Validates: Requirements 5.6**
  - [x] 6.7 Write property test for zero-holding removal
    - **Property 11: Zero-holding removal** — generate portfolios; execute full-sell of each holding; verify no zero-quantity entries remain in portfolio
    - **Validates: Requirements 5.7**
  - [x] 6.8 Write property test for portfolio snapshot on trade
    - **Property 28: Portfolio snapshot on trade** — execute random trades; verify snapshot recorded equals post-trade balance + sum of holdings at current prices
    - **Validates: Requirements 16.2**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UserController and user routes
  - [x] 8.1 Create `server/controllers/user.js` with `getPortfolio`, `getHistory`, and `resetAccount` handlers
    - `getPortfolio`: fetch user; enrich each holding with current price from price simulator; compute P/L and P/L%; return holdings, balance, snapshots
    - `getHistory`: query Transaction collection for userId, sort by timestamp desc, limit 50
    - `resetAccount`: set balance to 10000, clear portfolio array, clear portfolioSnapshots; delete all Transaction documents for userId
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 12.1, 15.4, 15.6, 15.8_
  - [x] 8.2 Create `server/routes/user.js` and wire `GET /api/user/portfolio`, `GET /api/user/history`, `POST /api/user/reset` (all protected)
    - _Requirements: 15.4, 15.6, 15.8_
  - [x] 8.3 Write property test for P/L calculation correctness
    - **Property 12: P/L calculation correctness** — generate random (avgPrice, currentPrice, quantity) tuples; verify P/L = (currentPrice − avgPrice) × quantity and P/L% = ((currentPrice − avgPrice) / avgPrice) × 100
    - **Validates: Requirements 6.2, 6.3**
  - [x] 8.4 Write property test for transaction history ordering
    - **Property 15: Transaction history ordering** — generate random transaction sets with varying timestamps; verify response is sorted descending by timestamp
    - **Validates: Requirements 7.1**
  - [x] 8.5 Write property test for transaction history field completeness
    - **Property 16: Transaction history field completeness** — generate random transactions; verify each response item includes action, symbol, quantity, price, total, and timestamp
    - **Validates: Requirements 7.2**
  - [x] 8.6 Write property test for transaction history page limit
    - **Property 17: Transaction history page limit** — create user with > 50 transactions; call history endpoint; verify response length ≤ 50
    - **Validates: Requirements 7.3**
  - [x] 8.7 Write property test for account reset completeness
    - **Property 26: Account reset completeness** — generate random user states; execute reset; verify balance === 10000, portfolio === [], history === []
    - **Validates: Requirements 12.1**

- [x] 9. Implement LeaderboardController and leaderboard route
  - [x] 9.1 Create `server/controllers/leaderboard.js` with `getLeaderboard` handler
    - Fetch all users; compute total value = balance + sum(holding.quantity × currentPrice) for each; sort descending; return top 10 with rank, username, totalValue
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 9.2 Create `server/routes/leaderboard.js` and wire `GET /api/leaderboard` (protected)
    - _Requirements: 15.7_
  - [x] 9.3 Write property test for leaderboard ordering
    - **Property 21: Leaderboard ordering** — generate random user portfolio values; verify leaderboard entries are in descending order of total portfolio value
    - **Validates: Requirements 10.1**
  - [x] 9.4 Write property test for leaderboard entry field completeness
    - **Property 22: Leaderboard entry field completeness** — generate random leaderboard responses; verify each entry includes rank, username, and totalValue
    - **Validates: Requirements 10.2**

- [x] 10. Implement StockController and wire Express app
  - [x] 10.1 Create `server/controllers/stock.js` with `getPrices` handler that returns `priceSimulator.getAll()`
    - _Requirements: 8.4, 8.5_
  - [x] 10.2 Create `server/routes/stock.js` and wire `GET /api/stocks/prices` (public, no auth)
    - _Requirements: 8.4_
  - [x] 10.3 Create `server/app.js`: configure Express with `cookie-parser`, `cors` (credentials: true), `express.json()`; mount all route files under `/api`; add global error handler returning `{ error: "Internal server error" }` on 500
    - _Requirements: 15.1–15.10_
  - [x] 10.4 Create `server/index.js`: connect to MongoDB via `MONGO_URI`; start price simulator; listen on `PORT`; exit with non-zero code on DB connection failure
    - _Requirements: 15.10_

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Write integration tests
  - [x] 12.1 Write auth flow integration test
    - Use Supertest + MongoDB Memory Server; test: register → login → access protected route → logout → access protected route (expect 401)
    - _Requirements: 1.1, 2.1, 2.3, 2.5, 15.9_
  - [x] 12.2 Write trade flow integration test
    - Test: register → login → buy → GET portfolio (verify holding) → sell → GET portfolio (verify balance restored)
    - _Requirements: 5.1, 5.2, 6.1_
  - [x] 12.3 Write reset flow integration test
    - Test: register → login → buy → POST reset → GET portfolio (verify balance=10000, portfolio=[], history=[])
    - _Requirements: 12.1_
  - [x] 12.4 Write leaderboard ranking integration test
    - Register multiple users with different portfolio values; verify leaderboard returns them in descending order
    - _Requirements: 10.1_
  - [x] 12.5 Write history pagination integration test
    - Create user with 60 transactions; call GET /api/user/history; verify response length === 50
    - _Requirements: 7.3_

- [x] 13. Refactor frontend — create `client/` structure and shared utilities
  - Move existing `index.html`, `styles.css` into `paper-trading-app/client/`
  - Create `client/js/api.js`: thin `fetch` wrapper with base URL; on 401 response, redirect to login page; export `get(path)`, `post(path, body)`
  - Create `client/js/notifications.js`: extract toast notification logic from existing `app.js`; export `showNotification(message, type)`
  - Create `client/js/theme.js`: extract dark/light mode toggle logic; apply saved theme on load before render; export `initTheme()`
  - _Requirements: 2.5, 11.1, 11.2, 11.3, 11.4, 13.3, 13.4_
  - [x] 13.1 Write property test for currency formatting
    - **Property 5: Currency formatting** — generate random non-negative numbers; verify `formatCurrency` output matches `$N,NNN.NN` pattern
    - **Validates: Requirements 3.1**
  - [x] 13.2 Write property test for theme toggle round-trip
    - **Property 23: Theme toggle round-trip** — for any initial theme state, toggle twice; verify theme returns to original state
    - **Validates: Requirements 11.1**
  - [x] 13.3 Write property test for theme persistence round-trip
    - **Property 24: Theme persistence round-trip** — save theme to localStorage; read back; verify applied theme matches saved theme
    - **Validates: Requirements 11.2**
  - [x] 13.4 Write property test for theme icon correctness
    - **Property 25: Theme icon correctness** — verify moon icon shown in Light_Mode and sun icon shown in Dark_Mode
    - **Validates: Requirements 11.4**

- [x] 14. Refactor frontend — auth module
  - Create `client/js/auth.js`: login form submit → `api.post('/api/auth/login')` → redirect to dashboard; signup form submit → `api.post('/api/auth/register')` → redirect to dashboard; logout button → `api.post('/api/auth/logout')` → redirect to login
  - Update `index.html` to remove inline auth logic and load `auth.js`
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 15. Refactor frontend — price poller and stock search
  - Create `client/js/pricePoller.js`: poll `GET /api/stocks/prices` every 3 seconds; store latest prices in a module-level map; emit a custom `pricesUpdated` event on `window`
  - Create `client/js/trade.js`: stock search filtering (case-insensitive, max 5 results) against the latest prices map; populate trade form on selection; render Chart.js price chart; listen for `pricesUpdated` to update dropdown prices and update chart in-place for selected stock
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_
  - [x] 15.1 Write property test for stock search result relevance and count
    - **Property 6: Stock search result relevance and count** — generate random query strings and stock datasets; verify all results contain query (case-insensitive) in symbol or name, and count ≤ 5
    - **Validates: Requirements 4.1**

- [x] 16. Refactor frontend — portfolio, history, and leaderboard modules
  - Create `client/js/portfolio.js`: fetch `GET /api/user/portfolio`; render holdings table with symbol, quantity, avgPrice, currentPrice, P/L (green/red), P/L%; render total portfolio value; render doughnut chart; render trend chart (hide with message if < 2 snapshots); wire "Sell All" button to `api.post('/api/trade')`
  - Create `client/js/history.js`: fetch `GET /api/user/history`; render transaction table (action, symbol, quantity, price, total, timestamp); show "No trades yet" when empty
  - Create `client/js/leaderboard.js`: fetch `GET /api/leaderboard`; render ranked list; highlight current user's row
  - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.4, 10.1, 10.2, 10.3, 16.1, 16.3_
  - [x] 16.1 Write property test for P/L color coding
    - **Property 13: P/L color coding** — generate random positive and negative P/L values; verify positive values get green CSS class and negative values get red CSS class
    - **Validates: Requirements 6.4, 6.5**
  - [x] 16.2 Write property test for total portfolio value calculation
    - **Property 14: Total portfolio value calculation** — generate random portfolios with prices; verify displayed total equals sum of (quantity × currentPrice) for all holdings
    - **Validates: Requirements 6.6**

- [x] 17. Refactor frontend — trade execution and notifications
  - Update `client/js/trade.js`: wire trade form submit to `api.post('/api/trade')`; on success call `showNotification` with action/quantity/symbol; on error call `showNotification` with error message; refresh balance display and portfolio after trade
  - Wire account reset button in `index.html`: show confirmation dialog; on confirm call `api.post('/api/user/reset')`; reload dashboard
  - _Requirements: 3.2, 5.3, 5.4, 5.5, 12.2, 12.3, 13.1, 13.2_
  - [x] 17.1 Write property test for success notification content
    - **Property 27: Success notification content** — execute random valid trades; verify notification text contains action, quantity, and symbol
    - **Validates: Requirements 13.1**

- [x] 18. Update `index.html` to load all client modules and wire navigation
  - Replace monolithic `app.js` script tag with module script tags for `api.js`, `auth.js`, `trade.js`, `portfolio.js`, `history.js`, `leaderboard.js`, `theme.js`, `notifications.js`, `pricePoller.js`
  - Ensure `initTheme()` is called synchronously before body renders (inline script or first module)
  - Wire navigation tab clicks to show/hide the correct section and trigger data fetch for that section
  - Display Virtual_Balance in header; update within 500ms after trade completes
  - _Requirements: 3.1, 3.3, 11.3, 14.1, 14.2, 14.3, 14.4_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each; each test file includes a comment `// Feature: paper-trading-app, Property N: <property text>`
- Integration tests use Supertest + MongoDB Memory Server (no real DB needed for CI)
- The price simulator runs only in the server process; the frontend never manipulates prices directly
- Atomic trade execution uses a MongoDB session to prevent race conditions on concurrent requests
