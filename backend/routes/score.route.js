'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/score.controller');
router.post('/', ctrl.submit);
module.exports = router;
