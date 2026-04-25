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
const userRouter = require('../routes/user');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const priceSimulator = require('../services/priceSimulator');

jest.setTimeout(60000);

let mongod;
let mongoUri;

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/trade', tradeRouter);
  app.use('/api/user', userRouter);
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

describe('User property tests', () => {
  test('Property 12: P/L calculation correctness', async () => {
    // Feature: paper-trading-app, Property 12: P/L calculation correctness
    await fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: 1, max: 1000, noNaN: true }),
          fc.float({ min: 1, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 100 })
        ),
        ([avgPrice, currentPrice, quantity]) => {
          const pl = (currentPrice - avgPrice) * quantity;
          const plPercent = ((currentPrice - avgPrice) / avgPrice) * 100;

          const expectedPl = (currentPrice - avgPrice) * quantity;
          const expectedPlPercent = ((currentPrice - avgPrice) / avgPrice) * 100;

          expect(pl).toBeCloseTo(expectedPl, 5);
          expect(plPercent).toBeCloseTo(expectedPlPercent, 5);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 15: Transaction history ordering', async () => {
    // Feature: paper-trading-app, Property 15: Transaction history ordering
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          const username = `user_p15_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          for (let i = 0; i < 5; i++) {
            const res = await request(app)
              .post('/api/trade')
              .set('Cookie', cookie)
              .send({ action: 'BUY', symbol: 'AAPL', quantity: 1 });
            expect(res.status).toBe(200);
          }

          const histRes = await request(app)
            .get('/api/user/history')
            .set('Cookie', cookie);
          expect(histRes.status).toBe(200);

          const transactions = histRes.body;
          expect(transactions.length).toBeGreaterThan(0);

          for (let i = 0; i < transactions.length - 1; i++) {
            const tsA = new Date(transactions[i].timestamp).getTime();
            const tsB = new Date(transactions[i + 1].timestamp).getTime();
            expect(tsA).toBeGreaterThanOrEqual(tsB);
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 16: Transaction history field completeness', async () => {
    // Feature: paper-trading-app, Property 16: Transaction history field completeness
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          const username = `user_p16_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          const tradeRes = await request(app)
            .post('/api/trade')
            .set('Cookie', cookie)
            .send({ action: 'BUY', symbol: 'AAPL', quantity: 1 });
          expect(tradeRes.status).toBe(200);

          const histRes = await request(app)
            .get('/api/user/history')
            .set('Cookie', cookie);
          expect(histRes.status).toBe(200);

          const transactions = histRes.body;
          expect(transactions.length).toBeGreaterThan(0);

          for (const tx of transactions) {
            expect(tx).toHaveProperty('action');
            expect(tx).toHaveProperty('symbol');
            expect(tx).toHaveProperty('quantity');
            expect(tx).toHaveProperty('price');
            expect(tx).toHaveProperty('total');
            expect(tx).toHaveProperty('timestamp');
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  test('Property 17: Transaction history page limit', async () => {
    // Feature: paper-trading-app, Property 17: Transaction history page limit
    const app = buildApp();

    await User.deleteMany({});
    await Transaction.deleteMany({});

    const username = `user_p17_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const cookie = await registerAndLogin(app, username, 'password123');

    for (let i = 0; i < 55; i++) {
      const res = await request(app)
        .post('/api/trade')
        .set('Cookie', cookie)
        .send({ action: 'BUY', symbol: 'AAPL', quantity: 1 });
      // Stop if we run out of balance
      if (res.status !== 200) break;
    }

    const histRes = await request(app)
      .get('/api/user/history')
      .set('Cookie', cookie);
    expect(histRes.status).toBe(200);
    expect(histRes.body.length).toBeLessThanOrEqual(50);
  });

  test('Property 26: Account reset completeness', async () => {
    // Feature: paper-trading-app, Property 26: Account reset completeness
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          await User.deleteMany({});
          await Transaction.deleteMany({});

          const username = `user_p26_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const cookie = await registerAndLogin(app, username, 'password123');

          // Execute 2 BUY trades
          for (let i = 0; i < 2; i++) {
            const res = await request(app)
              .post('/api/trade')
              .set('Cookie', cookie)
              .send({ action: 'BUY', symbol: 'AAPL', quantity: 1 });
            expect(res.status).toBe(200);
          }

          // Reset account
          const resetRes = await request(app)
            .post('/api/user/reset')
            .set('Cookie', cookie);
          expect(resetRes.status).toBe(200);

          // Verify portfolio is clean
          const portfolioRes = await request(app)
            .get('/api/user/portfolio')
            .set('Cookie', cookie);
          expect(portfolioRes.status).toBe(200);
          expect(portfolioRes.body.balance).toBe(10000);
          expect(portfolioRes.body.holdings).toEqual([]);

          // Verify history is empty
          const histRes = await request(app)
            .get('/api/user/history')
            .set('Cookie', cookie);
          expect(histRes.status).toBe(200);
          expect(histRes.body).toEqual([]);
        }
      ),
      { numRuns: 3 }
    );
  });
});
