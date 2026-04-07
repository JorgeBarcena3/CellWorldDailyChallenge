/**
 * ui.js — CellWorld Daily Challenge
 * All DOM manipulation, Canvas rendering, and screen transitions.
 * Imports the GameEngine from game.js.
 */

import { GameEngine, seedGrid, countAlive } from './game.js?v=14';
import { getConfig, getTexts, getLeaderboard, submitScore } from './api.js?v=14';
import { Tutorial } from './tutorial.js?v=14';
import { initNotifications, markChallengeCompleted, isTodayCompleted } from './notifications.js?v=14';

// ─── Cell placement limit (freemium) ─────────────────────────────────────────
// The daily challenge defines how many cells can be placed initially (config.initialCells).

// ─── Player identity ──────────────────────────────────────────────────────────
const PLAYER_ID_KEY   = 'cw_playerId';
const PLAYER_NAME_KEY = 'cw_playerName';

function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function getPlayerName() {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────

class CanvasRenderer {
  constructor(canvas, size = 12) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.size   = size;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const container = this.canvas.parentElement;
    let dim = container ? Math.min(container.clientWidth, container.clientHeight, window.innerWidth - 16) : 360;

    // Hardcode for the fixed result snapshot board
    if (this.canvas.id === 'result-best-board') {
      dim = 180;
    } else if (dim <= 0 && this.canvas.width > 0) {
      dim = this.canvas.width;
    } else if (dim <= 0) {
      dim = 360;
    }

    this.canvas.width  = dim;
    this.canvas.height = dim;
    this.cellSize = dim / this.size;
  }

  draw(grid) {
    const { ctx, canvas, cellSize, size } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid lines
    ctx.strokeStyle = 'rgba(0,255,100,0.05)';
    ctx.lineWidth   = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellSize, 0);        ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cellSize);        ctx.lineTo(canvas.width, i * cellSize);  ctx.stroke();
    }

    // Alive cells with neon glow
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const age = grid[r][c];
        if (!age) continue;

        const x = c * cellSize;
        const y = r * cellSize;
        const pad = cellSize * 0.1;

        // Older cells change hue (Thermographic / Ripening effect)
        // Starts at Green (144), transitions through Yellow (60) and Orange (30) down to Red (0)
        const h = Math.max(0, 144 - (age - 1) * 12);  
        
        // Keep them bright and fully saturated for a neon, glassmorphism feel
        const color = `hsl(${h}, 100%, 55%)`;

        // Removed glow shadow per user request
        ctx.shadowBlur  = 0;

        ctx.fillStyle = color;
        ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);

        ctx.shadowBlur = 0;
      }
    }

    // Diagnostic indicator if the board remains empty
    if (countAlive(grid) === 0 && this.canvas.id === 'result-best-board') {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(canvas.width, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(canvas.width, 0); ctx.lineTo(0, canvas.height); ctx.stroke();
    }
  }
}

// ─── HUD updater ──────────────────────────────────────────────────────────────

function updateHUD(state, texts) {
  const t = texts?.game || {};
  const gensLeft = Math.max(0, state.maxGenerations - state.generation);
  safeSet('hud-generation', gensLeft, t.generation || 'Gen');
  safeSet('hud-alive',      state.alive,      t.alive      || 'Alive');
  safeSet('hud-score',      formatScore(state.score));
  safeSet('hud-target',     state.target,     t.target     || 'Target');
  updateTargetBar(state.alive, state.target);
}

function safeSet(id, value, label) {
  const el = document.getElementById(id);
  if (!el) return;
  if (label !== undefined) {
    el.innerHTML = `<span class="hud-label">${label}</span><span class="hud-value">${value}</span>`;
  } else {
    el.textContent = value;
  }
}

function formatScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function updateTargetBar(alive, target) {
  const bar = document.getElementById('hud-alive-bar');
  if (!bar) return;
  const pct = Math.min((alive / target) * 100, 100);
  bar.style.setProperty('--bar-pct', `${pct}%`);
  bar.setAttribute('aria-valuenow', alive);
  bar.setAttribute('aria-valuemax', target);
  bar.classList.toggle('at-target', alive >= target);
}

// ─── Screen management ────────────────────────────────────────────────────────

const SCREENS = ['splash', 'daily', 'game', 'result'];

function showScreen(name) {
  SCREENS.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) {
      el.classList.toggle('active', s === name);
      el.setAttribute('aria-hidden', s !== name ? 'true' : 'false');
    }
  });
}

// ─── Preview automaton on Daily screen ───────────────────────────────────────

function startPreviewLoop(canvas, config) {
  const gridSize = config.gridSize || 12;
  const renderer = new CanvasRenderer(canvas, gridSize);
  let grid = seedGrid(config.seed || 42, gridSize, 0.35);
  let raf;
  const history = [];

  function getSpatialHash(g) {
    let s = '';
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g.length; c++) {
        if (g[r][c] > 0) s += `${r},${c}|`;
      }
    }
    return s || 'empty';
  }

  function tick() {
    import('./game.js?v=14').then(({ nextGeneration, seedGrid }) => {
      grid = nextGeneration(grid, config.rules);
      renderer.draw(grid);

      const hash = getSpatialHash(grid);
      if (history.includes(hash)) {
        // Stagnation detected! Re-seed grid to ensure perpetual motion
        grid = seedGrid(Math.random() * 1000000, gridSize, 0.35);
        history.length = 0;
      } else {
        history.push(hash);
        if (history.length > 8) history.shift();
      }

      raf = setTimeout(tick, 350);
    });
  }

  tick();
  return () => clearTimeout(raf);
}

// ─── Leaderboard rendering ────────────────────────────────────────────────────

function renderLeaderboard(scores, containerId, maxItems = 10) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!scores || scores.length === 0) {
    el.innerHTML = `<p class="lb-empty">🧬 Sé el primero en jugar hoy</p>`;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = scores.slice(0, maxItems).map((s, i) => `
    <div class="lb-row ${i < 3 ? 'lb-top' : ''}">
      <span class="lb-rank">${medals[i] || `#${i + 1}`}</span>
      <span class="lb-name">${escapeHtml(s.name)}</span>
      <span class="lb-score">${formatScore(s.score)}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// ─── Main App controller ──────────────────────────────────────────────────────

export class App {
  constructor() {
    this.config   = null;
    this.texts    = null;
    this.engine   = null;
    this.renderer = null;
    this.playerId = getOrCreatePlayerId();
    this._stopPreview = null;
  }

  /** Boot sequence: splash → load data → daily screen */
  async boot() {
    showScreen('splash');
    this._animateSplash();

    try {
      [this.config, this.texts] = await Promise.all([getConfig(), getTexts('es')]);
    } catch (err) {
      console.error('[App] Boot load error:', err);
      // Use defaults built into api.js fallbacks
    }

    const notifConfig = await import('./api.js').then(m => m.getNotifications()).catch(() => null);
    if (notifConfig) initNotifications(notifConfig);

    await this._delay(1800);   // minimum splash duration
    this._showDaily();
  }

  // ── Splash ──────────────────────────────────────────────────────────────────

  _animateSplash() {
    const bar = document.getElementById('splash-progress-bar');
    if (!bar) return;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = '60%'; }, 200);
    setTimeout(() => { bar.style.width = '90%'; }, 1000);
    setTimeout(() => { bar.style.width = '100%'; }, 1600);
  }

  // ── Daily screen ────────────────────────────────────────────────────────────

  async _showDaily() {
    showScreen('daily');
    const t  = this.texts?.daily_challenge || {};
    const cfg = this.config || {};

    // Update UI text
    document.getElementById('daily-title')?.setAttribute('textContent', t.title);
    safeText('daily-title',       t.title       || 'Desafío Diario');
    safeText('daily-date',        formatDate(cfg.date));
    safeText('daily-objective',   (t.objective || 'Objetivo: {{target}}').replace('{{target}}', cfg.target || 80));
    const diffText = capitalize(cfg.difficulty || 'medium');
    const gridSize = cfg.gridSize || 12;
    safeText('daily-difficulty',  `${diffText} (${gridSize}x${gridSize})`);
    safeText('daily-rules-birth', `B: ${(cfg.rules?.birth || [3]).join(',')}`);
    safeText('daily-rules-survive', `S: ${(cfg.rules?.survive || [2,3]).join(',')}`);

    // Completed badge & Random button
    const isCompleted = isTodayCompleted();
    const doneBadge = document.getElementById('daily-completed-badge');
    const randomBtn = document.getElementById('btn-random-challenge');
    if (doneBadge) doneBadge.style.display = isCompleted ? 'block' : 'none';
    if (randomBtn) {
      randomBtn.style.display = isCompleted ? 'block' : 'none';
      randomBtn.onclick = async () => {
        const { getRandomConfig } = await import('./api.js?v=2');
        this.config = await getRandomConfig();
        this._showDaily(); // Render the new random challenge payload
      };
    }

    // Replay tutorial
    const tutorialBtn = document.getElementById('btn-replay-tutorial');
    if (tutorialBtn) {
      tutorialBtn.onclick = () => {
        Tutorial.reset();
        this._startGame();
      };
    }

    // Preview automaton
    const previewCanvas = document.getElementById('daily-preview-canvas');
    if (previewCanvas && cfg.rules) {
      if (this._stopPreview) this._stopPreview();
      this._stopPreview = startPreviewLoop(previewCanvas, cfg);
    }

    // Leaderboard
    if (cfg.isPractice) {
      document.getElementById('daily-leaderboard').innerHTML = '<p class="lb-empty">🎲 Práctica: Sin clasificación</p>';
    } else {
      const scores = await getLeaderboard(cfg.date).catch(() => []);
      renderLeaderboard(scores, 'daily-leaderboard', 3);
    }

    // PLAY button
    const playBtn = document.getElementById('btn-daily-play');
    if (playBtn) playBtn.onclick = () => {
      // Clear the random challenge button visibility manually so it doesn't leak into UI logic
      const rBtn = document.getElementById('btn-random-challenge');
      if(rBtn) rBtn.style.display = 'none';
      this._startGame();
    };
  }

  // ── Game screen ─────────────────────────────────────────────────────────────

  _startGame() {
    if (this._stopPreview) { this._stopPreview(); this._stopPreview = null; }

    showScreen('game');

    // Track bonus limit state
    this._adViewsCount = 0;
    this._currentCellLimit = this.config?.initialCells || 15;

    const canvas = document.getElementById('game-canvas');
    const gridSize = this.config?.gridSize || 12;
    this.renderer = new CanvasRenderer(canvas, gridSize);

    this.engine = new GameEngine(this.config || { rules: { birth:[3], survive:[2,3] }, target:80, seed:42, maxGenerations:120, gridSize: 12 });
    this.engine.setPlayerId(this.playerId);

    // Wire callbacks
    this.engine.onTick   = (state) => {
      this.renderer.draw(state.grid);
      updateHUD(state, this.texts);
      this._updateCellLimitHUD(state.alive);
    };
    this.engine.onChange = (state) => {
      updateHUD(state, this.texts);
      this._updateCellLimitHUD(state.alive);
      const btn = document.getElementById('btn-play-pause');
      if (btn) btn.textContent = state.running ? (this.texts?.game?.pause_button || 'PAUSA') : (this.texts?.game?.play_button || 'PLAY');
    };
    this.engine.onEnd = (state) => this._showResult(state);

    // Touch / click on canvas using properties to avoid duplicate listeners when playing multiple times
    this._lastTouchTime = 0;

    canvas.ontouchstart = (e) => {
      if (e.cancelable) e.preventDefault();
      this._lastTouchTime = Date.now();
      const touch = e.touches[0];
      this._handleCellClick(canvas, touch.clientX, touch.clientY);
    };

    canvas.onclick = (e) => {
      if (Date.now() - this._lastTouchTime < 400) return;  // suppress ghost click
      this._handleCellClick(canvas, e.clientX, e.clientY);
    };

    // Control buttons
    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) btnPlayPause.onclick = () => this.engine.toggle();

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.onclick = () => {
      this._adViewsCount = 0;
      this._currentCellLimit = this.config?.initialCells || 15;
      this.engine.reset();
      this.renderer.draw(this.engine.state.grid);
      this._updateCellLimitHUD(0);
    };

    const btnInfo = document.getElementById('btn-info');
    if (btnInfo) btnInfo.onclick = () => this._showInfoModal();

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.onclick = () => this.engine.finish();

    // Tutorial (first time only) — delay so canvas has real dimensions
    if (!Tutorial.isCompleted()) {
      // rAF ensures the game screen is painted and canvas has layout before spotlight
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.renderer._resize();
          this.renderer.draw(this.engine.state.grid);
          const tut = new Tutorial(this.texts?.tutorial, this.config?.target);
          tut.onFinish = () => {};
          tut.show(document.getElementById('screen-game'));
        });
      });
    }

    // Initial render
    this.renderer.draw(this.engine.state.grid);
    updateHUD(this.engine.state, this.texts);
    this._updateCellLimitHUD(0);
  }

  /** Shows or hides the cell-limit banner depending on current alive count */
  _updateCellLimitHUD(alive) {
    const limit = this._currentCellLimit;
    const banner = document.getElementById('cell-limit-banner');
    if (banner) {
      banner.textContent = `🧬 Celdas: ${alive} / ${limit}`;
      banner.classList.toggle('at-limit', alive >= limit);
    }
  }

  _handleCellClick(canvas, clientX, clientY) {
    const gridSize = this.config?.gridSize || 12;
    const rect     = canvas.getBoundingClientRect();
    const scaleX   = canvas.width  / rect.width;
    const scaleY   = canvas.height / rect.height;
    const x        = (clientX - rect.left) * scaleX;
    const y        = (clientY - rect.top)  * scaleY;
    const cellSize = canvas.width / gridSize;
    const col      = Math.floor(x / cellSize);
    const row      = Math.floor(y / cellSize);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      // Check if this click would ACTIVATE a cell that pushes us over the limit
      const currentAlive = this.engine.state.alive;
      const cellState    = this.engine.state.grid[row][col];
      const limit        = this._currentCellLimit;

      if (!cellState && currentAlive >= limit) {
        // Cell is dead and we're at limit — show ad modal instead
        this._showAdModal();
        return;
      }

      this.engine.toggleCell(row, col);
      this.renderer.draw(this.engine.state.grid);
    }
  }

  /** Show the current rules info modal to remind players via the frontend UI */
  _showInfoModal() {
    document.getElementById('info-modal-overlay')?.remove();

    const rules = this.config?.rules || { birth: [3], survive: [2,3] };
    const bReqs = rules.birth.join(' o ');
    const sReqs = rules.survive.join(' o ');

    const overlay = document.createElement('div');
    overlay.id = 'info-modal-overlay';
    
    // Injecting styles directly modeled after ad-modal for flawless UI integration
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 3000;
      background: rgba(11,15,26,0.88); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: var(--gap-md); animation: screenFadeIn var(--t-mid) ease;
    `;

    overlay.innerHTML = `
      <div id="info-modal" style="
        background: rgba(12,20,14,0.97); border: 1px solid rgba(0,255,102,0.25);
        border-radius: var(--r-xl); padding: var(--gap-lg) var(--gap-md);
        max-width: 360px; width: 100%; display: flex; flex-direction: column;
        gap: var(--gap-md); box-shadow: 0 0 60px rgba(0,255,102,0.12), 0 24px 60px rgba(0,0,0,0.5);
        text-align: left;
      ">
        <h2 style="font-size:1.1rem; color:var(--text); text-align:center; margin-bottom:10px;">Comportamiento Celular</h2>
        <p style="font-size:0.9rem; color:var(--text-dim); line-height:1.5;">
          <strong>Nacimiento (B: ${rules.birth.join(',')}):</strong><br>
          Una celda inactiva (vacía) cobrará vida si tiene a su alrededor exactamente <strong>${bReqs}</strong> células vivas.
        </p>
        <p style="font-size:0.9rem; color:var(--text-dim); line-height:1.5;">
          <strong>Supervivencia (S: ${rules.survive.join(',')}):</strong><br>
          Una celda viva se mantendrá si tiene a su alrededor exactamente <strong>${sReqs}</strong> células vivas. De lo contrario, perecerá (por sobrepoblación o soledad).
        </p>
        <button id="info-close-btn" class="btn btn-ghost btn-sm" style="margin-top:10px;">Cerrar</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#info-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  /** Show the "watch an ad to unlock more cells" modal */
  _showAdModal() {
    // Check absolute ceiling limit (75% of grid)
    const gridSize = this.config?.gridSize || 12;
    const maxAbsolute = Math.floor(gridSize * gridSize * 0.75);

    // calculate next bonus amount: 10, 9, 8, 7, ... floor at 1
    const nextBonus = Math.max(1, 10 - this._adViewsCount);

    // Remove any existing modal
    document.getElementById('ad-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ad-modal-overlay';
    
    if (this._currentCellLimit >= maxAbsolute || this.engine.state.alive >= maxAbsolute) {
      overlay.innerHTML = `
        <div id="ad-modal">
          <div class="ad-modal-icon">🛑</div>
          <h2 class="ad-modal-title">¡Espacio Agotado!</h2>
          <p class="ad-modal-body">Por leyes físicas de densidad, no puedes colocar de forma manual más del <strong>75%</strong> de las celdas del tablero.</p>
          <button id="ad-close-btn" class="btn btn-primary">Volver al juego</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('#ad-close-btn').addEventListener('click', () => overlay.remove());
      return;
    }

    const cappedBonus = Math.min(nextBonus, maxAbsolute - this.engine.state.alive);

    overlay.innerHTML = `
      <div id="ad-modal">
        <div class="ad-modal-icon">🧬</div>
        <h2 class="ad-modal-title">¡Límite de celdas!</h2>
        <p class="ad-modal-body">Has alcanzado el límite de <strong>${this._currentCellLimit} celdas</strong>.<br>Mira un anuncio para añadir <strong>+${cappedBonus} celdas</strong> (hasta el tope del 75%).</p>

        <!-- AD PLACEHOLDER -->
        <div id="ad-placeholder">
          <div class="ad-placeholder-inner">
            <span class="ad-badge">AD</span>
            <p>📺 Aquí irá el anuncio</p>
            <p class="ad-sub">Banner / Interstitial placeholder</p>
          </div>
        </div>

        <button id="ad-watch-btn" class="btn btn-primary">▶ Ver anuncio (+${cappedBonus} celdas)</button>
        <button id="ad-close-btn" class="btn btn-ghost btn-sm">Continuar sin más celdas</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Simulate watching an ad (3-second countdown)
    const watchBtn = overlay.querySelector('#ad-watch-btn');
    const closeBtn = overlay.querySelector('#ad-close-btn');
    let watching = false;

    watchBtn.addEventListener('click', () => {
      if (watching) return;
      watching = true;
      let secs = 3;
      watchBtn.disabled = true;
      watchBtn.textContent = `⏳ Cargando anuncio... (${secs}s)`;
      const iv = setInterval(() => {
        secs--;
        if (secs > 0) {
          watchBtn.textContent = `⏳ ${secs}s...`;
        } else {
          clearInterval(iv);
          this._adViewsCount++;
          // limit is based on CURRENTly alive cells, plus cappedBonus, cannot exceed maxAbsolute
          this._currentCellLimit = Math.min(this.engine.state.alive + cappedBonus, maxAbsolute);
          this._updateCellLimitHUD(this.engine.state.alive);
          overlay.remove();
        }
      }, 1000);
    });

    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  /** Prompt the user for their name if not available or just to confirm it */
  _promptName() {
    return new Promise((resolve) => {
      document.getElementById('name-modal-overlay')?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'name-modal-overlay';
      overlay.innerHTML = `
        <div id="name-modal">
          <div class="ad-modal-icon" style="font-size:2rem; margin-bottom:10px;">🏆</div>
          <h2 class="ad-modal-title">¡Gran Partida!</h2>
          <p class="ad-modal-body" style="margin-bottom:15px;">Para guardar tu puntuación en el ranking público, necesitamos un alias.</p>
          <input type="text" id="name-input" class="name-input-field" placeholder="Tu nombre..." maxlength="16" autocomplete="off" value="${getPlayerName()}" />
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button id="name-submit-btn" class="btn btn-primary" style="flex:1;">Guardar Score</button>
            <button id="name-skip-btn" class="btn btn-ghost" style="flex:1;">No Guardar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#name-input');
      const submitBtn = overlay.querySelector('#name-submit-btn');
      const skipBtn = overlay.querySelector('#name-skip-btn');

      // Autofocus using a slight delay for mobile compatibility
      setTimeout(() => input.focus(), 100);

      const submit = () => {
        const val = input.value.trim();
        if (!val) {
          input.style.border = '1px solid var(--danger)';
          return;
        }
        localStorage.setItem(PLAYER_NAME_KEY, val);
        overlay.remove();
        resolve(val);
      };

      submitBtn.addEventListener('click', submit);
      input.addEventListener('keypress', (e) => {
        input.style.border = '';
        if (e.key === 'Enter') submit();
      });

      skipBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
    });
  }

  // ── Result screen ───────────────────────────────────────────────────────────

  async _showResult(state) {
    showScreen('result');
    const t   = this.texts?.result || {};
    const cfg = this.config        || {};

    safeText('result-score',      formatScore(state.score));
    safeText('result-generation', state.generation);
    safeText('result-alive',      state.alive);
    safeText('result-target',     cfg.target || 80);

    // Raw-API snap for peak snapshot (bypass abstraction for mobile compatibility)
    const snapshotCanvas = document.getElementById('result-best-board');
    if (snapshotCanvas) {
      const g = state.bestGrid || this.engine?.state?.bestGrid || state.grid;
      const gs = g.length;
      setTimeout(() => {
        const ctx = snapshotCanvas.getContext('2d');
        if (!ctx) return;
        const dim = 140;
        snapshotCanvas.width = dim;
        snapshotCanvas.height = dim;
        const cs = dim / gs;
        ctx.clearRect(0, 0, dim, dim);
        for (let r = 0; r < gs; r++) {
          for (let c = 0; c < gs; c++) {
            const age = g[r][c];
            if (!age) continue;
            const h = Math.max(0, 144 - (age - 1) * 12);
            ctx.fillStyle = `hsl(${h}, 100%, 55%)`;
            ctx.fillRect(c * cs, r * cs, cs - (cs * 0.1), cs - (cs * 0.1));
          }
        }
      }, 200);
    }

    // Animate score count-up
    this._countUp('result-score', 0, state.score, 1200);

    // If practice game, skip name prompt and submission
    if (cfg.isPractice) {
      safeText('result-submit-status', '🎲 Modo Práctica: Resultados no guardados en tabla.');
      document.getElementById('result-leaderboard').innerHTML = '<p class="lb-empty">El modo aleatorio no cuenta para el ranking diario.</p>';
      
      document.getElementById('btn-result-back')?.addEventListener('click', () => location.reload(), { once: true });
      return;
    }

    // Mandatorily prompt for name before submitting
    const name = await this._promptName();
    const cfgDate = cfg.date;

    if (!name) {
      safeText('result-submit-status', '⚠️ Puntuación no registrada (Omitido)');
    } else {
      safeText('result-submit-status', '⌛ Guardando...');
      try {
        const payload = {
          ...this.engine.toSubmissionPayload(),
          name,
          playerId: this.playerId
        };
        const res = await submitScore(payload);
        if (res.success) {
          markChallengeCompleted();
          safeText('result-submit-status', res.saved ? '✅ Puntuación guardada' : 'ℹ️ Tu récord actual es mayor o igual');
        }
      } catch (err) {
        console.error('[App] Score submit error:', err);
        safeText('result-submit-status', this.texts?.errors?.submit_failed || 'Error enviando puntuación');
      }
    }

    // Full leaderboard (fetch anew to show potentially updated ranking)
    const scores = await getLeaderboard(cfgDate).catch(() => []);
    renderLeaderboard(scores, 'result-leaderboard', 10);

    // Back button
    document.getElementById('btn-result-back')?.addEventListener('click', () => {
      location.reload();   // simplest restart: reload the page
    }, { once: true });
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  _countUp(id, from, to, durationMs) {
    const el    = document.getElementById(id);
    if (!el) return;
    const start = performance.now();
    const tick  = (now) => {
      const t   = Math.min((now - start) / durationMs, 1);
      const val = Math.round(from + (to - from) * easeOut(t));
      el.textContent = formatScore(val);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
