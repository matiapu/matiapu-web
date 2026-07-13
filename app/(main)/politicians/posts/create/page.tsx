"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '@/src/firebase/firebase';
import { getUserProfile, UserProfile } from '@/src/firebase/userDb';
import { createPost } from '@/src/firebase/postDb';
import styles from './page.module.css';

function PoliticianCreatePost() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('災害'); // Default category tag
  const [contentText, setContentText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ログイン状態と議員権限の確認
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile && userProfile.userType === 'politician') {
            setProfile(userProfile);
          } else {
            // 議員以外は議員投稿閲覧画面へリダイレクト
            router.push('/politicians/posts/1');
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
          router.push('/politicians/posts/1');
        } finally {
          setLoading(false);
        }
      } else {
        // 未ログイン時はログイン画面へ
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }
    if (!contentText.trim()) {
      setError('本文を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("ユーザーがログインしていません。");

      let imageUrl: string | null = null;
      if (imageFile) {
        // Firebase Storageへのアップロード
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Firestoreへ投稿を作成
      await createPost({
        author_uid: user.uid,
        user_badge: 'politician',
        content_text: contentText,
        title: title,
        tags: tags,
        image_url: imageUrl,
        status: 'Public',
        likes: 0
      });

      setSuccess('投稿が正常に公開されました！');
      
      // フォーム初期化
      setTitle('');
      setContentText('');
      setImageFile(null);
      setImagePreview(null);

      // 2秒後にプロフィール画面へ遷移
      setTimeout(() => {
        router.push('/profile');
      }, 2000);

    } catch (err: any) {
      console.error("Failed to create post:", err);
      setError(err.message || '投稿の作成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>認証情報を確認中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <button 
          onClick={() => router.push('/politicians/posts/1')} 
          className={styles.backBtn}
          type="button"
        >
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          一覧に戻る
        </button>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>新規投稿の作成</h1>
          <p className={styles.subtitle}>議員活動の報告や、街づくりのビジョンを共有しましょう。</p>
        </div>

        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className={styles.successAlert} role="alert">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* タイトル */}
          <div className={styles.fieldGroup}>
            <label htmlFor="title" className={styles.label}>タイトル</label>
            <input 
              id="title"
              type="text" 
              placeholder="例: 戸塚駅前の道路舗装工事の視察について" 
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* タグカテゴリ */}
          <div className={styles.fieldGroup}>
            <label htmlFor="category" className={styles.label}>カテゴリ</label>
            <select
              id="category"
              className={styles.select}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="災害">災害</option>
              <option value="道路">道路</option>
              <option value="お店">お店</option>
              <option value="通報">通報</option>
              <option value="その他">その他</option>
            </select>
          </div>

          {/* 本文 */}
          <div className={styles.fieldGroup}>
            <label htmlFor="content" className={styles.label}>本文</label>
            <textarea
              id="content"
              placeholder="投稿の本文をこちらに記述してください。活動報告や地域の課題に対する見解などを共有できます。" 
              className={styles.textarea}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={8}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 画像ドラッグ&ドロップ */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>添付画像 (任意)</label>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            
            {!imagePreview ? (
              <div 
                className={styles.dropzone}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <div className={styles.dropzoneContent}>
                  <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p className={styles.dropzoneText}>画像をドラッグ＆ドロップ、またはファイルを選択</p>
                  <span className={styles.dropzoneHint}>PNG, JPG, WEBP (最大5MB)</span>
                </div>
              </div>
            ) : (
              <div className={styles.previewContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imagePreview} 
                  alt="投稿プレビュー" 
                  className={styles.previewImage}
                />
                <button 
                  type="button" 
                  onClick={removeSelectedImage} 
                  className={styles.removeImageBtn}
                  aria-label="画像を削除"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? '投稿をアップロード中...' : '投稿を公開する'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PoliticianCreatePost;
