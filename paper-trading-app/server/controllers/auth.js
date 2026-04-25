'use strict';

const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/password');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, passwordHash, balance: 10000 });

    const token = signToken(user._id, user.username);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({ username: user.username, balance: 10000 });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user._id, user.username);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({ username: user.username, balance: user.balance });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

const registerValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

module.exports = { register, login, logout, registerValidation };
