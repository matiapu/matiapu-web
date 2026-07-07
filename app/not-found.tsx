"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/NotFound.module.css";

export default function NotFound() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>ページが見つかりません</h1>
        <p className={styles.description}>
          お探しのページは削除されたか、名前が変更されたか、一時的に利用できない可能性があります。
        </p>
        <div className={styles.buttonGroup}>
          <button onClick={handleBack} className={styles.secondaryButton}>
            前のページに戻る
          </button>
          <Link href="/" className={styles.primaryButton}>
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
