import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MASSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uid1 = "By9QeThgt1NcVh6m1kcR8rpWkcb2";
const uid2 = "VdQT5cV1BcessVln5VEiPO5Fuie2";

async function run() {
  const u1Ref = doc(db, "users", uid1);
  const u2Ref = doc(db, "users", uid2);
  const u1Snap = await getDoc(u1Ref);
  const u2Snap = await getDoc(u2Ref);
  
  if (u1Snap.exists()) {
    console.log(`User 1 (${uid1}):`, u1Snap.data());
  } else {
    console.log(`User 1 (${uid1}) not found in users collection.`);
  }
  
  if (u2Snap.exists()) {
    console.log(`User 2 (${uid2}):`, u2Snap.data());
  } else {
    console.log(`User 2 (${uid2}) not found in users collection.`);
  }
}

run().catch(console.error);
