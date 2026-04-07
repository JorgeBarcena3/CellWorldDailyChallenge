'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/notifications.controller');
router.get('/', ctrl.get);
module.exports = router;
