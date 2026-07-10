import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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

const userIds = [
  "VdQT5cV1BcessVln5VEiPO5Fuie2",
  "By9QeThgt1NcVh6m1kcR8rpWkcb2",
  "sGctGVR7gLTJDYym1G2ptVi4bbH3",
  "to2SjUJbz8XT1ICixCpJVjfIZNg1",
  "JgXQBJrpxbRhVQLlDwpyISPJuA62"
];

async function createChatRooms() {
  console.log("Starting chat room creation between all specified users...");
  let createdCount = 0;
  let skippedCount = 0;

  // Generate all pairs
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const uid1 = userIds[i];
      const uid2 = userIds[j];
      
      const sortedUids = [uid1, uid2].sort();
      const roomId = sortedUids.join("_");
      const roomRef = doc(db, "chat_rooms", roomId);
      
      try {
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          await setDoc(roomRef, {
            user_ids: sortedUids,
            created_at: Timestamp.now(),
            last_message_at: Timestamp.now(),
            last_message_text: "",
            last_message_iv: ""
          });
          console.log(`Created chat room: ${roomId}`);
          createdCount++;
        } else {
          console.log(`Chat room already exists: ${roomId}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Failed to handle chat room for ${roomId}:`, error);
      }
    }
  }

  console.log(`Done! Created: ${createdCount}, Skipped/Exists: ${skippedCount}`);
}

createChatRooms().catch(console.error);
