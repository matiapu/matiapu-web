import React from 'react'
import styles from './CommentInput.module.css'

function CommentInput() {
  return (
        <div className={styles.search_wrapper}>
          <div className={styles.Input_wrapper}>
            <p><input type="text" className={styles.Button}/>コメントする</p>
          </div>
        </div>
  )
}

export default CommentInput