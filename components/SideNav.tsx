"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";
import styles from "./SideNav.module.css";

export default function SideNav() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
    // セッションCookieを削除
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className={styles.sideNav}>
      <Link href="/" className={styles.navItem}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <span className={styles.label}>ホーム</span>
      </Link>

      <Link href="/profile" className={styles.navItem}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className={styles.label}>プロフィール</span>
      </Link>

      <Link href="/posts/1" className={styles.navItem}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M16 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8l-5-5zM7 7h5v2H7V7zm10 10H7v-2h10v2zm0-4H7v-2h10v2zm-2-4V5l4 4h-4z" />
        </svg>
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

      <Link href="/politicians/posts/1" className={styles.navItem}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M16.5 12c1.38 0 2.49-1.12 2.49-2.5S17.88 7 16.5 7C15.12 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zM9 11c1.66 0 2.99-1.34 2.99-3S10.66 5 9 5C7.34 5 6 6.34 6 8s1.34 3 3 3zm7.5 3c-1.83 0-5.5.92-5.5 2.75V19h11v-2.25c0-1.83-3.67-2.75-5.5-2.75zM9 13c-2.33 0-7 1.17-7 3.5V19h7v-2.25c0-.85.35-2.52 2.5-3.55-.83-.12-1.66-.2-2.5-.2z" />
        </svg>
        <span className={styles.label}>議員</span>
      </Link>

      <button onClick={handleLogout} className={`${styles.navItem} ${styles.logoutBtn}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={32}
          height={32}
          className={styles.iconImage}
          fill="currentColor"
        >
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
        </svg>
        <span className={styles.label}>ログアウト</span>
      </button>
    </nav>
  );
}