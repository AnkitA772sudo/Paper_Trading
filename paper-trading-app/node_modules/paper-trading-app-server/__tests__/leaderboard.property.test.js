'use strict';

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const fc = require('fast-check');
const authRouter = require('../routes/auth');
const leaderboardRouter = require('../routes/leaderboard');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

jest.setTimeout(30000);

let mongod;

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

async function registerAndLogin(app, username, password) {
  const regRes = await request(app).post('/api/auth/register').send({ username, password });
  if (regRes.status !== 201) throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
  const loginRes = await request(app).post('/api/auth/login').send({ username, password });
  if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  const setCookie = loginRes.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie[0] : setCookie;
}

describe('Leaderboard property tests', () => {
  test('Property 21: Leaderboard ordering', async () => {
    // Feature: paper-trading-app, Property 21: Leaderboard ordering
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        await User.deleteMany({});
        const passwordHash = await hashPassword('password123');
        const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        await User.create([
          { username: `user_a_${suffix}`, passwordHash, balance: 5000, portfolio: [] },
          { username: `user_b_${suffix}`, passwordHash, balance: 15000, portfolio: [] },
          { username: `user_c_${suffix}`, passwordHash, balance: 8000, portfolio: [] },
        ]);

        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({ username: `user_a_${suffix}`, password: 'password123' });
        expect(loginRes.status).toBe(200);
        const setCookie = loginRes.headers['set-cookie'];
        const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;

        const res = await request(app).get('/api/leaderboard').set('Cookie', cookie);
        expect(res.status).toBe(200);

        const entries = res.body;
        expect(entries.length).toBeGreaterThan(1);
        for (let i = 0; i < entries.length - 1; i++) {
          expect(entries[i].totalValue).toBeGreaterThanOrEqual(entries[i + 1].totalValue);
        }
      }),
      { numRuns: 3 }
    );
  });

  test('Property 22: Leaderboard entry field completeness', async () => {
    // Feature: paper-trading-app, Property 22: Leaderboard entry field completeness
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        await User.deleteMany({});
        const username = `user_p22_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const cookie = await registerAndLogin(app, username, 'password123');

        const res = await request(app).get('/api/leaderboard').set('Cookie', cookie);
        expect(res.status).toBe(200);

        for (const entry of res.body) {
          expect(entry).toHaveProperty('rank');
          expect(entry).toHaveProperty('username');
          expect(entry).toHaveProperty('totalValue');
        }
      }),
      { numRuns: 3 }
    );
  });
});
