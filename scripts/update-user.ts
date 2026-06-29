import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
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

async function run() {
  const userRef = doc(db, "users", "JgXQBJrpxbRhVQLlDwpyISPJuA62");
  const updates = {
    userType: "politician",
    politicalParty: "未来かがやき党",
    pledge: "戸塚区の安全・安心な街づくり、防災体制の強化と地域コミュニティの活性化に全力で取り組みます。すべての世代が健やかに安心して暮らせる街「横浜」の実現を目指し、皆様の声に寄り添い活動します。",
    updatedAt: new Date().toISOString()
  };
  await updateDoc(userRef, updates);
  console.log("Success! Updated JgXQBJrpxbRhVQLlDwpyISPJuA62 to a politician sample account.");
}

run().catch(console.error);
