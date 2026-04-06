/**
 * game.js — CellWorld Daily Challenge
 * Pure cellular automaton engine. No DOM dependencies.
 * Can be imported in browser (ES module) or Node.js (CommonJS via adapter).
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const TICK_MS_FAST   = 120;   // fast evolution tick
export const TICK_MS_NORMAL = 300;   // normal tick
export const TICK_MS_SLOW   = 500;   // slow tick

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
export function createRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Grid utilities ───────────────────────────────────────────────────────────

/**
 * Create an empty GRID_SIZE × GRID_SIZE grid filled with 0.
 */
export function createGrid(size = 12) {
  return Array.from({ length: size }, () => new Uint8Array(size));
}

/**
 * Deep-copy a grid (fast typed-array clone).
 */
export function cloneGrid(grid) {
  return grid.map(row => new Uint8Array(row));
}

/**
 * Seed a grid using a deterministic RNG from a numeric seed.
 * density — fraction of alive cells [0,1] (default 0.3)
 */
export function seedGrid(seed, size = 12, density = 0.3) {
  const rng  = createRNG(seed);
  const grid = createGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = rng() < density ? 1 : 0;
    }
  }
  return grid;
}

/**
 * Count alive cells in a grid.
 */
export function countAlive(grid) {
  return grid.reduce((total, row) => {
    let s = 0;
    for (let i = 0; i < row.length; i++) s += row[i] > 0 ? 1 : 0;
    return total + s;
  }, 0);
}

/**
 * Toggle a single cell alive ↔ dead.
 */
export function toggleCell(grid, row, col) {
  const next = cloneGrid(grid);
  next[row][col] = next[row][col] ? 0 : 1;
  return next;
}

/**
 * Set a single cell to a specific state.
 */
export function setCell(grid, row, col, state) {
  const next = cloneGrid(grid);
  next[row][col] = state ? 1 : 0;
  return next;
}

// ─── Core automaton step ──────────────────────────────────────────────────────

/**
 * Compute the next generation of the grid using B/S notation rules.
 *
 * @param {Uint8Array[]} grid   Current grid
 * @param {{ birth: number[], survive: number[] }} rules
 * @returns {Uint8Array[]}      New grid (immutable — new allocation)
 */
export function nextGeneration(grid, rules) {
  const size = grid.length;
  const next = createGrid(size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const neighbours = countNeighbours(grid, r, c, size);
      const alive      = grid[r][c] > 0;

      if (alive) {
        next[r][c] = rules.survive.includes(neighbours) ? Math.min(255, grid[r][c] + 1) : 0;
      } else {
        next[r][c] = rules.birth.includes(neighbours) ? 1 : 0;
      }
    }
  }

  return next;
}

/**
 * Count the 8 Moore neighbours of cell (row, col) with toroidal wrapping.
 */
function countNeighbours(grid, row, col, size) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = (row + dr + size) % size;
      const c = (col + dc + size) % size;
      count += grid[r][c] > 0 ? 1 : 0;
    }
  }
  return count;
}

// Score is now simply the maximum cells alive during the evolution, tracked inside GameEngine.

// ─── GameEngine class ─────────────────────────────────────────────────────────

/**
 * Manages game state and the evolution loop.
 * Emits events via callbacks — no DOM coupling.
 *
 * @example
 * const engine = new GameEngine(config);
 * engine.onTick = (state) => canvasRenderer.draw(state.grid);
 * engine.onEnd  = (state) => ui.showResult(state);
 * engine.start();
 */
export class GameEngine {
  constructor(config) {
    this.config     = config;
    this.state      = this._initialState();
    this._timerId   = null;
    this._tickMs    = TICK_MS_NORMAL;
    this._multiplier = 1;

    // Callbacks (set by consumer)
    this.onTick   = null;   // (state) => void
    this.onEnd    = null;   // (state) => void
    this.onChange = null;   // (state) => void  — fired on any state change
  }

  // ── State init ─────────────────────────────────────────────────────────────

  _initialState() {
    const { seed, gridSize = 12, rules, target, maxGenerations = 120 } = this.config;
    return {
      grid:           createGrid(gridSize),
      generation:     0,
      running:        false,
      alive:          0,
      target,
      maxGenerations,
      rules,
      playerId:       null,
      score:          0,
      finished:       false,
      tickMs:         TICK_MS_NORMAL,
      _seed:          seed
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Set player identity */
  setPlayerId(id) {
    this.state.playerId = id;
  }

  /** Set ad-boosted score multiplier (1 or 2) */
  setMultiplier(m) {
    this._multiplier = m;
  }

  /** Toggle running/paused */
  toggle() {
    if (this.state.finished) return;
    this.state.running ? this.pause() : this.play();
  }

  /** Start/resume the evolution loop */
  play() {
    if (this.state.finished || this.state.running) return;
    this.state.running = true;
    this._scheduleNextTick();
    this._emit(this.onChange);
  }

  /** Pause the evolution loop */
  pause() {
    this.state.running = false;
    clearTimeout(this._timerId);
    this._timerId = null;
    this._emit(this.onChange);
  }

  /** Reset to initial empty grid */
  reset() {
    this.pause();
    this.state = this._initialState();
    this._emit(this.onChange);
    this._emit(this.onTick);
  }

  /** Manually toggle a cell (only when paused) */
  toggleCell(row, col) {
    if (this.state.running) return;
    this.state.grid = toggleCell(this.state.grid, row, col);
    this.state.alive = countAlive(this.state.grid);
    // Note: Score is deliberately not updated here to prevent players from buying 75% of the grid with ads and claiming that as their score.
    this._emit(this.onTick);
    this._emit(this.onChange);
  }

  /** Set tick speed ('fast' | 'normal' | 'slow') */
  setSpeed(speed) {
    const map = { fast: TICK_MS_FAST, normal: TICK_MS_NORMAL, slow: TICK_MS_SLOW };
    this._tickMs = map[speed] || TICK_MS_NORMAL;
    this.state.tickMs = this._tickMs;
  }

  /** Finish the game */
  finish() {
    this.pause();
    this.state.finished  = true;
    this._emit(this.onEnd);
  }

  /** Serialise game state for score submission */
  toSubmissionPayload() {
    const { grid, generation, alive, score } = this.state;
    return {
      playerId:   this.state.playerId,
      score,
      generation,
      aliveCells: alive,
      date:       new Date().toISOString().slice(0, 10),
      finalGrid:  grid.map(row => Array.from(row))
    };
  }

  /** Export current grid as plain 2D array (for preview / Firestore) */
  exportGrid() {
    return this.state.grid.map(row => Array.from(row));
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _scheduleNextTick() {
    this._timerId = setTimeout(() => this._tick(), this._tickMs);
  }

  _tick() {
    if (!this.state.running) return;

    this.state.grid       = nextGeneration(this.state.grid, this.state.rules);
    this.state.generation += 1;
    this.state.alive      = countAlive(this.state.grid);
    this.state.score      = Math.max(this.state.score, this.state.alive);

    this._emit(this.onTick);

    if (this.state.generation >= this.state.maxGenerations) {
      this.finish();
      return;
    }

    this._scheduleNextTick();
  }

  _emit(cb) {
    if (typeof cb === 'function') cb({ ...this.state });
  }
}
