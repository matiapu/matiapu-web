import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faHeart } from '@fortawesome/free-solid-svg-icons';
import styles from './NoMorePosts.module.css';

function NoMorePosts() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>投稿はありません</h2>

        <div className={styles.buttonGroup}>
          <Link href="/" className={styles.primaryButton}>
            <FontAwesomeIcon icon={faMap} className={styles.buttonIcon} />
            マップを見る
          </Link>
          <Link href="/profile/likes" className={styles.secondaryButton}>
            <FontAwesomeIcon icon={faHeart} className={styles.buttonIcon} />
            いいねを見る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NoMorePosts;
