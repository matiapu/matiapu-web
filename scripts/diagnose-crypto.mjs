import crypto from 'crypto';

const roomId = "By9QeThgt1NcVh6m1kcR8rpWkcb2_VdQT5cV1BcessVln5VEiPO5Fuie2";
const ivBase64 = "tyCq+/BlKPEv5tXX";
const encryptedBase64 = "tyCq+/BlKPEv5tXXzAJcP2aRyamYm9+TNFmTDDpw7xJq/xsewiKIag==";

// Decode inputs
const iv = Buffer.from(ivBase64, 'base64');
const encrypted = Buffer.from(encryptedBase64, 'base64');

// Extract ciphertext + tag (iOS combined format has nonce at the beginning)
const ciphertextWithTag = encrypted.slice(12);

// Possible salts
const salts = [
  "matiapu_chat_secure_salt_2026",
  "matiapu-d775d", // project ID
  "AIzaSyClR0OsOPgSO4Pp5Kch54ZH_ZfPA2SFpTc", // firebase API key
  "AIzaSyDKNSZKJk1Is62gewqJdvHyzc4T0RAijvU", // maps API key
  "", // empty
];

// Possible formats of rawKeyMaterial
const formats = [
  (roomId, salt) => `${roomId}_${salt}`,
  (roomId, salt) => `${roomId}${salt}`,
  (roomId, salt) => `${salt}_${roomId}`,
  (roomId, salt) => `${salt}${roomId}`,
  (roomId, salt) => `${roomId}`,
  (roomId, salt) => `${salt}`,
];

async function attemptDecryption(keyBuffer) {
  try {
    // Import raw key
    const webKey = await crypto.webcrypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const decrypted = await crypto.webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      webKey,
      ciphertextWithTag
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log("Diagnosing cryptographic key derivation...");
  for (const salt of salts) {
    for (const formatFn of formats) {
      const keyMaterial = formatFn(roomId, salt);
      const encoder = new TextEncoder();
      const rawBytes = encoder.encode(keyMaterial);
      
      // Hash with SHA-256
      const hash = crypto.createHash('sha256').update(rawBytes).digest();
      
      const result = await attemptDecryption(hash);
      if (result !== null) {
        console.log("🎉 SUCCESS!");
        console.log(`  Key Material String: "${keyMaterial}"`);
        console.log(`  Salt used: "${salt}"`);
        console.log(`  Result plaintext: "${result}"`);
        return;
      }
    }
  }
  console.log("No standard combination succeeded.");
}

run();
