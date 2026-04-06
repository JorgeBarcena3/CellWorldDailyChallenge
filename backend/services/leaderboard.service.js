'use strict';
/**
 * leaderboard.service.js
 * Fetches and formats leaderboard data from the `scores` Firestore collection.
 */

const { db } = require('./firebase.service');

const COLLECTION   = 'scores';
const DEFAULT_TOP_N = 10;
const QUERY_TIMEOUT = 5000;  // ms — fail fast if Firestore is unreachable

/** Rejects after ms milliseconds */
function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Firestore timeout after ${ms}ms`)), ms)
  );
}

/**
 * Retrieve the top-N scores for a given date.
 * @param {string} date   YYYY-MM-DD
 * @param {number} [topN] Number of results (default 10)
 * @returns {Promise<Array<{rank, name, score, generation, aliveCells, timestamp}>>}
 */
async function getTopScores(date, topN = DEFAULT_TOP_N) {
  if (!db) {
    console.warn('[Leaderboard] db unavailable — returning empty leaderboard.');
    return [];
  }

  try {
    const query = db.collection(COLLECTION)
      .where('date', '==', date)
      .get();

    const snapshot = await Promise.race([query, timeout(QUERY_TIMEOUT)]);

    // Fetch all for the date, sort descending by score locally
    let scores = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        name: d.name || 'Anonymous',
        score: d.score,
        generation: d.generation,
        aliveCells: d.aliveCells,
        timestamp: d.timestamp
      };
    });

    scores.sort((a, b) => b.score - a.score);
    // Take top N
    scores = scores.slice(0, topN);

    // Assign rank
    return scores.map((s, index) => {
      s.rank = index + 1;
      return s;
    });
  } catch (err) {
    console.error('[Leaderboard] Firestore query error:', err.message);
    return [];
  }
}

module.exports = { getTopScores };
