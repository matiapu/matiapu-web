import React from 'react'
import styles from './CommentInput.module.css'

function CommentInput() {
  return (
        <div className={styles.search_wrapper}>
            <input type="text" placeholder='コメントする' className={styles.Input_button}/>
        </div>
  )
}

export default CommentInput