import React from 'react'
import UserIcon from './UserIcon'
import styles from '@/components/profile.module.css'
import PostImage from './PostImage'

import { POSTS } from '@/data/posts' 

function profile() {
    const post = POSTS[0];
  return (
    <div>
        <UserIcon className={styles.icon}/>
        <div className={styles.user_info}>
            <p>{post.address}</p>
            <h2>{post.name}</h2>
        </div>
        <PostImage />
    </div>
  )
}

export default profile