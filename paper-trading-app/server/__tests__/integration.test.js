'use strict';

// Feature: paper-trading-app — Integration Tests (Tasks 12.1–12.5)

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { hashPassword } = require('../utils/password');

jest.setTimeout(60000);

let mongod;

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

async function registerAndLogin(username, password) {
  const regRes = await request(app).post('/api/auth/register').send({ username, password });
  if (regRes.status !== 201) throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
  const loginRes = await request(app).post('/api/auth/login').send({ username, password });
  if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  const setCookie = loginRes.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie[0] : setCookie;
}

// 12.1 Auth flow — Requirements: 1.1, 2.1, 2.3, 2.5, 15.9
describe('12.1 Auth flow integration test', () => {
  test('register → login → protected route → logout → 401', async () => {
    const username = `auth_flow_${Date.now()}`;
    const regRes = await request(app).post('/api/auth/register').send({ username, password: 'securePass1' });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app).post('/api/auth/login').send({ username, password: 'securePass1' });
    expect(loginRes.status).toBe(200);
    const cookie = [].concat(loginRes.headers['set-cookie'])[0];

    expect((await request(app).get('/api/user/portfolio').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/user/portfolio')).status).toBe(401);
  });
});

// 12.2 Trade flow — Requirements: 5.1, 5.2, 6.1
describe('12.2 Trade flow integration test', () => {
  test('BUY → verify holding → SELL → verify balance restored', async () => {
    const cookie = await registerAndLogin(`trade_flow_${Date.now()}`, 'securePass1');

    expect((await request(app).post('/api/trade').set('Cookie', cookie).send({ action: 'BUY', symbol: 'AAPL', quantity: 1 })).status).toBe(200);

    const afterBuy = await request(app).get('/api/user/portfolio').set('Cookie', cookie);
    expect(afterBuy.status).toBe(200);
    expect(afterBuy.body.holdings.find(h => h.symbol === 'AAPL')).toBeDefined();

    expect((await request(app).post('/api/trade').set('Cookie', cookie).send({ action: 'SELL', symbol: 'AAPL', quantity: 1 })).status).toBe(200);

    const afterSell = await request(app).get('/api/user/portfolio').set('Cookie', cookie);
    expect(afterSell.status).toBe(200);
    expect(afterSell.body.balance).toBeCloseTo(10000, 0);
    expect(afterSell.body.holdings.find(h => h.symbol === 'AAPL')).toBeUndefined();
  });
});

// 12.3 Reset flow — Requirements: 12.1
describe('12.3 Reset flow integration test', () => {
  test('BUY → reset → portfolio clean, history empty', async () => {
    const cookie = await registerAndLogin(`reset_flow_${Date.now()}`, 'securePass1');

    expect((await request(app).post('/api/trade').set('Cookie', cookie).send({ action: 'BUY', symbol: 'AAPL', quantity: 1 })).status).toBe(200);
    expect((await request(app).post('/api/user/reset').set('Cookie', cookie)).status).toBe(200);

    const portfolio = await request(app).get('/api/user/portfolio').set('Cookie', cookie);
    expect(portfolio.body.balance).toBe(10000);
    expect(portfolio.body.holdings).toEqual([]);

    const history = await request(app).get('/api/user/history').set('Cookie', cookie);
    expect(history.body).toEqual([]);
  });
});

// 12.4 Leaderboard ranking — Requirements: 10.1
describe('12.4 Leaderboard ranking integration test', () => {
  test('users appear in descending totalValue order', async () => {
    const suffix = `lb_${Date.now()}`;
    const passwordHash = await hashPassword('securePass1');
    await User.create([
      { username: `user_a_${suffix}`, passwordHash, balance: 5000, portfolio: [] },
      { username: `user_b_${suffix}`, passwordHash, balance: 15000, portfolio: [] },
      { username: `user_c_${suffix}`, passwordHash, balance: 8000, portfolio: [] },
    ]);

    const loginRes = await request(app).post('/api/auth/login').send({ username: `user_a_${suffix}`, password: 'securePass1' });
    const cookie = [].concat(loginRes.headers['set-cookie'])[0];

    const res = await request(app).get('/api/leaderboard').set('Cookie', cookie);
    expect(res.status).toBe(200);
    for (let i = 0; i < res.body.length - 1; i++) {
      expect(res.body[i].totalValue).toBeGreaterThanOrEqual(res.body[i + 1].totalValue);
    }
    expect(res.body[0].totalValue).toBeCloseTo(15000, 0);
  });
});

// 12.5 History pagination — Requirements: 7.3
describe('12.5 History pagination integration test', () => {
  test('history endpoint returns at most 50 transactions', async () => {
    const cookie = await registerAndLogin(`hist_page_${Date.now()}`, 'securePass1');
    for (let i = 0; i < 55; i++) {
      const res = await request(app).post('/api/trade').set('Cookie', cookie).send({ action: 'BUY', symbol: 'AAPL', quantity: 1 });
      if (res.status !== 200) break;
    }
    const history = await request(app).get('/api/user/history').set('Cookie', cookie);
    expect(history.status).toBe(200);
    expect(history.body.length).toBeLessThanOrEqual(50);
  });
});
