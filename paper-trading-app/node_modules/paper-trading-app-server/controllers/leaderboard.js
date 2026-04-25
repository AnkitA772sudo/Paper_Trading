'use strict';

const User = require('../models/User');
const priceSimulator = require('../services/priceSimulator');

async function getLeaderboard(req, res, next) {
  try {
    const users = await User.find({}, 'username balance portfolio');

    const ranked = users.map(user => {
      const portfolioValue = user.portfolio.reduce((sum, holding) => {
        const price = priceSimulator.getPrice(holding.symbol);
        return sum + holding.quantity * (price !== null ? price : 0);
      }, 0);
      return {
        username: user.username,
        totalValue: user.balance + portfolioValue,
      };
    });

    ranked.sort((a, b) => b.totalValue - a.totalValue);

    const top10 = ranked.slice(0, 10).map((entry, i) => ({
      rank: i + 1,
      username: entry.username,
      totalValue: entry.totalValue,
    }));

    return res.status(200).json(top10);
  } catch (err) {
    next(err);
  }
}

module.exports = { getLeaderboard };
