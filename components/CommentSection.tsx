"use client"

import React, { useState, useEffect } from 'react'
import CommentItem from './CommentItem'
import styles from './CommentSection.module.css'
import { getCommentsForPost } from '@/src/firebase/commentDb'
import { getUserProfile } from '@/src/firebase/userDb'

interface CommentSectionProps {
  postId: string;
}

interface CommentData {
  id: string;
  name: string;
  userIcon: string;
  content: string;
  createAt: string;
}

function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComments() {
      if (!postId) return;
      setLoading(true);
      try {
        const fetchedComments = await getCommentsForPost(postId, { rootOnly: true });
        
        // コメント投稿者のプロフィールをロード
        const uids = Array.from(new Set(fetchedComments.map(c => c.author_uid).filter(Boolean))) as string[];
        const userProfiles: Record<string, any> = {};
        
        await Promise.all(
          uids.map(async (uid) => {
            try {
              const profile = await getUserProfile(uid);
              if (profile) userProfiles[uid] = profile;
            } catch (err) {
              console.error(`Error loading profile for author ${uid}:`, err);
            }
          })
        );

        const mappedComments = fetchedComments.map(c => {
          const user = userProfiles[c.author_uid] || {};
          return {
            id: c.id,
            name: user.displayName || user.nickname || "匿名ユーザー",
            userIcon: user.profileImage || "/user_Icon/user_icon1.jpg",
            content: c.content_text,
            createAt: c.created_at 
              ? new Date(c.created_at.seconds * 1000).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : "日付なし"
          };
        });

        setComments(mappedComments);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setLoading(false);
      }
    }
    loadComments();
  }, [postId]);

  if (loading) {
    return (
      <div className={styles.Comment_Wrapper}>
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>コメントを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={styles.Comment_Wrapper}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
        コメント ({comments.length})
      </h3>

      {comments.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>コメントはまだありません。</p>
      ) : (
        <div className={styles.Content_wrapper}>
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentSection