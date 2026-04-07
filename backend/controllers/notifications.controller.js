'use strict';
/**
 * notifications.controller.js
 * GET /notifications  →  returns push notification config from Firestore
 */

const { db } = require('../services/firebase.service');

const DEFAULT_NOTIFICATIONS = {
  id: 'daily_reminder',
  active: true,
  time: '20:00',
  messages: [
    '¡No olvides tu desafío de hoy! 🧬',
    '¡Las células te esperan! Juega ahora 🔬',
    'Tu desafío diario está listo. ¿Podrás superarte? 🏆'
  ],
  conditions: {
    onlyIfNotCompleted: true
  }
};

async function get(req, res, next) {
  try {
    if (db) {
      try {
        const doc = await db.collection('notifications').doc('daily_reminder').get();
        if (doc.exists) {
          return res.json({ success: true, data: doc.data() });
        }
      } catch (err) {
        console.warn('[NotificationsController] Firestore error:', err.message);
      }
    }

    res.json({ success: true, data: DEFAULT_NOTIFICATIONS, _fallback: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { get };
