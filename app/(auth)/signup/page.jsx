"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "./Signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // すでにセッションCookieがある場合はトップページへリダイレクト
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasSession = cookies.some((cookie) => cookie.trim().startsWith("session="));
    if (hasSession) {
      router.replace("/");
    }
  }, [router]);

  const handleSignup = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("すべての項目を入力してください。");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // 擬似セッションCookieを作成
    const expireTime = 60 * 60 * 24; // 1日
    document.cookie = `session=${encodeURIComponent(email)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

    // トップページに遷移
    router.push("/");
    router.refresh();
  };

  const handleSocialSignup = (provider) => {
    setIsSubmitting(true);
    const expireTime = 60 * 60 * 24;
    document.cookie = `session=${encodeURIComponent(provider + "-user")}; path=/; max-age=${expireTime}; SameSite=Lax;`;
    router.push("/");
    router.refresh();
  };

  return (
    <div className={styles.pageWrapper}>
      {/* ヘッダー (中央縦並びのロゴ) */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => router.push("/")}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 8.5 9 10 10.5 10.5C9 11 7.5 12.5 7.5 14.5C7.5 17 9.5 19 12 19C14.5 19 16.5 17 16.5 14.5C16.5 12.5 15 11 13.5 10.5C15 10 16.5 8.5 16.5 6.5C16.5 4 14.5 2 12 2Z" fill="#3b82f6" />
              <circle cx="12" cy="12" r="3" fill="#60a5fa" />
            </svg>
          </div>
          <span className={styles.logoText}>マチアプ</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.mainContent}>
        <div className={styles.card}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>アカウント作成</h1>
            <p className={styles.subtitle}>必要事項を入力して登録を完了してください</p>
          </div>

          {error && <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px", textAlign: "center" }}>{error}</div>}

          <form onSubmit={handleSignup} className={styles.form}>
            {/* お名前入力 */}
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.label}>
                お名前
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            {/* メールアドレス入力 */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                メールアドレス
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            {/* パスワード入力 */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                パスワード
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上の英数字"
                  className={`${styles.input} ${styles.passwordInput}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                  aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* 登録ボタン */}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : "登録する"}
            </button>
          </form>

          {/* または */}
          <div className={styles.divider}>または</div>

          {/* ソーシャルログイン */}
          <div className={styles.socialButtons}>
            <button type="button" onClick={() => handleSocialSignup("google")} className={`${styles.socialButton} ${styles.googleButton}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" className={styles.socialIcon}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.68-5.32 3.68-8.74Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.54 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.22A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.45 14.33a7.14 7.14 0 0 1 0-4.66V6.45H1.31a12 12 0 0 0 0 11.1l4.14-3.22Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A12 12 0 0 0 1.31 6.45L5.45 9.67c.92-2.77 3.5-4.83 6.55-4.83Z" />
              </svg>
              Googleで登録
            </button>
            <button type="button" onClick={() => handleSocialSignup("apple")} className={`${styles.socialButton} ${styles.appleButton}`}>
              <svg width="16" height="16" viewBox="0 0 170 170" fill="currentColor" className={styles.socialIcon}>
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.37-6.15-3.43-2.85-7.37-7.67-11.83-14.46-9.67-14.67-16.14-31.54-19.41-50.61-3.26-19.08-2.01-35.48 3.75-49.2 5.76-13.71 14.89-20.72 27.39-21.03 5.1 0 10.59 1.57 16.48 4.7 5.89 3.13 10.15 4.7 12.78 4.7 2.1 0 6.35-1.57 12.75-4.7 6.4-3.13 11.28-4.53 14.65-4.21 12.22.84 21.67 5.2 28.36 13.1 5.37 6.27 9.17 13.54 11.41 21.82-16.59 7.02-24.64 18.25-24.16 33.7.46 12.24 5.35 22.28 14.7 30.12 7.78 6.47 16.89 10.02 27.34 10.65-2.02 5.75-4.49 11.45-7.39 17.09zM119.22 35.61c0-7.83 2.76-14.93 8.28-21.3C133 8.35 140.42 4.43 149.77 2.53c.12 1.05.18 1.9.18 2.53 0 7.49-2.82 14.45-8.46 20.89-5.64 6.44-12.79 10.54-21.46 12.3-1.26-.95-2.07-1.85-2.43-2.7-5.62-5.46-8.38-12.1-8.38-19.94z" />
              </svg>
              Appleでサインアップ
            </button>
          </div>

          {/* ログインへ */}
          <div className={styles.cardFooter}>
            すでにアカウントをお持ちですか？
            <Link href="/login" className={styles.loginLink}>
              ログインはこちら
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="#" className={styles.footerLink}>
            Support
          </Link>
          <Link href="#" className={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link href="#" className={styles.footerLink}>
            Terms of Service
          </Link>
        </div>
        <p className={styles.copyright}>&copy; 2024 SecureAuth Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}