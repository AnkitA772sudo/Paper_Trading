'use strict';

const { Router } = require('express');
const { getPrices } = require('../controllers/stock');

const router = Router();

router.get('/prices', getPrices);

module.exports = router;
