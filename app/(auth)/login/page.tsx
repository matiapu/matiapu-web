"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "./Login.module.css";
import backgroundUrls from "@/src/firebase/backgroundUrls.json";

// Firebase Authのインポート
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/src/firebase/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("night");

  // 現在の時刻に基づいて時間帯（朝・昼・夜）を判定
  useEffect(() => {
    const hours = new Date().getHours();

    // 処理が忙しくなっちゃうから、一旦落ち着かせてあげる setTimeout をかませた
    const timer = setTimeout(() => {
      if (hours >= 5 && hours < 11) {
        setTimeOfDay("morning");
      } else if (hours >= 11 && hours < 18) {
        setTimeOfDay("noon");
      } else {
        // 夜の場合は通常夜(night)とランダム夜(night2)を判定
        const isNight2 = Math.random() < 0.3; // 30%の確率でnight-2.avifを表示
        setTimeOfDay(isNight2 ? "night2" : "night");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // すでにセッションCookieがある場合はトップページへリダイレクト
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasSession = cookies.some((cookie) => cookie.trim().startsWith("session="));
    if (hasSession) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Firebase Authでサインイン
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // セッションCookieを作成
      const expireTime = 60 * 60 * 24; // 1日
      document.cookie = `session=${encodeURIComponent(user.email || "")}; path=/; max-age=${expireTime}; SameSite=Lax;`;

      // 遷移してリフレッシュ
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      const firebaseError = err as { code?: string };
      // エラーハンドリング
      if (
        firebaseError.code === "auth/invalid-credential" || 
        firebaseError.code === "auth/user-not-found" || 
        firebaseError.code === "auth/wrong-password"
      ) {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (firebaseError.code === "auth/too-many-requests") {
        setError("ログイン試行が多すぎます。しばらく経ってから再試行してください。");
      } else {
        setError("ログインに失敗しました。通信状況などを確認してください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (providerName: "google" | "apple") => {
    setIsSubmitting(true);
    setError("");
    const provider = providerName === "google" ? googleProvider : appleProvider;

    try {
      // ポップアップでソーシャルログインを実行
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // セッションCookieを作成
      const expireTime = 60 * 60 * 24; // 1日
      document.cookie = `session=${encodeURIComponent(user.email || user.uid)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

      // 遷移してリフレッシュ
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Social login error:", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        setError(`${providerName === "google" ? "Google" : "Apple"}でのログインに失敗しました。`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgStyles = {
    "--bg-morning": `url(${backgroundUrls.morning || "/back_image/morning.avif"})`,
    "--bg-noon": `url(${backgroundUrls.noon || "/back_image/noon.avif"})`,
    "--bg-night": `url(${backgroundUrls.night || "/back_image/night.avif"})`,
    "--bg-night2": `url(${backgroundUrls["night-2"] || "/back_image/night-2.avif"})`,
  } as React.CSSProperties;

  return (
    <div className={`${styles.pageWrapper} ${timeOfDay}`} style={bgStyles}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => router.push("/")}>
          <Image src="/logo.png" alt="マチアプ" className={styles.logoImage} width={48} height={48} />
          <span className={styles.logoText}>マチアプ</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.mainContent}>
        <div className={styles.card}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>ログイン</h1>
            <p className={styles.subtitle}>アカウント情報を入力してください</p>
          </div>

          {error && <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>{error}</div>}

          <form onSubmit={handleLogin} className={styles.form}>
            {/* メールアドレス入力 */}
            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="email" className={styles.label}>
                  メールアドレス
                </label>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@secureauth.com"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            {/* パスワード入力 */}
            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="password" className={styles.label}>
                  パスワード
                </label>
                <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className={styles.forgotPassword}>
                  パスワードをお忘れの方
                </Link>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${styles.input} ${styles.passwordInput}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                  aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
                >
                  {showPassword ? (
                    <FontAwesomeIcon key="eye-slash" icon={faEyeSlash} />
                  ) : (
                    <FontAwesomeIcon key="eye" icon={faEye} />
                  )}
                </button>
              </div>
            </div>

            {/* ログインボタン */}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          {/* または */}
          <div className={styles.divider}>または</div>

          {/* ソーシャルログイン */}
          <div className={styles.socialButtons}>
            <button type="button" onClick={() => handleSocialLogin("google")} className={`${styles.socialButton} ${styles.googleButton}`} disabled={isSubmitting}>
              <svg width="18" height="18" viewBox="0 0 24 24" className={styles.socialIcon}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.68-5.32 3.68-8.74Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.54 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.22A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.45 14.33a7.14 7.14 0 0 1 0-4.66V6.45H1.31a12 12 0 0 0 0 11.1l4.14-3.22Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A12 12 0 0 0 1.31 6.45L5.45 9.67c.92-2.77 3.5-4.83 6.55-4.83Z" />
              </svg>
              Googleでログイン
            </button>
            <button type="button" onClick={() => handleSocialLogin("apple")} className={`${styles.socialButton} ${styles.appleButton}`} disabled={isSubmitting}>
              <Image src="/apple_rainbow.svg" alt="Apple logo" className={styles.socialIcon} style={{ width: "16px", height: "16px" }} width={16} height={16} />
              Appleでサインイン
            </button>
          </div>

          {/* 新規登録 */}
          <div className={styles.cardFooter}>
            アカウントをお持ちでないですか？
            <Link href="/signup" className={styles.signupLink}>
              新規登録はこちら
            </Link>
          </div>

          <div className={styles.cardFooter} style={{ marginTop: "12px", borderTop: "1px dashed #e1e5f2", paddingTop: "12px" }}>
            店舗の方はこちら：
            <Link href="/signup/store" className={styles.signupLink} style={{ color: "#003db3", fontWeight: "bold" }}>
              店舗用アカウントの新規登録
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>&copy; 2024 SecureAuth Inc.</p>
      </footer>
    </div>
  );
}