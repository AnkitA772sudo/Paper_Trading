const mongoose = require('mongoose');

const portfolioEntrySchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true },
    quantity: { type: Number, required: true },
    avgPrice: { type: Number, required: true },
  },
  { _id: false }
);

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  balance: { type: Number, default: 10000 },
  portfolio: { type: [portfolioEntrySchema], default: [] },
  portfolioSnapshots: { type: [portfolioSnapshotSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Cap portfolioSnapshots at 30 entries — remove oldest when over limit
userSchema.pre('save', function (next) {
  if (this.portfolioSnapshots.length > 30) {
    this.portfolioSnapshots = this.portfolioSnapshots.slice(
      this.portfolioSnapshots.length - 30
    );
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
