"use client";

import React, { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import NoMorePosts from '@/components/NoMorePosts';
import styles from '@/app/(main)/posts/[id]/page.module.css';
import NiceButton from '@/components/NiceButton';
import BadButton from '@/components/BadButton';
import SkipButton from '@/components/SkipButton';
import { getPosts, createPost } from '@/src/firebase/postDb';
import { getUserProfile } from '@/src/firebase/userDb';
import { hasLikedPost, likePost, unlikePost } from '@/src/firebase/likeDb';
import { handleUserLike, handleUserBad, getMatchesForUser } from '@/src/firebase/matchDb';
import { getOrCreateChatRoom, sendChatMessage } from '@/src/firebase/chatDb';
import { recordViewHistory } from '@/src/firebase/historyDb';
import { auth } from '@/src/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Post as UIPost } from '@/data/posts';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LocalUIPost extends UIPost {
  isLiked: boolean;
  isDisliked: boolean;
}

function Page({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [posts, setPosts] = useState<LocalUIPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 議員ユーザーがアクセスした場合は、投稿作成画面へリダイレクト
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile?.userType === 'politician') {
            router.push('/politicians/posts/create');
          }
        } catch (e) {
          console.error("Failed to check user role:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 1. データベースからデータをフェッチ & 必要に応じて自動シードを実行
  useEffect(() => {
    async function fetchData() {
      try {
        // バックグラウンドでSeed APIを叩いて初期データを投入（既に存在する場合もあります）
        try {
          await fetch('/api/temp-seed');
        } catch (e) {
          console.warn("Could not call seed API, proceeding with existing database data.", e);
        }

        const fetchedPosts = await getPosts();
        
        // 各投稿の author_uid に対応するユーザープロファイル情報を取得
        const uids = Array.from(new Set(fetchedPosts.map(p => p.author_uid).filter(Boolean))) as string[];
        const userProfiles: Record<string, any> = {};
        
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

        // ユーザーのマッチ情報を取得して、BADした議員を特定する
        let badPoliticianUids: string[] = [];
        if (auth.currentUser) {
          try {
            const matches = await getMatchesForUser(auth.currentUser.uid);
            badPoliticianUids = matches
              .filter(m => m.user_action === 'bad')
              .map(m => m.politician_uid);
          } catch (e) {
            console.error("Failed to load matches for user in politicians page:", e);
          }
        }

        const mappedPosts = await Promise.all(
          fetchedPosts.map(async (p) => {
            const user = userProfiles[p.author_uid] || {};
            let isLiked = false;
            try {
              if (p.id) {
                isLiked = await hasLikedPost(p.id, uid);
              }
            } catch (e) {
              console.error("Failed to check if post is liked:", e);
            }
            return {
              id: p.id || "",
              name: user.displayName || user.nickname || "匿名ユーザー",
              userIcon: user.profileImage || "/user_Icon/user_icon1.jpg",
              title: p.title || "無題の投稿",
              tags: p.tags || "その他",
              image: p.image_url || "/post_image/post_image1.jpg",
              createAt: p.created_at ? new Date(p.created_at.seconds * 1000).toLocaleDateString() : "日付なし",
              content: p.content_text || "",
              likes: String(p.likes || "0"),
              commentID: "",
              postID: p.id || "",
              userID: p.author_uid || "",
              questionText: p.questionText || null,
              answerText: p.answerText || null,
              isLiked: isLiked,
              isDisliked: false,
              authorUserType: user.userType
            };
          })
        );

        // 議員ユーザーの投稿のみ表示、かつ自分がバッドした議員の投稿を除外（ただしURL指定の投稿は除外しない）
        const filteredPosts = mappedPosts.filter(p => 
          (p.authorUserType === 'politician' && !badPoliticianUids.includes(p.userID)) ||
          p.id === id || p.postID === id
        );
        setPosts(filteredPosts);
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
    setIsCompleted(false);
    if (loading || posts.length === 0) return;

    const index = posts.findIndex(p => String(p.id) === id || p.postID === id);
    if (index !== -1) {
      const timer = setTimeout(() => {
        setActiveIndex(index);
      }, 0);
      // スクロールコンテナが描画されるのを少し待ってからスクロール位置を調整
      const scrollTimer = setTimeout(() => {
        const container = scrollContainerRef.current;
        const targetEl = cardRefs.current[posts[index].id];
        if (container && targetEl) {
          container.scrollTo({
            left: targetEl.offsetLeft,
            behavior: 'auto'
          });
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        clearTimeout(scrollTimer);
      };
    } else {
      // 存在しないIDの場合は最初の投稿を表示
      const timer = setTimeout(() => {
        setActiveIndex(0);
        window.history.replaceState(null, '', `/politicians/posts/${posts[0].id}`);
      }, 0);
      return () => clearTimeout(timer);
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
      window.history.replaceState(null, '', `/politicians/posts/${targetPostId}`);
    }
  };

  // 4. 指定した投稿へスムーズスクロール
  const scrollToPost = (index: number) => {
    if (index >= 0 && index < posts.length) {
      const container = scrollContainerRef.current;
      const targetEl = cardRefs.current[posts[index].id];
      if (container && targetEl) {
        container.scrollTo({
          left: targetEl.offsetLeft,
          behavior: 'smooth'
        });
        setActiveIndex(index);
        window.history.replaceState(null, '', `/politicians/posts/${posts[index].id}`);
      }
    }
  };

  // 5. 閲覧履歴の自動記録
  useEffect(() => {
    if (activeIndex !== -1 && posts[activeIndex]) {
      const activePost = posts[activeIndex];
      const uid = auth.currentUser?.uid || "user1";
      
      recordViewHistory(activePost.postID, uid).catch(err => {
        console.error("Error recording view history:", err);
      });
    }
  }, [activeIndex, posts]);

  // 6. 次の投稿へ移動するヘルパー
  const moveToNextPost = () => {
    if (activeIndex < posts.length - 1) {
      scrollToPost(activeIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  // いいねのアクション（マッチング登録 + 投稿いいね登録 + 次の投稿へ）
  const handleLike = async () => {
    if (activeIndex === -1 || posts.length === 0) return;
    const currentPost = posts[activeIndex];
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // 楽観的アップデート
    setPosts(prev => prev.map((p, idx) => {
      if (idx === activeIndex) {
        return {
          ...p,
          isLiked: true,
          isDisliked: false,
          likes: String(Number(p.likes) + 1)
        };
      }
      return p;
    }));

    try {
      // マッチング登録 (handleUserLike)
      await handleUserLike(uid, currentPost.userID);
      // 投稿そのもののいいね登録
      await likePost(currentPost.postID, uid);

      // いいねした一般ユーザーがこれまで投稿したことがないかチェック
      const userPosts = await getPosts({ author_uid: uid });
      if (userPosts.length === 0) {
        const profile = await getUserProfile(uid);
        if (profile) {
          const nickname = profile.nickname || profile.displayName || "匿名ユーザー";
          await createPost({
            author_uid: uid,
            user_badge: "一般",
            title: `${nickname}さんのプロフィール`,
            content_text: `${nickname}さんのプロフィールカードです。現在投稿はありません。`,
            image_url: profile.profileImage || null,
            status: "Public",
            tags: "プロフィール"
          });
        }
      }

      // 議員がいいねされた際のシステム通知チャット作成とメッセージ送信
      try {
        const currentUserProfile = await getUserProfile(uid);
        const citizenName = currentUserProfile?.displayName || currentUserProfile?.nickname || "市民";
        const systemRoomId = await getOrCreateChatRoom("system", currentPost.userID);
        const notificationText = `一般市民の ${citizenName} さんから「いいね！」を受信しました。マッチングに向けて「投稿」メニューから該当市民の投稿をチェックし、いいねを返してみましょう！`;
        await sendChatMessage(systemRoomId, "system", currentPost.userID, notificationText);
      } catch (chatErr) {
        console.error("Failed to send system notification chat room:", chatErr);
      }
    } catch (err) {
      console.error("Failed to process like matching in Firestore:", err);
    }

    // 次の投稿へ移動
    moveToNextPost();
  };

  // いまいちのアクション（マッチング不成立登録 + いいね解除 + 次の投稿へ）
  const handleDislike = async () => {
    if (activeIndex === -1 || posts.length === 0) return;
    const currentPost = posts[activeIndex];
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // 楽観的アップデート
    setPosts(prev => prev.map((p, idx) => {
      if (idx === activeIndex) {
        return {
          ...p,
          isDisliked: true,
          isLiked: false,
          likes: p.isLiked ? String(Math.max(0, Number(p.likes) - 1)) : p.likes
        };
      }
      return p;
    }));

    try {
      // マッチング不成立登録 (handleUserBad)
      await handleUserBad(uid, currentPost.userID);
      // いいね解除
      if (currentPost.isLiked) {
        await unlikePost(currentPost.postID, uid);
      }
    } catch (err) {
      console.error("Failed to process dislike matching in Firestore:", err);
    }

    // 次の投稿へ移動
    moveToNextPost();
  };

  // スキップのアクション（次の投稿へ）
  const handleSkip = () => {
    moveToNextPost();
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
      {/* カルーセルコンテナ - 手動スワイプを無効化するため overflowX: 'hidden' */}
      <div 
        className={styles.scrollContainer} 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ overflowX: 'hidden' }}
      >
        {posts.map((post) => (
          <div 
            key={post.id} 
            className={styles.cardWrapper}
            ref={el => { cardRefs.current[post.id] = el; }}
          >
            {/* 手動次・戻るを禁止するため矢印ボタンは表示しません */}
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* アクションエリア (コメント禁止対応 + スキップボタン追加) */}
      <div className={styles.Politician_NiceBadButton}>
        <BadButton onClick={handleDislike} isDisliked={currentPost.isDisliked} />
        <SkipButton onClick={handleSkip} />
        <NiceButton onClick={handleLike} isLiked={currentPost.isLiked} />
      </div>
    </div>
  );
}

export default Page;
