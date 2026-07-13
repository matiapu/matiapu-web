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
  where,
  limit,
  startAfter,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 質問情報を定義するTypeScriptインターフェースです。
 * Firestoreの `qa_questions` コレクションに対応しています。
 */
export interface QAQuestion {
  /** 質問ID (FirestoreのドキュメントID) */
  id?: string;
  /** 質問者のUID */
  author_uid: string;
  /** 質問のタイトル */
  title: string;
  /** 質問本文 */
  content_text: string;
  /** 対象の地域/都道府県名 (例: "東京都") */
  prefecture: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at?: Timestamp;
}

/**
 * 回答情報を定義するTypeScriptインターフェースです。
 * Firestoreの `/qa_questions/{questionId}/answers` サブコレクションに対応しています。
 */
export interface QAAnswer {
  /** 回答ID (FirestoreのドキュメントID) */
  id?: string;
  /** 対象の質問ID */
  question_id: string;
  /** 回答者のUID */
  author_uid: string;
  /** 回答本文 */
  content_text: string;
  /** 作成日時 */
  created_at: Timestamp;
  /** 更新日時 */
  updated_at?: Timestamp;
}

/**
 * 新しいQ&A質問を作成し、Firestoreの `qa_questions` コレクションに保存します。
 * 
 * @param questionData 登録する質問情報 (IDとcreated_atは除外)
 * @returns 新規作成されたドキュメントIDを返す Promise
 */
export async function createQAQuestion(
  questionData: Omit<QAQuestion, "id" | "created_at">
): Promise<string> {
  try {
    const questionsCollectionRef = collection(db, "qa_questions");
    const docRef = await addDoc(questionsCollectionRef, {
      ...questionData,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating QA question in Firestore:", err);
    throw err;
  }
}

/**
 * 質問IDに対応する質問ドキュメントを1件取得します。
 * 
 * @param questionId 質問ID
 * @returns 質問オブジェクトまたはnullを返す Promise
 */
export async function getQAQuestion(questionId: string): Promise<QAQuestion | null> {
  try {
    const docRef = doc(db, "qa_questions", questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id
      } as QAQuestion;
    }
    return null;
  } catch (err) {
    console.error("Error getting QA question from Firestore:", err);
    throw err;
  }
}

/**
 * 既存の質問内容（タイトル、本文、対象地域など）を更新します。
 * 
 * @param questionId 質問ID
 * @param updates 更新する値のオブジェクト
 */
export async function updateQAQuestion(
  questionId: string,
  updates: Partial<Pick<QAQuestion, "title" | "content_text" | "prefecture">>
): Promise<void> {
  try {
    const docRef = doc(db, "qa_questions", questionId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: Timestamp.now()
    });
  } catch (err) {
    console.error("Error updating QA question in Firestore:", err);
    throw err;
  }
}

/**
 * 質問ドキュメントを削除します。
 * 
 * @param questionId 質問ID
 */
export async function deleteQAQuestion(questionId: string): Promise<void> {
  try {
    const docRef = doc(db, "qa_questions", questionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting QA question from Firestore:", err);
    throw err;
  }
}

export interface GetQAQuestionsOptions {
  /** 特定の都道府県名でフィルタリングする場合に指定 (例: "東京都") */
  prefecture?: string;
  /** 取得する最大件数 */
  limitCount?: number;
  /** ページネーション用の開始ドキュメントスナップショット */
  startAfterDoc?: any;
}

/**
 * 質問一覧を最新順（created_at 降順）で取得します。
 * 都道府県(prefecture)によるフィルタや、最大取得件数、ページネーションに対応しています。
 * 
 * @param options 各種フィルタ・ページネーション設定
 * @returns 質問オブジェクトの配列を返す Promise
 */
export async function getQAQuestions(
  options: GetQAQuestionsOptions = {}
): Promise<QAQuestion[]> {
  try {
    const questionsCollectionRef = collection(db, "qa_questions");
    const constraints: any[] = [];

    if (options.prefecture) {
      constraints.push(where("prefecture", "==", options.prefecture));
    }

    // 最新順にソート
    constraints.push(orderBy("created_at", "desc"));

    if (options.startAfterDoc) {
      constraints.push(startAfter(options.startAfterDoc));
    }

    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(questionsCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const questions: QAQuestion[] = [];

    querySnapshot.forEach((docSnap) => {
      questions.push({
        ...docSnap.data(),
        id: docSnap.id
      } as QAQuestion);
    });

    return questions;
  } catch (err) {
    console.error("Error getting QA questions from Firestore:", err);
    throw err;
  }
}

/**
 * 指定した質問IDに対して新しい回答を作成し、Firestoreのサブコレクション `answers` に保存します。
 * 
 * @param questionId 質問ID
 * @param answerData 回答情報 (ID、質問ID、created_atは除外)
 * @returns 新規作成された回答のドキュメントIDを返す Promise
 */
export async function createQAAnswer(
  questionId: string,
  answerData: Omit<QAAnswer, "id" | "question_id" | "created_at">
): Promise<string> {
  try {
    const answersCollectionRef = collection(db, "qa_questions", questionId, "answers");
    const docRef = await addDoc(answersCollectionRef, {
      author_uid: answerData.author_uid,
      content_text: answerData.content_text,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating QA answer in Firestore:", err);
    throw err;
  }
}

/**
 * 特定の質問に対するすべての回答を取得し、時系列順（古い順）にソートして返します。
 * 
 * @param questionId 質問ID
 * @returns 回答オブジェクトの配列を返す Promise
 */
export async function getQAAnswersForQuestion(questionId: string): Promise<QAAnswer[]> {
  try {
    const answersCollectionRef = collection(db, "qa_questions", questionId, "answers");
    const q = query(answersCollectionRef, orderBy("created_at", "asc"));
    const querySnapshot = await getDocs(q);
    const answers: QAAnswer[] = [];

    querySnapshot.forEach((docSnap) => {
      answers.push({
        ...docSnap.data(),
        id: docSnap.id,
        question_id: questionId
      } as QAAnswer);
    });

    return answers;
  } catch (err) {
    console.error("Error getting QA answers from Firestore:", err);
    throw err;
  }
}

/**
 * 既存の回答内容を更新します。
 * 
 * @param questionId 質問ID
 * @param answerId 回答ID
 * @param contentText 新しい回答本文
 */
export async function updateQAAnswer(
  questionId: string,
  answerId: string,
  contentText: string
): Promise<void> {
  try {
    const docRef = doc(db, "qa_questions", questionId, "answers", answerId);
    await updateDoc(docRef, {
      content_text: contentText,
      updated_at: Timestamp.now()
    });
  } catch (err) {
    console.error("Error updating QA answer in Firestore:", err);
    throw err;
  }
}

/**
 * 回答を削除します。
 * 
 * @param questionId 質問ID
 * @param answerId 回答ID
 */
export async function deleteQAAnswer(questionId: string, answerId: string): Promise<void> {
  try {
    const docRef = doc(db, "qa_questions", questionId, "answers", answerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting QA answer from Firestore:", err);
    throw err;
  }
}
