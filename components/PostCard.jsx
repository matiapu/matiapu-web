"use client"
import React from 'react'
import { useState } from 'react'
import UserIcon from './UserIcon'
import styles from './PostCard.module.css'
import NiceBadButton from './NiceBadButton'
import Image from 'next/image'


function PostCard({ post }) {
    // 投稿が開いているかどうかを管理するステート（初期値は false = 閉じている
    const [isOpen, setIsOpen] = useState(false)

    const MAX_LENGTH = 100

    const isLongContent = post.content ? post.content.length > MAX_LENGTH : false;

    // 表示するテキストを切り替える
    // 開いている、または文字数が制限以下の場合は全文を表示。閉じている場合は一部を切り取る。
    const displayedContent = isOpen || !isLongContent
        ? post.content
        : post.content.substring(0, MAX_LENGTH)

    // 切替
    const toggleOpen = () => {
        setIsOpen(!isOpen)
    }
    return (
        <div>
            <div className={styles.post_wrapper}>
                {/* 投稿画像 */}
                <Image src={post.image} alt={`${post.name}さんの投稿画像`} className={styles.post_image} />

                {/* ユーザー情報 */}
                <div className={styles.overlay}>
                    <div className={styles.user_info}>
                        <UserIcon iconUrl={post.userIcon} />

                        <div className={styles.space}>
                            <p className={styles.user_name}>
                                {post.name}
                            </p>

                            <p>
                                {post.createAt}
                            </p>
                        </div>
                    </div>

                    <h2>{post.title}</h2>

                    <span className={styles.tag}>
                        {post.tags}
                    </span>

                    <div className={styles.content}>
                        <p>{displayedContent}</p>

                        {!isOpen && isLongContent && (
                            <button onClick={toggleOpen}>
                                続きを見る
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className={styles.NiceBadButton}>
                <NiceBadButton />
            </div>
        </div>
    )
}

export default PostCard