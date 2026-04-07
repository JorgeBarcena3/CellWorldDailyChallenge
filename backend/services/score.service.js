'use strict';
/**
 * score.service.js
 * Firestore CRUD for the `scores` collection.
 * Upsert logic: only saves if new score > existing score.
 */

const { db } = require('./firebase.service');

const COLLECTION = 'scores';

/**
 * Build a Firestore document ID for a player's daily score.
 * Format: YYYY-MM-DD__playerId
 */
function docId(date, playerId) {
  return `${date}__${playerId}`;
}

/**
 * Upsert a player's score for a given date.
 * Only updates if the new score is strictly greater than the stored one.
 *
 * @param {object} params
 * @param {string} params.date       YYYY-MM-DD
 * @param {string} params.playerId   UUID v4
 * @param {string} params.name       Display name
 * @param {number} params.score      Final score
 * @param {number} params.generation Last generation reached
 * @param {number} params.aliveCells Alive cells at submission
 * @returns {Promise<{ saved: boolean, previous?: number }>}
 */
async function upsertScore({ date, playerId, name, score, generation, aliveCells }) {
  if (!db) {
    console.warn('[ScoreService] db unavailable — score not persisted.');
    return { saved: false };
  }

  const id = docId(date, playerId);
  const ref = db.collection(COLLECTION).doc(id);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (snap.exists) {
      const existing = snap.data();
      if (score <= existing.score) {
        // Incoming score is not higher — do not update
        return { saved: false, previous: existing.score };
      }
    }

    tx.set(ref, {
      date,
      playerId,
      name: name.trim().slice(0, 32),   // sanitise & cap display name
      score,
      generation,
      aliveCells,
      timestamp: new Date().toISOString()
    });

    return { saved: true };
  });
}

/**
 * Get a specific player's score for a date (or null).
 * @param {string} date       YYYY-MM-DD
 * @param {string} playerId
 * @returns {Promise<object|null>}
 */
async function getPlayerScore(date, playerId) {
  if (!db) return null;
  const snap = await db.collection(COLLECTION).doc(docId(date, playerId)).get();
  return snap.exists ? snap.data() : null;
}

module.exports = { upsertScore, getPlayerScore };
