'use strict';
/**
 * config.controller.js
 * GET /config  →  returns today's daily challenge configuration
 */

const { getDailyConfig, todayUTC } = require('../services/dailyConfig.service');

async function getDaily(req, res, next) {
  try {
    const date = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date))
      ? req.query.date
      : todayUTC();

    const config = await getDailyConfig(date);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function getRandom(req, res, next) {
  try {
    // Pick a random offset between 0 and 29 days (since we seed 30 days ahead)
    const randomOffset = Math.floor(Math.random() * 30);
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + randomOffset);
    const randomDate = d.toISOString().slice(0, 10);

    const config = await getDailyConfig(randomDate);
    config.isPractice = true; // Mark as practice to disable score submission
    
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDaily, getRandom };
