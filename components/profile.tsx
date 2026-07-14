"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserIcon from './UserIcon';
import PostImage from './PostImage';
import styles from '@/components/profile.module.css';
import { auth } from '@/src/firebase/firebase';
import { getUserProfile, UserProfile } from '@/src/firebase/userDb';
import { getPosts, getPost, Post as DbPost } from '@/src/firebase/postDb';
import { getLikedPostIdsForUser } from '@/src/firebase/likeDb';
import { getViewHistoryForUser } from '@/src/firebase/historyDb';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faHeart, faImage, faHistory } from '@fortawesome/free-solid-svg-icons';
import { POSTS, Post as UIPost } from '@/data/posts';

function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<UIPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<UIPost[]>([]);
  const [historyPosts, setHistoryPosts] = useState<(UIPost & { viewedAt?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "likes" | "history">("posts");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Helper function to format other users' posts
          const formatPostData = async (p: DbPost | null | undefined, fallbackIdx: number): Promise<UIPost | null> => {
            if (!p) return null;
            let authorData: UserProfile | null = null;
            try {
              if (p.author_uid) {
                authorData = await getUserProfile(p.author_uid);
              }
            } catch (e) {
              console.error("Error fetching post author profile:", e);
            }
            
            const contentText = p.content_text || "";
            return {
              id: p.id || String(fallbackIdx),
              name: authorData?.displayName || authorData?.nickname || "ユーザー",
              address: authorData?.address ? `${authorData.address.prefecture}${authorData.address.addressDetail}` : "",
              userIcon: authorData?.profileImage || "/user_Icon/user_icon1.jpg",
              title: p.title || contentText.substring(0, 15) + (contentText.length > 15 ? "..." : ""),
              tags: p.tags || "一般",
              image: p.image_url || "/post_image/post_image1.jpg",
              createAt: p.created_at?.toDate ? p.created_at.toDate().toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
              content: contentText,
              likes: String(p.likes || "0"),
              commentID: "",
              postID: p.id || "",
              userID: p.author_uid || "",
              questionText: p.questionText || "",
              answerText: p.answerText || null,
              authorUserType: authorData?.userType
            };
          };

          // Fetch Firestore user profile
          let data: UserProfile | null = null;
          try {
            data = await getUserProfile(currentUser.uid);
            setProfileData(data);
          } catch (err) {
            console.error("Error loading user profile data:", err);
          }

          // Fetch user's posts
          try {
            const posts = await getPosts({ author_uid: currentUser.uid });
            const filteredDbPosts = posts.filter(p => p.tags !== 'プロフィール');
            console.log("[Antigravity] User's own posts fetched:", filteredDbPosts);
            // Map posts to match the UI format of data/posts.js
            const formattedPosts = filteredDbPosts.map((p, idx) => {
              const contentText = p.content_text || "";
              return {
                id: p.id || String(idx),
                name: data?.displayName || data?.nickname || currentUser.displayName || "ユーザー",
                address: data?.address ? `${data.address.prefecture}${data.address.addressDetail}` : "",
                userIcon: data?.profileImage || "/user_Icon/user_icon1.jpg",
                title: p.title || contentText.substring(0, 15) + (contentText.length > 15 ? "..." : ""),
                tags: p.tags || "一般",
                image: p.image_url || "/post_image/post_image1.jpg",
                createAt: p.created_at?.toDate ? p.created_at.toDate().toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
                content: contentText,
                likes: String(p.likes || "0"),
                commentID: "",
                postID: p.id || "",
                userID: p.author_uid || "",
                questionText: p.questionText || "",
                answerText: p.answerText || null,
                authorUserType: data?.userType
              };
            });
            console.log("[Antigravity] Formatted user's own posts:", formattedPosts);
            setUserPosts(formattedPosts);
          } catch (err) {
            console.error("Error loading user's own posts:", err);
          }

          // Fetch liked posts
          try {
            const likedPostIds = await getLikedPostIdsForUser(currentUser.uid);
            console.log("[Antigravity] Liked post IDs fetched:", likedPostIds);
            const likedPostsFetched = await Promise.all(
              likedPostIds.map(async (postId, idx) => {
                try {
                  const p = await getPost(postId);
                  if (!p) {
                    console.log(`[Antigravity] Liked post ${postId} not found in DB`);
                    return null;
                  }
                  const formatted = await formatPostData(p, idx);
                  return formatted;
                } catch (e) {
                  console.error(`[Antigravity] Error fetching individual liked post ${postId}:`, e);
                  return null;
                }
              })
            );
            const finalLikes = likedPostsFetched.filter((p): p is UIPost => p !== null);
            console.log("[Antigravity] Final liked posts formatted:", finalLikes);
            setLikedPosts(finalLikes);
          } catch (err) {
            console.error("Error loading liked posts:", err);
          }

          // Fetch view history
          try {
            const historyList = await getViewHistoryForUser(currentUser.uid);
            console.log("[Antigravity] View history list fetched:", historyList);
            const historyPostsFetched = await Promise.all(
              historyList.map(async (h, idx) => {
                try {
                  const p = await getPost(h.post_id);
                  if (!p) {
                    console.log(`[Antigravity] History post ${h.post_id} not found in DB`);
                    return null;
                  }
                  const formatted = await formatPostData(p, idx);
                  if (formatted) {
                    return {
                      ...formatted,
                      viewedAt: h.viewed_at,
                    };
                  }
                  return null;
                } catch (e) {
                  console.error(`[Antigravity] Error fetching individual history post ${h.post_id}:`, e);
                  return null;
                }
              })
            );
            const sortedHistory = historyPostsFetched
              .filter((p): p is (UIPost & { viewedAt: any }) => p !== null)
              .sort((a, b) => b.viewedAt.toMillis() - a.viewedAt.toMillis());
            console.log("[Antigravity] Sorted history posts formatted:", sortedHistory);
            setHistoryPosts(sortedHistory);
          } catch (err) {
            console.error("Error loading view history:", err);
          }

        } catch (err) {
          console.error("Critical error inside profile fetch workflow:", err);
        } finally {
          setLoading(false);
        }
      } else {
        // Not logged in or local development fallback
        setUser(null);
        setProfileData(null);
        setUserPosts([]);
        setLikedPosts([]);
        setHistoryPosts([]);
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
  const isLive = !!user;
  const displayName = isLive 
    ? (profileData?.displayName || profileData?.nickname || `${profileData?.lastName || ""} ${profileData?.firstName || ""}`.trim() || "ユーザー")
    : "佐々木 太郎";
  
  const userType = isLive && profileData ? (profileData.userType || "general") : "general"; // general | politician | shop

  const formattedAddress = isLive && profileData?.address
    ? `${profileData.address.prefecture} ${profileData.address.addressDetail}`
    : "東京都新宿区";

  const email = isLive ? (profileData?.email || user?.email || "") : "sasaki.taro@example.com";
  const avatarUrl = isLive && profileData?.profileImage ? profileData.profileImage : "/user_Icon/user_icon1.jpg";

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
              {userType === "politician" ? "議員" : userType === "shop" ? "加盟店" : "一般"}
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
          <span>いいねした投稿 ({isLive ? likedPosts.length : 0})</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "history" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <FontAwesomeIcon icon={faHistory} className={styles.tabIcon} />
          <span>閲覧履歴 ({isLive ? historyPosts.length : 0})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className={styles.tabContent}>
        {activeTab === "posts" && (
          <PostImage posts={postsToShow} />
        )}
        {activeTab === "likes" && (
          (isLive ? likedPosts : []).length > 0 ? (
            <PostImage posts={likedPosts} />
          ) : (
            <div className={styles.emptyLikesState}>
              <FontAwesomeIcon icon={faHeart} className={styles.emptyLikesIcon} />
              <p className={styles.emptyLikesText}>いいねした投稿はありません。</p>
              <button className={styles.exploreBtn} onClick={() => router.push("/")}>
                投稿を探しに行く
              </button>
            </div>
          )
        )}
        {activeTab === "history" && (
          (isLive ? historyPosts : []).length > 0 ? (
            <PostImage posts={historyPosts} />
          ) : (
            <div className={styles.emptyLikesState}>
              <FontAwesomeIcon icon={faHistory} className={styles.emptyLikesIcon} />
              <p className={styles.emptyLikesText}>閲覧履歴はありません。</p>
              <button className={styles.exploreBtn} onClick={() => router.push("/")}>
                投稿を見に行く
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Profile;