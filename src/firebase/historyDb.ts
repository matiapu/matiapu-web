import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 閲覧履歴のインターフェース
 */
export interface ViewHistory {
  id?: string;
  post_id: string;
  user_id: string;
  viewed_at: Timestamp;
}

/**
 * 閲覧履歴を保存します。
 * 重複を防ぐため、ドキュメントIDを `${postId}_${userId}` とし、
 * viewed_at を最新のタイムスタンプで上書きします。
 */
export async function recordViewHistory(postId: string, userId: string): Promise<void> {
  if (!postId || !userId) return;
  try {
    const docId = `${postId}_${userId}`;
    const docRef = doc(db, "view_histories", docId);
    
    await setDoc(docRef, {
      post_id: postId,
      user_id: userId,
      viewed_at: Timestamp.now()
    });
  } catch (err) {
    console.error("Error recording view history in Firestore:", err);
    throw err;
  }
}

/**
 * 特定のユーザーの閲覧履歴を取得します。
 */
export async function getViewHistoryForUser(userId: string): Promise<ViewHistory[]> {
  if (!userId) return [];
  try {
    const historyCollectionRef = collection(db, "view_histories");
    const q = query(historyCollectionRef, where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const histories: ViewHistory[] = [];
    querySnapshot.forEach((docSnap) => {
      histories.push({
        ...docSnap.data(),
        id: docSnap.id
      } as ViewHistory);
    });

    return histories;
  } catch (err) {
    console.error("Error getting view history from Firestore:", err);
    throw err;
  }
}
