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