import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * ユーザーの種別を表すリテラル型です。
 * - 'general': 一般ユーザー (市民)
 * - 'politician': 議員ユーザー
 * - 'shop': 店舗ユーザー
 */
export type UserType = 'general' | 'politician' | 'shop';

/**
 * ユーザープロファイル情報を定義するTypeScriptインターフェースです。
 * Firestoreの `users` コレクションの各ドキュメント構造に対応しています。
 */
export interface UserProfile {
  /** ユーザーのUID (Firebase AuthのUIDと一致します) */
  uid: string;
  /** ユーザーの種別 ('general': 一般ユーザー, 'politician': 議員ユーザー, 'shop': 店舗ユーザー) */
  userType?: UserType;
  /** メールアドレス */
  email: string;
  /** 所属政党名 (議員ユーザー向け、50文字以内) */
  politicalParty?: string;
  /** 掲げる公約や活動方針 (議員ユーザー向け、50文字以上2000文字以内) */
  pledge?: string;
  /** 店舗紹介 (店舗ユーザー向け、50文字以上2000文字以内) */
  shopIntroduction?: string;
  /** 店舗電話番号 (店舗ユーザー向け、ハイフンなし半角数字15桁以内) */
  shopPhoneNumber?: string;
  /** 氏名 (苗字 - 漢字など) */
  lastName?: string;
  /** 氏名 (名前 - 漢字など) */
  firstName?: string;
  /** フリガナ (苗字 - カタカナ) */
  lastNameKana?: string;
  /** フリガナ (名前 - カタカナ) */
  firstNameKana?: string;
  /** ニックネーム (アプリ内で公開される表示名) */
  nickname?: string;
  /** 生年月日 (YYYY-MM-DD 形式の文字列) */
  birthDate?: string;
  /** フルネーム (姓と名を結合した表示用お名前) */
  displayName?: string;
  /** 
   * 現住所情報 (マップ形式でグループ化) 
   */
  address?: {
    /** 郵便番号 (例: "150-0002") */
    postalCode: string;
    /** 都道府県名 (例: "東京都") */
    prefecture: string;
    /** 市区町村・番地 (例: "渋谷区渋谷2-24-12") */
    addressDetail: string;
    /** 建物名・部屋番号 (任意入力) */
    buildingName?: string;
  };
  /**
   * プロフィール画像情報 (マップ形式でグループ化)
   * 切り抜きを行わない場合は null もしくは未設定になります。
   */
  profileImage?: {
    /** Firebase Storageに保存されているオリジナル画像のダウンロードURL */
    url: string;
    /** 
     * クライアント側（CSS）でオリジナル画像を丸型フレーム内に切り抜いて表示するための座標パラメータ
     */
    cropPosition: {
      /** ビューポートに対する画像の横方向オフセット量 (px単位) */
      offsetX: number;
      /** ビューポートに対する画像の縦方向オフセット量 (px単位) */
      offsetY: number;
      /** 切り抜き時のズーム率 (1.0 〜 3.0 の倍率値) */
      zoom: number;
      /** クロップエリア表示時のベースとなる画像の横幅 (px単位) */
      displayW: number;
      /** クロップエリア表示時のベースとなる画像の縦幅 (px単位) */
      displayH: number;
    } | null;
  } | null;
  /** メールアドレス認証が完了しているかどうかのフラグ */
  isVerified?: boolean;
  /** プロフィール詳細登録が完了しているかどうかのフラグ */
  isProfileCompleted?: boolean;
  /** アカウントの新規登録・本登録フローがすべて完了しているかどうかのフラグ */
  isRegistered?: boolean;
  /** ドキュメント作成日時 (ISO 8601形式文字列: YYYY-MM-DDTHH:mm:ss.sssZ) */
  createdAt?: string;
  /** ドキュメント更新日時 (ISO 8601形式文字列: YYYY-MM-DDTHH:mm:ss.sssZ) */
  updatedAt?: string;
}

/**
 * 指定したユーザーID (UID) に対応するユーザープロファイル情報を Firestore から取得します。
 * 
 * @param uid 取得対象のユーザーのUID
 * @returns 該当ドキュメントが存在する場合は `UserProfile` オブジェクト、存在しない場合は `null` を返す Promise
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error("Error getting user profile from Firestore:", err);
    throw err;
  }
}

/**
 * ユーザープロファイル情報を Firestore に新規保存またはマージ保存します。
 * `setDoc` に `{ merge: true }` オプションを指定して実行するため、指定されていない既存のフィールドは維持されます。
 * 
 * @param uid 保存対象のユーザーのUID
 * @param profileData 保存・マージするプロファイルデータ（一部のフィールドだけでも可）
 * @returns 処理完了時に解決される Promise
 */
export async function saveUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, profileData, { merge: true });
  } catch (err) {
    console.error("Error saving user profile to Firestore:", err);
    throw err;
  }
}

/**
 * ユーザープロファイル情報の特定フィールドのみを部分更新します。
 * `updateDoc` を使用して、指定されたプロパティのみを直接更新します。
 * 
 * @param uid 更新対象のユーザーのUID
 * @param profileData 更新するプロファイルデータ
 * @returns 処理完了時に解決される Promise
 */
export async function updateUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, profileData as any);
  } catch (err) {
    console.error("Error updating user profile in Firestore:", err);
    throw err;
  }
}
