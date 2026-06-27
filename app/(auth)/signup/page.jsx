"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "./Signup.module.css";

// Firebase Auth & Centralized Firestore Database Operations
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/src/firebase/firebase";
import { saveUserProfile, updateUserProfile } from "@/src/firebase/userDb";

export default function SignupPage() {
  const router = useRouter();
  
  // 画面ステップ管理 ('register': アカウント作成フォーム, 'verify': メール認証待機画面)
  const [step, setStep] = useState("register");
  
  // フォーム入力値 (姓名・フリガナ分割)
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameKana, setLastNameKana] = useState("");
  const [firstNameKana, setFirstNameKana] = useState("");
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
            
            // 3. 詳細登録ページへ遷移
            router.push("/signup/details");
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

  // ひらがなを全角カタカナに変換するヘルパー関数
  const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) + 0x60);
    });
  };

  // お名前（姓）入力変更時のハンドラ
  const handleLastNameChange = (val) => {
    setLastName(val);
    
    // 入力値が「ひらがな・カタカナ・長音・スペース」のみの場合にフリガナへ自動コピー
    const isKanaOrAlpha = /^[ぁ-んァ-ンー\s]*$/.test(val);
    if (isKanaOrAlpha) {
      setLastNameKana(toKatakana(val));
    }
  };

  // お名前（名）入力変更時のハンドラ
  const handleFirstNameChange = (val) => {
    setFirstName(val);
    
    // 入力値が「ひらがな・カタカナ・長音・スペース」のみの場合にフリガナへ自動コピー
    const isKanaOrAlpha = /^[ぁ-んァ-ンー\s]*$/.test(val);
    if (isKanaOrAlpha) {
      setFirstNameKana(toKatakana(val));
    }
  };

  // アカウント新規登録処理
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!lastName || !firstName || !lastNameKana || !firstNameKana || !email || !password) {
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

      // 2. displayName（姓名を結合した文字列）を設定
      const fullName = `${lastName} ${firstName}`;
      await updateProfile(user, { displayName: fullName });

      // 3. Firebase標準の確認メール（検証用リンク）を送信
      await sendEmailVerification(user);

      // 4. Firestoreにアカウント情報を一時登録（認証ステータス: false）
      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email || "",
        lastName,
        firstName,
        lastNameKana,
        firstNameKana,
        displayName: fullName,
        isVerified: false,
        createdAt: new Date().toISOString()
      });

      // 5. メール認証待機ステップへ移行
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

        // 3. 詳細登録ページへ遷移
        router.push("/signup/details");
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

  // ソーシャルサインアップ（Google/Apple）
  const handleSocialSignup = async (providerName) => {
    setIsSubmitting(true);
    setError("");
    setInfoMessage("");
    const provider = providerName === "google" ? googleProvider : appleProvider;

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ソーシャルログインの場合は、すでに外部で本人確認済みのため、メール認証はスキップし直接有効化
      const [socialLastName, socialFirstName] = (user.displayName || "").split(" ");
      
      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email || "",
        lastName: socialLastName || "",
        firstName: socialFirstName || user.displayName || "",
        lastNameKana: "",
        firstNameKana: "",
        displayName: user.displayName || providerName + "-user",
        isVerified: true, // ソーシャルは初期から有効
        createdAt: new Date().toISOString()
      });

      // セッションCookieを作成
      const expireTime = 60 * 60 * 24; // 1日
      document.cookie = `session=${encodeURIComponent(user.email || user.uid)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

      // 別の詳細登録ページへ遷移
      router.push("/signup/details");
      router.refresh();
    } catch (err) {
      console.error("Social signup error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(`${providerName === "google" ? "Google" : "Apple"}での登録に失敗しました。`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
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
            /* STEP 1: 通常のアカウント作成画面 */
            <>
              <div className={styles.titleArea}>
                <h1 className={styles.title}>アカウント作成</h1>
                <p className={styles.subtitle}>必要事項を入力して登録を完了してください</p>
              </div>

              {error && <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>{error}</div>}

              <form onSubmit={handleSignupSubmit} className={styles.form}>
                
                {/* お名前入力 (姓・名横並び) */}
                <div className={styles.gridRow}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                      お名前（姓）
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        placeholder="山田"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                      お名前（名）
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        placeholder="太郎"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* フリガナ入力 (セイ・メイ横並び) */}
                <div className={styles.gridRow}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="lastNameKana" className={styles.label}>
                      フリガナ（セイ）
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="lastNameKana"
                        type="text"
                        value={lastNameKana}
                        onChange={(e) => setLastNameKana(e.target.value)}
                        placeholder="ヤマダ"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="firstNameKana" className={styles.label}>
                      フリガナ（メイ）
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="firstNameKana"
                        type="text"
                        value={firstNameKana}
                        onChange={(e) => setFirstNameKana(e.target.value)}
                        placeholder="タロウ"
                        className={styles.input}
                        required
                      />
                    </div>
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
                  {isSubmitting ? "登録中..." : "登録する"}
                </button>
              </form>

              {/* または */}
              <div className={styles.divider}>または</div>

              {/* ソーシャルサインアップ */}
              <div className={styles.socialButtons}>
                <button type="button" onClick={() => handleSocialSignup("google")} className={`${styles.socialButton} ${styles.googleButton}`} disabled={isSubmitting}>
                  <svg width="18" height="18" viewBox="0 0 24 24" className={styles.socialIcon}>
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.68-5.32 3.68-8.74Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.54 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.22A12 12 0 0 0 12 24Z" />
                    <path fill="#FBBC05" d="M5.45 14.33a7.14 7.14 0 0 1 0-4.66V6.45H1.31a12 12 0 0 0 0 11.1l4.14-3.22Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A12 12 0 0 0 1.31 6.45L5.45 9.67c.92-2.77 3.5-4.83 6.55-4.83Z" />
                  </svg>
                  Googleで登録
                </button>
                <button type="button" onClick={() => handleSocialSignup("apple")} className={`${styles.socialButton} ${styles.appleButton}`} disabled={isSubmitting}>
                  <img src="/apple_rainbow.svg" alt="Apple logo" className={styles.socialIcon} style={{ width: "16px", height: "16px" }} />
                  Appleでサインアップ
                </button>
              </div>

              {/* ログインへ */}
              <div className={styles.cardFooter}>
                すでにアカウントをお持ちですか？
                <Link href="/login" className={styles.signupLink}>
                  ログインはこちら
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
                  ご登録のメールアドレス宛に確認メールを送信しました。<br />
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