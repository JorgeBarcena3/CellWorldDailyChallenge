'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/config.controller');

router.get('/random', ctrl.getRandom);
router.get('/', ctrl.getDaily);

module.exports = router;
