"use client";

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import NoMorePosts from '@/components/NoMorePosts';
import styles from "./page.module.css";
import { POSTS } from '@/data/posts';
import CommentInput from '@/components/CommentInput';
import NiceButton from '@/components/NiceButton';
import BadButton from '@/components/BadButton';
import CommentSection from '@/components/CommentSection';

// Re-export POSTS to maintain backward compatibility with other files importing it from here
export { POSTS };

function Page({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [isCompleted, setIsCompleted] = useState(false);

  const currentId = Number(id);
  const currentIndex = POSTS.findIndex((p) => p.id === currentId);
  const post = POSTS[currentIndex];

  const handleNext = () => {
    if (currentIndex < POSTS.length - 1) {
      router.push(`/posts/${POSTS[currentIndex + 1].id}`);
    } else {
      setIsCompleted(true);
    }
  };

  // For a rating-based feed, both Nice (ThumbsUp) and Bad (ThumbsDown) advance to the next card.
  const handlePrevious = handleNext;

  if (isCompleted) {
    return <NoMorePosts />;
  }

  if (!post) {
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
