import React from 'react'
import Image from 'next/image'
import styles from '@/components/PostImage.module.css'

import { POSTS } from '@/app/(main)/posts/[id]/page' 

function PostImage() {
  const post = POSTS[0];
  return (
    <div className={styles.container}>
      {/* 画像を並べるエリア */}
      <div className={styles.imageGrid}>
        {/* 5個 × 3行 ＝ 計15回 ループして同じ画像を表示 */}
        {Array(15).fill(null).map((_, index) => (
          <div key={index} className={styles.imageContainer}>
            <Image 
              src={post.image} 
              alt={`投稿画像-${index}`} 
              width={300}
              height={300}
              unoptimized
              loading="eager" 
              priority
              className={styles.actualImage}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PostImage
