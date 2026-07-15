import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  GeoPoint,
  DocumentData
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 避難所情報を定義するTypeScriptインターフェースです。
 * Firestoreの `shelters` コレクションの各ドキュメント構造に対応しています。
 */
export interface Shelter {
  /** 避難所のドキュメントID (Firestoreから取得した際に付与されます) */
  id?: string;
  /** 避難所名 */
  shelter_name: string;
  /** 避難所の位置情報 (緯度・経度) */
  location: GeoPoint;
  /** 収容可能人数 (任意) */
  capacity?: number;
}

/**
 * 避難所を新規作成します。
 * 
 * @param shelterData 避難所データ (ID以外は必須)
 * @returns 作成された避難所のドキュメントIDを返す Promise
 */
export async function createShelter(
  shelterData: Omit<Shelter, 'id'>
): Promise<string> {
  try {
    const sheltersCollectionRef = collection(db, "shelters");
    const docRef = await addDoc(sheltersCollectionRef, shelterData);
    return docRef.id;
  } catch (err) {
    console.error("Error creating shelter in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した避難所IDに対応する避難所情報を Firestore から取得します。
 * 
 * @param shelterId 取得対象の避難所ID
 * @returns 該当ドキュメントが存在する場合は `Shelter` オブジェクト、存在しない場合は `null` を返す Promise
 */
export async function getShelter(shelterId: string): Promise<Shelter | null> {
  try {
    const docRef = doc(db, "shelters", shelterId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id
      } as Shelter;
    }
    return null;
  } catch (err) {
    console.error("Error getting shelter from Firestore:", err);
    throw err;
  }
}

/**
 * 避難所情報の特定フィールドのみを部分更新します。
 * `id` は更新対象から除外されます。
 * 
 * @param shelterId 更新対象の避難所ID
 * @param shelterData 更新する避難所データ (部分更新可)
 * @returns 処理完了時に解決される Promise
 */
export async function updateShelter(
  shelterId: string,
  shelterData: Partial<Omit<Shelter, 'id'>>
): Promise<void> {
  try {
    const docRef = doc(db, "shelters", shelterId);
    await updateDoc(docRef, shelterData as DocumentData);
  } catch (err) {
    console.error("Error updating shelter in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した避難所IDに対応する避難所を Firestore から削除します。
 * 
 * @param shelterId 削除対象の避難所ID
 * @returns 処理完了時に解決される Promise
 */
export async function deleteShelter(shelterId: string): Promise<void> {
  try {
    const docRef = doc(db, "shelters", shelterId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting shelter from Firestore:", err);
    throw err;
  }
}

/**
 * 避難所の一覧を取得します。
 * 
 * @returns 取得された避難所オブジェクトの配列を返す Promise
 */
export async function getShelters(): Promise<Shelter[]> {
  try {
    const sheltersCollectionRef = collection(db, "shelters");
    const q = query(sheltersCollectionRef);
    const querySnapshot = await getDocs(q);
    const shelters: Shelter[] = [];
    querySnapshot.forEach((docSnap) => {
      shelters.push({
        ...docSnap.data(),
        id: docSnap.id
      } as Shelter);
    });
    return shelters;
  } catch (err) {
    console.error("Error getting shelters list from Firestore:", err);
    throw err;
  }
}
