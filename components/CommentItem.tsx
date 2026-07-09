"use client";

import React, { useState } from 'react';
import UserIcon from './UserIcon';
import styles from './CommentItem.module.css';
import { createComment, getThreadComments } from '@/src/firebase/commentDb';
import { getUserProfile } from '@/src/firebase/userDb';
import { auth } from '@/src/firebase/firebase';

interface CommentData {
  id: string;
  name: string;
  userIcon: string;
  content: string;
  createAt: string;
}

interface CommentItemProps {
  comment: CommentData;
  isReply?: boolean;
  rootId?: string | null;
  postId: string;
}

function CommentItem({ comment, isReply = false, rootId = null, postId }: CommentItemProps) {
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [showReply, setShowReply] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // 返信データを取得する関数
  const fetchReplies = async () => {
    try {
      // getRepliesForComment の代わりに getThreadComments を使ってスレッド全体の返信をフラットにロード
      const fetchedReplies = await getThreadComments(comment.id);
      
      // 各返信投稿者のプロファイルをロード
      const uids = Array.from(new Set(fetchedReplies.map(r => r.author_uid).filter(Boolean))) as string[];
      const userProfiles: Record<string, any> = {};
      
      await Promise.all(
        uids.map(async (uid) => {
          try {
            const profile = await getUserProfile(uid);
            if (profile) {
              userProfiles[uid] = profile;
            }
          } catch (err) {
            console.error(`Error loading profile for ${uid}:`, err);
          }
        })
      );

      const mappedReplies = fetchedReplies.map(r => {
        const user = userProfiles[r.author_uid] || {};
        return {
          id: r.id,
          name: user.displayName || user.nickname || "匿名ユーザー",
          userIcon: user.profileImage || "/user_Icon/user_icon1.jpg",
          content: r.content_text,
          createAt: r.created_at 
            ? new Date(r.created_at.seconds * 1000).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            : "日付なし"
        };
      });

      setReplies(mappedReplies);
    } catch (err) {
      console.error("Failed to fetch replies:", err);
    }
  };

  const toggleReply = async () => {
    if (!showReply && replies.length === 0) {
      setLoading(true);
      await fetchReplies();
      setLoading(false);
    }
    setShowReply(!showReply);
  };

  // コメントの返信を送信する処理
  const handleReplySubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && replyText.trim() && !submittingReply) {
      e.preventDefault();
      setSubmittingReply(true);
      
      try {
        const uid = auth.currentUser?.uid || "user1"; // ログインユーザーがいなければuser1にフォールバック

        await createComment({
          post_id: postId,
          parent_id: comment.id,
          root_id: comment.id, // すべて最上位コメントに対する直接の返信にするため root_id に最上位コメントIDを設定
          author_uid: uid,
          content_text: replyText.trim()
        });

        setReplyText(""); // 入力フィールドのクリア
        
        // 最新の返信リストを再フェッチ
        await fetchReplies();
      } catch (err) {
        console.error("Failed to post reply:", err);
        alert("返信の投稿に失敗しました。");
      } finally {
        setSubmittingReply(false);
      }
    }
  };

  return (
    <div className={styles.itemContainer}>
      <div className={styles.User_info}>
        <UserIcon iconUrl={comment.userIcon} userName={comment.name} className={styles.UserIcon} />
        <h2 className={styles.name}>{comment.name}</h2>
      </div>
      <div className={styles.contents}>
        <p className={styles.content}>{comment.content}</p>
        <p className={styles.createAt}>{comment.createAt}</p>
      </div>

      {/* 返信ボタンは最上位のコメントのみに表示 */}
      {!isReply && (
        <div className={styles.actionArea}>
          <button className={styles.Reply_Button} onClick={toggleReply}>
            {loading ? '読み込み中...' : showReply ? '返信を閉じる' : `返信を見る (${replies.length})`}
          </button>
        </div>
      )}

      {/* ネストされた返信スレッドおよび返信投稿フォーム */}
      {showReply && (
        <div className={styles.reply}>
          {/* 返信コメントの入力エリア */}
          <div className={styles.replyInputWrapper}>
            <input 
              type="text" 
              placeholder={submittingReply ? '送信中...' : '返信する... (Enterで送信)'} 
              className={styles.replyInput}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleReplySubmit}
              disabled={submittingReply}
            />
          </div>

          {/* 子コメントのレンダリング (最上位コメントの直下のみ) */}
          {!isReply && replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              isReply={true} 
              rootId={comment.id}
              postId={postId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentItem;