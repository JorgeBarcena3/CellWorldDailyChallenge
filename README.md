# CellWorld Daily Challenge

A mobile-first daily cellular automaton game built with Vanilla JS, Node.js/Express, and Firebase.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, Vanilla JS, Canvas API |
| Backend | Node.js, Express |
| Database | Firebase Firestore |
| Auth | Firebase Auth (optional Google login) |
| Push | Firebase Cloud Messaging + Cordova Local Notifications |
| Mobile | Apache Cordova (Android) |

---

## Project Structure

```
CellWorldDailyChallenge/
├── frontend/          ← Static web app (Cordova www/)
│   ├── index.html
│   ├── style.css
│   ├── api.js
│   ├── game.js
│   ├── ui.js
│   ├── tutorial.js
│   ├── notifications.js
│   └── firebase-config.js
├── backend/           ← Node.js API server
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── serviceAccountKey.json  ← (you provide)
│   ├── .env
│   └── package.json
├── config.xml         ← Cordova config
└── README.md
```

---

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Firestore**, **Firebase Auth** (Google provider), and **Cloud Messaging**.
3. Download the **Admin SDK service account key** → save as `backend/serviceAccountKey.json`.
4. Copy your **Firebase web config** → paste into `frontend/firebase-config.js`.

### 2. Firestore Seed Data

Create these collections manually or via the Firebase Emulator:

**`daily_configs/{YYYY-MM-DD}`**
```json
{
  "date": "2026-04-06",
  "rules": { "birth": [3], "survive": [2, 3] },
  "target": 80,
  "difficulty": "medium",
  "seed": 42
}
```

**`texts/es`**
```json
{
  "lang": "es",
  "daily_challenge": {
    "title": "Desafío Diario",
    "objective": "Mantén {{target}} células vivas",
    "play_button": "JUGAR",
    "difficulty_label": "Dificultad"
  },
  "tutorial": {
    "step1": "Toca las celdas para activarlas",
    "step2": "Pulsa Play para iniciar la evolución",
    "step3": "Alcanza el objetivo de células vivas",
    "step4": "Envía tu puntuación al ranking"
  },
  "notifications": {
    "daily_reminder": "¡No olvides tu desafío de hoy! 🧬"
  }
}
```

**`notifications/daily_reminder`**
```json
{
  "id": "daily_reminder",
  "active": true,
  "time": "20:00",
  "messages": ["¡No olvides tu desafío de hoy! 🧬"],
  "conditions": { "onlyIfNotCompleted": true }
}
```

### 3. Backend

```bash
cd backend
cp ../.env.example .env
# Edit .env with your Firebase project ID
npm install
node server.js
```

Server starts on `http://localhost:3000`.

### 4. Frontend (browser)

Open `frontend/index.html` directly in a browser, or serve with:
```bash
cd frontend
npx serve . -p 8080
```

Edit `frontend/index.html` line with `window.CELLWORLD_API` to point at your backend URL.

### 5. Cordova (Android)

```bash
# Install Cordova globally
npm install -g cordova

# Add Android platform
cordova platform add android

# Copy frontend into www/
cp -r frontend/* www/

# Build
cordova build android
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/config` | Today's daily challenge config |
| GET | `/texts?lang=es` | UI text strings |
| GET | `/notifications` | Push notification config |
| GET | `/leaderboard?date=YYYY-MM-DD` | Top 10 scores for a date |
| POST | `/submit-score` | Submit and validate a score |

### POST /submit-score body
```json
{
  "playerId": "uuid-v4",
  "name": "Player",
  "score": 2400,
  "generation": 30,
  "aliveCells": 80,
  "date": "2026-04-06",
  "finalGrid": [[0,1,…],…]
}
```

---

## Environment Variables

See `.env.example` for all variables.

---

## Score Validation Logic

1. `score` ≤ `aliveCells × generation × 1.1` (within 10% tolerance)
2. `generation` ≤ `MAX_GENERATIONS` (default 200)
3. `playerId` must match UUID v4 format
4. Only one score per player per day (upsert: keeps highest)
5. `aliveCells` verified against `finalGrid` snapshot

---

## License

MIT
