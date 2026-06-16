"use client";

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { POSTS } from '@/data/posts';

// Re-export POSTS to maintain backward compatibility with other files importing it from here
export { POSTS };

function Page({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const currentId = Number(id);
  const currentIndex = POSTS.findIndex((p) => p.id === currentId);
  const post = POSTS[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      router.push(`/posts/${POSTS[currentIndex - 1].id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < POSTS.length - 1) {
      router.push(`/posts/${POSTS[currentIndex + 1].id}`);
    }
  };

  const disablePrevious = currentIndex <= 0;
  const disableNext = currentIndex >= POSTS.length - 1;

  if (!post) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>投稿が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div>
      <PostCard
        post={post}
        onPreviousPost={handlePrevious}
        onNextPost={handleNext}
        disablePrevious={disablePrevious}
        disableNext={disableNext}
      />
    </div>
  );
}

export default Page;
