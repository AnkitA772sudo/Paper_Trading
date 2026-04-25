# Requirements Document

## Introduction

PaperTrade is a full-stack paper trading web application that allows users to simulate stock trading using virtual money, with no real financial risk. The existing project has a working frontend-only version (HTML/CSS/JS with localStorage persistence). This spec covers upgrading it to a full-stack application with a Node.js/Express backend, MongoDB/Firebase database, and a complete feature set including authentication, trading, portfolio management, transaction history, leaderboard, charts, dark/light mode, and optional real-time price simulation.

The upgrade preserves the existing glassmorphism UI, Chart.js integration, and mock stock data while adding server-side persistence, proper authentication, and a RESTful API layer.

---

## Glossary

- **System**: The PaperTrade full-stack web application
- **User**: An authenticated person interacting with the System
- **Auth_Service**: The component responsible for user registration, login, and session management
- **Trade_Engine**: The component that processes buy and sell orders
- **Portfolio_Service**: The component that tracks a User's stock holdings and calculates profit/loss
- **Price_Simulator**: The component that generates simulated real-time stock price updates
- **Leaderboard_Service**: The component that ranks Users by portfolio performance
- **Stock**: A mock financial instrument with a symbol, name, current price, and price history
- **Portfolio**: The collection of Stocks a User currently holds, along with quantities and average purchase prices
- **Transaction**: A record of a single buy or sell action performed by a User
- **Virtual_Balance**: The amount of simulated currency a User has available to spend
- **Starting_Capital**: The initial Virtual_Balance assigned to a new User account ($10,000)
- **P/L**: Profit or Loss — the difference between current market value and the cost basis of a holding
- **Session**: An authenticated browser session identified by a JWT or cookie
- **API**: The RESTful HTTP interface exposed by the backend
- **Dark_Mode**: A UI color scheme using dark backgrounds and light text
- **Light_Mode**: A UI color scheme using light backgrounds and dark text

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account with a username and password, so that I can access the trading simulator with my own persistent data.

#### Acceptance Criteria

1. WHEN a visitor submits a valid username and password via the signup form, THE Auth_Service SHALL create a new User account with a Starting_Capital of $10,000.
2. WHEN a visitor submits a username that already exists, THE Auth_Service SHALL return an error message stating "Username already taken".
3. WHEN a visitor submits a password shorter than 6 characters, THE Auth_Service SHALL return an error message stating "Password must be at least 6 characters".
4. WHEN a visitor submits a signup form where the password and confirm-password fields do not match, THE System SHALL display an error message before submitting to the server.
5. WHEN a new User account is successfully created, THE Auth_Service SHALL automatically log the User in and redirect to the Dashboard.

---

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in and log out securely, so that my trading data is private and persisted across sessions.

#### Acceptance Criteria

1. WHEN a User submits valid credentials, THE Auth_Service SHALL issue a Session token and redirect the User to the Dashboard.
2. WHEN a User submits invalid credentials, THE Auth_Service SHALL return an error message stating "Invalid username or password" without revealing which field is incorrect.
3. WHEN a User clicks the logout button, THE Auth_Service SHALL invalidate the Session and redirect the User to the login page.
4. WHILE a valid Session exists, THE System SHALL automatically restore the User's Dashboard on page reload without requiring re-login.
5. IF a Session token is expired or invalid, THEN THE Auth_Service SHALL redirect the User to the login page.

---

### Requirement 3: Dashboard and Virtual Balance Display

**User Story:** As a logged-in user, I want to see my current virtual balance prominently on the dashboard, so that I can make informed trading decisions.

#### Acceptance Criteria

1. WHEN a User navigates to the Dashboard, THE System SHALL display the User's current Virtual_Balance formatted as a USD currency value (e.g., "$10,000.00").
2. WHEN a trade is executed, THE System SHALL update the displayed Virtual_Balance within 500ms of the trade completing.
3. THE System SHALL display the Dashboard as the default view after a successful login.
4. WHEN a User's Virtual_Balance drops below $0.01, THE System SHALL display a warning message indicating insufficient funds.

---

### Requirement 4: Stock Search

**User Story:** As a trader, I want to search for stocks by symbol or company name, so that I can quickly find the stock I want to trade.

#### Acceptance Criteria

1. WHEN a User types at least 1 character into the search bar, THE System SHALL display a dropdown of matching Stocks filtered by symbol or company name (case-insensitive), showing up to 5 results.
2. WHEN a User selects a Stock from the search dropdown, THE System SHALL populate the trade form with that Stock's symbol and display its current price.
3. WHEN a User clears the search bar, THE System SHALL hide the search results dropdown.
4. IF no Stocks match the search query, THEN THE System SHALL display a "No results found" message in the dropdown.
5. THE System SHALL provide at least 10 mock Stocks (AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA, META, NFLX, AMD, CRM) as the searchable dataset when a real market data API is unavailable.

---

### Requirement 5: Buy and Sell Trading

**User Story:** As a trader, I want to buy and sell stocks with a specified quantity, so that I can simulate real trading decisions.

#### Acceptance Criteria

1. WHEN a User submits a buy order with a valid Stock symbol and positive quantity, THE Trade_Engine SHALL deduct the total cost (price × quantity) from the User's Virtual_Balance and add the shares to the User's Portfolio.
2. WHEN a User submits a sell order for a Stock the User holds with a quantity not exceeding the held amount, THE Trade_Engine SHALL add the total proceeds (price × quantity) to the User's Virtual_Balance and reduce the Portfolio holding accordingly.
3. IF a User submits a buy order where the total cost exceeds the User's Virtual_Balance, THEN THE Trade_Engine SHALL reject the order and display an "Insufficient balance" error.
4. IF a User submits a sell order for a quantity exceeding the User's held shares for that Stock, THEN THE Trade_Engine SHALL reject the order and display an "Insufficient shares" error.
5. IF a User submits a buy or sell order with a quantity of 0 or a negative number, THEN THE Trade_Engine SHALL reject the order and display a "Quantity must be greater than zero" error.
6. WHEN a trade is successfully executed, THE Trade_Engine SHALL record a Transaction and display a success notification within 500ms.
7. WHEN a Portfolio holding reaches exactly 0 shares after a sell, THE Portfolio_Service SHALL remove that Stock entry from the User's Portfolio.

---

### Requirement 6: Portfolio View

**User Story:** As a trader, I want to see all my current stock holdings with performance metrics, so that I can evaluate my investment decisions.

#### Acceptance Criteria

1. WHEN a User navigates to the Portfolio page, THE Portfolio_Service SHALL display each held Stock with its symbol, quantity, average purchase price, current price, P/L in dollars, and P/L as a percentage.
2. THE Portfolio_Service SHALL calculate P/L as: (current price − average purchase price) × quantity.
3. THE Portfolio_Service SHALL calculate P/L percentage as: ((current price − average purchase price) / average purchase price) × 100.
4. WHEN a Stock's P/L is positive, THE System SHALL display the P/L value in green.
5. WHEN a Stock's P/L is negative, THE System SHALL display the P/L value in red.
6. THE Portfolio_Service SHALL display the total portfolio value (sum of all holdings at current prices) at the bottom of the portfolio table.
7. WHEN a User clicks "Sell All" for a Stock in the Portfolio, THE Trade_Engine SHALL execute a sell order for the full held quantity at the current price.
8. THE Portfolio_Service SHALL display a doughnut chart showing the proportional value of each Stock holding relative to total portfolio value.

---

### Requirement 7: Transaction History

**User Story:** As a trader, I want to review all my past trades with timestamps, so that I can track my trading activity.

#### Acceptance Criteria

1. WHEN a User navigates to the History page, THE System SHALL display all Transactions for the current User in reverse chronological order (most recent first).
2. THE System SHALL display each Transaction with: action (BUY/SELL), stock symbol, quantity, price per share, total value, and date/time.
3. THE System SHALL display at most 50 Transactions per page on the History page.
4. WHEN no Transactions exist for a User, THE System SHALL display a "No trades yet" message.

---

### Requirement 8: Simulated Real-Time Price Updates

**User Story:** As a trader, I want stock prices to update periodically, so that the simulation feels dynamic and realistic.

#### Acceptance Criteria

1. THE Price_Simulator SHALL update all Stock prices every 3 seconds by applying a random percentage change in the range of −2% to +2%.
2. WHEN a Stock price is updated, THE Price_Simulator SHALL ensure the new price does not fall below $1.00.
3. WHEN a Stock price is updated, THE Price_Simulator SHALL append the new price to that Stock's price history, maintaining a rolling window of the last 50 price points.
4. WHEN the price chart is visible and a Stock is selected, THE System SHALL refresh the chart data within 3 seconds of a price update without requiring a page reload.
5. WHEN the stock selector dropdown is visible, THE System SHALL update the displayed prices in the dropdown within 3 seconds of a price update.

---

### Requirement 9: Stock Price Chart

**User Story:** As a trader, I want to see a price history chart for the selected stock, so that I can visually assess price trends before trading.

#### Acceptance Criteria

1. WHEN a User selects a Stock, THE System SHALL render a line chart displaying the last 50 price points for that Stock.
2. THE System SHALL render the price chart using Chart.js with responsive sizing that adapts to the viewport width.
3. WHEN a new price update arrives for the currently selected Stock, THE System SHALL update the chart data in place without destroying and recreating the chart instance.
4. WHEN a User selects a different Stock, THE System SHALL destroy the existing chart instance and render a new chart for the newly selected Stock.

---

### Requirement 10: Leaderboard

**User Story:** As a trader, I want to see how my portfolio performance compares to other users, so that I can gauge my trading skill.

#### Acceptance Criteria

1. WHEN a User navigates to the Leaderboard page, THE Leaderboard_Service SHALL display a ranked list of Users ordered by total portfolio value (Virtual_Balance + sum of all holdings at current prices) in descending order.
2. THE Leaderboard_Service SHALL display each entry with: rank number, username, and total portfolio value.
3. THE Leaderboard_Service SHALL include the current User's entry in the leaderboard, highlighted distinctly from other entries.
4. WHERE a real multi-user backend is unavailable, THE Leaderboard_Service SHALL display mock leaderboard entries alongside the current User's live data.

---

### Requirement 11: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light color themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN a User clicks the theme toggle button, THE System SHALL switch the active color theme between Dark_Mode and Light_Mode.
2. WHEN the theme is changed, THE System SHALL persist the selected theme to localStorage so it is restored on the next page load.
3. WHEN the page loads, THE System SHALL apply the previously saved theme before rendering any visible content to prevent a flash of unstyled content.
4. THE System SHALL display a moon icon (🌙) when Light_Mode is active and a sun icon (☀️) when Dark_Mode is active.

---

### Requirement 12: Account Reset

**User Story:** As a trader, I want to reset my account to the starting state, so that I can practice trading from scratch without creating a new account.

#### Acceptance Criteria

1. WHEN a User clicks the Reset button and confirms the action, THE System SHALL reset the User's Virtual_Balance to $10,000, clear the User's Portfolio, and clear the User's Transaction history.
2. WHEN the reset is confirmed, THE System SHALL display a success notification and reload the Dashboard with the reset data.
3. WHEN a User clicks the Reset button, THE System SHALL display a confirmation dialog before performing any destructive action.

---

### Requirement 13: Trade Execution Notifications

**User Story:** As a trader, I want to receive immediate visual feedback when a trade is executed or fails, so that I know the outcome of my actions.

#### Acceptance Criteria

1. WHEN a trade is successfully executed, THE System SHALL display a green success notification containing the action, quantity, and stock symbol (e.g., "BUY 5 AAPL executed").
2. WHEN a trade is rejected due to an error, THE System SHALL display a red error notification with a descriptive error message.
3. WHEN a notification is displayed, THE System SHALL automatically dismiss it after 3 seconds.
4. THE System SHALL support displaying multiple simultaneous notifications without overlap.

---

### Requirement 14: Mobile Responsive Layout

**User Story:** As a mobile user, I want the application to be usable on small screens, so that I can trade on my phone or tablet.

#### Acceptance Criteria

1. THE System SHALL render a single-column layout on viewports narrower than 768px.
2. THE System SHALL render the navigation bar as a wrapping flex row on viewports narrower than 768px so all navigation buttons remain accessible.
3. THE System SHALL scale all charts, tables, and forms to fit within the viewport width on screens narrower than 480px without horizontal scrolling.
4. THE System SHALL use touch-friendly tap targets with a minimum size of 44×44px for all interactive elements on mobile viewports.

---

### Requirement 15: Backend API (Full-Stack Upgrade)

**User Story:** As a developer, I want a RESTful Node.js/Express backend, so that user data is persisted in a database rather than localStorage and the app can support multiple users.

#### Acceptance Criteria

1. THE API SHALL expose a POST `/api/auth/register` endpoint that accepts a username and password and creates a new User record in the database.
2. THE API SHALL expose a POST `/api/auth/login` endpoint that validates credentials and returns a signed JWT with a 24-hour expiry.
3. THE API SHALL expose a POST `/api/auth/logout` endpoint that invalidates the current Session.
4. THE API SHALL expose a GET `/api/user/portfolio` endpoint that returns the authenticated User's Portfolio data.
5. THE API SHALL expose a POST `/api/trade` endpoint that accepts a trade order and executes it atomically, updating the User's balance and portfolio in the database.
6. THE API SHALL expose a GET `/api/user/history` endpoint that returns the authenticated User's Transaction history.
7. THE API SHALL expose a GET `/api/leaderboard` endpoint that returns the top 10 Users ranked by total portfolio value.
8. THE API SHALL expose a POST `/api/user/reset` endpoint that resets the authenticated User's account to Starting_Capital.
9. WHEN a request is made to a protected endpoint without a valid Session token, THE API SHALL return an HTTP 401 Unauthorized response.
10. THE API SHALL store all User data in a MongoDB or Firebase Firestore database.

---

### Requirement 16: Portfolio Performance Chart

**User Story:** As a trader, I want to see a chart of my portfolio's total value over time, so that I can visualize my overall performance trend.

#### Acceptance Criteria

1. WHEN a User navigates to the Portfolio page, THE System SHALL render a line chart showing the User's total portfolio value trend over the last 30 recorded data points.
2. THE System SHALL record a portfolio value snapshot each time a trade is executed.
3. WHEN fewer than 2 portfolio value snapshots exist, THE System SHALL hide the portfolio trend chart and display a "Make your first trade to see performance data" message.
