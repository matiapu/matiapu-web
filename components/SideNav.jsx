import Image from "next/image";
import Link from "next/link";
import styles from "./SideNav.module.css";

export default function SideNav() {
  return (
    <nav className={styles.sideNav}>
      <Link href="/" className={styles.navItem}>
        <Image
          src="/icons/home.png"
          alt="ホーム"
          width={32}
          height={32}
          className={styles.iconImage}
        />
        <span className={styles.label}>ホーム</span>
      </Link>

      <Link href="/map" className={styles.navItem}>
        <Image
          src="/icons/map.png"
          alt="地図"
          width={32}
          height={32}
          className={styles.iconImage}
        />
        <span className={styles.label}>地図</span>
      </Link>

      <Link href="/posts/matchs" className={styles.navItem}>
        <Image
          src="/icons/posts.png"
          alt="投稿"
          width={32}
          height={32}
          className={styles.iconImage}
        />
        <span className={styles.label}>投稿</span>
      </Link>

      <Link href="/chat" className={styles.navItem}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
        </svg>
        <span className={styles.label}>チャット</span>
      </Link>

      <Link href="/member" className={styles.navItem}>
        <Image
          src="/icons/member.png"
          alt="議員"
          width={32}
          height={32}
          className={styles.iconImage}
        />
        <span className={styles.label}>議員</span>
      </Link>

      <Link href="/settings" className={styles.navItem}>
        <Image
          src="/icons/settings.png"
          alt="設定"
          width={32}
          height={32}
          className={styles.iconImage}
        />
        <span className={styles.label}>設定</span>
      </Link>
    </nav>
  );
}