'use strict';
/**
 * score.controller.js
 * POST /submit-score  →  validates and saves a player's score
 */

const { validateScore } = require('../services/scoreValidation.service');
const { upsertScore } = require('../services/score.service');

async function submit(req, res, next) {
  try {
    const payload = req.body;

    // ── Validate ────────────────────────────────────────────────────────────
    const { valid, error } = validateScore(payload);
    if (!valid) {
      return res.status(422).json({ success: false, error });
    }

    // ── Persist ─────────────────────────────────────────────────────────────
    const { date, playerId, name, score, generation, aliveCells } = payload;

    const result = await upsertScore({
      date,
      playerId,
      name,
      score,
      generation,
      aliveCells
    });

    if (!result.saved) {
      return res.json({
        success: true,
        saved: false,
        message: 'Existing score is higher — not updated.',
        previousScore: result.previous
      });
    }

    return res.json({
      success: true,
      saved: true,
      score,
      message: 'Score saved successfully!'
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { submit };
