import React from 'react'
import Header from '@/components/Header'
import Likes from '@/components/Likes'
import PostImage from '@/components/PostImage'

function page() {
  return (
    <div>
      <Likes />
      <PostImage />
    </div>
  )
}

export default page