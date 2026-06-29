"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faCircleCheck,
  faSpinner,
  faShieldHalved,
  faCamera,
  faExclamationCircle,
  faArrowLeft,
  faSave
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import styles from "./settings.module.css";

// Firebase Auth, Storage, and Firestore operations
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

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // アカウント種別 ('general': 一般, 'politician': 議員, 'shop': 加盟店)
  const [accountType, setAccountType] = useState("general");

  // プロフィール画像の状態
  const [originalFile, setOriginalFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // クロップ処理用状態
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [zoom, setZoom] = useState(1.0);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgDisplaySize, setImgDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [savedCropPosition, setSavedCropPosition] = useState(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    nickname: "",
    birthDateDisplay: "",
    postalCode: "",
    prefecture: "東京都",
    addressDetail: "",
    buildingName: "",
    profileImage: "",
    politicalParty: "", // 議員用: 政党
    pledge: "",         // 議員用: 公約・活動方針
    shopPhoneNumber: "", // 加盟店用: 電話番号
    shopIntroduction: "", // 加盟店用: 紹介
  });

  // 認証状態の監視 & Firestore情報の取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const data = await getUserProfile(user.uid);
          if (data) {
            if (data.userType) {
              setAccountType(data.userType);
            }

            const address = data.address || {};
            const profileImageMap = data.profileImage || {};

            let imageUrl = "";
            let cropPos = null;
            if (typeof profileImageMap === "string") {
              imageUrl = profileImageMap;
            } else if (profileImageMap && typeof profileImageMap === "object") {
              imageUrl = profileImageMap.url || "";
              cropPos = profileImageMap.cropPosition || null;
            }

            // 生年月日のフォーマット表示 (YYYY年MM月DD日)
            let bDateDisplay = "未登録";
            if (data.birthDate) {
              const parts = data.birthDate.split("-");
              if (parts.length === 3) {
                bDateDisplay = `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
              } else {
                bDateDisplay = data.birthDate;
              }
            }

            setFormData({
              lastName: data.lastName || "",
              firstName: data.firstName || "",
              lastNameKana: data.lastNameKana || "",
              firstNameKana: data.firstNameKana || "",
              email: data.email || user.email || "",
              nickname: data.nickname || "",
              birthDateDisplay: bDateDisplay,
              postalCode: address.postalCode || "",
              prefecture: address.prefecture || "東京都",
              addressDetail: address.addressDetail || "",
              buildingName: address.buildingName || "",
              profileImage: imageUrl,
              politicalParty: data.politicalParty || "",
              pledge: data.pledge || "",
              shopPhoneNumber: data.shopPhoneNumber || "",
              shopIntroduction: data.shopIntroduction || "",
            });

            if (imageUrl) {
              setAvatarPreview(imageUrl);
            }
            if (cropPos) {
              setSavedCropPosition(cropPos);
            }
          }
        } catch (err) {
          console.error("Firestore loading error:", err);
          setError("ユーザー情報の取得中にエラーが発生しました。");
        } finally {
          setLoading(false);
        }
      } else {
        // 未ログイン時はログイン画面へ
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
  const isNicknameValid = accountType !== "general" || formData.nickname.trim().length > 0;
  const isAddressValid =
    formData.postalCode.replace(/-/g, "").length === 7 &&
    !!formData.prefecture &&
    formData.addressDetail.trim().length > 0;

  const isPoliticalPartyValid = accountType !== "politician" || formData.politicalParty.trim().length > 0;
  const isPledgeValid =
    accountType !== "politician" ||
    (formData.pledge.trim().length >= 50 && formData.pledge.trim().length <= 2000);

  const isShopPhoneValid =
    accountType !== "shop" ||
    /^[0-9]{10,15}$/.test(formData.shopPhoneNumber.replace(/-/g, ""));
  const isShopIntroValid =
    accountType !== "shop" ||
    (formData.shopIntroduction.trim().length >= 50 && formData.shopIntroduction.trim().length <= 2000);

  // 郵便番号から住所を自動検索する処理
  const handleZipSearch = async () => {
    const cleanZip = formData.postalCode.replace(/-/g, "");
    if (cleanZip.length !== 7) {
      alert("郵便番号は7桁の数字で入力してください。");
      return;
    }

    try {
      setError("");
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
        setError("該当する住所が見つかりませんでした。郵便番号をご確認ください。");
      }
    } catch (err) {
      console.error("Zip search error:", err);
      setError("住所の取得中にエラーが発生しました。");
    }
  };

  // アバター画像クリック時の処理
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択変更時の処理（切り抜きモーダルを開く）
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選択してください。");
        return;
      }
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropSrc(event.target.result);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // 切り抜き範囲（200x200のサークル、オフセット40px）から画像がはみ出さないようにオフセットをクランプする関数
  const clampOffset = (x, y, currentZoom) => {
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

  // ズーム変更時の処理
  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    setCropOffset((prev) => clampOffset(prev.x, prev.y, newZoom));
  };

  // 切り抜きモーダル内で画像読み込み完了時のサイズ設定
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
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

  // ドラッグ操作（マウス）
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    setCropOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ドラッグ操作（タッチ）
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - cropOffset.x,
        y: e.touches[0].clientY - cropOffset.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStartRef.current.x;
    const rawY = e.touches[0].clientY - dragStartRef.current.y;
    setCropOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 切り抜き決定時の処理
  const handleCropApply = () => {
    if (!cropSrc) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");

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

  // クロップ座標に基づくCSSスタイル生成
  const getCroppedImgStyle = (cropPos, containerSize = 100) => {
    if (!cropPos) return { width: "100%", height: "100%", objectFit: "cover" };
    const ratio = containerSize / 200;
    return {
      position: "absolute",
      left: `${(cropPos.offsetX - 40) * ratio}px`,
      top: `${(cropPos.offsetY - 40) * ratio}px`,
      width: `${(cropPos.displayW * cropPos.zoom) * ratio}px`,
      height: `${(cropPos.displayH * cropPos.zoom) * ratio}px`,
      maxWidth: "none",
    };
  };

  // 設定保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();

    // バリデーションチェック
    if (!isNicknameValid || !isAddressValid || !isPoliticalPartyValid || !isPledgeValid || !isShopPhoneValid || !isShopIntroValid) {
      setError("入力内容に不備があります。入力フォームを確認してください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      if (!currentUser) throw new Error("セッションが切断されました。");

      let imageUrl = formData.profileImage;

      // 新しく画像ファイルが選択されている場合はStorageへ保存
      if (avatarFile) {
        try {
          const storageRef = ref(storage, `users/${currentUser.uid}/profile_image.jpeg`);
          const uploadResult = await uploadBytes(storageRef, avatarFile, {
            contentType: "image/jpeg",
          });
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (imgErr) {
          console.error("Profile image upload failed:", imgErr);
          throw new Error("プロフィールの画像のアップロードに失敗しました。");
        }
      }

      const payload = {
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
        updatedAt: new Date().toISOString()
      };

      if (accountType === "general") {
        payload.nickname = formData.nickname;
        payload.displayName = formData.nickname;
      } else if (accountType === "politician") {
        payload.politicalParty = formData.politicalParty;
        payload.pledge = formData.pledge;
        payload.displayName = `${formData.lastName} ${formData.firstName}`;
      } else if (accountType === "shop") {
        payload.shopPhoneNumber = formData.shopPhoneNumber;
        payload.shopIntroduction = formData.shopIntroduction;
        payload.displayName = `${formData.lastName} ${formData.firstName}`;
      }

      await saveUserProfile(currentUser.uid, payload);
      setSuccessMsg("設定が正常に保存されました。");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.message || "設定の保存に失敗しました。時間をおいてもう一度お試しください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <main className={styles.mainContent}>
          <div className={styles.card}>
            <div className={styles.loadingContainer}>
              <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#003db3" }} />
              <p>設定情報を読み込み中...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContent}>
        <div className={styles.card}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>設定</h1>
            <p className={styles.subtitle}>
              アカウント情報や地域の設定を編集できます。
            </p>
          </div>

          {successMsg && (
            <div className={styles.successMessage}>
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>{error}</span>
            </div>
          )}

          {/* プロフィール画像アップローダー */}
          <div className={styles.avatarUploadContainer}>
            <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
              <div className={styles.avatarCircle}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="プロフィール画像"
                    className={styles.avatarImage}
                    style={getCroppedImgStyle(savedCropPosition, 100)}
                  />
                ) : (
                  <svg className={styles.avatarPlaceholder} viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                )}
              </div>
              <div className={styles.cameraBadge}>
                <FontAwesomeIcon icon={faCamera} />
              </div>
            </div>
            <span className={styles.avatarLabel} onClick={handleAvatarClick}>
              プロフィール画像を変更
            </span>
            <p className={styles.avatarSubtext}>
              PNG, JPG, HEIC、最大4MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

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

            {/* メールアドレス (変更不可) */}
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

            {/* 生年月日 (変更不可) */}
            <div className={styles.inputGroup}>
              <div className={styles.labelArea}>
                <label htmlFor="birthdate" className={styles.label}>
                  生年月日
                </label>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="birthdate"
                  type="text"
                  value={formData.birthDateDisplay}
                  readOnly
                  disabled
                  className={`${styles.input} ${styles.lockedInput}`}
                />
                <FontAwesomeIcon icon={faLock} className={styles.lockIcon} />
              </div>
              <p className={styles.hint}>生年月日は変更できません。</p>
            </div>

            {/* アカウント種別表示 */}
            <div className={styles.inputGroup}>
              <div className={styles.labelArea}>
                <label className={styles.label}>アカウントタイプ</label>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={accountType === "politician" ? "議員" : accountType === "shop" ? "加盟店" : "一般市民"}
                  readOnly
                  disabled
                  className={`${styles.input} ${styles.lockedInput}`}
                />
                <FontAwesomeIcon icon={faLock} className={styles.lockIcon} />
              </div>
            </div>

            {/* 一般市民の場合のみニックネーム */}
            {accountType === "general" && (
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
                <p className={styles.hint}>公開される名前です。</p>
              </div>
            )}

            {/* 議員情報 */}
            {accountType === "politician" && (
              <>
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
                      onChange={(e) => setFormData({ ...formData, politicalParty: e.target.value })}
                      placeholder="未来創造党"
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="pledge" className={styles.label}>
                      公約・活動方針 <span className={styles.requiredBadge}>必須 (50〜2000文字)</span>
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
                        ※最低50文字必要です（現在 {formData.pledge.length} 文字）
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

            {/* 加盟店情報 */}
            {accountType === "shop" && (
              <>
                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="shopPhoneNumber" className={styles.label}>
                      店舗電話番号 <span className={styles.requiredBadge}>必須</span>
                    </label>
                    {isShopPhoneValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="shopPhoneNumber"
                      type="tel"
                      value={formData.shopPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, shopPhoneNumber: e.target.value })}
                      placeholder="0312345678"
                      className={styles.input}
                      required
                    />
                  </div>
                  <p className={styles.hint}>半角数字のみで入力してください。</p>
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.labelArea}>
                    <label htmlFor="shopIntroduction" className={styles.label}>
                      店舗紹介 <span className={styles.requiredBadge}>必須 (50〜2000文字)</span>
                    </label>
                    {isShopIntroValid && (
                      <FontAwesomeIcon icon={faCircleCheck} className={styles.validationCheck} />
                    )}
                  </div>
                  <div className={styles.inputWrapper}>
                    <textarea
                      id="shopIntroduction"
                      value={formData.shopIntroduction}
                      onChange={(e) => setFormData({ ...formData, shopIntroduction: e.target.value.slice(0, 2000) })}
                      placeholder="店舗の特徴や紹介文を50文字以上で入力してください。"
                      className={styles.input}
                      style={{ minHeight: "150px", resize: "none", lineHeight: "1.6" }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    {formData.shopIntroduction.length > 0 && formData.shopIntroduction.length < 50 ? (
                      <p style={{ fontSize: "11px", color: "#ef4444", margin: 0, fontWeight: "bold" }}>
                        ※最低50文字必要です（現在 {formData.shopIntroduction.length} 文字）
                      </p>
                    ) : (
                      <p className={styles.hint}></p>
                    )}
                    <p style={{ fontSize: "11px", color: "#7b8ab8", margin: 0 }}>
                      {formData.shopIntroduction.length}/2000
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
                  placeholder="渋谷区渋谷2-24-12"
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
                  placeholder="建物名・部屋番号（任意）"
                  className={styles.input}
                  aria-label="建物名・部屋番号"
                />
              </div>
            </div>

            {/* 情報保護文言 */}
            <div className={styles.infoBox}>
              <FontAwesomeIcon icon={faShieldHalved} className={styles.infoIcon} />
              <p className={styles.infoText}>
                住所情報はセキュリティ規約に基づき厳重に管理され、他のユーザーに直接公開されることはありません。
              </p>
            </div>

            {/* ボタングループ */}
            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className={styles.cancelFormButton}
              >
                <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: "8px" }} />
                キャンセル
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    保存処理中...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    設定を保存する
                  </>
                )}
              </button>
            </div>
          </form>
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
    </div>
  );
}