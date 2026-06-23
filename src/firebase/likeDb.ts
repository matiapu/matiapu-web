import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  getCountFromServer
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 投稿に対する「いいね」情報を定義するTypeScriptインターフェースです。
 * Firestoreの `likes` コレクションの各ドキュメント構造に対応しています。
 */
export interface Like {
  /** いいねのドキュメントID (形式: `${postId}_${userId}`) */
  id?: string;
  /** 対象の投稿ID */
  post_id: string;
  /** いいねしたユーザーのID (UID) */
  user_id: string;
  /** いいねした日時 */
  created_at: Timestamp;
}

/**
 * 特定の投稿に対して、ユーザーがいいねを登録します。
 * 重複登録を防ぐため、ドキュメントIDは `${postId}_${userId}` の形式で作成します。
 * 
 * @param postId いいね対象の投稿ID
 * @param userId いいねするユーザーのUID
 * @returns 処理完了時に解決される Promise
 */
export async function likePost(postId: string, userId: string): Promise<void> {
  try {
    const docId = `${postId}_${userId}`;
    const docRef = doc(db, "likes", docId);
    
    await setDoc(docRef, {
      post_id: postId,
      user_id: userId,
      created_at: Timestamp.now()
    });
  } catch (err) {
    console.error("Error liking post in Firestore:", err);
    throw err;
  }
}

/**
 * 特定の投稿に対する、ユーザーのいいねを解除（レコード削除）します。
 * 
 * @param postId いいね解除対象 of 投稿ID
 * @param userId いいね解除するユーザーのUID
 * @returns 処理完了時に解決される Promise
 */
export async function unlikePost(postId: string, userId: string): Promise<void> {
  try {
    const docId = `${postId}_${userId}`;
    const docRef = doc(db, "likes", docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error unliking post in Firestore:", err);
    throw err;
  }
}

/**
 * 指定したユーザーが、特定の投稿にいいねをしているかを判定します。
 * 
 * @param postId 判定対象の投稿ID
 * @param userId 判定対象のユーザーのUID
 * @returns いいねしている場合は `true`、そうでない場合は `false` を返す Promise
 */
export async function hasLikedPost(postId: string, userId: string): Promise<boolean> {
  try {
    const docId = `${postId}_${userId}`;
    const docRef = doc(db, "likes", docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (err) {
    console.error("Error checking if user liked post in Firestore:", err);
    throw err;
  }
}

/**
 * 特定の投稿に対するいいねの総数を、`likes` テーブルのレコード数から取得します。
 * getCountFromServer を使用することで、ドキュメントの読み込み数を増やすことなく高速かつ安価に取得できます。
 * 
 * @param postId 対象の投稿ID
 * @returns いいねの総数を返す Promise
 */
export async function getLikeCountForPost(postId: string): Promise<number> {
  try {
    const likesCollectionRef = collection(db, "likes");
    const q = query(likesCollectionRef, where("post_id", "==", postId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    console.error("Error getting like count from Firestore:", err);
    throw err;
  }
}

/**
 * 特定のユーザーがいいねした投稿IDの一覧を取得します。
 * 
 * @param userId 対象ユーザーのUID
 * @returns いいねした投稿IDの配列を返す Promise
 */
export async function getLikedPostIdsForUser(userId: string): Promise<string[]> {
  try {
    const likesCollectionRef = collection(db, "likes");
    const q = query(
      likesCollectionRef,
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const postIds: string[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.post_id) {
        postIds.push(data.post_id);
      }
    });
    return postIds;
  } catch (err) {
    console.error("Error getting liked posts for user from Firestore:", err);
    throw err;
  }
}
