"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserIcon from './UserIcon';
import PostImage from './PostImage';
import styles from '@/components/profile.module.css';
import { auth } from '@/src/firebase/firebase';
import { getUserProfile } from '@/src/firebase/userDb';
import { getPosts } from '@/src/firebase/postDb';
import { onAuthStateChanged } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faHeart, faImage } from '@fortawesome/free-solid-svg-icons';
import { POSTS } from '@/data/posts';

function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "likes"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch Firestore user profile
          const data = await getUserProfile(currentUser.uid);
          setProfileData(data);

          // Fetch user's posts
          const posts = await getPosts({ author_uid: currentUser.uid });
          // Map posts to match the UI format of data/posts.js
          const formattedPosts = posts.map((p, idx) => ({
            id: p.id || `post_${idx}`,
            name: data?.displayName || data?.nickname || currentUser.displayName || "ユーザー",
            address: data?.address ? `${data.address.prefecture}${data.address.addressDetail}` : "",
            userIcon: data?.profileImage || "/user_Icon/user_icon1.jpg",
            title: p.content_text.substring(0, 15) + (p.content_text.length > 15 ? "..." : ""),
            tags: "一般",
            image: p.image_url || "/post_image/post_image1.jpg",
            createAt: p.created_at?.toDate ? p.created_at.toDate().toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
            content: p.content_text,
            likes: "0",
          }));
          setUserPosts(formattedPosts);
        } catch (err) {
          console.error("Error loading user profile or posts:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // Not logged in or local development fallback
        setUser(null);
        setProfileData(null);
        setUserPosts([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className={styles.spinner} />
        <p>プロフィールを読み込み中...</p>
      </div>
    );
  }

  // Determine if we use live or mock data
  const isLive = !!user && !!profileData;
  const displayName = isLive 
    ? (profileData.displayName || profileData.nickname || `${profileData.lastName || ""} ${profileData.firstName || ""}`.trim() || "ユーザー")
    : "佐々木 太郎";
  
  const userType = isLive ? profileData.userType : "general"; // general | politician | shop

  const formattedAddress = isLive && profileData.address
    ? `${profileData.address.prefecture} ${profileData.address.addressDetail}`
    : "東京都新宿区";

  const email = isLive ? (profileData.email || user.email) : "sasaki.taro@example.com";
  const avatarUrl = isLive ? profileData.profileImage : "/user_Icon/user_icon1.jpg";

  // Bio content based on user type
  let bioContent = "";
  if (isLive) {
    if (userType === "politician") {
      bioContent = profileData.pledge || "活動方針や公約が未設定です。";
    } else if (userType === "shop") {
      bioContent = profileData.shopIntroduction || "店舗紹介が未設定です。";
    } else {
      bioContent = "街アプを利用して、地域の課題解決やコミュニティ活性化に貢献しています。";
    }
  } else {
    bioContent = "街アプを利用して、地域の課題解決やコミュニティ活性化に貢献しています。";
  }

  // Display posts (live posts or mock posts fallback)
  const postsToShow = isLive ? userPosts : POSTS;

  return (
    <div className={styles.profileContainer}>
      {/* Banner / Cover */}
      <div className={styles.coverBanner}></div>

      {/* Profile Card Header */}
      <div className={styles.profileCard}>
        {/* Avatar Container */}
        <div className={styles.avatarContainer}>
          <UserIcon iconUrl={avatarUrl} userName={displayName} className={styles.profileAvatar} />
        </div>

        {/* Profile Info */}
        <div className={styles.profileMeta}>
          <div className={styles.nameSection}>
            <h1 className={styles.userName}>{displayName}</h1>
            <span className={`${styles.roleBadge} ${styles[userType]}`}>
              {userType === "politician" ? "議員" : userType === "shop" ? "加盟店" : "一般市民"}
            </span>
          </div>

          <div className={styles.contactDetails}>
            <div className={styles.detailItem}>
              <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{formattedAddress}</span>
            </div>
            <div className={styles.detailItem}>
              <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>{email}</span>
            </div>
            {userType === "shop" && profileData?.shopPhoneNumber && (
              <div className={styles.detailItem}>
                <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{profileData.shopPhoneNumber}</span>
              </div>
            )}
            {userType === "politician" && profileData?.politicalParty && (
              <div className={styles.detailItem}>
                <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>所属政党: {profileData.politicalParty}</span>
              </div>
            )}
          </div>

          {/* Bio / Pledge Card */}
          <div className={styles.bioCard}>
            <h3 className={styles.bioTitle}>
              {userType === "politician" ? "公約・活動方針" : userType === "shop" ? "店舗紹介" : "自己紹介"}
            </h3>
            <p className={styles.bioText}>{bioContent}</p>
          </div>

          {/* Stats Summary */}
          <div className={styles.profileStats}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{postsToShow.length}</span>
              <span className={styles.statLabel}>投稿</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>
                {postsToShow.reduce((acc, p) => acc + parseInt(p.likes || 0), 0)}
              </span>
              <span className={styles.statLabel}>獲得いいね</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>12</span>
              <span className={styles.statLabel}>マッチング</span>
            </div>
          </div>

          {/* Edit Profile Action */}
          <div className={styles.actionButtons}>
            <button className={styles.editButton} onClick={() => router.push("/settings")}>
              プロフィールを編集
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabSection}>
        <button 
          className={`${styles.tabBtn} ${activeTab === "posts" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          <FontAwesomeIcon icon={faImage} className={styles.tabIcon} />
          <span>投稿一覧 ({postsToShow.length})</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "likes" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("likes")}
        >
          <FontAwesomeIcon icon={faHeart} className={styles.tabIcon} />
          <span>いいねした投稿</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className={styles.tabContent}>
        {activeTab === "posts" ? (
          <PostImage posts={postsToShow} />
        ) : (
          <div className={styles.emptyLikesState}>
            <FontAwesomeIcon icon={faHeart} className={styles.emptyLikesIcon} />
            <p className={styles.emptyLikesText}>いいねした投稿はありません。</p>
            <button className={styles.exploreBtn} onClick={() => router.push("/")}>
              投稿を探しに行く
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;