'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRouter = require('./routes/auth');
const tradeRouter = require('./routes/trade');
const userRouter = require('./routes/user');
const leaderboardRouter = require('./routes/leaderboard');
const stockRouter = require('./routes/stock');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/user', userRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/stocks', stockRouter);

// Serve the frontend website files
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));

// Redirect root to login page
app.get('/', (req, res) => res.redirect('/login.html'));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
