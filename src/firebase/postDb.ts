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
  limit, 
  where, 
  startAfter,
  GeoPoint, 
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 公開ステータスを表すユニオン型です。
 */
export type PostStatus = 'Public' | 'Private' | 'Draft';

/**
 * 投稿情報を定義するTypeScriptインターフェースです。
 * Firestoreの `posts` コレクションの各ドキュメント構造に対応しています。
 */
export interface Post {
  /** 投稿のドキュメントID (Firestoreから取得した際に付与されます) */
  id?: string;
  /** 投稿者ユーザーID (Ref: Users.uid) */
  author_uid: string;
  /** 投稿時点のユーザーバッジ */
  user_badge: string;
  /** 投稿本文 */
  content_text: string;
  /** 添付画像のURL */
  image_url?: string | null;
  /** 位置情報 (緯度・経度) */
  geo_location?: GeoPoint | null;
  /** 公開ステータス */
  status: PostStatus;
  /** 投稿日時 */
  created_at: Timestamp;
  /** 投稿のタイトル (オプショナル) */
  title?: string;
  /** 投稿のタグ (災害など、オプショナル) */
  tags?: string;
  /** いいね数 (オプショナル) */
  likes?: string | number;
  /** 質問テキスト (オプショナル) */
  questionText?: string | null;
  /** 回答テキスト (オプショナル) */
  answerText?: string | null;
}

/**
 * 投稿を新規作成します。
 * `created_at` が指定されていない場合は、現在のサーバー時間の Timestamp を自動設定します。
 * 
 * @param postData 投稿データ (ID, 作成日時以外は必須)
 * @returns 作成された投稿のドキュメントIDを返す Promise
 */
export async function createPost(
  postData: Omit<Post, 'id' | 'created_at'> & {
    created_at?: Timestamp;
  }
): Promise<string> {
  try {
    const postsCollectionRef = collection(db, "posts");
    const docRef = await addDoc(postsCollectionRef, {
      ...postData,
      created_at: postData.created_at || Timestamp.now(),
      image_url: postData.image_url || null
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating post in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した投稿IDに対応する投稿情報を Firestore から取得します。
 * 
 * @param postId 取得対象の投稿ID
 * @returns 該当ドキュメントが存在する場合は `Post` オブジェクト、存在しない場合は `null` を返す Promise
 */
export async function getPost(postId: string): Promise<Post | null> {
  try {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data
      } as Post;
    }
    return null;
  } catch (err) {
    console.error("Error getting post from Firestore:", err);
    throw err;
  }
}

/**
 * 投稿情報の特定フィールドのみを部分更新します。
 * `id` および `author_uid` は更新対象から除外されます。
 * 
 * @param postId 更新対象 of 投稿ID
 * @param postData 更新する投稿データ (部分更新可)
 * @returns 処理完了時に解決される Promise
 */
export async function updatePost(
  postId: string,
  postData: Partial<Omit<Post, 'id' | 'author_uid'>>
): Promise<void> {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, postData as DocumentData);
  } catch (err) {
    console.error("Error updating post in Firestore:", err);
    throw err;
  }
}

/**
 * 指定した投稿IDに対応する投稿を Firestore から削除します。
 * 
 * @param postId 削除対象の投稿ID
 * @returns 処理完了時に解決される Promise
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const docRef = doc(db, "posts", postId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting post from Firestore:", err);
    throw err;
  }
}

/**
 * 投稿一覧を取得するためのオプション定義です。
 */
export interface GetPostsOptions {
  /** 特定の公開ステータスでフィルタします */
  status?: PostStatus;
  /** 特定のユーザーによる投稿でフィルタします */
  author_uid?: string;
  /** 最大取得件数を指定します */
  limitCount?: number;
  /** 指定したドキュメントスナップショットの次のドキュメントから取得を開始します (ページネーション用) */
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
}

/**
 * 投稿一覧を最新日時 (`created_at` の降順) で取得します。
 * 
 * @param options フィルタや件数制限などのオプション
 * @returns 取得された投稿オブジェクトの配列を返す Promise
 */
export async function getPosts(options: GetPostsOptions = {}): Promise<Post[]> {
  try {
    const postsCollectionRef = collection(db, "posts");
    let q = query(postsCollectionRef);

    // フィルタ条件の追加
    if (options.status) {
      q = query(q, where("status", "==", options.status));
    }
    if (options.author_uid) {
      q = query(q, where("author_uid", "==", options.author_uid));
    }

    // 最新順ソート
    q = query(q, orderBy("created_at", "desc"));

    // ページネーション用 (startAfter)
    if (options.startAfterDoc) {
      q = query(q, startAfter(options.startAfterDoc));
    }

    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    querySnapshot.forEach((docSnap) => {
      posts.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Post);
    });

    return posts;
  } catch (err) {
    console.error("Error getting posts list from Firestore:", err);
    throw err;
  }
}


