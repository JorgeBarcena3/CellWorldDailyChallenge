'use strict';
/**
 * leaderboard.controller.js
 * GET /leaderboard?date=YYYY-MM-DD  →  top 10 scores for the day
 */

const { getTopScores } = require('../services/leaderboard.service');
const { todayUTC } = require('../services/dailyConfig.service');

async function getTop10(req, res, next) {
  try {
    const date = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date))
      ? req.query.date
      : todayUTC();

    const scores = await getTopScores(date, 10);

    res.json({
      success: true,
      date,
      data: scores
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTop10 };
