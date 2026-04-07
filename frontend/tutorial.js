/**
 * tutorial.js — CellWorld Daily Challenge
 * Interactive 4-step first-run tutorial overlay.
 */

const TUTORIAL_KEY  = 'cw_tutorialCompleted';
const TOTAL_STEPS   = 6;

// Highlight targets per step (CSS selectors into the game screen)
const HIGHLIGHT_SELECTORS = [
  '#game-canvas',        // step 1: tap to activate cells
  '#hud-generation',    // step 2: check generations limit
  '#hud-alive',         // step 3: watch alive count
  '#btn-info',          // step 4: check rules/info
  '#btn-play-pause',     // step 5: press play
  '#btn-submit'          // step 6: submit score
];

export class Tutorial {
  /**
   * @param {object} texts   Texts object (tutorial sub-section)
   * @param {number} target  Daily target cell count (for {{target}} interpolation)
   */
  constructor(texts, target) {
    this.texts    = texts || {};
    this.target   = target || 80;
    this.step     = 0;
    this.el       = null;
    this.onFinish = null;
  }

  /** Returns true if the tutorial has already been completed. */
  static isCompleted() {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  }

  /** Mark tutorial as done and persist. */
  static markCompleted() {
    localStorage.setItem(TUTORIAL_KEY, '1');
  }

  /** Reset tutorial (useful for debugging). */
  static reset() {
    localStorage.removeItem(TUTORIAL_KEY);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Mount and show the tutorial overlay.
   * @param {HTMLElement} container  Element to append overlay into (usually document.body)
   */
  show(container = document.body) {
    if (Tutorial.isCompleted()) {
      this.onFinish && this.onFinish();
      return;
    }

    this._buildOverlay();
    container.appendChild(this.el);
    this.step = 0;
    this._renderStep();
  }

  _buildOverlay() {
    this.el = document.createElement('div');
    this.el.id = 'tutorial-overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', 'Tutorial');
    this.el.innerHTML = `
      <div id="tutorial-backdrop"></div>
      <div id="tutorial-spotlight"></div>
      <div id="tutorial-card">
        <div id="tutorial-step-indicator"></div>
        <h2 id="tutorial-title"></h2>
        <p  id="tutorial-body"></p>
        <div id="tutorial-actions">
          <button id="tutorial-skip"   aria-label="Omitir tutorial">Omitir</button>
          <button id="tutorial-next"   aria-label="Siguiente paso"></button>
        </div>
      </div>
    `;

    this.el.querySelector('#tutorial-skip').addEventListener('click', () => this._finish());
    this.el.querySelector('#tutorial-next').addEventListener('click', () => this._advance());
  }

  _renderStep() {
    const t = this.texts;
    const steps = [
      { title: t.step1_title, body: t.step1_body },
      { title: t.step2_title, body: t.step2_body },
      { title: t.step3_title, body: t.step3_body },
      { title: t.step4_title, body: t.step4_body },
      { title: t.step5_title, body: t.step5_body },
      { title: t.step6_title, body: t.step6_body }
    ];

    const { title, body } = steps[this.step] || {};
    const isLast = this.step === TOTAL_STEPS - 1;

    const interpolate = (str) => (str || '').replace('{{target}}', this.target);

    this.el.querySelector('#tutorial-title').textContent = interpolate(title) || `Step ${this.step + 1}`;
    this.el.querySelector('#tutorial-body').textContent  = interpolate(body)  || '';
    this.el.querySelector('#tutorial-next').textContent  =
      isLast ? (t.finish_button || 'Start') : (t.next_button || 'Next');

    // Dot indicator
    const dots = Array.from({ length: TOTAL_STEPS }, (_, i) =>
      `<span class="tut-dot ${i === this.step ? 'active' : ''}"></span>`
    ).join('');
    this.el.querySelector('#tutorial-step-indicator').innerHTML = dots;

    // Spotlight on highlighted element
    this._updateSpotlight();
  }

  _updateSpotlight() {
    const spotlight = this.el.querySelector('#tutorial-spotlight');
    const selector  = HIGHLIGHT_SELECTORS[this.step];
    const target    = selector ? document.querySelector(selector) : null;

    if (target) {
      const rect = target.getBoundingClientRect();
      const pad  = 8;
      Object.assign(spotlight.style, {
        display:      'block',
        top:          `${rect.top    - pad}px`,
        left:         `${rect.left   - pad}px`,
        width:        `${rect.width  + pad * 2}px`,
        height:       `${rect.height + pad * 2}px`,
        borderRadius: '10px'
      });
    } else {
      spotlight.style.display = 'none';
    }
  }

  _advance() {
    this.step++;
    if (this.step >= TOTAL_STEPS) {
      this._finish();
    } else {
      this._renderStep();
    }
  }

  _finish() {
    Tutorial.markCompleted();
    if (this.el && this.el.parentNode) {
      this.el.classList.add('fade-out');
      setTimeout(() => {
        if (this.el && this.el.parentNode) this.el.remove();
      }, 400);
    }
    if (typeof this.onFinish === 'function') this.onFinish();
  }
}
