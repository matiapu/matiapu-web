"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./Chat.module.css";
import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/src/firebase/firebase";
import { onSnapshot, collection, query, orderBy, where } from "firebase/firestore";
import { getUserProfile } from "@/src/firebase/userDb";
import {
  sendChatMessage,
  decryptContent
} from "@/src/firebase/chatDb";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faPlus,
  faImage,
  faSmile,
  faInfoCircle,
  faLock,
  faEdit,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";

// 日本語のフォーマットヘルパー
const formatTime = (date) => {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const formatDate = (date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // チャットスレッド一覧とメッセージ履歴
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  
  // スクロール用Ref
  const messageLogRef = useRef(null);

  // --- 1. 認証状態の監視 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUser({ uid: user.uid, ...profile });
        } catch (err) {
          console.error("Failed to load user profile:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. チャットルーム一覧のリアルタイム監視 ---
  useEffect(() => {
    if (!currentUser) {
      setRooms([]);
      return;
    }

    const roomsCollectionRef = collection(db, "chat_rooms");
    const q = query(
      roomsCollectionRef,
      where("user_ids", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const dbRooms = [];
      querySnapshot.forEach((docSnap) => {
        dbRooms.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // メモリ上で最終メッセージ日時の降順にソートします
      dbRooms.sort((a, b) => {
        const timeA = a.last_message_at?.toMillis() || 0;
        const timeB = b.last_message_at?.toMillis() || 0;
        return timeB - timeA;
      });

      const formattedRooms = await Promise.all(
        dbRooms.map(async (room) => {
          const partnerUid = room.user_ids.find((id) => id !== currentUser.uid);
          const partnerProfile = await getUserProfile(partnerUid);
          
          let lastMsgText = "メッセージはありません";
          if (room.last_message_text && room.last_message_iv) {
            try {
              lastMsgText = await decryptContent(room.last_message_text, room.last_message_iv, room.id);
            } catch (err) {
              lastMsgText = "🔒 [復号化に失敗した暗号メッセージ]";
            }
          }

          let lastActiveStr = "";
          if (room.last_message_at) {
            const date = room.last_message_at.toDate();
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
              lastActiveStr = formatTime(date);
            } else {
              lastActiveStr = `${date.getMonth() + 1}/${date.getDate()}`;
            }
          }

          return {
            id: room.id,
            partnerUid,
            partnerName: partnerProfile?.displayName || partnerProfile?.nickname || "ユーザー",
            avatar: partnerProfile?.profileImage || "/user_Icon/user_icon1.jpg",
            online: false,
            lastActive: lastActiveStr,
            unreadCount: 0,
            lastMessageText: lastMsgText
          };
        })
      );

      setRooms(formattedRooms);
      
      // 最初の一件を自動選択
      if (formattedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(formattedRooms[0].id);
      }
    }, (err) => {
      console.error("Error listening to chat rooms:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- 3. 選択されたチャットルームのメッセージリアルタイム監視 ---
  useEffect(() => {
    if (!selectedRoomId || !currentUser) {
      setMessages([]);
      return;
    }

    const messagesCollectionRef = collection(db, "chat_rooms", selectedRoomId, "messages");
    const q = query(messagesCollectionRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const decryptedPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        try {
          const plainText = await decryptContent(data.encrypted_content, data.iv, selectedRoomId);
          return {
            id: docSnap.id,
            sender_id: data.sender_id === currentUser.uid ? "me" : "partner",
            is_system: data.is_system || data.sender_id === "system",
            content_text: plainText,
            created_at: data.created_at ? data.created_at.toDate() : new Date(),
            isRead: true
          };
        } catch (err) {
          console.error("Failed to decrypt message:", err);
          return {
            id: docSnap.id,
            sender_id: data.sender_id === currentUser.uid ? "me" : "partner",
            is_system: data.is_system || data.sender_id === "system",
            content_text: "🔒 [復号化に失敗した暗号メッセージ]",
            created_at: data.created_at ? data.created_at.toDate() : new Date(),
            isRead: true
          };
        }
      });

      const decryptedMessages = await Promise.all(decryptedPromises);
      setMessages(decryptedMessages);
    }, (err) => {
      console.error("Error listening to messages:", err);
    });

    return () => unsubscribe();
  }, [selectedRoomId, currentUser]);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [messages]);

  // --- 4. メッセージの送信処理 ---
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedRoomId || !currentUser) return;

    const userText = inputText.trim();
    setInputText("");

    try {
      const activeRoom = rooms.find((r) => r.id === selectedRoomId);
      if (!activeRoom) return;

      await sendChatMessage(
        selectedRoomId,
        currentUser.uid,
        activeRoom.partnerUid,
        userText
      );
    } catch (err) {
      console.error("Failed to send message to database:", err);
    }
  };

  // 入力フォームでのEnterキー送信対応（Shift+Enterは改行）
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#0052cc" }} />
          <p style={{ marginTop: "12px", color: "#94a3b8" }}>チャットを準備中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={styles.container} style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h3 style={{ color: "#0f172a", marginBottom: "8px" }}>ログインが必要です</h3>
          <p style={{ color: "#64748b", marginBottom: "16px" }}>チャット機能を利用するにはログインしてください。</p>
          <Link href="/login" style={{ padding: "8px 16px", backgroundColor: "#0052cc", color: "white", borderRadius: "6px", textDecoration: "none" }}>ログイン画面へ</Link>
        </div>
      </div>
    );
  }

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className={styles.container}>
      {/* 1. 左側スレッド一覧 */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>メッセージ</h2>
          <button className={styles.composeButton} title="新規メッセージ">
            <FontAwesomeIcon icon={faEdit} size="lg" />
          </button>
        </div>
        <div className={styles.threadList}>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`${styles.threadItem} ${
                room.id === selectedRoomId ? styles.activeThread : ""
              }`}
              onClick={() => setSelectedRoomId(room.id)}
            >
              <div className={styles.avatarWrapper}>
                <Image
                  src={room.avatar}
                  alt={room.partnerName}
                  className={styles.avatar}
                  width={48}
                  height={48}
                  unoptimized
                />
                {room.online && <span className={styles.onlineBadge} />}
              </div>
              <div className={styles.threadInfo}>
                <div className={styles.threadMeta}>
                  <h3 className={styles.partnerName}>{room.partnerName}</h3>
                  <span className={styles.lastMsgTime}>{room.lastActive}</span>
                </div>
                <div className={styles.lastMsgPreviewRow}>
                  <p className={styles.lastMsgPreview}>{room.lastMessageText}</p>
                  {room.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{room.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. 右側チャットメインエリア */}
      {activeRoom ? (
        <main className={styles.chatArea}>
          {/* ヘッダー部分 */}
          <header className={styles.chatHeader}>
            <div className={styles.chatPartnerInfo}>
              <Image
                src={activeRoom.avatar}
                alt={activeRoom.partnerName}
                className={styles.partnerAvatar}
                width={40}
                height={40}
                unoptimized
              />
              <div className={styles.partnerDetail}>
                <h3 className={styles.partnerMainName}>{activeRoom.partnerName}</h3>
                {activeRoom.online ? (
                  <span className={styles.partnerStatusText}>● オンライン</span>
                ) : (
                  <span className={styles.partnerOfflineText}>オフライン</span>
                )}
              </div>
            </div>
            <button className={styles.infoButton} title="詳細情報">
              <FontAwesomeIcon icon={faInfoCircle} size="lg" />
            </button>
          </header>

          {/* メッセージログ表示部分 */}
          <div className={styles.messageLog} ref={messageLogRef}>
            {messages.map((msg, index) => {
              const isSystem = msg.is_system;
              const isMe = msg.sender_id === "me";
              
              // 前のメッセージと日付が異なる場合に日付セパレーターを表示
              const currentDateStr = formatDate(msg.created_at);
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const prevDateStr = prevMsg ? formatDate(prevMsg.created_at) : null;
              const showDivider = currentDateStr !== prevDateStr;

              return (
                <React.Fragment key={msg.id || index}>
                  {showDivider && (
                    <div className={styles.dateDivider}>
                      <span className={styles.dateText}>{currentDateStr}</span>
                    </div>
                  )}
                  {isSystem ? (
                    <div className={styles.systemRow}>
                      <div className={styles.systemBubble}>
                        {msg.content_text}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`${styles.messageRow} ${
                        isMe ? styles.outgoingRow : styles.incomingRow
                      }`}
                    >
                      {!isMe && (
                        <Image
                          src={activeRoom.avatar}
                          alt={activeRoom.partnerName}
                          className={styles.messageAvatar}
                          width={32}
                          height={32}
                          unoptimized
                        />
                      )}
                      <div className={styles.bubbleContainer}>
                        <div
                          className={`${styles.bubble} ${
                            isMe ? styles.outgoingBubble : styles.incomingBubble
                          }`}
                        >
                          {msg.content_text}
                        </div>
                      </div>
                      <div
                        className={`${styles.metaContainer} ${
                          isMe ? styles.outgoingMeta : styles.incomingMeta
                        }`}
                      >
                        {isMe && msg.isRead && (
                          <span className={styles.readStatus}>既読</span>
                        )}
                        <span>{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* メッセージ入力・フォーム部分 */}
          <div className={styles.inputAreaContainer}>
            <form className={styles.inputBar} onSubmit={handleSend}>
              <button type="button" className={styles.iconBtn} title="追加機能">
                <FontAwesomeIcon icon={faPlus} />
              </button>
              <button type="button" className={styles.iconBtn} title="画像送信">
                <FontAwesomeIcon icon={faImage} />
              </button>
              
              <input
                type="text"
                placeholder="メッセージを入力..."
                className={styles.messageInput}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              
              <button type="button" className={styles.iconBtn} title="絵文字">
                <FontAwesomeIcon icon={faSmile} />
              </button>
              <button type="submit" className={styles.sendBtn} title="送信">
                <FontAwesomeIcon icon={faPaperPlane} size="sm" />
              </button>
            </form>
            <div className={styles.encryptionNotice}>
              <FontAwesomeIcon icon={faLock} className={styles.encryptionIcon} />
              <span>エンドツーエンド暗号化で保護されています</span>
            </div>
          </div>

          {/* フッターリンク部分 */}
          <footer className={styles.chatFooter}>
            <div className={styles.footerLinks}>
              <Link href="#" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="#" className={styles.footerLink}>Terms of Service</Link>
              <Link href="#" className={styles.footerLink}>Security Center</Link>
              <Link href="#" className={styles.footerLink}>Support</Link>
            </div>
            <p className={styles.copyright}>&copy; 2024 Machiapp Security. All rights reserved.</p>
          </footer>
        </main>
      ) : (
        <div className={styles.noChatSelected}>
          <h3 className={styles.noChatTitle}>チャットを選択してください</h3>
          <p className={styles.noChatText}>左側のメッセージリストからスレッドを選択して会話を開始できます。</p>
        </div>
      )}
    </div>
  );
}
