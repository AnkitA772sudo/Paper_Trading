'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { executeTrade } = require('../controllers/trade');

const router = Router();

router.post('/', authMiddleware, executeTrade);

module.exports = router;
