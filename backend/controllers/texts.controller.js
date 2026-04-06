'use strict';
/**
 * texts.controller.js
 * GET /texts?lang=es  →  returns UI text strings
 */

const { db } = require('../services/firebase.service');

// Built-in fallback texts (bilingual)
const DEFAULT_TEXTS = {
  es: {
    lang: 'es',
    daily_challenge: {
      title: 'Desafío Diario',
      subtitle: 'Autómata celular',
      objective: 'Mantén {{target}} células vivas',
      play_button: 'JUGAR',
      difficulty_label: 'Dificultad',
      rules_birth: 'Nacimiento:',
      rules_survive: 'Supervivencia:',
      leaderboard_title: 'TOP HOY',
      no_scores: 'Sé el primero en jugar'
    },
    game: {
      generation: 'Generaciones restantes',
      alive: 'Vivas',
      target: 'Objetivo',
      pause_button: 'PAUSA',
      play_button: 'PLAY',
      reset_button: 'RESET',
      submit_button: 'ENVIAR SCORE',
      timer_label: 'Tiempo'
    },
    result: {
      title: '¡Resultado!',
      score_label: 'Puntuación',
      generation_label: 'Generaciones',
      alive_label: 'Células vivas',
      play_again: 'Jugar de nuevo',
      leaderboard_title: 'Clasificación del día',
      share_button: 'Compartir'
    },
    tutorial: {
      step1_title: 'Activa células',
      step1_body: 'Toca las casillas del tablero para activar células',
      step2_title: 'Inicia la evolución',
      step2_body: 'Pulsa PLAY para que las células evolucionen solas',
      step3_title: 'Alcanza el objetivo',
      step3_body: 'Mantén {{target}} células vivas el mayor tiempo posible',
      step4_title: 'Envía tu puntuación',
      step4_body: 'Al terminar, pulsa ENVIAR SCORE para el ranking',
      next_button: 'Siguiente',
      finish_button: 'Empezar'
    },
    notifications: {
      daily_reminder: '¡No olvides tu desafío de hoy! 🧬',
      streak_reminder: '¡Lleva {{days}} días seguidos! Mantén tu racha 🔥'
    },
    errors: {
      load_failed: 'Error cargando datos. Revisa tu conexión.',
      submit_failed: 'Error enviando puntuación.',
      invalid_score: 'Puntuación inválida.'
    }
  },
  en: {
    lang: 'en',
    daily_challenge: {
      title: 'Daily Challenge',
      subtitle: 'Cellular Automaton',
      objective: 'Keep {{target}} cells alive',
      play_button: 'PLAY',
      difficulty_label: 'Difficulty',
      rules_birth: 'Birth:',
      rules_survive: 'Survive:',
      leaderboard_title: "TODAY'S TOP",
      no_scores: 'Be the first to play!'
    },
    game: {
      generation: 'Generation',
      alive: 'Alive',
      target: 'Target',
      pause_button: 'PAUSE',
      play_button: 'PLAY',
      reset_button: 'RESET',
      submit_button: 'SUBMIT SCORE',
      timer_label: 'Time'
    },
    result: {
      title: 'Result!',
      score_label: 'Score',
      generation_label: 'Generations',
      alive_label: 'Alive cells',
      play_again: 'Play again',
      leaderboard_title: "Today's Leaderboard",
      share_button: 'Share'
    },
    tutorial: {
      step1_title: 'Activate cells',
      step1_body: 'Tap on the grid squares to activate cells',
      step2_title: 'Start evolution',
      step2_body: 'Press PLAY to let the cells evolve automatically',
      step3_title: 'Reach the target',
      step3_body: 'Keep {{target}} cells alive for as long as possible',
      step4_title: 'Submit your score',
      step4_body: 'When done, press SUBMIT SCORE to join the leaderboard',
      next_button: 'Next',
      finish_button: 'Start'
    },
    notifications: {
      daily_reminder: "Don't forget today's challenge! 🧬",
      streak_reminder: "You're on a {{days}}-day streak! Keep it up 🔥"
    },
    errors: {
      load_failed: 'Failed to load data. Check your connection.',
      submit_failed: 'Failed to submit score.',
      invalid_score: 'Invalid score.'
    }
  }
};

async function getTexts(req, res, next) {
  try {
    const lang = (req.query.lang === 'en') ? 'en' : 'es';

    if (db) {
      try {
        const doc = await db.collection('texts').doc(lang).get();
        if (doc.exists) {
          return res.json({ success: true, data: doc.data() });
        }
      } catch (err) {
        console.warn('[TextsController] Firestore error — using defaults:', err.message);
      }
    }

    // Return built-in defaults
    res.json({ success: true, data: DEFAULT_TEXTS[lang], _fallback: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTexts };
