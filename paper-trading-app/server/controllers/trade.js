'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const priceSimulator = require('../services/priceSimulator');

async function executeTrade(req, res, next) {
  const { action, symbol, quantity } = req.body;

  // Validate quantity
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than zero' });
  }

  // Validate action
  if (action !== 'BUY' && action !== 'SELL') {
    return res.status(400).json({ error: 'Action must be BUY or SELL' });
  }

  // Validate symbol exists in price simulator
  const price = priceSimulator.getPrice(symbol);
  if (price === null) {
    return res.status(400).json({ error: 'Unknown stock symbol' });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(req.user.sub).session(session);

      if (action === 'BUY') {
        const totalCost = price * quantity;

        if (user.balance < totalCost) {
          const err = new Error('Insufficient balance');
          err.statusCode = 400;
          throw err;
        }

        user.balance -= totalCost;

        const existing = user.portfolio.find(h => h.symbol === symbol);
        if (existing) {
          const newAvg =
            (existing.avgPrice * existing.quantity + price * quantity) /
            (existing.quantity + quantity);
          existing.avgPrice = newAvg;
          existing.quantity += quantity;
        } else {
          user.portfolio.push({ symbol, quantity, avgPrice: price });
        }
      } else {
        // SELL
        const holding = user.portfolio.find(h => h.symbol === symbol);

        if (!holding || holding.quantity < quantity) {
          const err = new Error('Insufficient shares');
          err.statusCode = 400;
          throw err;
        }

        user.balance += price * quantity;
        holding.quantity -= quantity;

        if (holding.quantity === 0) {
          user.portfolio = user.portfolio.filter(h => h.symbol !== symbol);
        }
      }

      // Create transaction record
      await Transaction.create(
        [
          {
            userId: user._id,
            action,
            symbol,
            quantity,
            price,
            total: price * quantity,
          },
        ],
        { session }
      );

      // Record portfolio value snapshot
      const portfolioValue = user.portfolio.reduce((sum, holding) => {
        const currentPrice = priceSimulator.getPrice(holding.symbol);
        return sum + holding.quantity * (currentPrice !== null ? currentPrice : 0);
      }, 0);

      user.portfolioSnapshots.push({ value: user.balance + portfolioValue });

      await user.save({ session });
    });

    // Re-fetch user to get the final state after transaction
    const updatedUser = await User.findById(req.user.sub);
    return res.status(200).json({
      balance: updatedUser.balance,
      portfolio: updatedUser.portfolio,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  } finally {
    session.endSession();
  }
}

module.exports = { executeTrade };
