'use strict';

const jwt = require('jsonwebtoken');

function signToken(userId, username) {
  return jwt.sign(
    { sub: userId.toString(), username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
