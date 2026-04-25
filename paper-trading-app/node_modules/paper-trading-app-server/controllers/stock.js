'use strict';

const priceSimulator = require('../services/priceSimulator');

function getPrices(req, res, next) {
  try {
    return res.status(200).json(priceSimulator.getAll());
  } catch (err) {
    next(err);
  }
}

module.exports = { getPrices };
