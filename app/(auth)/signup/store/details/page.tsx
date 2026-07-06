"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faLock, 
  faCheck, 
  faCircleCheck, 
  faSpinner, 
  faShieldHalved, 
  faChevronRight, 
  faCamera,
  faEye,
  faEyeSlash
} from "@fortawesome/free-solid-svg-icons";
import styles from "../StoreDetails.module.css";

// Firebase Auth, Storage, and Centralized Firestore Database Operations
import { onAuthStateChanged, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/src/firebase/firebase";
import { getUserProfile, saveUserProfile } from "@/src/firebase/userDb";

// 都道府県リスト
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

interface FormData {
  shopName: string;
  shopIntroduction: string;
  shopPhoneNumber: string;
  email: string;
  postalCode: string;
  prefecture: string;
  addressDetail: string;
  buildingName: string;
  profileImage: string;
}

export default function StoreSignupDetailsPage() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // 画面状態 ('loading': 読み込み中, 2: プロフィール入力, 3: 登録完了)
  const [step, setStep] = useState(2);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // プロフィール画像の状態
  const [, setOriginalFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // クロップ処理用状態
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [zoom, setZoom] = useState(1.0);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgDisplaySize, setImgDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [savedCropPosition, setSavedCropPosition] = useState<any>(null);
  const [isImageAlreadySet, setIsImageAlreadySet] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState<FormData>({
    shopName: "",
    shopIntroduction: "",
    shopPhoneNumber: "",
    email: "",
    postalCode: "",
    prefecture: "東京都",
    addressDetail: "",
    buildingName: "",
    profileImage: "",
  });

  // パスワード変更
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 認証状態の監視 & Firestore情報の取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const data: any = await getUserProfile(user.uid);
          
          if (data) {
            // 他のアカウントタイプで店舗登録画面に来た場合はリダイレクト
            if (data.userType && data.userType !== "shop") {
              router.replace("/signup/details");
              return;
            }

            // すでに登録完了している場合はトップへリダイレクト
            if (data.isProfileCompleted || data.isRegistered) {
              router.replace("/");
              return;
            }

            const address: any = data.address || {};
            const profileImageMap: any = data.profileImage || {};
            
            let imageUrl = "";
            let cropPos = null;
            if (typeof profileImageMap === "string") {
              imageUrl = profileImageMap;
            } else if (profileImageMap && typeof profileImageMap === "object") {
              imageUrl = profileImageMap.url || "";
              cropPos = profileImageMap.cropPosition || null;
            }

            setFormData((prev) => ({
              ...prev,
              shopName: data.displayName || "",
              shopIntroduction: data.shopIntroduction || "",
              shopPhoneNumber: data.shopPhoneNumber || "",
              email: data.email || user.email || "",
              postalCode: address.postalCode || data.postalCode || "",
              prefecture: address.prefecture || data.prefecture || "東京都",
              addressDetail: address.addressDetail || data.addressDetail || "",
              buildingName: address.buildingName || data.buildingName || "",
              profileImage: imageUrl,
            }));

            if (imageUrl) {
              setAvatarPreview(imageUrl);
              setIsImageAlreadySet(true);
            }
            if (cropPos) {
              setSavedCropPosition(cropPos);
            }
          } else {
            // ドキュメントがない場合も、このURLにいる時点で店舗ユーザーとして扱う
            setFormData((prev) => ({
              ...prev,
              email: user.email || "",
            }));
          }
        } catch (err) {
          console.error("Firestore loading error:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // ログインしていない場合はログイン画面へ
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ローカルプレビューURLのクリーンアップ（メモリリーク対策）
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // 入力値バリデーション判定
  const isShopNameValid = formData.shopName.trim().length > 0 && formData.shopName.length <= 50;
  const isShopIntroductionValid = formData.shopIntroduction.trim().length >= 50 && formData.shopIntroduction.length <= 2000;
  
  // ハイフンなしの半角数字15桁以内
  const isShopPhoneNumberValid = /^[0-9]{10,15}$/.test(formData.shopPhoneNumber.replace(/-/g, ""));
  
  const isAddressValid = 
    formData.postalCode.replace(/-/g, "").length === 7 && 
    !!formData.prefecture && 
    formData.addressDetail.trim().length > 0;

  // パスワード確認（12〜64文字、英大文字・英小文字・数字の混在必須。空の場合は変更なしのため有効）
  const isPasswordValid = 
    newPassword === "" || 
    (newPassword.length >= 12 && 
     newPassword.length <= 64 && 
     /[A-Z]/.test(newPassword) && 
     /[a-z]/.test(newPassword) && 
     /[0-9]/.test(newPassword));

  // 郵便番号から住所を自動検索する処理
  const handleZipSearch = async () => {
    const cleanZip = formData.postalCode.replace(/-/g, "");
    if (cleanZip.length !== 7) {
      alert("郵便番号は7桁の数字で入力してください。");
      return;
    }

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
      if (!response.ok) throw new Error("Zip API response error");
      const data = await response.json();
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        setFormData((prev) => ({
          ...prev,
          prefecture: result.address1, // 都道府県
          addressDetail: result.address2 + result.address3, // 市区町村＋町域
        }));
      } else {
        alert("該当する住所が見つかりませんでした。郵便番号をご確認ください。");
      }
    } catch (err) {
      console.error("Zip search error:", err);
      alert("住所の取得中にエラーが発生しました。");
    }
  };

  // アバター画像クリック時の処理
  const handleAvatarClick = () => {
    if (isImageAlreadySet) return; // 既に画像がある場合は編集不可
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択変更時の処理（切り抜きモーダルを開く）
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選択してください。");
        return;
      }
      setOriginalFile(file); // 元のファイルを保存
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCropSrc(event.target.result as string);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // クロップオフセット制限
  const clampOffset = (x: number, y: number, currentZoom: number) => {
    const w = imgDisplaySize.width * currentZoom;
    const h = imgDisplaySize.height * currentZoom;
    const minX = 240 - w;
    const maxX = 40;
    const clampedX = Math.min(Math.max(x, minX), maxX);
    const minY = 240 - h;
    const maxY = 40;
    const clampedY = Math.min(Math.max(y, minY), maxY);
    return { x: clampedX, y: clampedY };
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setCropOffset((prev) => clampOffset(prev.x, prev.y, newZoom));
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    let w = 280;
    let h = 280;
    if (naturalWidth > naturalHeight) {
      w = (naturalWidth / naturalHeight) * 280;
    } else {
      h = (naturalHeight / naturalWidth) * 280;
    }
    setImgDisplaySize({ width: w, height: h });
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setCropOffset({
      x: (280 - w) / 2,
      y: (280 - h) / 2,
    });
    setZoom(1.0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    setCropOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - cropOffset.x,
        y: e.touches[0].clientY - cropOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStartRef.current.x;
    const rawY = e.touches[0].clientY - dragStartRef.current.y;
    setCropOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleCropApply = () => {
    if (!cropSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        const scale = naturalSize.width / (imgDisplaySize.width * zoom);
        const sx = (40 - cropOffset.x) * scale;
        const sy = (40 - cropOffset.y) * scale;
        const sw = 200 * scale;
        const sh = 200 * scale;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 400);
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], "avatar.jpeg", { type: "image/jpeg" });
            setAvatarFile(croppedFile);
            const localUrl = URL.createObjectURL(blob);
            setAvatarPreview(localUrl);
            setSavedCropPosition(null);
          }
          setIsCropperOpen(false);
        }, "image/jpeg", 0.85);
      }
    };
    img.src = cropSrc;
  };

  const handleCropCancel = () => {
    setIsCropperOpen(false);
    setCropSrc("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getCroppedImgStyle = (cropPos: any, containerSize = 90) => {
    if (!cropPos) return { width: "100%", height: "100%", objectFit: "cover" as const };
    const ratio = containerSize / 200;
    return {
      position: "absolute" as const,
      left: `${(cropPos.offsetX - 40) * ratio}px`,
      top: `${(cropPos.offsetY - 40) * ratio}px`,
      width: `${(cropPos.displayW * cropPos.zoom) * ratio}px`,
      height: `${(cropPos.displayH * cropPos.zoom) * ratio}px`,
      maxWidth: "none",
    };
  };

  // プロフィール情報登録の送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isShopNameValid || !isShopIntroductionValid || !isShopPhoneNumberValid || !isAddressValid || !isPasswordValid) {
      setError("入力内容に不備があります。必須項目を正しく入力してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (!currentUser) throw new Error("セッションが切断されました。");

      let imageUrl = formData.profileImage;

      // 画像のアップロード
      if (avatarFile) {
        try {
          const storageRef = ref(storage, `users/${currentUser.uid}/profile_image.jpeg`);
          const uploadResult = await uploadBytes(storageRef, avatarFile, {
            contentType: "image/jpeg",
          });
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (imgErr: any) {
          console.error("Profile image upload failed:", imgErr);
          throw new Error("店舗画像のアップロードに失敗しました: " + imgErr.message);
        }
      }

      // パスワードの変更が入力されている場合は更新
      if (newPassword !== "") {
        try {
          await updatePassword(currentUser, newPassword);
        } catch (passErr: any) {
          console.error("Password update failed:", passErr);
          if (passErr.code === "auth/requires-recent-login") {
            throw new Error("セキュリティ確保のため、パスワード変更には再ログインが必要です。一度ログアウトし、再ログインしてからお試しください。");
          }
          throw new Error("パスワードの変更に失敗しました: " + passErr.message);
        }
      }

      const payload = {
        displayName: formData.shopName,
        shopIntroduction: formData.shopIntroduction,
        shopPhoneNumber: formData.shopPhoneNumber.replace(/-/g, ""),
        address: {
          postalCode: formData.postalCode,
          prefecture: formData.prefecture,
          addressDetail: formData.addressDetail,
          buildingName: formData.buildingName,
        },
        profileImage: imageUrl || null,
        userType: "shop" as const,
        isProfileCompleted: true,
        isRegistered: true,
        updatedAt: new Date().toISOString()
      };

      // Firestoreに保存
      await saveUserProfile(currentUser.uid, payload);

      // セッションCookieの有効期限を更新
      const expireTime = 60 * 60 * 24; // 1日
      document.cookie = `session=${encodeURIComponent(currentUser.email || currentUser.uid)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

      // 完了画面へ
      setStep(3);
    } catch (err: any) {
      console.error("Submit profile error:", err);
      setError(err.message || "店舗情報の登録に失敗しました。お手数ですが時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => {
    return (
      <div className={styles.progressContainer}>
        <div className={styles.progressSteps}>
          {/* Step 1 */}
          <div className={styles.step}>
            <div className={`${styles.stepCircle} ${styles.stepCircleCompleted}`}>
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <span className={`${styles.stepLabel} ${styles.stepLabelActive}`}>認証</span>
          </div>
          
          <div className={`${styles.stepLine} ${styles.stepLineLeft} ${styles.stepLineCompleted}`}></div>

          {/* Step 2 */}
          <div className={styles.step}>
            <div className={`${styles.stepCircle} ${step >= 2 ? (step === 2 ? styles.stepCircleActive : styles.stepCircleCompleted) : ""}`}>
              {step > 2 ? <FontAwesomeIcon icon={faCheck} /> : "2"}
            </div>
            <span className={`${styles.stepLabel} ${step >= 2 ? styles.stepLabelActive : ""}`}>プロフィール</span>
          </div>

          <div className={`${styles.stepLine} ${styles.stepLineRight} ${step === 3 ? styles.stepLineCompleted : ""}`}></div>

          {/* Step 3 */}
          <div className={styles.step}>
            <div className={`${styles.stepCircle} ${step === 3 ? styles.stepCircleActive : ""}`}>
              {step === 3 ? <FontAwesomeIcon icon={faCheck} /> : "3"}
            </div>
            <span className={`${styles.stepLabel} ${step === 3 ? styles.stepLabelActive : ""}`}>完了</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.pageWrapper} ${timeOfDay}`}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => router.push("/")}>
          <div className={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 8.5 9 10 10.5 10.5C9 11 7.5 12.5 7.5 14.5C7.5 17 9.5 19 12 19C14.5 19 16.5 17 16.5 14.5C16.5 12.5 15 11 13.5 10.5C15 10 16.5 8.5 16.5 6.5C16.5 4 14.5 2 12 2Z" fill="#3b82f6" />
              <circle cx="12" cy="12" r="3" fill="#60a5fa" />
            </svg>
          </div>
          <span className={styles.logoText}>マチアプ</span>
        </div>
      </header>

      {/* ステップ進捗バー */}
      {renderProgressBar()}

      {/* メインカード */}
      <main className={styles.mainContent}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#003db3" }} />
              <p>ユーザー情報を読み込み中...</p>
            </div>
          ) : step === 2 ? (
            /* STEP 2: 店舗プロフィール登録フォーム */
            <>
              <div className={styles.titleArea}>
                <h1 className={styles.title}>プロフィール情報入力</h1>
                <p className={styles.subtitle}>
                  店舗の基本情報を設定してください。
                </p>
              </div>

              {/* 店舗画像アップローダー */}
              <div className={styles.avatarUploadContainer}>
                <div 
                  className={styles.avatarWrapper} 
                  onClick={handleAvatarClick}
                  style={{ cursor: isImageAlreadySet ? "default" : "pointer" }}
                >
                  <div className={styles.avatarCircle}>
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="店舗画像" 
                        className={styles.avatarImage} 
                        style={getCroppedImgStyle(savedCropPosition, 90)}
                      />
                    ) : (
                      <svg className={styles.avatarPlaceholder} viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    )}
                  </div>
                  {!isImageAlreadySet && (
                    <div className={styles.cameraBadge}>
                      <FontAwesomeIcon icon={faCamera} />
                    </div>
                  )}
                </div>
                <span 
                  className={styles.avatarLabel} 
                  onClick={handleAvatarClick}
                  style={{ cursor: isImageAlreadySet ? "default" : "pointer" }}
                >
                  画像を選択
                </span>
                <p className={styles.avatarSubtext}>
                  {isImageAlreadySet ? "画像は変更できません" : "店舗の雰囲気が伝わります"}
                </p>
                <p className={styles.avatarSubtext} style={{ fontSize: "9px", color: "#a0aec0" }}>
                  PNG, JPG, HEIC、最大4MB
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={isImageAlreadySet}
                />
              </div>

              {error && (
                <div style={{ color: "#ef4444", fontSize: "14px", marginBottom: "20px", textAlign: "center", lineHeight: "1.4" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                
                {/* 実店舗名 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="shopName" className={styles.label}>
                      実店舗名 <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isShopNameValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="shopName"
                      type="text"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value.slice(0, 50) })}
                      placeholder="例：カフェ・マチアブ 渋谷店"
                      className={styles.input}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <p className={styles.hint}></p>
                    <p style={{ fontSize: "11px", color: "#7b8ab8", margin: 0 }}>
                      {formData.shopName.length}/50
                    </p>
                  </div>
                </div>

                {/* 店舗紹介 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="shopIntroduction" className={styles.label}>
                      店舗紹介 <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isShopIntroductionValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <textarea
                      id="shopIntroduction"
                      value={formData.shopIntroduction}
                      onChange={(e) => setFormData({ ...formData, shopIntroduction: e.target.value.slice(0, 2000) })}
                      placeholder="お店のこだわりや特徴、提供している体験について50文字以上で詳しく記入してください。"
                      className={styles.input}
                      style={{ minHeight: "150px", resize: "none", lineHeight: "1.6" }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    {formData.shopIntroduction.length > 0 && formData.shopIntroduction.length < 50 ? (
                      <p style={{ fontSize: "11px", color: "#ef4444", margin: 0, fontWeight: "bold" }}>
                        ※最低50文字必要です
                      </p>
                    ) : (
                      <p className={styles.hint}></p>
                    )}
                    <p style={{ fontSize: "11px", color: "#7b8ab8", margin: 0 }}>
                      {formData.shopIntroduction.length}/2000
                    </p>
                  </div>
                </div>

                {/* 店舗電話番号 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="shopPhoneNumber" className={styles.label}>
                      店舗電話番号 <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isShopPhoneNumberValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="shopPhoneNumber"
                      type="text"
                      value={formData.shopPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, shopPhoneNumber: e.target.value.replace(/-/g, "").slice(0, 15) })}
                      placeholder="例：0312345678"
                      className={styles.input}
                      required
                    />
                  </div>
                  <p className={styles.hint}>ハイフンなしの半角数字（15桁以内）</p>
                </div>

                {/* 所在地 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="postalCode" className={styles.label}>
                      所在地 <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isAddressValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  
                  {/* 郵便番号 */}
                  <div className={styles.postalSearchGroup}>
                    <div className={styles.inputWrapper}>
                      <input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="1500002"
                        className={styles.input}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleZipSearch}
                      className={styles.searchButton}
                    >
                      住所検索
                    </button>
                  </div>

                  {/* 都道府県 */}
                  <div className={styles.inputWrapper} style={{ marginTop: "8px" }}>
                    <select
                      value={formData.prefecture}
                      onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                      className={`${styles.input} ${styles.selectInput}`}
                      required
                      aria-label="都道府県"
                    >
                      <option value="">都道府県を選択してください</option>
                      {PREFECTURES.map((pref) => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                  </div>

                  {/* 市区町村・番地 */}
                  <div className={styles.inputWrapper} style={{ marginTop: "8px" }}>
                    <input
                      type="text"
                      value={formData.addressDetail}
                      onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                      placeholder="例：渋谷区神南1-1-1"
                      className={styles.input}
                      required
                      aria-label="市区町村・番地"
                    />
                  </div>

                  {/* 建物名・部屋番号 */}
                  <div className={styles.inputWrapper} style={{ marginTop: "8px" }}>
                    <input
                      type="text"
                      value={formData.buildingName}
                      onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                      placeholder="例：マチアプビル 201"
                      className={styles.input}
                      aria-label="建物名・部屋番号"
                    />
                  </div>
                </div>

                {/* アカウント管理 */}
                <h2 className={styles.sectionHeader}>アカウント管理</h2>

                {/* ログインID */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="email" className={styles.label}>
                      ログインID（メールアドレス）
                    </label>
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      readOnly
                      disabled
                      className={`${styles.input} ${styles.lockedInput}`}
                    />
                    <FontAwesomeIcon icon={faLock} className={styles.lockIcon} />
                  </div>
                  <p className={styles.hint}>IDは登録後に変更することはできません。</p>
                </div>

                {/* パスワード確認・変更 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="newPassword" className={styles.label}>
                      パスワードの確認・変更
                    </label>
                    {newPassword !== "" && isPasswordValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`${styles.input} ${styles.passwordInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeButton}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#7b8ab8",
                        cursor: "pointer"
                      }}
                      aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                  <p className={styles.hint}>※パスワードを変更したい場合のみ入力してください。</p>
                  {newPassword !== "" && !isPasswordValid && (
                    <p style={{ fontSize: "11px", color: "#ef4444", margin: "4px 0 0 0", fontWeight: "bold" }}>
                      12文字以上64文字以内、英大文字・英小文字・数字の混在必須。
                    </p>
                  )}
                </div>

                {/* 個人情報保護に関する文言 */}
                <div className={styles.infoBox}>
                  <FontAwesomeIcon icon={faShieldHalved} className={styles.infoIcon} />
                  <p className={styles.infoText}>
                    入力された所在地情報は本人確認および規約に基づくマッチング精度の向上のためにのみ使用され、他の一般ユーザーに無断で公開されることはありません。
                  </p>
                </div>

                {/* 送信ボタン */}
                <button 
                  type="submit" 
                  className={styles.submitButton} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      登録処理中...
                    </>
                  ) : (
                    <>
                      次へ進む
                      <FontAwesomeIcon icon={faChevronRight} />
                    </>
                  )}
                </button>

              </form>
            </>
          ) : (
            /* STEP 3: 登録完了画面 */
            <div className={styles.successContainer}>
              <div className={styles.successIconWrapper} style={{ overflow: "hidden", position: "relative" }}>
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="店舗画像" 
                    className={styles.avatarImage}
                    style={getCroppedImgStyle(savedCropPosition, 80)}
                  />
                ) : (
                  <FontAwesomeIcon icon={faCircleCheck} className={styles.successIcon} />
                )}
              </div>
              <h1 className={styles.title}>アカウント登録が完了しました！</h1>
              <p className={styles.subtitle} style={{ marginBottom: "32px" }}>
                マチアプへようこそ。店舗情報の詳細登録がすべて完了し、アカウントの有効化に成功しました。
              </p>

              <button 
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }} 
                className={styles.submitButton}
              >
                はじめる
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 切り抜き用モーダル */}
      {isCropperOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>画像の切り抜き</h2>
            
            <div 
              className={styles.cropperViewport}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={cropSrc}
                alt="Crop Target"
                className={styles.cropperImage}
                onLoad={handleImageLoad}
                style={{
                  left: `${cropOffset.x}px`,
                  top: `${cropOffset.y}px`,
                  width: `${imgDisplaySize.width * zoom}px`,
                  height: `${imgDisplaySize.height * zoom}px`,
                }}
              />
              <div className={styles.cropOverlayCircle}></div>
            </div>
            
            {/* ズームスライダー */}
            <div className={styles.sliderContainer}>
              <span className={styles.sliderIcon} style={{ fontSize: "12px" }}>A</span>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className={styles.slider}
                aria-label="ズーム"
              />
              <span className={styles.sliderIcon} style={{ fontSize: "18px" }}>A</span>
            </div>
            
            {/* 操作ボタン */}
            <div className={styles.modalButtons}>
              <button 
                type="button" 
                onClick={handleCropCancel} 
                className={styles.cancelButton}
              >
                キャンセル
              </button>
              <button 
                type="button" 
                onClick={handleCropApply} 
                className={styles.applyButton}
              >
                切り取る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>マチアプ &copy; 2024 ||||. All rights reserved.</p>
      </footer>
    </div>
  );
}
