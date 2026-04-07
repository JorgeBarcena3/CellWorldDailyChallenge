const path = require('path');
// Point to backend's node_modules so we can run from any directory
const BACKEND_DIR = path.join(__dirname, '../backend');
require(path.join(BACKEND_DIR, 'node_modules', 'dotenv')).config({ path: path.join(BACKEND_DIR, '.env') });

const { db } = require('../backend/services/firebase.service');

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
      leaderboard_title: 'Clasificación',
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
      step2_title: 'Generaciones',
      step2_body: 'Tienes un número limitado de generaciones antes de que termine el juego',
      step3_title: 'Alcanza el objetivo',
      step3_body: 'Alcanza {{target}} células vivas para ganar puntos de bonus',
      step4_title: 'Reglas del día',
      step4_body: 'Pulsa INFO para ver cómo nacen y mueren las células hoy',
      step5_title: 'Inicia la evolución',
      step5_body: 'Pulsa PLAY para que la simulación empiece a correr',
      step6_title: 'Envía tu puntuación',
      step6_body: 'Al terminar, pulsa ENVIAR SCORE para el ranking',
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
      generation: 'Generation left',
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
      step2_title: 'Generations',
      step2_body: 'You have a limited number of generations before the game ends',
      step3_title: 'Reach the target',
      step3_body: 'Reach {{target}} alive cells to earn bonus points',
      step4_title: 'Rules of the day',
      step4_body: 'Press INFO to see the birth and survival rules today',
      step5_title: 'Start evolution',
      step5_body: 'Press PLAY to start the simulation loop',
      step6_title: 'Submit your score',
      step6_body: 'When finished, press SUBMIT SCORE to enter the ranking',
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

async function run() {
  console.log('Uploading texts to Firestore...');
  if (!db) {
    console.error('Firebase DB not initialized!');
    process.exit(1);
  }

  for (const lang of Object.keys(DEFAULT_TEXTS)) {
    await db.collection('texts').doc(lang).set(DEFAULT_TEXTS[lang]);
    console.log(`Uploaded language: ${lang}`);
  }
  console.log('Done.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
