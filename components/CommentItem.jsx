import React from 'react'
import UserIcon from './UserIcon'
import styles from './CommentItem.module.css'

export const COMMENT = [
    {
        commentId: 1,
        UserIcon: "/user_icon/user_icon4.jpg",
        name: "矢野 幸太郎",
        content: "本文本文本文本文本文本文本文本文本文本文本文本文本文本文",
        createAt: "2026:06:10 22:22"
    }
]

function CommentItem() {
    const comment = COMMENT[0]
    return (
        <div>
            <div className={styles.User_info}>
                <UserIcon iconUrl={comment.UserIcon} alt={`${comment.name}さんのアイコン`} fill sizes='100vh' className={styles.UserIcon} />
                <h2 className={styles.name}>{comment.name}</h2>
            </div>
            <div className={styles.contents}>
                <p className={styles.content}>{comment.content}</p>
                <p className={styles.createAt}>{comment.createAt}</p>
            </div>
        </div>
    )
}

export default CommentItem