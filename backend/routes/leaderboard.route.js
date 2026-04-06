'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/leaderboard.controller');
router.get('/', ctrl.getTop10);
module.exports = router;
