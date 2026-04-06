/**
 * api.js — CellWorld Daily Challenge
 * HTTP client that wraps all Node.js backend calls.
 * Falls back to cached / default data when offline.
 */

// The base URL is injected by index.html via window.CELLWORLD_API
const BASE_URL = () => (window.CELLWORLD_API || 'http://localhost:3000').replace(/\/$/, '');

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_KEYS = {
  config:        'cw_cache_config_v2',
  texts:         'cw_cache_texts_v2',
  notifications: 'cw_cache_notifications_v2',
  leaderboard:   'cw_cache_leaderboard_v2'
};
const CACHE_TTL_MS = 10 * 60 * 1000;   // 10 minutes

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      ts: Date.now()
    }));
  } catch (_) { /* ignore quota errors */ }
}

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch (_) {
    return null;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL()}${path}`;
  const res  = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── API methods ──────────────────────────────────────────────────────────────

/**
 * GET /config
 * Returns today's daily challenge configuration.
 */
export async function getConfig(date) {
  try {
    const qs  = date ? `?date=${date}` : '';
    const res = await apiFetch(`/config${qs}`);
    if (res.success) {
      // Opt-out of frontend caching for config, to ensure we always have the freshest settings
      return res.data;
    }
    throw new Error('Config fetch failed');
  } catch (err) {
    console.warn('[API] getConfig failed, using fallback:', err.message);
    return _defaultConfig();
  }
}

/**
 * GET /config/random
 * Returns a random challenge from the database for practice.
 */
export async function getRandomConfig() {
  try {
    const res = await apiFetch(`/config/random`);
    if (res.success) {
      return res.data;
    }
    throw new Error('Config fetch failed');
  } catch (err) {
    console.warn('[API] getRandomConfig failed, using fallback:', err.message);
    const fb = _defaultConfig();
    fb.isPractice = true;
    return fb;
  }
}

/**
 * GET /texts?lang=es
 * Returns UI text strings.
 */
export async function getTexts(lang = 'es') {
  const cacheKey = CACHE_KEYS.texts + lang;
  const cached = loadCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await apiFetch(`/texts?lang=${lang}`);
    if (res.success) {
      saveCache(cacheKey, res.data);
      return res.data;
    }
    throw new Error('Texts fetch failed');
  } catch (err) {
    console.warn('[API] getTexts failed, using fallback:', err.message);
    return _defaultTexts(lang);
  }
}

/**
 * GET /notifications
 * Returns push notification configuration.
 */
export async function getNotifications() {
  const cached = loadCache(CACHE_KEYS.notifications);
  if (cached) return cached;

  try {
    const res = await apiFetch('/notifications');
    if (res.success) {
      saveCache(CACHE_KEYS.notifications, res.data);
      return res.data;
    }
    throw new Error('Notifications fetch failed');
  } catch (err) {
    console.warn('[API] getNotifications failed, using fallback:', err.message);
    return _defaultNotifications();
  }
}

/**
 * GET /leaderboard?date=YYYY-MM-DD
 * Returns top 10 scores for the day.
 */
export async function getLeaderboard(date) {
  try {
    const qs  = date ? `?date=${date}` : '';
    const res = await apiFetch(`/leaderboard${qs}`);
    if (res.success) {
      saveCache(CACHE_KEYS.leaderboard, res.data);
      return res.data;
    }
    throw new Error('Leaderboard fetch failed');
  } catch (err) {
    console.warn('[API] getLeaderboard failed:', err.message);
    return loadCache(CACHE_KEYS.leaderboard) || [];
  }
}

/**
 * POST /submit-score
 * Validates and saves a player's score.
 * @param {object} payload — { playerId, name, score, generation, aliveCells, date, finalGrid }
 */
export async function submitScore(payload) {
  const res = await apiFetch('/submit-score', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res;
}

// ─── Offline fallbacks ────────────────────────────────────────────────────────

function _defaultConfig() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today,
    rules: { birth: [3], survive: [2, 3] },
    target: 80,
    difficulty: 'medium',
    seed: 42,
    gridSize: 12,
    initialCells: 20,
    maxGenerations: 120,
    _offline: true
  };
}

function _defaultTexts(lang) {
  const isEs = lang !== 'en';
  return {
    lang,
    daily_challenge: {
      title:             isEs ? 'Desafío Diario'              : 'Daily Challenge',
      objective:         isEs ? 'Mantén {{target}} vivas'     : 'Keep {{target}} cells alive',
      play_button:       isEs ? 'JUGAR'                       : 'PLAY',
      difficulty_label:  isEs ? 'Dificultad'                  : 'Difficulty',
      leaderboard_title: isEs ? 'TOP HOY'                     : "TODAY'S TOP",
      no_scores:         isEs ? 'Sé el primero en jugar'      : 'Be the first to play!'
    },
    game: {
      generation:    isEs ? 'Generaciones restantes'    : 'Generation left',
      alive:         isEs ? 'Vivas'         : 'Alive',
      target:        isEs ? 'Objetivo'      : 'Target',
      pause_button:  isEs ? 'PAUSA'         : 'PAUSE',
      play_button:   'PLAY',
      reset_button:  'RESET',
      submit_button: isEs ? 'ENVIAR SCORE'  : 'SUBMIT SCORE'
    },
    result: {
      title:             isEs ? '¡Resultado!'        : 'Result!',
      score_label:       isEs ? 'Puntuación'         : 'Score',
      play_again:        isEs ? 'Jugar de nuevo'     : 'Play again',
      leaderboard_title: isEs ? 'Clasificación'      : 'Leaderboard'
    },
    tutorial: {
      step1_title: isEs ? 'Activa células'       : 'Activate cells',
      step1_body:  isEs ? 'Toca las casillas'    : 'Tap the grid squares',
      step2_title: isEs ? 'Inicia la evolución'  : 'Start evolution',
      step2_body:  isEs ? 'Pulsa PLAY'           : 'Press PLAY',
      step3_title: isEs ? 'Alcanza el objetivo'  : 'Reach the target',
      step3_body:  isEs ? 'Mantén {{target}} células vivas' : 'Keep {{target}} cells alive',
      step4_title: isEs ? 'Envía tu puntuación'  : 'Submit your score',
      step4_body:  isEs ? 'Pulsa ENVIAR SCORE'   : 'Press SUBMIT SCORE',
      next_button:   isEs ? 'Siguiente' : 'Next',
      finish_button: isEs ? 'Empezar'   : 'Start'
    },
    errors: {
      load_failed:    isEs ? 'Error cargando datos.'     : 'Failed to load data.',
      submit_failed:  isEs ? 'Error enviando puntuación.': 'Failed to submit score.',
      invalid_score:  isEs ? 'Puntuación inválida.'      : 'Invalid score.'
    }
  };
}

function _defaultNotifications() {
  return {
    id: 'daily_reminder',
    active: true,
    time: '20:00',
    messages: ['¡No olvides tu desafío de hoy! 🧬'],
    conditions: { onlyIfNotCompleted: true },
    _offline: true
  };
}
