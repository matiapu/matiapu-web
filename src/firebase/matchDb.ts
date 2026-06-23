import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { getOrCreateChatRoom, sendSystemNotification } from "./chatDb";

/**
 * 議員と一般ユーザーのマッチング情報を定義するTypeScriptインターフェースです。
 * Firestoreの `matches` コレクションに対応しています。
 */
export interface Match {
  /** マッチングID (形式: `user_uid_politician_uid`) */
  id?: string;
  /** 一般ユーザーのUID */
  user_uid: string;
  /** 議員のUID */
  politician_uid: string;
  /** 一般ユーザーのアクション ('like' | 'bad' | 'none') */
  user_action: "like" | "bad" | "none";
  /** 議員のアクション ('like' | 'bad' | 'none') */
  politician_action: "like" | "bad" | "none";
  /** マッチングステータス ('pending' | 'matched') */
  status: "pending" | "matched";
  /** マッチング成立日時 (両者いいね時のみ設定) */
  matched_at?: Timestamp;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at: Timestamp;
}

/**
 * 汎用のいいねアクション処理です。
 * 双方のアクションが 'like' になった場合はステータスを 'matched' にし、チャットルームを初期化してシステム通知を送信します。
 */
async function processLike(
  userUid: string,
  politicianUid: string,
  byRole: "user" | "politician"
): Promise<{ status: "pending" | "matched"; roomId?: string }> {
  try {
    const matchId = `${userUid}_${politicianUid}`;
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    const now = Timestamp.now();

    if (!matchSnap.exists()) {
      // 新規マッチドキュメントの作成
      const newMatch: Match = {
        user_uid: userUid,
        politician_uid: politicianUid,
        user_action: byRole === "user" ? "like" : "none",
        politician_action: byRole === "politician" ? "like" : "none",
        status: "pending",
        created_at: now,
        updated_at: now
      };
      await setDoc(matchRef, newMatch);
      return { status: "pending" };
    } else {
      // 既存ドキュメントの更新
      const data = matchSnap.data() as Match;
      
      const updatedData: Partial<Match> = {
        updated_at: now
      };

      if (byRole === "user") {
        updatedData.user_action = "like";
      } else {
        updatedData.politician_action = "like";
      }

      const userAction = updatedData.user_action || data.user_action;
      const politicianAction = updatedData.politician_action || data.politician_action;

      if (userAction === "like" && politicianAction === "like") {
        // 双方がいいねを押したためマッチング成立
        updatedData.status = "matched";
        updatedData.matched_at = now;
        await setDoc(matchRef, updatedData, { merge: true });

        // チャットルームの自動作成
        const roomId = await getOrCreateChatRoom(userUid, politicianUid);

        // マッチング成立のシステム通知をチャットへ送信
        await sendSystemNotification(roomId, "マッチングが成立しました！チャットを開始できます。");

        return { status: "matched", roomId };
      } else {
        await setDoc(matchRef, updatedData, { merge: true });
        return { status: "pending" };
      }
    }
  } catch (err) {
    console.error(`Error processing like by ${byRole} in Firestore:`, err);
    throw err;
  }
}

/**
 * 汎用のBADアクション処理です。
 * 片方が「BAD」を押した場合はマッチング不成立となり、ドキュメントを即座に消去（物理削除）します。
 */
async function processBad(userUid: string, politicianUid: string): Promise<void> {
  try {
    const matchId = `${userUid}_${politicianUid}`;
    const matchRef = doc(db, "matches", matchId);
    await deleteDoc(matchRef);
  } catch (err) {
    console.error("Error processing bad action in Firestore:", err);
    throw err;
  }
}

/**
 * 一般ユーザーが議員に対して「いいね」を押した時の処理です。
 * 
 * @param userUid 一般ユーザーのUID
 * @param politicianUid 議員のUID
 * @returns マッチング結果のステータスと、成立した場合はチャットルームID
 */
export async function handleUserLike(
  userUid: string,
  politicianUid: string
): Promise<{ status: "pending" | "matched"; roomId?: string }> {
  return processLike(userUid, politicianUid, "user");
}

/**
 * 議員が一般ユーザーに対して「いいね」を押した時の処理です。
 * 
 * @param politicianUid 議員のUID
 * @param userUid 一般ユーザーのUID
 * @returns マッチング結果のステータスと、成立した場合はチャットルームID
 */
export async function handlePoliticianLike(
  politicianUid: string,
  userUid: string
): Promise<{ status: "pending" | "matched"; roomId?: string }> {
  return processLike(userUid, politicianUid, "politician");
}

/**
 * 一般ユーザーが議員に対して「BAD」を押した時の処理です。
 * マッチングドキュメントを物理削除します。
 * 
 * @param userUid 一般ユーザーのUID
 * @param politicianUid 議員のUID
 */
export async function handleUserBad(userUid: string, politicianUid: string): Promise<void> {
  return processBad(userUid, politicianUid);
}

/**
 * 議員が一般ユーザーに対して「BAD」を押した時の処理です。
 * マッチングドキュメントを物理削除します。
 * 
 * @param politicianUid 議員のUID
 * @param userUid 一般ユーザーのUID
 */
export async function handlePoliticianBad(politicianUid: string, userUid: string): Promise<void> {
  return processBad(userUid, politicianUid);
}

/**
 * 一般ユーザーに関連するマッチング一覧を取得します。
 * 
 * @param userUid 一般ユーザーのUID
 * @param status 特定のステータスでフィルタリングしたい場合に指定
 */
export async function getMatchesForUser(
  userUid: string,
  status?: "pending" | "matched"
): Promise<Match[]> {
  try {
    const matchesCollectionRef = collection(db, "matches");
    const constraints = [where("user_uid", "==", userUid)];
    
    if (status) {
      constraints.push(where("status", "==", status));
    }
    
    const q = query(matchesCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    
    querySnapshot.forEach((docSnap) => {
      matches.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Match);
    });
    
    return matches;
  } catch (err) {
    console.error("Error getting matches for user from Firestore:", err);
    throw err;
  }
}

/**
 * 議員に関連するマッチング一覧を取得します。
 * 
 * @param politicianUid 議員のUID
 * @param status 特定のステータスでフィルタリングしたい場合に指定
 */
export async function getMatchesForPolitician(
  politicianUid: string,
  status?: "pending" | "matched"
): Promise<Match[]> {
  try {
    const matchesCollectionRef = collection(db, "matches");
    const constraints = [where("politician_uid", "==", politicianUid)];
    
    if (status) {
      constraints.push(where("status", "==", status));
    }
    
    const q = query(matchesCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    
    querySnapshot.forEach((docSnap) => {
      matches.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Match);
    });
    
    return matches;
  } catch (err) {
    console.error("Error getting matches for politician from Firestore:", err);
    throw err;
  }
}
