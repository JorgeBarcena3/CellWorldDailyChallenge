Create a complete mobile-first game project called "CellWorld Daily Challenge" with a hybrid architecture using Firebase + Node.js backend.
In path: /home/adminLegacy/www/CellWorldDailyChallenge
========================
🧠 CORE CONCEPT
========================

- A daily challenge game based on a cellular automaton (similar to Conway’s Game of Life).
- Each day has a unique configuration (rules, difficulty, target).
- All users play the same daily challenge.
- Users compete in a daily leaderboard.

========================
🏗️ ARCHITECTURE
========================

Frontend:
- Vanilla JavaScript
- HTML + CSS
- Canvas for rendering
- Mobile-first design (single screen portrait)
- Compatible with Cordova (Android)

Backend:
- Node.js + Express (main API)
- Firebase (support services)

Firebase usage:
- Firestore (configs, texts, notifications)
- Firebase Auth (optional Google login)
- Firebase Cloud Messaging (push notifications)

Node.js responsibilities:
- Score validation
- Leaderboard aggregation
- Anti-cheat logic
- API layer between frontend and Firebase

========================
📱 APP FLOW
========================

App Start
→ Splash
→ Load config + texts + notifications (via Node API)
→ Daily Challenge Screen
→ Gameplay (tutorial if first time)
→ Result Screen
→ Submit score (Node API)
→ Leaderboard (Node API)
→ Back to Daily Challenge

========================
📅 DAILY CHALLENGE SCREEN
========================

Include:
- Current date
- Animated preview of automaton
- Objective
- Rules (birth/survive)
- Difficulty
- Top 3 leaderboard
- PLAY button

========================
🎮 GAMEPLAY
========================

- Grid: 40x40
- Cells alive/dead
- Tap to toggle cells
- Automatic evolution loop

Implement:
nextGeneration(grid, rules)

Rules loaded dynamically from backend:
rules.birth = [3]
rules.survive = [2,3]

========================
🧠 GAME STATE
========================

GameState = {
  grid,
  generation,
  running,
  config,
  playerId
}

========================
🗄️ DATA ARCHITECTURE
========================

Firestore collections:

1. daily_configs
{
  date: "YYYY-MM-DD",
  rules: { birth: [3], survive: [2,3] },
  target: 80,
  difficulty: "medium",
  seed: number
}

2. texts
{
  lang: "es",
  daily_challenge: {...},
  notifications: {...},
  tutorial: {...}
}

3. notifications
{
  id: "daily_reminder",
  active: true,
  time: "20:00",
  messages: [...],
  conditions: {
    onlyIfNotCompleted: true
  }
}

Node.js database (can also use Firestore or MongoDB):

4. scores
{
  date,
  playerId,
  name,
  score,
  timestamp
}

========================
🔌 NODE API ENDPOINTS
========================

GET /config
→ returns daily config (from Firestore)

GET /texts
→ returns UI texts

GET /notifications
→ returns notification config

GET /leaderboard
→ returns top scores of the day

POST /submit-score
→ validates and saves score

========================
🧠 SCORE VALIDATION (IMPORTANT)
========================

- Reject impossible scores
- Limit max generations
- Ensure 1 score per player per day
- Only update if new score is higher

========================
👤 USER IDENTITY
========================

- Anonymous ID via localStorage
- Optional Google login via Firebase Auth
- Only store user ID (no personal data)

========================
💾 LOCAL CACHE
========================

Store:
- config
- texts
- playerId
- lastCompletedDate
- tutorialCompleted

========================
🏆 LEADERBOARD LOGIC
========================

- Sorted descending
- Top 10 results
- Top 3 displayed on main screen

========================
🎓 TUTORIAL
========================

- Only first time
- Interactive overlay
- Max 4 steps
- Texts loaded from backend

========================
🔔 NOTIFICATIONS
========================

- Loaded from Firestore via Node API
- Evaluated in frontend
- Triggered via:
  - Local notifications (Cordova)
  - Firebase Cloud Messaging (optional)

Condition:
- Only if user has NOT completed today's challenge

========================
🎨 UI DESIGN
========================

- Dark theme (#0b0f1a)
- Neon glowing cells (green)
- Minimal interface
- Smooth animations

Layout:
[HUD]
[Canvas Grid]
[Controls]

========================
📢 MONETIZATION
========================

- Rewarded Ads:
  - Continue game
  - Boost multiplier

========================
⚠️ REQUIREMENTS
========================

- No personal data storage
- Mobile-first
- Clean modular code
- Separation of concerns (frontend / backend)

========================
📦 OUTPUT REQUIRED
========================

Generate:

FRONTEND:
- index.html
- style.css
- game.js
- ui.js
- tutorial.js
- notifications.js
- api.js (calls Node backend)

BACKEND (Node.js):
- server.js
- routes/
- controllers/
- services/
- firebase integration
- leaderboard logic
- score validation

CONFIG:
- Firebase setup file
- Cordova config

Make the project production-ready, modular, and easy to scale.