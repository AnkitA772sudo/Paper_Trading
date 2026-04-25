'use strict';

// Feature: paper-trading-app, Property 4: Invalid token rejection on protected endpoints
// Validates: Requirements 2.5, 15.9

process.env.JWT_SECRET = 'test-secret';

const fc = require('fast-check');
const { verifyToken } = require('../utils/jwt');

describe('Property 4: Invalid token rejection on protected endpoints', () => {
  test('verifyToken throws for any random string token', () => {
    fc.assert(
      fc.property(fc.string(), (token) => {
        try {
          verifyToken(token);
          return false; // did NOT throw — invalid token was accepted
        } catch (_err) {
          return true; // threw as expected
        }
      }),
      { numRuns: 20 }
    );
  });
});
