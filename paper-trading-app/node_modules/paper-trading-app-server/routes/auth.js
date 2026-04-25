'use strict';

const { Router } = require('express');
const { register, login, logout, registerValidation } = require('../controllers/auth');

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
