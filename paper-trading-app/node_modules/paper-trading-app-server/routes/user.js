'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { getPortfolio, getHistory, resetAccount } = require('../controllers/user');

const router = Router();

router.get('/portfolio', authMiddleware, getPortfolio);
router.get('/history', authMiddleware, getHistory);
router.post('/reset', authMiddleware, resetAccount);

module.exports = router;
