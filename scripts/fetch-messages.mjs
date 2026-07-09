import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

const roomId = "By9QeThgt1NcVh6m1kcR8rpWkcb2_VdQT5cV1BcessVln5VEiPO5Fuie2";

async function run() {
  const messagesCollectionRef = collection(db, "chat_rooms", roomId, "messages");
  const querySnapshot = await getDocs(messagesCollectionRef);
  
  console.log(`--- Messages in room ${roomId} ---`);
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    console.log(`Doc ID: ${docSnap.id}`);
    console.log(`  sender_id: ${data.sender_id}`);
    console.log(`  recipient_id: ${data.recipient_id}`);
    console.log(`  iv (base64): ${data.iv}`);
    console.log(`  iv (bytes length): ${data.iv ? Buffer.from(data.iv, 'base64').length : 0}`);
    console.log(`  encrypted_content (base64): ${data.encrypted_content}`);
    console.log(`  encrypted_content (bytes length): ${data.encrypted_content ? Buffer.from(data.encrypted_content, 'base64').length : 0}`);
    console.log(`  read: ${data.read}`);
    console.log(`  created_at: ${data.created_at?.toDate()}`);
    console.log('----------------------------------');
  });
}

run().catch(err => {
  console.error('Fetch failed:', err);
  process.exit(1);
});
