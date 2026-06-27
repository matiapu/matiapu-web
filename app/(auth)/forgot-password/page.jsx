"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPaperPlane, faArrowLeft, faCircleQuestion, faLock, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "./ForgotPassword.module.css";

// Firebase Auth Operations
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // クエリパラメータからメールアドレスを自動入力
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("メールアドレスを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("パスワード再設定用のメールを送信しました。メールボックスを確認してください。");
    } catch (err) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setError("メールアドレスが正しくないか、登録されていません。");
      } else {
        setError("メールの送信に失敗しました。入力内容をお確かめください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.circleCard}>
      {/* ロゴサークル */}
      <div className={styles.logoCircle}>
        <img src="/logo.png" alt="マチアプ" className={styles.logoImage} />
      </div>
      <p className={styles.logoText}>マチアプ</p>

      {/* タイトル & サブタイトル */}
      <h1 className={styles.title}>パスワードの再設定</h1>
      <p className={styles.subtitle}>
        登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>

      {error && <div className={styles.message} style={{ color: "#ef4444" }}>{error}</div>}
      {message && <div className={styles.message} style={{ color: "#10b981" }}>{message}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* メール入力 */}
        <div className={styles.inputWrapper}>
          <FontAwesomeIcon icon={faEnvelope} className={styles.inputIcon} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
            className={styles.input}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* ボタン */}
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? (
            "送信中..."
          ) : (
            <>
              再設定メールを送信する
              <FontAwesomeIcon icon={faPaperPlane} />
            </>
          )}
        </button>
      </form>

      {/* 戻るリンク */}
      <button 
        type="button" 
        onClick={() => router.push("/login")} 
        className={styles.backLink}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        ログイン画面に戻る
      </button>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className={styles.pageWrapper}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => router.push("/")}>
          <FontAwesomeIcon icon={faLock} className={styles.logoIcon} style={{ marginRight: "4px" }} />
          <span>SecureAuth</span>
        </div>
        <button className={styles.helpButton} aria-label="ヘルプ">
          <FontAwesomeIcon icon={faCircleQuestion} />
        </button>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.mainContent}>
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#003db3" }} />
          </div>
        }>
          <ForgotPasswordForm />
        </Suspense>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="#" className={styles.footerLink}>サポート</Link>
          <Link href="#" className={styles.footerLink}>利用規約</Link>
          <Link href="#" className={styles.footerLink}>プライバシーポリシー</Link>
        </div>
        <p className={styles.copyright}>&copy; 2024 SecureAuth Inc. All rights reserved.</p>
        <div className={styles.footerBrand}>SECUREAUTH</div>
      </footer>
    </div>
  );
}
