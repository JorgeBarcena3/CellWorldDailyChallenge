'use strict';
/**
 * routes/index.js — barrel that mounts all route modules
 */

const router = require('express').Router();

router.use('/config',        require('./config.route'));
router.use('/texts',         require('./texts.route'));
router.use('/notifications', require('./notifications.route'));
router.use('/leaderboard',   require('./leaderboard.route'));
router.use('/submit-score',  require('./score.route'));

module.exports = router;
