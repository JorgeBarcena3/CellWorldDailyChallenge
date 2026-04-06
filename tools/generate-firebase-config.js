#!/usr/bin/env node
/**
 * generate-firebase-config.js
 * Generates CellWorld Daily Challenge configurations for the next 30 days
 * and uploads them to Firestore (collection: "dailyChallenge").
 *
 * Usage:
 *   # Dry-run — writes seed.json only
 *   node tools/generate-firebase-config.js --dry-run
 *
 *   # Upload to Firestore
 *   node tools/generate-firebase-config.js
 */
'use strict';

const path = require('path');

// Point to backend's node_modules so we can run from any directory
const BACKEND_DIR = path.join(__dirname, '../backend');
require(path.join(BACKEND_DIR, 'node_modules', 'dotenv')).config({ path: path.join(BACKEND_DIR, '.env') });

const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
// Grid size and initial cells are now determined per map
const MAX_GENERATIONS = 120;
const DAYS_AHEAD      = 30;
const DRY_RUN         = process.argv.includes('--dry-run');
const OUTPUT_FILE     = path.join(__dirname, 'firebase-seed.json');

// ── Rulesets (B/S notation) ───────────────────────────────────────────────────
// Each difficulty tier gets different rule variants for variety
const RULESETS = {
  easy: [
    { birth: [3],    survive: [2, 3] },          // Conway (classic)
    { birth: [3, 6], survive: [2, 3] },          // HighLife
    { birth: [3],    survive: [1, 2, 3, 4] },    // Stable-ish
  ],
  medium: [
    { birth: [3, 6], survive: [2, 3, 6] },       // HighLife variant
    { birth: [2, 3], survive: [2, 3] },           // Seeds-ish
    { birth: [3, 7], survive: [2, 3, 4] },        // Custom
    { birth: [3],    survive: [2, 3, 8] },        // Variant
  ],
  hard: [
    { birth: [3, 6, 8], survive: [2, 4, 5] },    // Complex
    { birth: [3, 5],    survive: [2, 3, 4, 5] }, // Aggressive
    { birth: [2, 3, 8], survive: [3, 4, 5] },    // Chaotic-ish
  ],
};

// Difficulty cycle: 2 easy, 3 medium, 2 hard per week (pattern repeats)
const DIFFICULTY_PATTERN = [
  'easy', 'medium', 'medium', 'hard', 'medium', 'easy', 'hard'
];

// Target cells (alive goal) per difficulty
const TARGET_RANGE = {
  easy:   { min: 20, max: 35 },
  medium: { min: 40, max: 65 },
  hard:   { min: 70, max: 100 },
};

// Grid size bounds per difficulty
const GRID_SIZE_RANGE = {
  easy:   { min: 8, max: 10 },
  medium: { min: 10, max: 13 },
  hard:   { min: 12, max: 16 },
};

// Initial cells allowed to be placed without ads
const INITIAL_CELLS_RANGE = {
  easy:   { min: 10, max: 15 },
  medium: { min: 12, max: 18 },
  hard:   { min: 15, max: 20 },
};

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────────
function createRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Config generator ──────────────────────────────────────────────────────────
function generateDayConfig(date, dayIndex) {
  // Stable seed from the date string so runs are idempotent
  const dateSeed = date.replace(/-/g, '') | 0;
  const rng = createRNG(dateSeed + dayIndex * 1337);

  const difficulty = DIFFICULTY_PATTERN[dayIndex % DIFFICULTY_PATTERN.length];
  const ruleset      = pickRandom(rng, RULESETS[difficulty]);
  const range        = TARGET_RANGE[difficulty];
  const target       = randInt(rng, range.min, range.max);
  const gridSize     = randInt(rng, GRID_SIZE_RANGE[difficulty].min, GRID_SIZE_RANGE[difficulty].max);
  const initialCells = randInt(rng, INITIAL_CELLS_RANGE[difficulty].min, INITIAL_CELLS_RANGE[difficulty].max);
  const seed         = randInt(rng, 1000, 999999);

  return {
    date,
    gridSize,
    initialCells,
    maxGenerations: MAX_GENERATIONS,
    difficulty,
    rules:          ruleset,
    target,
    seed,
    createdAt:      new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const start  = today();
  const configs = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(start, i);
    configs.push(generateDayConfig(date, i));
  }

  // Always write the JSON seed file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(configs, null, 2), 'utf8');
  console.log(`✅ Wrote ${configs.length} configs to ${OUTPUT_FILE}`);

  if (DRY_RUN) {
    console.log('\n📋 Dry-run preview (first 3 days):');
    configs.slice(0, 3).forEach(c => console.log(JSON.stringify(c, null, 2)));
    console.log('\nRun without --dry-run to upload to Firestore.');
    return;
  }

  // Upload to Firestore
  const admin = require(path.join(__dirname, '../backend/node_modules/firebase-admin'));
  const serviceAccount = require(path.join(__dirname, '../backend/serviceAccountKey.json'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const batch = db.batch();
  const COLLECTION = 'dailyChallenge';

  configs.forEach(cfg => {
    const ref = db.collection(COLLECTION).doc(cfg.date);
    batch.set(ref, cfg, { merge: true });
  });

  await batch.commit();
  console.log(`🔥 Uploaded ${configs.length} documents to Firestore collection "${COLLECTION}".`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
