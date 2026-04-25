'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { getLeaderboard } = require('../controllers/leaderboard');

const router = Router();

router.get('/', authMiddleware, getLeaderboard);

module.exports = router;
