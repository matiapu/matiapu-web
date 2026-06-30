"use client";

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import NoMorePosts from '@/components/NoMorePosts';
import styles from "./page.module.css";
import { POSTS } from '@/data/posts';
import CommentInput from '@/components/CommentInput';
import NiceButton from '@/components/NiceButton';
import BadButton from '@/components/BadButton';
import CommentSection from '@/components/CommentSection';
import { getPost } from '@/src/firebase/postDb';
import { getUserProfile } from '@/src/firebase/userDb';

// Re-export POSTS to maintain backward compatibility with other files importing it from here
export { POSTS };

function Page({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [isCompleted, setIsCompleted] = useState(false);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        // 1. Try to find the post in mock data first (if id is a number)
        const currentId = Number(id);
        if (!isNaN(currentId)) {
          const mockPost = POSTS.find((p) => p.id === currentId);
          if (mockPost) {
            setPost(mockPost);
            setLoading(false);
            return;
          }
        }

        // 2. Fetch from DB if it is a Firestore string ID
        const fetched = await getPost(id);
        if (fetched) {
          // Fetch author profile
          const authorProfile = await getUserProfile(fetched.author_uid);
          const formatted = {
            id: fetched.id,
            name: authorProfile?.displayName || authorProfile?.nickname || "ユーザー",
            address: authorProfile?.address ? `${authorProfile.address.prefecture}${authorProfile.address.addressDetail}` : "",
            userIcon: authorProfile?.profileImage || "/user_icon/user_icon1.jpg",
            title: fetched.content_text.substring(0, 15) + (fetched.content_text.length > 15 ? "..." : ""),
            tags: fetched.user_badge === "shop" ? "お店" : fetched.user_badge === "politician" ? "議員" : "一般",
            image: fetched.image_url || "/post_image/post_image1.jpg",
            createAt: fetched.created_at?.toDate ? fetched.created_at.toDate().toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
            content: fetched.content_text,
            likes: "0",
          };
          setPost(formatted);
        }
      } catch (err) {
        console.error("Error loading post details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const handleNext = () => {
    // If it's a mock post, move to the next mock post
    const currentId = Number(id);
    if (!isNaN(currentId)) {
      const currentIndex = POSTS.findIndex((p) => p.id === currentId);
      if (currentIndex !== -1 && currentIndex < POSTS.length - 1) {
        router.push(`/posts/${POSTS[currentIndex + 1].id}`);
        return;
      }
    }
    // If it's a DB post, since we don't have a simple sequence, mark completed
    setIsCompleted(true);
  };

  const handlePrevious = handleNext;

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#7b8ab8', fontFamily: 'sans-serif' }}>
        読み込み中...
      </div>
    );
  }

  if (isCompleted || !post) {
    return <NoMorePosts />;
  }

  return (
    <div>
      <PostCard
        post={post}
        onPreviousPost={handlePrevious}
        onNextPost={handleNext}
        disablePrevious={false}
        disableNext={false}
      />

      <div className={styles.Comment_NiceBadButton}>
        <CommentInput />
        <BadButton onClick={handlePrevious}/>
        <NiceButton onClick={handleNext}/>
      </div>

      <CommentSection />
    </div>
  );
}

export default Page;
