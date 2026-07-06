"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "../Signup.module.css";

// Firebase Auth & Centralized Firestore Database Operations
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";
import { saveUserProfile, updateUserProfile } from "@/src/firebase/userDb";

export default function StoreSignupPage() {
  const router = useRouter();
  const [timeOfDay, setTimeOfDay] = useState("night");

  // 現在の時刻に基づいて時間帯（朝・昼・夜）を判定
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) {
      setTimeOfDay("morning");
    } else if (hours >= 11 && hours < 18) {
      setTimeOfDay("noon");
    } else {
      // 夜の場合は通常夜(night)とランダム夜(night2)を判定
      const isNight2 = Math.random() < 0.3; // 30%の確率でnight-2.avifを表示
      setTimeOfDay(isNight2 ? "night2" : "night");
    }
  }, []);
  
  // 画面ステップ管理 ('register': アカウント作成フォーム, 'verify': メール認証待機画面)
  const [step, setStep] = useState("register");
  
  // フォーム入力値
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 状態管理
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // すでにセッションCookieがある場合はトップページへリダイレクト
  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasSession = cookies.some((cookie) => cookie.trim().startsWith("session="));
    if (hasSession) {
      router.replace("/");
    }
  }, [router]);

  // メール認証の自動検知（ポーリング）
  useEffect(() => {
    let intervalId;
    if (step === "verify" && auth.currentUser) {
      intervalId = setInterval(async () => {
        try {
          // 現在のユーザー情報をリロードして最新の認証状態（emailVerified）を取得
          await auth.currentUser.reload();
          
          if (auth.currentUser.emailVerified) {
            clearInterval(intervalId);
            
            // 1. Firestoreのステータスを更新（isVerified = true）
            await updateUserProfile(auth.currentUser.uid, { isVerified: true });
            
            // 2. セッションCookieを作成
            const expireTime = 60 * 60 * 24; // 1日
            document.cookie = `session=${encodeURIComponent(auth.currentUser.email)}; path=/; max-age=${expireTime}; SameSite=Lax;`;
            
            // 3. 店舗用の詳細登録ページへ遷移
            router.push("/signup/store/details");
            router.refresh();
          }
        } catch (err) {
          console.error("Poller error reloading user:", err);
        }
      }, 3000); // 3秒間隔でチェック
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, router]);

  // アカウント新規登録処理
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("すべての項目を入力してください。");
      return;
    }

    if (email.includes("+")) {
      setError("メールアドレスに「+」記号を使用することはできません。");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setInfoMessage("");

    try {
      // 1. Firebase Auth でアカウント作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firebase標準の確認メール（検証用リンク）を送信
      await sendEmailVerification(user);

      // 3. Firestoreにアカウント情報を一時登録（認証ステータス: false, userType: 'shop'）
      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email || "",
        userType: "shop",
        isVerified: false,
        createdAt: new Date().toISOString()
      });

      // 4. メール認証待機ステップへ移行
      setStep("verify");
      setInfoMessage("確認メールを送信しました。メールボックスを確認してください。");
    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("このメールアドレスはすでに登録されています。");
      } else if (err.code === "auth/invalid-email") {
        setError("メールアドレスの形式が正しくありません。");
      } else if (err.code === "auth/weak-password") {
        setError("パスワードが弱すぎます。8文字以上の英数字にしてください。");
      } else {
        setError("登録に失敗しました。入力内容を確認してください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 手動でメール認証状態を確認する処理
  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setError("");
    setInfoMessage("");

    try {
      // ユーザーの認証状態を最新化
      await auth.currentUser.reload();

      if (auth.currentUser.emailVerified) {
        // 1. Firestoreのステータスを更新
        await updateUserProfile(auth.currentUser.uid, { isVerified: true });

        // 2. セッションCookieを作成
        const expireTime = 60 * 60 * 24; // 1日
        document.cookie = `session=${encodeURIComponent(auth.currentUser.email)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

        // 3. 店舗用詳細登録ページへ遷移
        router.push("/signup/store/details");
        router.refresh();
      } else {
        setError("メール認証が完了していません。届いたメールのURLリンクをクリックしてください。");
      }
    } catch (err) {
      console.error("Check verification error:", err);
      setError("確認処理中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 確認メールの再送信処理
  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setError("");
    setInfoMessage("");

    try {
      await sendEmailVerification(auth.currentUser);
      setInfoMessage("確認メールを再送信しました。メールボックスをご確認ください。");
    } catch (err) {
      console.error("Resend email error:", err);
      if (err.code === "auth/too-many-requests") {
        setError("送信リクエストが多すぎます。少し時間をおいてから再試行してください。");
      } else {
        setError("メールの再送信に失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 待機状態からキャンセルして戻る処理
  const handleCancelVerify = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out on cancel error:", err);
    }
    // 登録画面の状態をリセットして初期フォームに戻る
    setStep("register");
    setError("");
    setInfoMessage("");
  };

  return (
    <div className={`${styles.pageWrapper} ${timeOfDay}`}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => router.push("/")}>
          <img src="/logo.png" alt="マチアプ" className={styles.logoImage} />
          <span className={styles.logoText}>マチアプ</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.mainContent}>
        <div className={styles.card}>
          {step === "register" ? (
            /* STEP 1: 店舗用アカウント作成画面 */
            <>
              <div className={styles.titleArea}>
                <h1 className={styles.title}>店舗アカウント作成</h1>
                <p className={styles.subtitle}>メールアドレスを入力して登録を開始してください</p>
              </div>

              {error && <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>{error}</div>}

              <form onSubmit={handleSignupSubmit} className={styles.form}>
                
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
                      placeholder="store-admin@example.com"
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
                  {isSubmitting ? "登録中..." : "登録する"}
                </button>
              </form>

              {/* ログイン・通常登録へ */}
              <div className={styles.cardFooter}>
                すでにアカウントをお持ちですか？
                <Link href="/login" className={styles.signupLink}>
                  ログインはこちら
                </Link>
              </div>

              <div className={styles.cardFooter} style={{ marginTop: "12px", borderTop: "1px dashed #e1e5f2", paddingTop: "12px" }}>
                一般・議員の方はこちら：
                <Link href="/signup" className={styles.signupLink} style={{ color: "#003db3", fontWeight: "bold" }}>
                  一般アカウントの新規登録
                </Link>
              </div>
            </>
          ) : (
            /* STEP 2: メール認証確認リンク待機画面 */
            <>
              <div className={styles.titleArea}>
                <div className={styles.emailIconWrapper}>
                  <FontAwesomeIcon icon={faEnvelope} className={styles.emailIcon} />
                </div>
                <h1 className={styles.title}>メール認証を実施中</h1>
                <p className={styles.subtitle}>
                  ご登録の店舗メールアドレス宛に確認メールを送信しました。<br />
                  メールに記載されているリンクをクリックして<br />
                  認証を完了してください。
                </p>
                <div className={styles.emailBox}>
                  <strong>{email}</strong>
                </div>
              </div>

              {error && <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>{error}</div>}
              {infoMessage && <div style={{ color: "#10b981", fontSize: "14px", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>{infoMessage}</div>}

              {/* ポーリング待機アニメーション */}
              <div className={styles.spinnerContainer}>
                <FontAwesomeIcon icon={faSpinner} spin className={styles.spinner} />
                <span className={styles.spinnerText}>認証メールの確認を待機中...</span>
              </div>

              <div className={styles.form}>
                <button type="button" onClick={handleCheckVerification} className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? "確認中..." : "メールの確認を完了しました"}
                </button>
              </div>

              <div className={styles.cardFooter}>
                メールが届かない場合は？ 
                <button 
                  type="button" 
                  onClick={handleResendEmail} 
                  disabled={isSubmitting}
                  style={{ background: "none", border: "none", color: "#0052cc", fontWeight: "700", cursor: "pointer", marginLeft: "4px" }}
                >
                  再送信する
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button 
                  type="button" 
                  onClick={handleCancelVerify}
                  style={{ background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  キャンセルして戻る
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>&copy; 2024 SecureAuth Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
