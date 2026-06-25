import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 災害種別を表すユニオン型です。
 */
export type DisasterType = '洪水' | '土砂' | '津波' | '地震';

/**
 * 危険区域のポリゴンデータを表すGeoJSON形式のインターフェースです。
 */
export interface DangerZone {
  type: 'Polygon';
  /**
   * 危険区域のポリゴン頂点座標の配列（Google Mapsと互換性のある形式）
   */
  coordinates: { lat: number; lng: number }[];
}

/**
 * 災害情報を定義するTypeScriptインターフェースです。
 * Firestoreの `disasters` コレクションの各ドキュメント構造に対応しています。
 */
export interface Disaster {
  /** 災害情報のドキュメントID (Firestoreから取得した際に付与されます) */
  id?: string;
  /** 災害種別 (洪水, 土砂, 津波, 地震) */
  disaster_type: DisasterType;
  /** 地震の震度 (例: "3", "5弱", "5強" など。地震の場合のみ設定) */
  seismic_intensity?: string;
  /** 地震の最大震度コード (例: 30, 45, 50 など。地震の場合のみ設定) */
  seismic_intensity_code?: number;
  /** 都道府県ごとの震度情報 (例: { "青森県": { scale: 50, intensity: "5強" } }) ※地震のみ */
  prefecture_intensity?: Record<string, { scale: number; intensity: string }>;
  /** 危険区域のポリゴンデータ (GeoJSON形式等) */
  danger_zone: DangerZone;
  /** 災害発生日時 */
  occurred_at: Timestamp;
  /** レコード作成日時 */
  created_at: Timestamp;
  /** 地震の震度 (例: "3", "5弱", "5強" など。地震の場合のみ設定) */
  seismic_intensity?: string;
  /** 地震の最大震度コード (例: 30, 45, 50 など。地震の場合のみ設定) */
  seismic_intensity_code?: number;
}

/**
 * 災害情報を新規作成します。
 * `created_at` が指定されていない場合は、現在のサーバー時間の Timestamp を自動設定します。
 * 
 * @param disasterData 災害情報データ (ID, レコード作成日時以外は必須)
 * @returns 作成された災害情報のドキュメントIDを返す Promise
 */
export async function createDisaster(
  disasterData: Omit<Disaster, 'id' | 'created_at'> & {
    created_at?: Timestamp;
  }
): Promise<string> {
  try {
    const disastersCollectionRef = collection(db, "disasters");
    const docRef = await addDoc(disastersCollectionRef, {
      ...disasterData,
      created_at: disasterData.created_at || Timestamp.now()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating disaster info in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した災害情報IDに対応する災害情報を Firestore から取得します。
 * 
 * @param disasterId 取得対象の災害情報ID
 * @returns 該当ドキュメントが存在する場合は `Disaster` オブジェクト、存在しない場合は `null` を返す Promise
 */
export async function getDisaster(disasterId: string): Promise<Disaster | null> {
  try {
    const docRef = doc(db, "disasters", disasterId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data
      } as Disaster;
    }
    return null;
  } catch (err) {
    console.error("Error getting disaster info from Firestore:", err);
    throw err;
  }
}

/**
 * 災害情報の特定フィールドのみを部分更新します。
 * `id` および `created_at` は更新対象から除外されます。
 * 
 * @param disasterId 更新対象の災害情報ID
 * @param disasterData 更新する災害データ (部分更新可)
 * @returns 処理完了時に解決される Promise
 */
export async function updateDisaster(
  disasterId: string,
  disasterData: Partial<Omit<Disaster, 'id' | 'created_at'>>
): Promise<void> {
  try {
    const docRef = doc(db, "disasters", disasterId);
    await updateDoc(docRef, disasterData as DocumentData);
  } catch (err) {
    console.error("Error updating disaster info in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した災害情報IDに対応する災害情報を Firestore から削除します。
 * 
 * @param disasterId 削除対象の災害情報ID
 * @returns 処理完了時に解決される Promise
 */
export async function deleteDisaster(disasterId: string): Promise<void> {
  try {
    const docRef = doc(db, "disasters", disasterId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting disaster info from Firestore:", err);
    throw err;
  }
}

/**
 * 災害情報の一覧を発生日時 (`occurred_at` の降順) で取得します。
 * 
 * @returns 取得された災害情報オブジェクトの配列を返す Promise
 */
export async function getDisasters(): Promise<Disaster[]> {
  try {
    const disastersCollectionRef = collection(db, "disasters");
    const q = query(disastersCollectionRef, orderBy("occurred_at", "desc"));
    const querySnapshot = await getDocs(q);
    const disasters: Disaster[] = [];
    querySnapshot.forEach((docSnap) => {
      disasters.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Disaster);
    });
    return disasters;
  } catch (err) {
    console.error("Error getting disasters list from Firestore:", err);
    throw err;
  }
}
