import styles from "./Header.module.css";
import Link from 'next/link';

export default function Header() {
  return (
    <div>
      <header className={styles.header}>
        <div className={styles.logo}>
          <p>街アプ</p>
        </div>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              ホーム
            </Link>
            <Link href="/profile" className={styles.navLink}>
              プロフィール
            </Link>
            <Link href="/posts/1" className={styles.navLink}>
              投稿
            </Link>
            <Link href="/profile/likes" className={styles.navLink}>
              いいね
            </Link>
            <Link href="/settings" className={styles.navLink}>
              設定
            </Link>
          </nav>
      </header>
    </div>
  );
}