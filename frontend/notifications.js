/**
 * notifications.js — CellWorld Daily Challenge
 * Evaluates notification conditions and schedules notifications.
 *
 * Works in two modes:
 * 1. Cordova (Android)  — uses cordova-plugin-local-notification
 * 2. Browser            — uses the Web Notifications API as fallback
 */

const COMPLETED_KEY = 'cw_lastCompletedDate';

// ─── Condition evaluation ─────────────────────────────────────────────────────

/**
 * Check if the user has already completed today's challenge.
 */
function hasCompletedToday() {
  const today     = new Date().toISOString().slice(0, 10);
  const last      = localStorage.getItem(COMPLETED_KEY);
  return last === today;
}

/**
 * Evaluate a notification's conditions and return true if it should fire.
 * @param {{ conditions: { onlyIfNotCompleted?: boolean } }} notif
 */
function shouldFire(notif) {
  const cond = notif.conditions || {};
  if (cond.onlyIfNotCompleted && hasCompletedToday()) return false;
  return notif.active !== false;
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

/**
 * Parse a "HH:MM" string into a Date object for today.
 */
function parseTimeToday(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Schedule a Cordova local notification.
 */
function scheduleCordova(notif, message) {
  if (!window.cordova || !window.cordova.plugins || !window.cordova.plugins.notification) {
    return false;
  }

  const fireTime = parseTimeToday(notif.time || '20:00');

  // If the time has already passed today, schedule for tomorrow
  if (fireTime < new Date()) {
    fireTime.setDate(fireTime.getDate() + 1);
  }

  window.cordova.plugins.notification.local.schedule({
    id:       1,
    title:    'CellWorld Daily 🧬',
    text:     message,
    trigger:  { at: fireTime },
    sound:    'res://platform_default',
    icon:     'res://ic_launcher',
    smallIcon:'res://ic_notification'
  });

  return true;
}

/**
 * Schedule a browser Web Notification (desktop/PWA fallback).
 */
function scheduleBrowser(notif, message) {
  if (!('Notification' in window)) return false;

  const fireTime    = parseTimeToday(notif.time || '20:00');
  const now         = Date.now();
  const delay       = fireTime.getTime() - now;

  if (delay < 0) return false;   // already passed — skip for today

  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') return;

    setTimeout(() => {
      if (hasCompletedToday()) return;   // re-check at fire time
      new Notification('CellWorld Daily 🧬', {
        body: message,
        icon: './icons/icon-192.png',
        badge: './icons/badge-72.png'
      });
    }, delay);
  });

  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise notifications from the backend config.
 * Call this once after the app loads (after loading notif config from API).
 *
 * @param {object} notifConfig  — result from api.getNotifications()
 */
export function initNotifications(notifConfig) {
  if (!notifConfig || !shouldFire(notifConfig)) {
    console.log('[Notifications] Conditions not met — not scheduling.');
    return;
  }

  const messages = notifConfig.messages || ['¡No olvides tu desafío! 🧬'];
  const message  = messages[Math.floor(Math.random() * messages.length)];

  // Try Cordova first, then browser API
  const done = scheduleCordova(notifConfig, message) || scheduleBrowser(notifConfig, message);

  if (done) {
    console.log('[Notifications] Scheduled:', message);
  } else {
    console.log('[Notifications] No scheduling API available.');
  }
}

/**
 * Mark today's challenge as completed.
 * Call this after a successful score submission.
 */
export function markChallengeCompleted() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(COMPLETED_KEY, today);

  // Cancel any pending local notifications via Cordova
  if (window.cordova?.plugins?.notification?.local) {
    window.cordova.plugins.notification.local.cancel(1);
  }
}

/**
 * Returns true if today's challenge has been completed.
 */
export function isTodayCompleted() {
  return hasCompletedToday();
}
