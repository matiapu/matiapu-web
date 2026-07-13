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
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * コメント情報を定義するTypeScriptインターフェースです。
 * Firestoreの `comments` コレクションの各ドキュメント構造に対応しています。
 */
export interface Comment {
  /** コメントのドキュメントID (Firestoreから取得した際に付与されます) */
  id?: string;
  /** 対象の投稿ID */
  post_id: string;
  /** 親コメントのID (直接の返信先。最上位のコメントの場合は null) */
  parent_id: string | null;
  /** 返信スレッド全体の最上位コメントのID (自身が最上位の場合は null) */
  root_id: string | null;
  /** コメント投稿者のユーザーID (Ref: Users.uid) */
  author_uid: string;
  /** コメント本文 */
  content_text: string;
  /** コメント投稿日時 */
  created_at: Timestamp;
}

/**
 * コメントを新規作成します。
 * `created_at` が指定されていない場合は、現在のサーバー時間の Timestamp を自動設定します。
 * 
 * @param commentData コメントデータ (ID, 作成日時以外は必須)
 * @returns 作成されたコメントのドキュメントIDを返す Promise
 */
export async function createComment(
  commentData: Omit<Comment, 'id' | 'created_at'> & {
    created_at?: Timestamp;
  }
): Promise<string> {
  try {
    const commentsCollectionRef = collection(db, "comments");
    const docRef = await addDoc(commentsCollectionRef, {
      ...commentData,
      created_at: commentData.created_at || Timestamp.now()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating comment in Firestore:", err);
    throw err;
  }
}

/**
 * 指定したコメントIDに対応するコメント情報を Firestore から取得します。
 * 
 * @param commentId 取得対象のコメントID
 * @returns 該当ドキュメントが存在する場合は `Comment` オブジェクト、存在しない場合は `null` を返す Promise
 */
export async function getComment(commentId: string): Promise<Comment | null> {
  try {
    const docRef = doc(db, "comments", commentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id
      } as Comment;
    }
    return null;
  } catch (err) {
    console.error("Error getting comment from Firestore:", err);
    throw err;
  }
}

/**
 * コメント情報の特定フィールドのみを部分更新します。
 * `id`, `post_id`, `author_uid` は更新対象から除外されます。
 * 
 * @param commentId 更新対象のコメントID
 * @param commentData 更新するコメントデータ (部分更新可)
 * @returns 処理完了時に解決される Promise
 */
export async function updateComment(
  commentId: string,
  commentData: Partial<Omit<Comment, 'id' | 'post_id' | 'author_uid'>>
): Promise<void> {
  try {
    const docRef = doc(db, "comments", commentId);
    await updateDoc(docRef, commentData as DocumentData);
  } catch (err) {
    console.error("Error updating comment in Firestore:", err);
    throw err;
  }
}

/**
 * 指定したコメントIDに対応するコメントを Firestore から削除します。
 * 
 * @param commentId 削除対象のコメントID
 * @returns 処理完了時に解決される Promise
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const docRef = doc(db, "comments", commentId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting comment from Firestore:", err);
    throw err;
  }
}

/**
 * コメント一覧を取得するためのオプション定義です。
 */
export interface GetCommentsOptions {
  /** trueの場合、返信ではない最上位のルートコメント（parent_id == null）のみを取得します */
  rootOnly?: boolean;
  /** 最大取得件数を指定します */
  limitCount?: number;
  /** 指定したドキュメントスナップショットの次のドキュメントから取得を開始します (ページネーション用) */
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
}

/**
 * 特定の投稿に対するコメント一覧を取得します。
 * デフォルトでは、コメントの作成日時順（昇順）に並べられます。
 * 
 * @param postId 対象の投稿ID
 * @param options ルートコメント限定や件数制限などのオプション
 * @returns コメントオブジェクトの配列を返す Promise
 */
export async function getCommentsForPost(
  postId: string,
  options: GetCommentsOptions = {}
): Promise<Comment[]> {
  try {
    const commentsCollectionRef = collection(db, "comments");
    // 複合インデックスエラーを避けるため、クエリは単純な post_id でのフィルタのみに留める
    const q = query(
      commentsCollectionRef,
      where("post_id", "==", postId)
    );

    const querySnapshot = await getDocs(q);
    let comments: Comment[] = [];
    querySnapshot.forEach((docSnap) => {
      comments.push({
        ...docSnap.data(),
        id: docSnap.id
      } as Comment);
    });

    // クライアント側で rootOnly フィルタを適用 (parent_id === null)
    if (options.rootOnly) {
      comments = comments.filter(c => c.parent_id === null);
    }

    // クライアント側で created_at の古い順 (昇順) にソート
    comments.sort((a, b) => {
      const timeA = a.created_at?.seconds || 0;
      const timeB = b.created_at?.seconds || 0;
      return timeA - timeB;
    });

    // 取得件数制限 (limit) をクライアント側で適用
    if (options.limitCount) {
      comments = comments.slice(0, options.limitCount);
    }

    return comments;
  } catch (err) {
    console.error("Error getting comments for post from Firestore:", err);
    throw err;
  }
}

/**
 * 特定のコメントに対する直接の返信コメント（1レベル下の返信）一覧を時系列順に取得します。
 * 
 * @param commentId 親コメントのID
 * @returns 返信コメントオブジェクトの配列を返す Promise
 */
export async function getRepliesForComment(commentId: string): Promise<Comment[]> {
  try {
    const commentsCollectionRef = collection(db, "comments");
    const q = query(
      commentsCollectionRef,
      where("parent_id", "==", commentId)
    );

    const querySnapshot = await getDocs(q);
    const replies: Comment[] = [];
    querySnapshot.forEach((docSnap) => {
      replies.push({
        ...docSnap.data(),
        id: docSnap.id
      } as Comment);
    });

    // クライアント側で created_at の古い順 (昇順) にソート
    replies.sort((a, b) => {
      const timeA = a.created_at?.seconds || 0;
      const timeB = b.created_at?.seconds || 0;
      return timeA - timeB;
    });

    return replies;
  } catch (err) {
    console.error("Error getting replies for comment from Firestore:", err);
    throw err;
  }
}

/**
 * 特定のルートコメントに紐づくすべての返信（孫返信なども含むスレッド全体）を時系列順に取得します。
 * 
 * @param rootCommentId 最上位のルートコメントID
 * @returns スレッド内のすべてのコメントオブジェクトの配列を返す Promise
 */
export async function getThreadComments(rootCommentId: string): Promise<Comment[]> {
  try {
    const commentsCollectionRef = collection(db, "comments");
    // 複合インデックスエラーを避けるため、orderBy はクライアント側で行う
    const q = query(
      commentsCollectionRef,
      where("root_id", "==", rootCommentId)
    );

    const querySnapshot = await getDocs(q);
    const replies: Comment[] = [];
    querySnapshot.forEach((docSnap) => {
      replies.push({
        ...docSnap.data(),
        id: docSnap.id
      } as Comment);
    });

    // クライアント側で created_at の古い順 (昇順) にソート
    replies.sort((a, b) => {
      const timeA = a.created_at?.seconds || 0;
      const timeB = b.created_at?.seconds || 0;
      return timeA - timeB;
    });

    return replies;
  } catch (err) {
    console.error("Error getting thread comments from Firestore:", err);
    throw err;
  }
}
