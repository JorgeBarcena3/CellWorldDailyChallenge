const admin = require('./backend/node_modules/firebase-admin');
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const doc = await db.collection('dailyChallenge').doc('2026-04-06').get();
  console.log('Exists:', doc.exists);
  if (doc.exists) console.log(doc.data());
  process.exit();
}
run();
