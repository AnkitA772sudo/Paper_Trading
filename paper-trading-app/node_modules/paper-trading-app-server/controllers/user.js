'use strict';

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const priceSimulator = require('../services/priceSimulator');

async function getPortfolio(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);

    const enrichedHoldings = user.portfolio.map(holding => {
      const currentPrice = priceSimulator.getPrice(holding.symbol);
      const pl = (currentPrice - holding.avgPrice) * holding.quantity;
      const plPercent = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
      return {
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        currentPrice,
        pl,
        plPercent,
      };
    });

    return res.status(200).json({
      balance: user.balance,
      holdings: enrichedHoldings,
      snapshots: user.portfolioSnapshots,
    });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const transactions = await Transaction.find({ userId: req.user.sub })
      .sort({ timestamp: -1 })
      .limit(50);

    return res.status(200).json(transactions);
  } catch (err) {
    next(err);
  }
}

async function resetAccount(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);

    user.balance = 10000;
    user.portfolio = [];
    user.portfolioSnapshots = [];
    await user.save();

    await Transaction.deleteMany({ userId: req.user.sub });

    return res.status(200).json({ message: 'Account reset', balance: 10000 });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortfolio, getHistory, resetAccount };
