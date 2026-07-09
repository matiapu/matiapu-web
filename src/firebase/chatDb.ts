import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  where,
  Timestamp,
  DocumentData,
  updateDoc,
  deleteDoc,
  limit
} from "firebase/firestore";
import { db } from "./firebase";

// 環境変数からソルトを取得（無ければデフォルトのフォールバックを使用）
const SYSTEM_SALT = process.env.NEXT_PUBLIC_CHAT_SALT || "matiapu_chat_secure_salt_2026";

/**
 * チャットルーム情報を定義するTypeScriptインターフェースです。
 * Firestoreの `chat_rooms` コレクションに対応しています。
 */
export interface ChatRoom {
  /** ルームのドキュメントID (形式: `uid1_uid2` アルファベット昇順) */
  id?: string;
  /** 参加ユーザーIDの配列 (サイズ2) */
  user_ids: string[];
  /** ルーム作成日時 */
  created_at: Timestamp;
  /** 最後にメッセージが送信された日時 */
  last_message_at: Timestamp;
  /** 最後のメッセージ本文（暗号化） */
  last_message_text?: string;
  /** 最後のメッセージ用 IV (暗号化用) */
  last_message_iv?: string;
}

/**
 * 暗号化されたメッセージ情報を定義するTypeScriptインターフェースです。
 * Firestoreの `/chat_rooms/{roomId}/messages` サブコレクションに対応しています。
 */
export interface ChatMessage {
  /** メッセージID */
  id?: string;
  /** 送信者UID */
  sender_id: string;
  /** 受信者UID */
  recipient_id: string;
  /** 暗号化されたメッセージ本文 (Base64エンコード) */
  encrypted_content: string;
  /** 暗号化時に使用した初期化ベクトル (Base64エンコード) */
  iv: string;
  /** 送信日時 */
  created_at: Timestamp;
  /** システム通知かどうか */
  is_system?: boolean;
  /** 添付画像のURL */
  image_url?: string | null;
  /** 既読フラグ */
  read?: boolean;
  /** 画像が消去されたかどうかのフラグ */
  image_deleted?: boolean;
  /** 送信取り消しフラグ */
  canceled?: boolean;
}

// 復号化された平文メッセージのインターフェース
export interface DecryptedChatMessage {
  id?: string;
  sender_id: string;
  recipient_id: string;
  content_text: string;
  created_at: Timestamp;
  is_system?: boolean;
  /** 添付画像のURL */
  image_url?: string | null;
  /** 既読フラグ */
  read?: boolean;
  /** 画像が消去されたかどうかのフラグ */
  image_deleted?: boolean;
  /** 送信取り消しフラグ */
  canceled?: boolean;
}

// --- Base64 / ArrayBuffer 変換ヘルパー (ブラウザ・Node.js両対応) ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 環境に応じた Crypto オブジェクトの取得
const getCrypto = (): Crypto => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  // Node.jsの古いバージョン用フォールバック
  const cryptoModule = require("crypto");
  return cryptoModule.webcrypto;
};

/**
 * ユーザーIDとシステムソルトを基準にして、ルーム固有の非公開共通鍵 (CryptoKey) を生成します。
 * 
 * @param roomId チャットルームID
 * @returns AES-GCM の CryptoKey
 */
async function deriveRoomKey(roomId: string): Promise<CryptoKey> {
  const cryptoObj = getCrypto();
  const encoder = new TextEncoder();
  
  // ユーザーIDに基づく一意のキーマテリアルを作成
  const rawKeyMaterial = encoder.encode(roomId + "_" + SYSTEM_SALT);
  
  // PBKDF2の代わりに、一方向性ハッシュ（SHA-256）を用いて32バイトのハッシュを作成し、AES-GCMキーとしてインポート
  const hash = await cryptoObj.subtle.digest("SHA-256", rawKeyMaterial);
  
  return await cryptoObj.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * メッセージ本文を AES-GCM で暗号化します。
 * 
 * @param text 平文メッセージ
 * @param roomId チャットルームID
 */
export async function encryptContent(
  text: string,
  roomId: string
): Promise<{ encrypted_content: string; iv: string }> {
  const cryptoObj = getCrypto();
  const encoder = new TextEncoder();
  const key = await deriveRoomKey(roomId);
  
  // 初期化ベクトル (12バイト) の生成
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  
  const encrypted = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );
  
  return {
    encrypted_content: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

/**
 * 暗号化されたメッセージ本文を復号化します。
 * 
 * @param encryptedBase64 暗号化されたテキスト (Base64)
 * @param ivBase64 初期化ベクトル (Base64)
 * @param roomId チャットルームID
 */
export async function decryptContent(
  encryptedBase64: string,
  ivBase64: string,
  roomId: string
): Promise<string> {
  if (!encryptedBase64 || !ivBase64) {
    throw new Error("Missing encrypted content or initialization vector");
  }

  const cryptoObj = getCrypto();
  const decoder = new TextDecoder();
  const key = await deriveRoomKey(roomId);
  
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  if (iv.byteLength === 0) {
    throw new Error("Invalid initialization vector length");
  }
  
  const decrypted = await cryptoObj.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

/**
 * 2人のユーザー間の一意なチャットルームを取得、存在しない場合は新規作成します。
 * ルームIDは `${uid1}_${uid2}`（アルファベット昇順）で一意に定められます。
 * 
 * @param uid1 ユーザーAのUID
 * @param uid2 ユーザーBのUID
 * @returns チャットルーム情報とIDのオブジェクトを返す Promise
 */
export async function getOrCreateChatRoom(uid1: string, uid2: string): Promise<string> {
  try {
    const sortedUids = [uid1, uid2].sort();
    const roomId = sortedUids.join("_");
    const roomRef = doc(db, "chat_rooms", roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      await setDoc(roomRef, {
        user_ids: sortedUids,
        created_at: Timestamp.now(),
        last_message_at: Timestamp.now(),
        last_message_text: "",
        last_message_iv: ""
      });
    }

    return roomId;
  } catch (err) {
    console.error("Error getting or creating chat room:", err);
    throw err;
  }
}

/**
 * 暗号化チャットメッセージを送信します。
 * メッセージ本文はルームの非公開キーで暗号化されて保存されます。
 * 
 * @param roomId チャットルームID
 * @param senderId 送信者のUID
 * @param recipientId 受信者のUID
 * @param text メッセージ本文
 */
export async function sendChatMessage(
  roomId: string,
  senderId: string,
  recipientId: string,
  text: string,
  imageUrl?: string | null
): Promise<string> {
  try {
    // コンテンツを暗号化
    const { encrypted_content, iv } = await encryptContent(text, roomId);
    
    // サブコレクション `/chat_rooms/{roomId}/messages` にメッセージを保存
    const messagesCollectionRef = collection(db, "chat_rooms", roomId, "messages");
    const docRef = await addDoc(messagesCollectionRef, {
      sender_id: senderId,
      recipient_id: recipientId,
      encrypted_content,
      iv,
      created_at: Timestamp.now(),
      image_url: imageUrl || null,
      read: false
    });

    // 親のチャットルームの最終メッセージ情報を更新
    const roomRef = doc(db, "chat_rooms", roomId);
    // 画像送信の時は最後のメッセージプレビューを "[画像]" にする
    const displayLastText = imageUrl && !text ? "[画像]" : text;
    const { encrypted_content: last_encrypted, iv: last_iv } = await encryptContent(displayLastText, roomId);

    await updateDoc(roomRef, {
      last_message_at: Timestamp.now(),
      last_message_text: last_encrypted,
      last_message_iv: last_iv
    });

    return docRef.id;
  } catch (err) {
    console.error("Error sending chat message in Firestore:", err);
    throw err;
  }
}

/**
 * システム通知メッセージをチャットルームに送信します。
 * 送信者は "system" となり、コンテンツはルームの非公開キーで暗号化されて保存されます。
 * 
 * @param roomId チャットルームID
 * @param text システム通知の本文
 */
export async function sendSystemNotification(
  roomId: string,
  text: string
): Promise<string> {
  try {
    // コンテンツを暗号化
    const { encrypted_content, iv } = await encryptContent(text, roomId);
    
    // サブコレクション `/chat_rooms/{roomId}/messages` にシステムメッセージを保存
    const messagesCollectionRef = collection(db, "chat_rooms", roomId, "messages");
    const docRef = await addDoc(messagesCollectionRef, {
      sender_id: "system",
      recipient_id: "system",
      encrypted_content,
      iv,
      created_at: Timestamp.now(),
      is_system: true
    });

    // 親のチャットルームの最終メッセージ情報を更新
    const roomRef = doc(db, "chat_rooms", roomId);
    await updateDoc(roomRef, {
      last_message_at: Timestamp.now(),
      last_message_text: encrypted_content,
      last_message_iv: iv
    });

    return docRef.id;
  } catch (err) {
    console.error("Error sending system notification in Firestore:", err);
    throw err;
  }
}

/**
 * 指定したチャットルームのメッセージ一覧を取得し、非公開キーで復号化して返します。
 * メッセージは時系列順（昇順）で並べられます。
 * 
 * @param roomId チャットルームID
 * @returns 復号化されたメッセージの配列を返す Promise
 */
export async function getDecryptedMessages(roomId: string): Promise<DecryptedChatMessage[]> {
  try {
    const messagesCollectionRef = collection(db, "chat_rooms", roomId, "messages");
    const q = query(messagesCollectionRef, orderBy("created_at", "asc"));
    const querySnapshot = await getDocs(q);
    
    const decryptedMessages: DecryptedChatMessage[] = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data() as ChatMessage;
      try {
        const plainText = await decryptContent(data.encrypted_content, data.iv, roomId);
        decryptedMessages.push({
          id: docSnap.id,
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          content_text: plainText,
          image_url: data.image_url || null,
          read: data.read || false,
          image_deleted: data.image_deleted || false,
          created_at: data.created_at,
          is_system: data.is_system || false,
          canceled: data.canceled || false
        });
      } catch (decErr) {
        // キー不一致などで復号化に失敗した場合は伏字で表示
        console.warn(`Failed to decrypt message ${docSnap.id}:`, decErr instanceof Error ? decErr.message : String(decErr));
        decryptedMessages.push({
          id: docSnap.id,
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          content_text: "🔒 [復号化に失敗した暗号メッセージ]",
          image_url: data.image_url || null,
          read: data.read || false,
          image_deleted: data.image_deleted || false,
          created_at: data.created_at,
          is_system: data.is_system || false,
          canceled: data.canceled || false
        });
      }
    }

    return decryptedMessages;
  } catch (err) {
    console.error("Error getting or decrypting chat messages:", err);
    throw err;
  }
}

/**
 * チャットメッセージの送信を取り消します。
 * 未読状態であればドキュメントを完全に削除し、
 * 既読状態であれば "送信が取り消されました" というテキストを暗号化して更新し、canceledフラグをtrueにします。
 * 送信取り消し後に親のチャットルームの最終メッセージ情報（last_message）も自動更新します。
 * 
 * @param roomId チャットルームID
 * @param messageId 取り消すメッセージのドキュメントID
 */
export async function cancelChatMessage(
  roomId: string,
  messageId: string
): Promise<void> {
  try {
    const messageRef = doc(db, "chat_rooms", roomId, "messages", messageId);
    const msgSnap = await getDoc(messageRef);
    if (!msgSnap.exists()) {
      throw new Error("Message does not exist");
    }

    const msgData = msgSnap.data() as ChatMessage;
    const isRead = msgData.read === true;

    if (!isRead) {
      // 未読状態：形跡なしで完全に削除
      await deleteDoc(messageRef);
    } else {
      // 既読状態：テキストを更新して canceled フラグを true に
      const cancelText = "送信が取り消されました";
      const { encrypted_content, iv } = await encryptContent(cancelText, roomId);
      await updateDoc(messageRef, {
        encrypted_content,
        iv,
        canceled: true,
        image_url: null,
        image_deleted: true
      });
    }

    // 親チャットルームの最終メッセージ情報を更新
    const roomRef = doc(db, "chat_rooms", roomId);
    
    // 最新のメッセージを1件取得
    const messagesCollectionRef = collection(db, "chat_rooms", roomId, "messages");
    const q = query(messagesCollectionRef, orderBy("created_at", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const latestMsgDoc = querySnapshot.docs[0];
      const latestMsgData = latestMsgDoc.data() as ChatMessage;
      
      await updateDoc(roomRef, {
        last_message_at: latestMsgData.created_at || Timestamp.now(),
        last_message_text: latestMsgData.encrypted_content,
        last_message_iv: latestMsgData.iv
      });
    } else {
      // メッセージが残っていない場合
      await updateDoc(roomRef, {
        last_message_at: Timestamp.now(),
        last_message_text: "",
        last_message_iv: ""
      });
    }
  } catch (err) {
    console.error("Error canceling chat message:", err);
    throw err;
  }
}

/**
 * 特定のユーザーに関連するチャットルーム一覧を取得します。
 * 
 * @param userId ユーザーのUID
 */
export async function getChatRoomsForUser(userId: string): Promise<ChatRoom[]> {
  try {
    const roomsCollectionRef = collection(db, "chat_rooms");
    const q = query(
      roomsCollectionRef,
      where("user_ids", "array-contains", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const rooms: ChatRoom[] = [];
    querySnapshot.forEach((docSnap) => {
      rooms.push({
        id: docSnap.id,
        ...docSnap.data()
      } as ChatRoom);
    });

    // インデックス作成エラーを回避するため、メモリ上で最終メッセージ日時の降順にソートします
    rooms.sort((a, b) => {
      const timeA = a.last_message_at?.toMillis() || 0;
      const timeB = b.last_message_at?.toMillis() || 0;
      return timeB - timeA;
    });

    return rooms;
  } catch (err) {
    console.error("Error getting chat rooms for user:", err);
    throw err;
  }
}
