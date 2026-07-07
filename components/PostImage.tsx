import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/components/PostImage.module.css';
import { Post as UIPost } from '@/data/posts';

interface PostImageProps {
  posts?: UIPost[];
}

function PostImage({ posts = [] }: PostImageProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className={styles.emptyGridState}>
        <div className={styles.emptyIconContainer}>
          <svg className={styles.emptySvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <h4 className={styles.emptyTitle}>投稿がまだありません</h4>
        <p className={styles.emptyText}>地域の出来事や気づきを投稿してみましょう！</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageGrid}>
        {posts.map((post) => (
          <Link 
            key={post.id} 
            href={post.authorUserType === 'politician' ? `/politicians/posts/${post.id}` : `/posts/${post.id}`} 
            className={styles.imageContainer}
          >
            <Image 
              src={post.image} 
              alt={post.title || "投稿画像"} 
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 250px, 300px"
              unoptimized
              loading="lazy"
              className={styles.actualImage}
            />
            {/* Elegant Hover Overlay */}
            <div className={styles.overlay}>
              <div className={styles.overlayContent}>
                <span className={styles.overlayTag}>{post.tags || "一般"}</span>
                <p className={styles.overlayTitle}>{post.title || "詳細を見る"}</p>
                <div className={styles.overlayLikes}>
                  <svg className={styles.heartIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>{post.likes || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PostImage;
