/**
 * api.js — CellWorld Daily Challenge
 * HTTP client that wraps all Node.js backend calls.
 * Falls back to cached / default data when offline.
 */

// The base URL is injected by index.html via window.CELLWORLD_API
const BASE_URL = () => (window.CELLWORLD_API || 'http://localhost:3000').replace(/\/$/, '');

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_KEYS = {
  config:        'cw_cache_config_v3',
  texts:         'cw_cache_texts_v3',
  notifications: 'cw_cache_notifications_v3',
  leaderboard:   'cw_cache_leaderboard_v3'
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

function loadCache(key, ignoreExpiry = false) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!ignoreExpiry && Date.now() - ts > CACHE_TTL_MS) return null;
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
      saveCache(CACHE_KEYS.config, res.data); // Cache today's config too
      return res.data;
    }
    throw new Error('Config fetch failed');
  } catch (err) {
    console.warn('[API] getConfig failed, trying local fallback:', err.message);
    
    // 1. Try cache (even if stale)
    const cached = loadCache(CACHE_KEYS.config, true);
    if (cached && (!date || cached.date === date)) return { ...cached, _fromCache: true };

    // 2. Try fallback JSON
    try {
      const localRes = await fetch('./fallback-challenges.json');
      const challenges = await localRes.json();
      const today = date || new Date().toISOString().slice(0, 10);
      const match = challenges.find(c => c.date === today);
      if (match) return { ...match, _fromFallback: true };
      
      // If no date match, just return a random one from the local file
      const random = challenges[Math.floor(Math.random() * challenges.length)];
      return { ...random, _fromFallbackRandom: true };
    } catch (localErr) {
      console.warn('[API] Local fallback failed:', localErr);
      return _defaultConfig();
    }
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
    console.warn('[API] getTexts failed, trying local fallback:', err.message);
    
    // Try stale cache first
    const stale = loadCache(cacheKey, true);
    if (stale) return stale;

    // Try local JSON
    try {
      const localRes = await fetch(`./fallback-texts-${lang}.json`);
      if (localRes.ok) {
        const data = await localRes.json();
        saveCache(cacheKey, data);
        return data;
      }
    } catch (_) {}

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
    console.warn('[API] getNotifications failed, trying stale cache:', err.message);
    return loadCache(CACHE_KEYS.notifications, true) || _defaultNotifications();
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
    console.warn('[API] getLeaderboard failed, using stale cache:', err.message);
    return loadCache(CACHE_KEYS.leaderboard, true) || [];
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
      leaderboard_title: isEs ? 'Clasificación'               : "Classification",
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
      step1_body:  isEs ? 'Toca las casillas del tablero para activar células' : 'Tap on the grid squares to activate cells',
      step2_title: isEs ? 'Generaciones'         : 'Generations',
      step2_body:  isEs ? 'Tienes un número limitado de generaciones antes de que termine el juego' : 'You have a limited number of generations before the game ends',
      step3_title: isEs ? 'Alcanza el objetivo'  : 'Reach the target',
      step3_body:  isEs ? 'Alcanza {{target}} células vivas para ganar puntos de bonus' : 'Reach {{target}} alive cells to earn bonus points',
      step4_title: isEs ? 'Reglas del día'       : 'Rules of the day',
      step4_body:  isEs ? 'Pulsa INFO para ver cómo nacen y mueren las células hoy' : 'Press INFO to see the birth and survival rules today',
      step5_title: isEs ? 'Inicia la evolución'  : 'Start evolution',
      step5_body:  isEs ? 'Pulsa PLAY para que la simulación empiece a correr' : 'Press PLAY to start the simulation loop',
      step6_title: isEs ? 'Envía tu puntuación'  : 'Submit your score',
      step6_body:  isEs ? 'Al terminar, pulsa ENVIAR SCORE para el ranking' : 'When finished, press SUBMIT SCORE to enter the ranking',
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
