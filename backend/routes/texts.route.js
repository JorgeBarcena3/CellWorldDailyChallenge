'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/texts.controller');
router.get('/', ctrl.getTexts);
module.exports = router;
