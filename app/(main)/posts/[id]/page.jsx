"use client";

import React, { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import NoMorePosts from '@/components/NoMorePosts';
import styles from "./page.module.css";
import CommentInput from '@/components/CommentInput';
import NiceButton from '@/components/NiceButton';
import BadButton from '@/components/BadButton';
import CommentSection from '@/components/CommentSection';
import { getPosts } from '@/src/firebase/postDb';
import { getUserProfile } from '@/src/firebase/userDb';
import { hasLikedPost, likePost, unlikePost } from '@/src/firebase/likeDb';
import { recordViewHistory } from '@/src/firebase/historyDb';
import { auth } from '@/src/firebase/firebase';

function Page({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [commentRefreshCount, setCommentRefreshCount] = useState(0);
  const scrollContainerRef = useRef(null);
  const cardRefs = useRef({});

  // 1. データベースからデータをフェッチ & 必要に応じて自動シードを実行
  useEffect(() => {
    async function fetchData() {
      try {
        // バックグラウンドでSeed APIを叩いて初期データを投入（既に存在する場合は上書き/マージされます）
        try {
          await fetch('/api/temp-seed');
        } catch (e) {
          console.warn("Could not call seed API, proceeding with existing database data.", e);
        }

        const fetchedPosts = await getPosts();
        
        // 各投稿の author_uid に対応するユーザープロファイル情報を取得
        const uids = Array.from(new Set(fetchedPosts.map(p => p.author_uid).filter(Boolean)));
        const userProfiles = {};
        
        await Promise.all(
          uids.map(async (uid) => {
            try {
              const profile = await getUserProfile(uid);
              if (profile) {
                userProfiles[uid] = profile;
              }
            } catch (err) {
              console.error(`Error fetching user profile for ${uid}:`, err);
            }
          })
        );

        // UIコンポーネント(PostCard)が期待するフォーマットにマッピング (非同期対応)
        const uid = auth.currentUser?.uid || "user1";
        const mappedPosts = await Promise.all(
          fetchedPosts.map(async (p) => {
            const user = userProfiles[p.author_uid] || {};
            let isLiked = false;
            try {
              isLiked = await hasLikedPost(p.id, uid);
            } catch (e) {
              console.error("Failed to check if post is liked:", e);
            }
            return {
              id: p.id,
              name: user.displayName || user.nickname || "匿名ユーザー",
              userIcon: user.profileImage || "/user_Icon/user_icon1.jpg",
              title: p.title || "無題の投稿",
              tags: p.tags || "その他",
              image: p.image_url || "/post_image/post_image1.jpg",
              createAt: p.created_at ? new Date(p.created_at.seconds * 1000).toLocaleDateString() : "日付なし",
              content: p.content_text || "",
              likes: p.likes || "0",
              questionText: p.questionText || null,
              answerText: p.answerText || null,
              isLiked: isLiked,
              isDisliked: false
            };
          })
        );

        setPosts(mappedPosts);
      } catch (err) {
        console.error("Error fetching posts data from Firestore:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. 初期ロード完了時にURLの ID に応じたカードへスクロール
  useEffect(() => {
    if (loading || posts.length === 0) return;

    const index = posts.findIndex(p => p.id === id);
    if (index !== -1) {
      setActiveIndex(index);
      // スクロールコンテナが描画されるのを少し待ってからスクロール位置を調整
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const targetEl = cardRefs.current[posts[index].id];
        if (container && targetEl) {
          container.scrollTo({
            left: targetEl.offsetLeft,
            behavior: 'auto'
          });
        }
      }, 100);
    } else {
      // 存在しないIDの場合は最初の投稿を表示
      setActiveIndex(0);
      window.history.replaceState(null, '', `/posts/${posts[0].id}`);
    }
  }, [loading, posts, id]);

  // 3. 横スクロール（スワイプ等）完了時にURLとアクティブ投稿を同期
  const handleScroll = () => {
    if (!scrollContainerRef.current || posts.length === 0) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    // 現在中央に最も近いカードのインデックスを計算
    const index = Math.round(scrollLeft / containerWidth);
    if (index >= 0 && index < posts.length && index !== activeIndex) {
      setActiveIndex(index);
      const targetPostId = posts[index].id;
      // Next.jsの再レンダリングを走らせずにURLだけをスムーズに更新
      window.history.replaceState(null, '', `/posts/${targetPostId}`);
    }
  };

  // 4. 指定した投稿へスムーズスクロール
  const scrollToPost = (index) => {
    if (index >= 0 && index < posts.length) {
      const container = scrollContainerRef.current;
      const targetEl = cardRefs.current[posts[index].id];
      if (container && targetEl) {
        container.scrollTo({
          left: targetEl.offsetLeft,
          behavior: 'smooth'
        });
        setActiveIndex(index);
        window.history.replaceState(null, '', `/posts/${posts[index].id}`);
      }
    }
  };

  // 5. 閲覧履歴の自動記録
  useEffect(() => {
    if (activeIndex !== -1 && posts[activeIndex]) {
      const activePost = posts[activeIndex];
      const uid = auth.currentUser?.uid || "user1";
      
      recordViewHistory(activePost.id, uid).catch(err => {
        console.error("Error recording view history:", err);
      });
    }
  }, [activeIndex, posts]);

  const handleNext = () => {
    if (activeIndex < posts.length - 1) {
      scrollToPost(activeIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      scrollToPost(activeIndex - 1);
    }
  };

  // いいねのアクション（遷移なし）
  const handleLike = async () => {
    if (activeIndex === -1 || posts.length === 0) return;
    const currentPost = posts[activeIndex];
    const uid = auth.currentUser?.uid || "user1";
    const newLiked = !currentPost.isLiked;

    // UIを即座に更新する（楽観的アップデート）
    setPosts(prev => prev.map((p, idx) => {
      if (idx === activeIndex) {
        return {
          ...p,
          isLiked: newLiked,
          likes: newLiked ? Number(p.likes) + 1 : Math.max(0, Number(p.likes) - 1),
          isDisliked: newLiked ? false : p.isDisliked // いいねした場合は「いまいち」を解除
        };
      }
      return p;
    }));

    try {
      if (newLiked) {
        await likePost(currentPost.id, uid);
      } else {
        await unlikePost(currentPost.id, uid);
      }
    } catch (err) {
      console.error("Failed to toggle like in Firestore:", err);
      // エラー時は元の状態にロールバック
      setPosts(prev => prev.map((p, idx) => {
        if (idx === activeIndex) {
          return {
            ...p,
            isLiked: currentPost.isLiked,
            likes: currentPost.likes,
            isDisliked: currentPost.isDisliked
          };
        }
        return p;
      }));
    }
  };

  // いまいちのアクション（遷移なし）
  const handleDislike = () => {
    if (activeIndex === -1 || posts.length === 0) return;
    const currentPost = posts[activeIndex];
    const newDisliked = !currentPost.isDisliked;

    setPosts(prev => prev.map((p, idx) => {
      if (idx === activeIndex) {
        return {
          ...p,
          isDisliked: newDisliked,
          isLiked: newDisliked ? false : p.isLiked, // いまいちした場合は「いいね」を解除
          likes: (newDisliked && p.isLiked) ? Math.max(0, Number(p.likes) - 1) : p.likes
        };
      }
      return p;
    }));

    // もともといいねしていた場合は、いまいちの選択に伴いFirestore側のいいねを解除
    if (newDisliked && currentPost.isLiked) {
      const uid = auth.currentUser?.uid || "user1";
      unlikePost(currentPost.id, uid).catch(e => console.error("Failed to unlike on dislike:", e));
    }
  };

  if (loading) {
    return <div className={styles.loading}>投稿を読み込み中...</div>;
  }

  if (isCompleted || posts.length === 0) {
    return <NoMorePosts />;
  }

  const currentPost = posts[activeIndex] || posts[0];

  return (
    <div className={styles.container}>
      {/* カルーセルコンテナ */}
      <div 
        className={styles.scrollContainer} 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {posts.map((post, idx) => (
          <div 
            key={post.id} 
            className={styles.cardWrapper}
            ref={el => cardRefs.current[post.id] = el}
          >
            {/* 左矢印ボタン (最初の投稿以外に表示) */}
            {idx > 0 && (
              <button 
                className={`${styles.navButton} ${styles.prevButton}`} 
                onClick={() => scrollToPost(idx - 1)}
                aria-label="前の投稿へ"
              >
                ‹
              </button>
            )}
            
            <PostCard post={post} />
            
            {/* 右矢印ボタン (最後の投稿以外に表示) */}
            {idx < posts.length - 1 && (
              <button 
                className={`${styles.navButton} ${styles.nextButton}`} 
                onClick={() => scrollToPost(idx + 1)}
                aria-label="次の投稿へ"
              >
                ›
              </button>
            )}
          </div>
        ))}
      </div>

      {/* アクションエリア */}
      <div className={styles.Comment_NiceBadButton}>
        <CommentInput 
          postId={currentPost.id} 
          onCommentSubmitted={() => setCommentRefreshCount(prev => prev + 1)} 
        />
        <BadButton onClick={handleDislike} isDisliked={currentPost.isDisliked} />
        <NiceButton onClick={handleLike} isLiked={currentPost.isLiked} />
      </div>

      {/* 現在アクティブな投稿に対応するコメントを表示 */}
      <CommentSection key={`${currentPost.id}-${commentRefreshCount}`} postId={currentPost.id} />
    </div>
  );
}

export default Page;
