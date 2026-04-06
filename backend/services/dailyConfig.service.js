'use strict';
/**
 * dailyConfig.service.js
 * Fetches the daily challenge config from Firestore.
 * If none exists for today, generates a deterministic default from the date.
 */

const { db } = require('./firebase.service');

const GRID_SIZE = parseInt(process.env.GRID_SIZE || '40', 10);

/**
 * Deterministic pseudo-random number generator seeded by a number.
 * Returns a float in [0, 1).
 */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Generate a daily config from the date string deterministically.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {object}
 */
function generateDefaultConfig(dateStr) {
  const seed = dateStr.replace(/-/g, '').split('').reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0
  );
  const rand = seededRandom(Math.abs(seed));

  // Rotate through difficulty levels based on day index
  const dayIndex = parseInt(dateStr.replace(/-/g, ''), 10) % 3;
  const difficulties = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[dayIndex];

  // Birth/survive rules — standard Conway, or a slight variation
  const variationRoll = rand();
  let rules;
  if (variationRoll < 0.5) {
    rules = { birth: [3], survive: [2, 3] };          // Conway's Life
  } else if (variationRoll < 0.75) {
    rules = { birth: [3, 6], survive: [2, 3] };       // HighLife variant
  } else {
    rules = { birth: [3], survive: [2, 3, 4] };       // 34 Life variant
  }

  const targets = { easy: 30, medium: 50, hard: 80 };
  const target = targets[difficulty];

  // Fallback defaults
  const gridSizes = { easy: 10, medium: 12, hard: 14 };
  const initialLimits = { easy: 12, medium: 15, hard: 18 };

  return {
    date: dateStr,
    rules,
    target,
    difficulty,
    seed: Math.abs(seed),
    gridSize: gridSizes[difficulty],
    initialCells: initialLimits[difficulty],
    maxGenerations: parseInt(process.env.MAX_GENERATIONS || '120', 10),
    _generated: true   // flag to distinguish from Firestore docs
  };
}

/**
 * Get current date as YYYY-MM-DD (UTC).
 */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch the daily config for a given date (defaults to today).
 * @param {string} [date]  YYYY-MM-DD — defaults to today
 * @returns {Promise<object>}
 */
async function getDailyConfig(date) {
  const dateStr = date || todayUTC();

  if (!db) {
    console.warn('[DailyConfig] db unavailable — using generated config');
    return generateDefaultConfig(dateStr);
  }

  try {
    const doc = await db.collection('dailyChallenge').doc(dateStr).get();
    if (doc.exists) {
      return { ...doc.data(), _generated: false };
    }
  } catch (err) {
    console.error('[DailyConfig] Firestore error:', err.message);
  }

  // Firestore doc not found — generate deterministically
  return generateDefaultConfig(dateStr);
}

module.exports = { getDailyConfig, generateDefaultConfig, todayUTC };
