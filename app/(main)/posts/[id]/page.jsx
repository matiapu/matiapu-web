import React from 'react'

async function page({params}) {
  const { id } = await params;

    const POSTS = [
      {
        id:1,
        name:"佐々木 太郎",
        userIcon:"/user_icon/user_icon1.jpg",
        title:"test",
        tags:"災害",
        image:"/post_image/post_image1.jpg",
        createAt:"2026-06-10",
        content:"本文",
        likes:"1",
        commentID:"comment1",
        postID: "post1",               // FK PostId
        userID: "user1",       // FK UserId（ログインユーザーのID）
        questionText: "質問です",     // 画像のスキーマ定義に合わせる（本文）
        answerText: null,  
      },
      {
        id:2,
        name:"佐々木 太郎",
        userIcon:"/user_icon/user_icon2.jpg",
        title:"わああああ",
        tags:"災害",
        image:"/post_image/post_image2.jpg",
        createAt:"2026-06-10",
        content:"本文",
        commentID:"comment1",
        postID: "post2",               // FK PostId
        userID: "user2",       // FK UserId（ログインユーザーのID）
        questionText: "今日は暑いです。",     // 画像のスキーマ定義に合わせる（本文）
        answerText: null,  
      },
      {
        id:3,
        name:"佐々木 太郎",
        userIcon:"/user_icon/user_icon3.jpg",
        title:"test",
        tags:"災害",
        image:"/post_image/post_image3.jpg",
        createAt:"2026-06-10",
        content:"本文",
        commentID:"comment1",
        postID: "post3",               // FK PostId
        userID: "user3",       // FK UserId（ログインユーザーのID）
        questionText: "今日も元気",     // 画像のスキーマ定義に合わせる（本文）
        answerText: null,  
      }
    ];

     const post = POSTS.find((p) => p.id === Number(id));


  return (
    <div>
      <p>{post.name}</p>
      <img src={post.userIcon} alt="ユーザー画像" />
      <p>{post.title}</p>
      <p>{post.tags}</p>
      <img src={post.image} alt="投稿画像" />
      <p>{post.createAt}</p>
      <p>{post.content}</p>
      <p>{post.commentID}</p>
      <p>{post.postID}</p>
      <p>{post.userID}</p>
      <p>{post.questionText}</p>
    </div>
  );
}

export default page