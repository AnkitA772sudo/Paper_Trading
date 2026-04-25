'use strict';

// Requirements: 2.1, 2.5

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');

describe('JWT helpers', () => {
  test('signToken produces a token that verifyToken can decode with correct sub and username', () => {
    const token = signToken('user123', 'alice');
    const payload = verifyToken(token);
    expect(payload.sub).toBe('user123');
    expect(payload.username).toBe('alice');
  });

  test('verifyToken throws on a tampered token', () => {
    const token = signToken('user123', 'alice');
    expect(() => verifyToken(token + 'tampered')).toThrow();
  });

  test('verifyToken throws on an expired token', () => {
    const expired = jwt.sign(
      { sub: 'user123', username: 'alice' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
    expect(() => verifyToken(expired)).toThrow();
  });
});

describe('Password helpers', () => {
  test('hashPassword returns a string different from the plain text input', async () => {
    const hash = await hashPassword('mypassword');
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe('mypassword');
  });

  test('comparePassword returns true when plain matches the hash', async () => {
    const hash = await hashPassword('correcthorse');
    const result = await comparePassword('correcthorse', hash);
    expect(result).toBe(true);
  });

  test('comparePassword returns false when plain does not match the hash', async () => {
    const hash = await hashPassword('correcthorse');
    const result = await comparePassword('wrongpassword', hash);
    expect(result).toBe(false);
  });
});
