'use strict';
/**
 * firebase.service.js
 * Initialises the Firebase Admin SDK once and exports shared instances.
 * All other services import `db` and `auth` from here.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db;
let auth;
let messaging;

function initFirebase() {
  if (admin.apps.length > 0) {
    // Already initialised — return existing instance
    db = admin.firestore();
    auth = admin.auth();
    messaging = admin.messaging();
    return;
  }

  const credPath = path.resolve(
    __dirname,
    '..',
    process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json'
  );

  let credential;

  if (fs.existsSync(credPath)) {
    try {
      const serviceAccount = require(credPath);
      // Check if it's a real service account (not our placeholder)
      if (serviceAccount.type === 'service_account') {
        credential = admin.credential.cert(serviceAccount);
      }
    } catch (e) {
      console.warn('[Firebase] Could not load serviceAccountKey.json:', e.message);
    }
  }

  if (!credential) {
    // Fall back to Application Default Credentials (e.g. Google Cloud environment)
    // or use an emulator
    console.warn('[Firebase] No service account found — using Application Default Credentials.');
    console.warn('[Firebase] Set GOOGLE_APPLICATION_CREDENTIALS or provide serviceAccountKey.json');
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID
  });

  db = admin.firestore();
  // Set shorter timeout so a missing/unresponsive Firestore doesn't hang requests
  db.settings({ timeout: 5000 });
  auth = admin.auth();
  messaging = admin.messaging();

  console.log('[Firebase] Initialised successfully.');
}

// Initialise immediately on require
try {
  initFirebase();
} catch (err) {
  console.error('[Firebase] Init failed:', err.message);
  console.warn('[Firebase] Starting in offline/mock mode — scores will not persist.');
}

module.exports = {
  get db() { return db; },
  get auth() { return auth; },
  get messaging() { return messaging; },
  admin
};
