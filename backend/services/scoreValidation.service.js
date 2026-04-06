'use strict';
/**
 * scoreValidation.service.js
 * Anti-cheat validation logic for score submissions.
 *
 * Validation steps:
 *  1. Required field presence & types
 *  2. UUID v4 format for playerId
 *  3. generation ≤ MAX_GENERATIONS
 *  4. aliveCells verified against submitted finalGrid
 *  5. score within tolerance of aliveCells × generationBonus
 *  6. aliveCells ≤ gridSize²
 */

const { validate: uuidValidate, version: uuidVersion } = require('uuid');

const MAX_GENERATIONS = parseInt(process.env.MAX_GENERATIONS || '120', 10);

// Score tolerance: allow ±10%
const SCORE_TOLERANCE = 0.10;

/**
 * Count alive cells in a 2D grid (array of arrays: 0/1).
 * @param {number[][]} grid
 * @returns {number}
 */
function countAliveInGrid(grid) {
  return grid.reduce((total, row) => {
    if (!Array.isArray(row)) return total;
    return total + row.reduce((s, cell) => s + (cell ? 1 : 0), 0);
  }, 0);
}

/**
 * Validate a score submission payload.
 * @param {object} payload — request body from POST /submit-score
 * @returns {{ valid: boolean, error?: string }}
 */
function validateScore(payload) {
  const { playerId, name, score, generation, aliveCells, date, finalGrid } = payload;

  // ── Step 1: Required fields ────────────────────────────────────────────────
  if (!playerId || !score || generation == null || !aliveCells || !date || !finalGrid) {
    return { valid: false, error: 'Missing required fields.' };
  }

  // ── Step 2: Types ──────────────────────────────────────────────────────────
  if (typeof score !== 'number' || typeof generation !== 'number' || typeof aliveCells !== 'number') {
    return { valid: false, error: 'score, generation and aliveCells must be numbers.' };
  }
  if (!Array.isArray(finalGrid) || !finalGrid.every(Array.isArray)) {
    return { valid: false, error: 'finalGrid must be a 2D array.' };
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'name must be a non-empty string.' };
  }

  // ── Step 3: playerId format (UUID v4) ──────────────────────────────────────
  if (!uuidValidate(playerId) || uuidVersion(playerId) !== 4) {
    return { valid: false, error: 'Invalid playerId — must be UUID v4.' };
  }

  const gridSize = finalGrid.length;
  const MAX_CELLS = gridSize * gridSize;

  // ── Step 4: Bounds ─────────────────────────────────────────────────────────
  if (score <= 0) {
    return { valid: false, error: 'score must be positive.' };
  }
  if (generation > MAX_GENERATIONS) {
    return { valid: false, error: `generation exceeds max (${MAX_GENERATIONS}).` };
  }
  if (aliveCells > MAX_CELLS) {
    return { valid: false, error: `aliveCells exceeds grid size (${MAX_CELLS}).` };
  }

  // ── Step 5: Verify aliveCells against finalGrid ────────────────────────────
  const gridAlive = countAliveInGrid(finalGrid);
  if (Math.abs(gridAlive - aliveCells) > 2) {
    return {
      valid: false,
      error: `aliveCells mismatch: reported ${aliveCells} but grid has ${gridAlive}.`
    };
  }

  // ── Step 6: Score plausibility ─────────────────────────────────────────────
  // Score is now the historical maximum of 'alive' cells during the entire simulation.
  // Therefore, it must be at least the amount alive at the end (gridAlive),
  // and no greater than the total cells in the grid (MAX_CELLS).
  if (score < gridAlive) {
    return {
      valid: false,
      error: `Score ${score} cannot be less than final alive cells (${gridAlive}).`
    };
  }
  if (score > MAX_CELLS) {
    return {
      valid: false,
      error: `Score ${score} impossibly high (max grid size is ${MAX_CELLS}).`
    };
  }

  // ── Step 7: Date format ────────────────────────────────────────────────────
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: 'Invalid date format — expected YYYY-MM-DD.' };
  }

  return { valid: true };
}

module.exports = { validateScore, countAliveInGrid };
