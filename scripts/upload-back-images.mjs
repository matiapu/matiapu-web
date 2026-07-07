import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
const storage = getStorage(app);

const imagesToUpload = [
  'chat_backimage.avif',
  'morning.avif',
  'noon.avif',
  'night.avif',
  'night-2.avif'
];

const publicBackImageDir = path.resolve(__dirname, '../public/back_image');
const urls = {};

async function uploadAll() {
  console.log('Starting upload of background images to Firebase Storage...');
  for (const filename of imagesToUpload) {
    const filePath = path.join(publicBackImageDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Uploading ${filename}...`);
    const fileBuffer = fs.readFileSync(filePath);
    const storageRef = ref(storage, `back_image/${filename}`);
    
    // Upload bytes
    const uploadResult = await uploadBytes(storageRef, fileBuffer, {
      contentType: 'image/avif'
    });
    
    // Get download URL
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    console.log(`Uploaded ${filename} successfully. Download URL: ${downloadUrl}`);
    
    // Map filename to URL key
    const key = filename.replace('.avif', '');
    urls[key] = downloadUrl;
  }

  // Write URLs to src/firebase/backgroundUrls.json
  const outputPath = path.resolve(__dirname, '../src/firebase/backgroundUrls.json');
  fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2), 'utf8');
  console.log(`Wrote background URLs to ${outputPath}`);
}

uploadAll().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
