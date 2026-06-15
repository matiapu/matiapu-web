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
              <a>ホーム</a>
            </Link>
            <Link href="/profile" className={styles.navLink}>
              <a>プロフィール</a>
            </Link>
            <Link href={'../../posts/1'} className={styles.navLink}>
              <a>投稿</a>
            </Link>
            <Link href="/settings" className={styles.navLink}>
              <a>設定</a>
            </Link>
          </nav>
      </header>
    </div>
  );
}