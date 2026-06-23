"use client"

import React from 'react'
import { useState } from 'react'
import CommentItem from './CommentItem'
import styles from './CommentSection.module.css'

function CommentSection() {
  const [showReply, setShowReply] = useState(false);

  const toggleReply = () => {
    setShowReply(!showReply);
  };

  return (
      <div className={styles.Comment_Wrapper}>
        <div className={styles.Content_wrapper}>
          <CommentItem />

          {showReply && (
          <div className={styles.reply}>
              <CommentItem />
          </div>
        )}
        </div>
        
        <button className={styles.Reply_Button} onClick={toggleReply}>
          {showReply ? '返信を閉じる' : '返信を見る'}
        </button>
      </div>
  )
}

export default CommentSection