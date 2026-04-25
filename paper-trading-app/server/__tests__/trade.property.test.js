'use strict';

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const fc = require('fast-check');
const authRouter = require('../routes/auth');
const tradeRouter = require('../routes/trade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const priceSimulator = require('../services/priceSimulator');

jest.setTimeout(60000);

let mongod;

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/trade', tradeRouter);
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
});

async function registerAndLogin(app, username, password) {
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password });
  if (regRes.status !== 201) {
    throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
  }
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }
  const setCookie = loginRes.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie[0] : setCookie;
}

describe('Trade property tests', () => {
  test('Property 7: Buy order balance conservation', async () => {
    // Feature: paper-trading-app, Property 7: Buy order balance conservation
    const app = buildApp();
    const price = priceSimulator.getPrice('AAPL');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (quantity) => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          // Skip if cost exceeds starting balance
          if (price * quantity > 10000) return;

          const username = `user_p7_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const res = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity });

          expect(res.status).toBe(200);
          expect(res.body.balance).toBeCloseTo(10000 - price * quantity, 2);

          const holding = res.body.portfolio.find(h => h.symbol === 'AAPL');
          expect(holding).toBeDefined();
          expect(holding.quantity).toBe(quantity);
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 8: Sell order balance conservation', async () => {
    // Feature: paper-trading-app, Property 8: Sell order balance conservation
    const app = buildApp();
    const price = priceSimulator.getPrice('AAPL');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (buyQty, rawSellQty) => {
          const sellQty = Math.min(rawSellQty, buyQty);

          await User.deleteMany({});
          await Transaction.deleteMany({});

          if (price * buyQty > 10000) return;

          const username = `user_p8_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const buyRes = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity: buyQty });
          expect(buyRes.status).toBe(200);

          const sellRes = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'SELL', symbol: 'AAPL', quantity: sellQty });
          expect(sellRes.status).toBe(200);

          const expectedBalance = 10000 - price * buyQty + price * sellQty;
          expect(sellRes.body.balance).toBeCloseTo(expectedBalance, 2);
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 9: Invalid trade rejection preserves state', async () => {
    // Feature: paper-trading-app, Property 9: Invalid trade rejection preserves state
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { action: 'BUY', symbol: 'AAPL', quantity: 99999 },
          { action: 'SELL', symbol: 'AAPL', quantity: 1 },
          { action: 'BUY', symbol: 'AAPL', quantity: 0 }
        ),
        async (invalidOrder) => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          const username = `user_p9_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const res = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send(invalidOrder);

          expect(res.status).toBe(400);

          const user = await User.findOne({ username });
          expect(user.balance).toBe(10000);
          expect(user.portfolio).toHaveLength(0);
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 10: Transaction recorded on successful trade', async () => {
    // Feature: paper-trading-app, Property 10: Transaction recorded on successful trade
    const app = buildApp();
    const price = priceSimulator.getPrice('AAPL');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (quantity) => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          if (price * quantity > 10000) return;

          const username = `user_p10_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const res = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity });
          expect(res.status).toBe(200);

          const user = await User.findOne({ username });
          const tx = await Transaction.findOne({ userId: user._id });

          expect(tx).not.toBeNull();
          expect(tx.action).toBe('BUY');
          expect(tx.symbol).toBe('AAPL');
          expect(tx.quantity).toBe(quantity);
          expect(tx.price).toBeCloseTo(price, 2);
          expect(tx.total).toBeCloseTo(price * quantity, 2);
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 11: Zero-holding removal', async () => {
    // Feature: paper-trading-app, Property 11: Zero-holding removal
    const app = buildApp();
    const price = priceSimulator.getPrice('AAPL');

    await fc.assert(
      fc.asyncProperty(
        fc.constant(3),
        async (quantity) => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          if (price * quantity > 10000) return;

          const username = `user_p11_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const buyRes = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity });
          expect(buyRes.status).toBe(200);

          const sellRes = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'SELL', symbol: 'AAPL', quantity });
          expect(sellRes.status).toBe(200);

          expect(sellRes.body.portfolio).toHaveLength(0);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property 28: Portfolio snapshot on trade', async () => {
    // Feature: paper-trading-app, Property 28: Portfolio snapshot on trade
    const app = buildApp();
    const price = priceSimulator.getPrice('AAPL');

    await fc.assert(
      fc.asyncProperty(
        fc.constant(2),
        async (quantity) => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          if (price * quantity > 10000) return;

          const username = `user_p28_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const res = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity });
          expect(res.status).toBe(200);

          const user = await User.findOne({ username });
          expect(user.portfolioSnapshots.length).toBeGreaterThanOrEqual(1);

          const latestSnapshot = user.portfolioSnapshots[user.portfolioSnapshots.length - 1];
          const portfolioValue = user.portfolio.reduce((sum, holding) => {
            const currentPrice = priceSimulator.getPrice(holding.symbol);
            return sum + holding.quantity * (currentPrice !== null ? currentPrice : 0);
          }, 0);
          const expectedValue = user.balance + portfolioValue;

          expect(latestSnapshot.value).toBeCloseTo(expectedValue, 2);
        }
      ),
      { numRuns: 5 }
    );
  });
});
