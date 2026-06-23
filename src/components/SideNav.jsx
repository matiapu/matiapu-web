import styles from "./SideNav.module.css";

export default function SideNav() {
  return (
    <nav className={styles.sideNav}>
      <a href="/" className={styles.navItem}>
        <img
          src="/icons/home.png"
          alt="ホーム"
          className={styles.iconImage}
        />
        <span className={styles.label}>ホーム</span>
      </a>

      <a href="/map" className={styles.navItem}>
        <img
          src="/icons/map.png"
          alt="地図"
          className={styles.iconImage}
        />
        <span className={styles.label}>地図</span>
      </a>

      <a href="/posts/matchs" className={styles.navItem}>
        <img
          src="/icons/posts.png"
          alt="投稿"
          className={styles.iconImage}
        />
        <span className={styles.label}>投稿</span>
      </a>

      <a href="/member" className={styles.navItem}>
        <img
          src="/icons/member.png"
          alt="議員"
          className={styles.iconImage}
        />
        <span className={styles.label}>議員</span>
      </a>

      <a href="/settings" className={styles.navItem}>
        <img
          src="/icons/settings.png"
          alt="設定"
          className={styles.iconImage}
        />
        <span className={styles.label}>設定</span>
      </a>
    </nav>
  );
}