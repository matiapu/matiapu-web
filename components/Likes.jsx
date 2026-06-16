import React from 'react'
import styles from '@/components/Likes.module.css'

function likes() {
  return (
    <div>
        <div className={styles.like_wrapper}>
            <h2>いいねした投稿</h2>
        </div>

        <div className={styles.search_wrapper}>
            <div className={styles.search_bar}>
                <span className={styles.search_icon}>🔍</span>
                <span className={styles.search_placeholder}>検索</span>
            </div>
        </div>
    </div>
  )
}

export default likes