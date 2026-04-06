cd /home/adminLegacy/www/CellWorldDailyChallenge/backend

# 1. Create .env from template only if it doesn't exist
if [ ! -f .env ]; then
  cp ../.env.example .env
fi

# 2. Install dependencies
npm install

# 3. Start with pm2 (auto-restarts on crash, survives logout)
pm2 start server.js --name cellworld-api

# 4. Save so it restarts on reboot
pm2 save
