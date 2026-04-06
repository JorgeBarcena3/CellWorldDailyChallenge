/**
 * firebase-config.js — CellWorld Daily Challenge
 * Firebase Web SDK initialisation for optional client-side features:
 * - Google Sign-In (Firebase Auth)
 * - Firebase Cloud Messaging (optional push)
 *
 * NOTE: Score submission always goes through the Node.js backend — never directly to Firestore.
 */

// ─── TODO: Replace with your Firebase project config ──────────────────────────
// Found in: Firebase Console → Project Settings → Your apps → Web app → Config
const firebaseConfig = {
  apiKey: "AIzaSyCj41L9141k3y3zCKkq8lcb7Cxm-V78g0s",
  authDomain: "cellworlddailychallenge.firebaseapp.com",
  projectId: "cellworlddailychallenge",
  storageBucket: "cellworlddailychallenge.firebasestorage.app",
  messagingSenderId: "155776463836",
  appId: "1:155776463836:web:ebd7002ae7e17cca8d5519",
  measurementId: "G-JG4SZDJLGZ"
};
// ─────────────────────────────────────────────────────────────────────────────

let _app      = null;
let _auth     = null;
let _messaging = null;

/**
 * Initialise Firebase SDK (called lazily so it doesn't block app boot).
 * Safe to call multiple times — initialises only once.
 */
export async function initFirebase() {
  if (_app) return { app: _app, auth: _auth, messaging: _messaging };

  // Only load Firebase SDK if the config looks real
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.warn('[Firebase Client] Config not set — Google Auth disabled.');
    return { app: null, auth: null, messaging: null };
  }

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js');

    _app  = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    const analytics = getAnalytics(_app);

    console.log('[Firebase Client] Initialised (incl. Analytics).');
    return { app: _app, auth: _auth, analytics, GoogleAuthProvider, signInWithPopup };
  } catch (err) {
    console.error('[Firebase Client] Init failed:', err.message);
    return { app: null, auth: null, messaging: null };
  }
}

/**
 * Attempt Google Sign-In popup.
 * Returns the user object (uid, displayName, email) or null on failure.
 */
export async function signInWithGoogle() {
  const { auth, GoogleAuthProvider, signInWithPopup } = await initFirebase();
  if (!auth) return null;

  try {
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider);
    return {
      uid:         result.user.uid,
      displayName: result.user.displayName || 'Player',
      email:       result.user.email        || null
    };
  } catch (err) {
    console.error('[Firebase Auth] Sign-in failed:', err.message);
    return null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { auth } = await initFirebase();
  if (auth) await auth.signOut();
}

/**
 * Get the current Firebase user (null if not signed in or not initialised).
 */
export async function getCurrentUser() {
  const { auth } = await initFirebase();
  return auth ? auth.currentUser : null;
}
