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
  faCamera
} from "@fortawesome/free-solid-svg-icons";
import styles from "./Details.module.css";

// Firebase Auth, Storage, and Centralized Firestore Database Operations
import { onAuthStateChanged } from "firebase/auth";
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
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  nickname: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  postalCode: string;
  prefecture: string;
  addressDetail: string;
  buildingName: string;
  profileImage: string;
  politicalParty: string;
  pledge: string;
}

export default function SignupDetailsPage() {
  const router = useRouter();
  const [timeOfDay, setTimeOfDay] = useState("night");

  // 現在の時刻に基づいて時間帯（朝・昼・夜）を判定
  useEffect(() => {
    const hours = new Date().getHours();
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // 画面状態 ('loading': 読み込み中, 2: プロフィール入力, 3: 登録完了)
  const [step, setStep] = useState(2);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 新規追加: アカウント種別 ('general': 一般, 'politician': 議員) & ソーシャルユーザー判定
  const [accountType, setAccountType] = useState("general");
  const [isSocialUser, setIsSocialUser] = useState(false);

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
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    nickname: "",
    birthYear: "1995",
    birthMonth: "5",
    birthDay: "15",
    postalCode: "",
    prefecture: "東京都",
    addressDetail: "",
    buildingName: "",
    profileImage: "",
    politicalParty: "", // 議員用: 政党
    pledge: "",         // 議員用: 公約・活動方針
  });

  // 生年月日用の選択肢生成
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  // 18歳以上を対象にする（現在年-18歳から1940年まで）
  const maxYear = currentYear - 18;
  for (let y = maxYear; y >= 1940; y--) {
    years.push(y);
  }
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // 認証状態の監視 & Firestore情報の取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // ソーシャルアカウント（Google/Apple）判定
        const providers = user.providerData.map((p) => p.providerId);
        const isSocial = providers.includes("google.com") || providers.includes("apple.com");
        setIsSocialUser(isSocial);

        try {
          const data: any = await getUserProfile(user.uid);
          
          if (data) {
            // すでに登録完了している場合はトップへリダイレクト
            if (data.isProfileCompleted || data.isRegistered) {
              router.replace("/");
              return;
            }

            // userType が保存されている場合はセット
            if (data.userType) {
              setAccountType(data.userType);
            } else if (isSocial) {
              setAccountType("general");
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

            let bYear = "1995";
            let bMonth = "5";
            let bDay = "15";
            if (data.birthDate) {
              const parts = data.birthDate.split("-");
              if (parts.length === 3) {
                bYear = parts[0];
                bMonth = parseInt(parts[1], 10).toString();
                bDay = parseInt(parts[2], 10).toString();
              }
            }

            setFormData((prev) => ({
              ...prev,
              lastName: data.lastName || "",
              firstName: data.firstName || "",
              lastNameKana: data.lastNameKana || "",
              firstNameKana: data.firstNameKana || "",
              email: data.email || user.email || "",
              nickname: data.nickname || data.firstName || "",
              birthYear: bYear,
              birthMonth: bMonth,
              birthDay: bDay,
              postalCode: address.postalCode || data.postalCode || "",
              prefecture: address.prefecture || data.prefecture || "東京都",
              addressDetail: address.addressDetail || data.addressDetail || "",
              buildingName: address.buildingName || data.buildingName || "",
              profileImage: imageUrl,
              politicalParty: data.politicalParty || "",
              pledge: data.pledge || "",
            }));

            if (imageUrl) {
              setAvatarPreview(imageUrl);
              setIsImageAlreadySet(true);
            }
            if (cropPos) {
              setSavedCropPosition(cropPos);
            }
          } else {
            // Firestoreドキュメントが無い場合（ソーシャル連携など）
            const [socialLastName, socialFirstName] = (user.displayName || "").split(" ");
            setFormData((prev) => ({
              ...prev,
              lastName: socialLastName || "",
              firstName: socialFirstName || user.displayName || "",
              email: user.email || "",
              nickname: socialFirstName || user.displayName || "",
              profileImage: user.photoURL || "",
              politicalParty: "",
              pledge: "",
            }));

            if (user.photoURL) {
              setAvatarPreview(user.photoURL);
              setIsImageAlreadySet(true);
            }
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
  const isNicknameValid = formData.nickname.trim().length > 0;
  const isBirthdateValid = !!(formData.birthYear && formData.birthMonth && formData.birthDay);
  const isAddressValid = 
    formData.postalCode.replace(/-/g, "").length === 7 && 
    !!formData.prefecture && 
    formData.addressDetail.trim().length > 0;

  // 議員用バリデーション
  const isPoliticalPartyValid = formData.politicalParty.trim().length > 0;
  const isPledgeValid = formData.pledge.trim().length >= 50 && formData.pledge.trim().length <= 2000;

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

  // 切り抜き範囲（200x200のサークル、オフセット40px）から画像がはみ出さないようにオフセットをクランプする関数
  const clampOffset = (x: number, y: number, currentZoom: number) => {
    const w = imgDisplaySize.width * currentZoom;
    const h = imgDisplaySize.height * currentZoom;

    // x の範囲制限: サークル左端(40px)から右端(240px)
    // X <= 40 かつ X + W >= 240 => 240 - W <= X <= 40
    const minX = 240 - w;
    const maxX = 40;
    const clampedX = Math.min(Math.max(x, minX), maxX);

    // y の範囲制限: サークル上端(40px)から下端(240px)
    // Y <= 40 かつ Y + H >= 240 => 240 - H <= Y <= 40
    const minY = 240 - h;
    const maxY = 40;
    const clampedY = Math.min(Math.max(y, minY), maxY);

    return { x: clampedX, y: clampedY };
  };

  // ズーム変更時の処理（位置調整オフセットがはみ出さないように再クランプ）
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setCropOffset((prev) => clampOffset(prev.x, prev.y, newZoom));
  };

  // 切り抜きモーダル内で画像読み込み完了時のサイズ設定
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    let w = 280;
    let h = 280;
    
    // 短い方の辺が280pxになるように初期表示サイズを調整
    if (naturalWidth > naturalHeight) {
      w = (naturalWidth / naturalHeight) * 280;
    } else {
      h = (naturalHeight / naturalWidth) * 280;
    }

    setImgDisplaySize({ width: w, height: h });
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    
    // 初期配置をビューポート中央に設定
    setCropOffset({
      x: (280 - w) / 2,
      y: (280 - h) / 2,
    });
    setZoom(1.0);
  };

  // ドラッグ操作（マウス）
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

  // ドラッグ操作（タッチ）
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

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 切り抜き決定時の処理（Canvasでクロップした画像を生成）
  const handleCropApply = () => {
    if (!cropSrc) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400; // 出力解像度
      canvas.height = 400;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // クロップ座標の計算
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
            setSavedCropPosition(null); // 以後はCSS調整不要なのでnullに
          }
          setIsCropperOpen(false);
        }, "image/jpeg", 0.85);
      }
    };
    img.src = cropSrc;
  };

  // 切り抜きキャンセル
  const handleCropCancel = () => {
    setIsCropperOpen(false);
    setCropSrc("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // クロップ座標に基づくCSSスタイル生成ヘルパー
  const getCroppedImgStyle = (cropPos: any, containerSize = 90) => {
    if (!cropPos) return { width: "100%", height: "100%", objectFit: "cover" as const };
    // クロップ時のビューポート内のサークル基準(200px)に対する倍率
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
    
    if (accountType === "general") {
      if (!isNicknameValid || !isBirthdateValid || !isAddressValid) {
        setError("入力内容に不備があります。必須項目を正しく入力してください。");
        return;
      }
    } else {
      if (!isPoliticalPartyValid || !isPledgeValid || !isAddressValid) {
        setError("入力内容に不備があります。必須項目を正しく入力してください。");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (!currentUser) throw new Error("セッションが切断されました。");

      let imageUrl = formData.profileImage;

      // 画像ファイルが新たに選択されている場合はStorageへアップロード
      if (avatarFile) {
        try {
          const storageRef = ref(storage, `users/${currentUser.uid}/profile_image.jpeg`);
          const uploadResult = await uploadBytes(storageRef, avatarFile, {
            contentType: "image/jpeg",
          });
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (imgErr: any) {
          console.error("Profile image upload failed:", imgErr);
          throw new Error("プロフィールの画像のアップロードに失敗しました: " + imgErr.message);
        }
      }

      const payload: any = {
        lastName: formData.lastName,
        firstName: formData.firstName,
        lastNameKana: formData.lastNameKana,
        firstNameKana: formData.firstNameKana,
        address: {
          postalCode: formData.postalCode,
          prefecture: formData.prefecture,
          addressDetail: formData.addressDetail,
          buildingName: formData.buildingName,
        },
        profileImage: imageUrl || null,
        userType: accountType,
        isProfileCompleted: true,
        isRegistered: true,
        updatedAt: new Date().toISOString()
      };

      if (accountType === "general") {
        const birthDateString = `${formData.birthYear}-${formData.birthMonth.padStart(2, "0")}-${formData.birthDay.padStart(2, "0")}`;
        payload.nickname = formData.nickname;
        payload.birthDate = birthDateString;
        payload.displayName = formData.nickname;
      } else {
        payload.politicalParty = formData.politicalParty;
        payload.pledge = formData.pledge;
        payload.displayName = `${formData.lastName} ${formData.firstName}`;
      }

      // Firestoreのユーザー情報を更新
      await saveUserProfile(currentUser.uid, payload);

      // セッションCookieの有効期限を更新
      const expireTime = 60 * 60 * 24; // 1日
      document.cookie = `session=${encodeURIComponent(currentUser.email || currentUser.uid)}; path=/; max-age=${expireTime}; SameSite=Lax;`;

      // 登録完了画面（Step 3）へ遷移
      setStep(3);
    } catch (err: any) {
      console.error("Submit profile error:", err);
      setError(err.message || "情報の登録に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 進捗バーの描画
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
            /* 読み込み中表示 */
            <div className={styles.loadingContainer}>
              <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#003db3" }} />
              <p>ユーザー情報を読み込み中...</p>
            </div>
          ) : step === 2 ? (
            /* STEP 2: プロフィール情報入力フォーム */
            <>
              <div className={styles.titleArea}>
                <h1 className={styles.title}>プロフィール情報入力</h1>
                <p className={styles.subtitle}>
                  {accountType === "general"
                    ? "あなたについて教えてください。これらの情報はマッチングの質を高めるために使用されます。"
                    : "議員活動を伝えるための詳細情報を入力してください"}
                </p>
              </div>

              {/* タブ切り替えセレクター */}
              <div className={styles.tabContainer}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${accountType === "general" ? styles.tabButtonActive : ""}`}
                  onClick={() => setAccountType("general")}
                >
                  一般市民として登録
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${accountType === "politician" ? styles.tabButtonActive : ""} ${isSocialUser ? styles.tabButtonDisabled : ""}`}
                  onClick={() => {
                    if (!isSocialUser) {
                      setAccountType("politician");
                    }
                  }}
                  disabled={isSocialUser}
                  title={isSocialUser ? "Google/Appleアカウントで作成された場合は議員として登録できません。" : ""}
                >
                  議員として登録
                </button>
              </div>
              {isSocialUser && (
                <p className={styles.socialHint}>
                  ※Google/Appleアカウントで作成された場合は、議員として登録できません。
                </p>
              )}

              {/* プロフィール画像アップローダー */}
              <div className={styles.avatarUploadContainer}>
                <div 
                  className={styles.avatarWrapper} 
                  onClick={handleAvatarClick}
                  style={{ cursor: isImageAlreadySet ? "default" : "pointer" }}
                >
                  <div className={styles.avatarCircle}>
                    {avatarPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={avatarPreview} 
                        alt="プロフィール画像" 
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
                  プロフィール画像（任意）
                </span>
                <p className={styles.avatarSubtext} style={{ whiteSpace: "pre-line" }}>
                  {isImageAlreadySet 
                    ? "画像は変更できません" 
                    : accountType === "general"
                      ? "マッチング率が向上します"
                      : "マッチング率が向上します\nPNG, JPG, HEIC、最大4MB"}
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
                
                {/* 姓・名 入力 */}
                <div className={styles.gridRow}>
                  <div className={styles.inputGroup}>
                    <div className={styles.labelArea}>
                      <label htmlFor="lastName" className={styles.label}>
                        姓 <span className={styles.requiredBadge}>必須</span>
                      </label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="山田"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.labelArea}>
                      <label htmlFor="firstName" className={styles.label}>
                        名 <span className={styles.requiredBadge}>必須</span>
                      </label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="太郎"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* セイ・メイ 入力 */}
                <div className={styles.gridRow}>
                  <div className={styles.inputGroup}>
                    <div className={styles.labelArea}>
                      <label htmlFor="lastNameKana" className={styles.label}>
                        セイ <span className={styles.requiredBadge}>必須</span>
                      </label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="lastNameKana"
                        type="text"
                        value={formData.lastNameKana}
                        onChange={(e) => setFormData({ ...formData, lastNameKana: e.target.value })}
                        placeholder="ヤマダ"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.labelArea}>
                      <label htmlFor="firstNameKana" className={styles.label}>
                        メイ <span className={styles.requiredBadge}>必須</span>
                      </label>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="firstNameKana"
                        type="text"
                        value={formData.firstNameKana}
                        onChange={(e) => setFormData({ ...formData, firstNameKana: e.target.value })}
                        placeholder="タロウ"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* メールアドレス（変更不可・鍵マーク付き） */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="email" className={styles.label}>
                      メールアドレス
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
                  <p className={styles.hint}>メールアドレスは変更できません。</p>
                </div>

                {accountType === "general" ? (
                  <>
                    {/* ニックネーム */}
                    <div className={styles.inputGroup}>
                      <div className={styles.labelArea}>
                        <label htmlFor="nickname" className={styles.label}>
                          ニックネーム <span className={styles.requiredBadge}>必須</span>
                        </label>
                        {isNicknameValid && (
                          <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                        )}
                      </div>
                      <div className={styles.inputWrapper}>
                        <input
                          id="nickname"
                          type="text"
                          value={formData.nickname}
                          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          placeholder="タロウ"
                          className={styles.input}
                          required
                        />
                      </div>
                      <p className={styles.hint}>公開される名前です。後で変更可能です。</p>
                    </div>

                    {/* 生年月日 */}
                    <div className={styles.inputGroup}>
                      <div className={styles.labelArea}>
                        <label className={styles.label}>
                          生年月日 <span className={styles.requiredBadge}>必須</span>
                        </label>
                        {isBirthdateValid && (
                          <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                        )}
                      </div>
                      <div className={styles.gridRow} style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <div className={styles.inputWrapper}>
                          <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            className={`${styles.input} ${styles.selectInput}`}
                            aria-label="年"
                          >
                            {years.map((y) => (
                              <option key={y} value={y}>{y}年</option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.inputWrapper}>
                          <select
                            value={formData.birthMonth}
                            onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
                            className={`${styles.input} ${styles.selectInput}`}
                            aria-label="月"
                          >
                            {months.map((m) => (
                              <option key={m} value={m}>{m}月</option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.inputWrapper}>
                          <select
                            value={formData.birthDay}
                            onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                            className={`${styles.input} ${styles.selectInput}`}
                            aria-label="日"
                          >
                            {days.map((d) => (
                              <option key={d} value={d}>{d}日</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className={styles.hint}>※生年月日は後で変更できません。</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 政党 */}
                    <div className={styles.inputGroup}>
                      <div className={styles.labelArea}>
                        <label htmlFor="politicalParty" className={styles.label}>
                          政党 <span className={styles.requiredBadge}>必須</span>
                        </label>
                        {isPoliticalPartyValid && (
                          <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                        )}
                      </div>
                      <div className={styles.inputWrapper}>
                        <input
                          id="politicalParty"
                          type="text"
                          value={formData.politicalParty}
                          onChange={(e) => setFormData({ ...formData, politicalParty: e.target.value.slice(0, 50) })}
                          placeholder="例：未来創造党"
                          className={styles.input}
                          required
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        <p className={styles.hint}></p>
                        <p style={{ fontSize: "11px", color: "#7b8ab8", margin: 0 }}>
                          {formData.politicalParty.length}/50
                        </p>
                      </div>
                    </div>

                    {/* 公約・活動方針 */}
                    <div className={styles.inputGroup}>
                      <div className={styles.labelArea}>
                        <label htmlFor="pledge" className={styles.label}>
                          公約・活動方針 <span className={styles.requiredBadge}>必須</span>
                        </label>
                        {isPledgeValid && (
                          <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                        )}
                      </div>
                      <div className={styles.inputWrapper}>
                        <textarea
                          id="pledge"
                          value={formData.pledge}
                          onChange={(e) => setFormData({ ...formData, pledge: e.target.value.slice(0, 2000) })}
                          placeholder="掲げる公約や具体的な活動方針を50文字以上で入力してください。"
                          className={styles.input}
                          style={{ minHeight: "150px", resize: "none", lineHeight: "1.6" }}
                          required
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        {formData.pledge.length > 0 && formData.pledge.length < 50 ? (
                          <p style={{ fontSize: "11px", color: "#ef4444", margin: 0, fontWeight: "bold" }}>
                            ※最低50文字必要です
                          </p>
                        ) : (
                          <p className={styles.hint}></p>
                        )}
                        <p style={{ fontSize: "11px", color: "#7b8ab8", margin: 0 }}>
                          {formData.pledge.length}/2000
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* 住所・活動地域 */}
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="postalCode" className={styles.label}>
                      {accountType === "general" ? "現住所" : "活動地域"} <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isAddressValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  
                  {/* 郵便番号入力 & 検索ボタン */}
                  <div className={styles.postalSearchGroup}>
                    <div className={styles.inputWrapper}>
                      <input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="150-0002"
                        className={styles.input}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleZipSearch}
                      className={styles.searchButton}
                    >
                      検索
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
                      placeholder="渋谷区渋谷2-24-12"
                      className={styles.input}
                      required
                      aria-label="市区町村・番地"
                    />
                  </div>

                  {/* 建物名・部屋番号（任意） */}
                  <div className={styles.inputWrapper} style={{ marginTop: "8px" }}>
                    <input
                      type="text"
                      value={formData.buildingName}
                      onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                      placeholder="建物名・部屋番号（任意）"
                      className={styles.input}
                      aria-label="建物名・部屋番号"
                    />
                  </div>
                </div>

                {/* 個人情報保護に関する文言 */}
                <div className={styles.infoBox}>
                  <FontAwesomeIcon icon={faShieldHalved} className={styles.infoIcon} />
                  <p className={styles.infoText}>
                    入力された住所情報は本人確認および規約に基づくマッチング精度の向上のためにのみ使用され、他のユーザーに公開されることはありません。
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
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={avatarPreview} 
                    alt="プロフィール画像" 
                    className={styles.avatarImage}
                    style={getCroppedImgStyle(savedCropPosition, 80)}
                  />
                ) : (
                  <FontAwesomeIcon icon={faCircleCheck} className={styles.successIcon} />
                )}
              </div>
              <h1 className={styles.title}>アカウント登録が完了しました！</h1>
              <p className={styles.subtitle} style={{ marginBottom: "32px" }}>
                マチアプへようこそ。プロフィールの詳細登録がすべて完了し、アカウントの有効化に成功しました。
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
            <h2 className={styles.modalTitle}>プロフィールの切り抜き</h2>
            
            <div 
              className={styles.cropperViewport}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
