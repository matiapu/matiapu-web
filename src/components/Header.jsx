import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>マチアプ</div>
      <nav className={styles.nav}>
        <a href="/" className={styles.navLink}>
          ホーム
        </a>
        <a href="/profile" className={styles.navLink}>
          プロフィール
        </a>
        <a href="/posts" className={styles.navLink}>
          投稿
        </a>
        <a href="/settings" className={styles.navLink}>
          設定
        </a>
      </nav>
    </header>
  );
}