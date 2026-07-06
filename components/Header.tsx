"use client";

import styles from "./Header.module.css";
import Link from 'next/link';
import Image from "next/image";
import { useRouter } from "next/navigation";

// Firebase Authのインポート
import { signOut } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";

export default function Header() {
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
    <div>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/logo.png" alt="マチアプ" className={styles.logoImage} width={32} height={32} />
          <span className={styles.logoText}>マチアプ</span>
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
          <Link href="/chat" className={styles.navLink}>
            チャット
          </Link>
          <Link href="/politicians/matchs" className={styles.navLink}>
            議員
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </nav>
      </header>
    </div>
  );
}