"use client";

import React, { useState } from 'react';
import styles from './CommentInput.module.css';
import { createComment } from '@/src/firebase/commentDb';
import { auth } from '@/src/firebase/firebase';

function CommentInput({ postId, onCommentSubmitted }) {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && commentText.trim() && !isSubmitting) {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        const uid = auth.currentUser?.uid || "user1"; // フォールバック用サンプルUID
        await createComment({
          post_id: postId,
          parent_id: null,
          root_id: null,
          author_uid: uid,
          content_text: commentText.trim()
        });
        
        setCommentText(""); // 入力欄をクリア
        if (onCommentSubmitted) {
          onCommentSubmitted();
        }
      } catch (err) {
        console.error("Failed to submit comment:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={styles.search_wrapper}>
      <input 
        type="text" 
        placeholder={isSubmitting ? '送信中...' : 'コメントする (Enterで送信)'} 
        className={styles.Input_button}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
    </div>
  );
}

export default CommentInput;