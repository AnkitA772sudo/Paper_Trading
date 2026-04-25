'use strict';

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const fc = require('fast-check');
const authRouter = require('../routes/auth');
const User = require('../models/User');

jest.setTimeout(30000);

let mongod;

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
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

describe('Auth property tests', () => {
  test('Property 1: New account starting capital', async () => {
    // Feature: paper-trading-app, Property 1: New account starting capital
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          fc.string({ minLength: 6, maxLength: 20 })
        ),
        async ([username, password]) => {
          await User.deleteMany({});
          const res = await request(app)
            .post('/api/auth/register')
            .send({ username, password });

          expect(res.status).toBe(201);
          expect(res.body.balance).toBe(10000);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property 2: Short password rejection', async () => {
    // Feature: paper-trading-app, Property 2: Short password rejection
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 5 }),
        async (password) => {
          await User.deleteMany({});
          const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', password });

          expect(res.status).toBe(400);
          const count = await User.countDocuments();
          expect(count).toBe(0);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property 3: Invalid credential error message consistency', async () => {
    // Feature: paper-trading-app, Property 3: Invalid credential error message consistency
    const app = buildApp();

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 })
        ),
        async ([username, password]) => {
          const res = await request(app)
            .post('/api/auth/login')
            .send({ username, password });

          expect(res.status).toBe(401);
          expect(res.body.error).toBe('Invalid username or password');
        }
      ),
      { numRuns: 5 }
    );
  });
});
