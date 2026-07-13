"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./Chat.module.css";
import backgroundUrls from "@/src/firebase/backgroundUrls.json";
import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "@/src/firebase/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onSnapshot, collection, query, orderBy, where, doc, updateDoc, getDocs } from "firebase/firestore";
import { getUserProfile } from "@/src/firebase/userDb";
import {
  sendChatMessage,
  decryptContent,
  cancelChatMessage
} from "@/src/firebase/chatDb";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faImage,
  faSmile,
  faInfoCircle,
  faLock,
  faSpinner,
  faUndo
} from "@fortawesome/free-solid-svg-icons";

const EMOJIS = [
  "😊", "😂", "🤣", "🥰", "😍", "😘", "😜", "🤔", "🤫", "🙄",
  "😭", "🥺", "😱", "😠", "🤯", "👍", "👎", "👏", "🙌", "🤝",
  "❤️", "💔", "🎉", "🔥", "✨", "🌟", "💬", "🔊", "📅", "📍"
];

// 日本語のフォーマットヘルパー
const formatTime = (date: Date) => {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const isImageExpired = (msg: any) => {
  if (msg.image_deleted) return true;
  if (!msg.image_url) return false;
  // 共有の絵文字画像は期限切れにしない
  if (msg.image_url.includes("shared_emojis")) return false;
  
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const createdTime = msg.created_at instanceof Date 
    ? msg.created_at.getTime() 
    : msg.created_at?.toDate?.().getTime() || new Date(msg.created_at).getTime();
    
  return (Date.now() - createdTime) > ONE_WEEK_MS;
};

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 葉っぱの枯れ具合更新のための現在時刻ステート (10秒ごとに更新)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 経過時間に応じた枯れ具合ステージを取得
  const getLeafStage = (createdAt: Date) => {
    const diffMs = now - createdAt.getTime();
    const diffMins = diffMs / 1000 / 60;
    if (diffMins < 1) {
      return "fresh";
    } else if (diffMins < 3) {
      return "yellowing";
    } else {
      return "withered";
    }
  };

  // チャットスレッド一覧とメッセージ履歴
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // 絵文字ピッカーの表示状態
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 取得した絵文字のURLキャッシュ
  const [emojiUrls, setEmojiUrls] = useState<Record<string, string>>({});

  // 画像拡大表示用のURLステート
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // 右クリック送信取り消しメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);

  // スクロール用Ref
  const messageLogRef = useRef<HTMLDivElement>(null);

  // 絵文字ピッカーの外側をクリックしたときに閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // コンテキストメニューを閉じる
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener("click", handleCloseMenu);
    return () => {
      window.removeEventListener("click", handleCloseMenu);
    };
  }, []);

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
      const timer = setTimeout(() => {
        setRooms([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const roomsCollectionRef = collection(db, "chat_rooms");
    const q = query(
      roomsCollectionRef,
      where("user_ids", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const dbRooms: any[] = [];
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
          const partnerUid = room.user_ids.find((id: string) => id !== currentUser.uid);
          let partnerProfile: any = null;
          if (partnerUid === "system") {
            partnerProfile = {
              displayName: "システム通知",
              nickname: "システム",
              profileImage: "/logo.png"
            };
          } else {
            try {
              partnerProfile = await getUserProfile(partnerUid);
            } catch (err) {
              console.error(`Error fetching user profile for ${partnerUid}:`, err);
            }
          }
          
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

          // 未読メッセージ件数の取得
          let unreadCount = 0;
          try {
            const messagesCollectionRef = collection(db, "chat_rooms", room.id, "messages");
            const unreadQuery = query(
              messagesCollectionRef,
              where("sender_id", "==", partnerUid),
              where("read", "==", false)
            );
            const unreadSnap = await getDocs(unreadQuery);
            unreadCount = unreadSnap.size;
          } catch (unreadErr) {
            console.error("Failed to fetch unread count:", unreadErr);
          }

          return {
            id: room.id,
            partnerUid,
            partnerName: partnerProfile?.displayName || partnerProfile?.nickname || "ユーザー",
            avatar: partnerProfile?.profileImage || "/user_Icon/user_icon1.jpg",
            online: false,
            lastActive: lastActiveStr,
            unreadCount: room.id === selectedRoomId ? 0 : unreadCount,
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
  }, [currentUser, selectedRoomId]);

  // --- 3. 選択されたチャットルームのメッセージリアルタイム監視 ---
  useEffect(() => {
    if (!selectedRoomId || !currentUser) {
      const timer = setTimeout(() => {
        setMessages([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const messagesCollectionRef = collection(db, "chat_rooms", selectedRoomId, "messages");
    const q = query(messagesCollectionRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      // 相手からの未読メッセージがあればFirestore上で既読(read: true)にする
      const batchUpdates: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.sender_id !== currentUser.uid && !data.read) {
          const messageRef = doc(db, "chat_rooms", selectedRoomId, "messages", docSnap.id);
          batchUpdates.push(updateDoc(messageRef, { read: true }));
        }

        // 送信から1週間経過した画像を自動消去する処理
        if (data.image_url && !data.image_deleted && !data.image_url.includes("shared_emojis")) {
          const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          const createdTime = data.created_at ? data.created_at.toDate().getTime() : Date.now();
          if (Date.now() - createdTime > ONE_WEEK_MS) {
            (async () => {
              try {
                // Storageから削除
                const fileRef = ref(storage, data.image_url);
                await deleteObject(fileRef);
              } catch (storageErr) {
                // すでに消去されている場合などは警告を出して続行
                const message = storageErr instanceof Error ? storageErr.message : String(storageErr);
                console.warn("Storage object already deleted or failed to delete:", message);
              }
              try {
                // Firestoreを更新
                const messageRef = doc(db, "chat_rooms", selectedRoomId, "messages", docSnap.id);
                await updateDoc(messageRef, { image_url: null, image_deleted: true });
              } catch (dbErr) {
                console.error("Failed to update image_deleted status in Firestore:", dbErr);
              }
            })();
          }
        }
      });
      if (batchUpdates.length > 0) {
        Promise.all(batchUpdates).catch(err => console.error("Failed to mark messages as read:", err));
      }

      const decryptedPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        try {
          const plainText = await decryptContent(data.encrypted_content, data.iv, selectedRoomId);
          return {
            id: docSnap.id,
            sender_id: data.sender_id === currentUser.uid ? "me" : "partner",
            is_system: data.is_system || data.sender_id === "system",
            content_text: plainText,
            image_url: data.image_url || null,
            image_deleted: data.image_deleted || false,
            created_at: data.created_at ? data.created_at.toDate() : new Date(),
            isRead: data.read || false,
            canceled: data.canceled || false
          };
        } catch (err) {
          console.warn("Failed to decrypt message:", err instanceof Error ? err.message : String(err));
          return {
            id: docSnap.id,
            sender_id: data.sender_id === currentUser.uid ? "me" : "partner",
            is_system: data.is_system || data.sender_id === "system",
            content_text: "🔒 [復号化に失敗した暗号メッセージ]",
            image_url: data.image_url || null,
            image_deleted: data.image_deleted || false,
            created_at: data.created_at ? data.created_at.toDate() : new Date(),
            isRead: data.read || false,
            canceled: data.canceled || false
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
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending || !inputText.trim() || !selectedRoomId || !currentUser) return;

    const userText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const activeRoom = rooms.find((r) => r.id === selectedRoomId);
      if (!activeRoom) {
        setIsSending(false);
        return;
      }

      await sendChatMessage(
        selectedRoomId,
        currentUser.uid,
        activeRoom.partnerUid,
        userText
      );
    } catch (err) {
      console.error("Failed to send message to database:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmoji = async (emoji: string) => {
    setShowEmojiPicker(false);
    if (!selectedRoomId || !currentUser) return;

    try {
      const activeRoom = rooms.find((r) => r.id === selectedRoomId);
      if (!activeRoom) return;

      let imageUrl = emojiUrls[emoji];

      if (!imageUrl) {
        // まだキャッシュにない場合はFirebase Storageから取得
        const storageRef = ref(storage, `shared_emojis/${emoji}.svg`);
        imageUrl = await getDownloadURL(storageRef);
        
        // キャッシュを更新
        setEmojiUrls(prev => ({
          ...prev,
          [emoji]: imageUrl
        }));
      }

      // メッセージを送信
      await sendChatMessage(
        selectedRoomId,
        currentUser.uid,
        activeRoom.partnerUid,
        "",
        imageUrl
      );
    } catch (err) {
      console.error("Error sending Firebase emoji:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomId || !currentUser) return;
    
    // reset file input
    e.target.value = "";

    try {
      const activeRoom = rooms.find((r) => r.id === selectedRoomId);
      if (!activeRoom) return;

      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `chat_rooms/${selectedRoomId}/images/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file, {
        contentType: file.type || "image/jpeg",
      });
      const imageUrl = await getDownloadURL(uploadResult.ref);

      await sendChatMessage(
        selectedRoomId,
        currentUser.uid,
        activeRoom.partnerUid,
        "",
        imageUrl
      );
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  };

  const handleCancelMessage = async (messageId: string) => {
    if (!selectedRoomId) return;
    try {
      await cancelChatMessage(selectedRoomId, messageId);
      setContextMenu(null);
    } catch (err) {
      console.error("Failed to cancel message:", err);
    }
  };

  // 入力フォームでのEnterキー送信対応（Shift+Enterは改行、IME確定時のEnterは送信しない）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
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
        <main
          className={styles.chatArea}
          style={{
            "--chat-bg-url": `url(${backgroundUrls.chat_backimage || "/back_image/chat_backimage.avif"})`
          } as React.CSSProperties}
        >
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
                        {(() => {
                           const leafStage = getLeafStage(msg.created_at);
                           const leafBubbleClass = msg.canceled
                             ? `${styles.bubble} ${styles.canceledBubble}`
                             : `${styles.bubble} ${
                                 isMe ? styles.outgoingBubble : styles.incomingBubble
                               } ${styles[`leaf-${leafStage}`]} ${
                                 isMe ? styles[`leaf-outgoing-${leafStage}`] : styles[`leaf-incoming-${leafStage}`]
                               }`;
                           return (
                             <div
                               className={leafBubbleClass}
                               onContextMenu={(e) => {
                                 if (isMe && !msg.canceled && !isSystem) {
                                   e.preventDefault();
                                   setContextMenu({
                                     x: e.clientX,
                                     y: e.clientY,
                                     messageId: msg.id
                                   });
                                 }
                               }}
                             >
                               {msg.canceled ? (
                                 <p style={{ margin: 0 }}>送信が取り消されました</p>
                               ) : (
                                 <>
                                   {(msg.image_url || msg.image_deleted) && (
                                     isImageExpired(msg) || msg.image_deleted ? (
                                       <div 
                                         className={styles.expiredImagePlaceholder}
                                         style={{ marginBottom: msg.content_text ? "8px" : "0" }}
                                       >
                                         <span>🐛 画像は虫に食べられちゃった！（送信から1週間経過）</span>
                                       </div>
                                     ) : (
                                       msg.image_url && msg.image_url.includes("shared_emojis") ? (
                                         <div 
                                           className={styles.emojiImageWrapper}
                                           style={{ marginBottom: msg.content_text ? "8px" : "0" }}
                                         >
                                           {/* eslint-disable-next-line @next/next/no-img-element */}
                                           <img
                                             src={msg.image_url}
                                             alt="絵文字"
                                             className={`${styles.emojiImage} ${styles.noSelectImage}`}
                                             onContextMenu={(e) => e.preventDefault()}
                                             onDragStart={(e) => e.preventDefault()}
                                             style={{ pointerEvents: "none" }}
                                           />
                                         </div>
                                       ) : (
                                         <div 
                                           className={styles.messageImageWrapper} 
                                           style={{ 
                                             marginBottom: msg.content_text ? "8px" : "0",
                                             cursor: "zoom-in"
                                           }}
                                           onClick={() => setZoomImageUrl(msg.image_url)}
                                         >
                                           {/* eslint-disable-next-line @next/next/no-img-element */}
                                           <img
                                             src={msg.image_url || ""}
                                             alt="添付画像"
                                             className={`${styles.messageImage} ${styles.noSelectImage}`}
                                             onContextMenu={(e) => e.preventDefault()}
                                             onDragStart={(e) => e.preventDefault()}
                                             style={{ pointerEvents: "none" }}
                                           />
                                         </div>
                                       )
                                     )
                                   )}
                                   {msg.content_text && <p style={{ margin: 0 }}>{msg.content_text}</p>}
                                 </>
                               )}
                             </div>
                           );
                         })()}
                       </div>
                       <div
                         className={`${styles.metaContainer} ${
                           isMe ? styles.outgoingMeta : styles.incomingMeta
                         }`}
                       >
                         {isMe && msg.isRead && !msg.canceled && (
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
          {activeRoom.partnerUid === "system" ? (
            <div className={styles.systemChatNotice}>
              <FontAwesomeIcon icon={faLock} style={{ marginRight: '8px', color: '#64748b' }} />
              システム専用チャットのため、メッセージの送信はできません。
            </div>
          ) : (
            <div className={styles.inputAreaContainer}>
              <form className={styles.inputBar} onSubmit={handleSend}>
                <button 
                  type="button" 
                  className={styles.iconBtn} 
                  title="画像送信"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FontAwesomeIcon icon={faImage} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                
                <input
                  type="text"
                  placeholder="メッセージを入力..."
                  className={styles.messageInput}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                
                <div style={{ position: "relative" }} ref={emojiPickerRef}>
                  <button 
                    type="button" 
                    className={styles.iconBtn} 
                    title="絵文字"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <FontAwesomeIcon icon={faSmile} />
                  </button>
                  {showEmojiPicker && (
                    <div className={styles.emojiPickerPopup}>
                      <div className={styles.emojiPickerGrid}>
                        {EMOJIS.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={styles.emojiItem}
                            onClick={() => handleSendEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button type="submit" className={styles.sendBtn} title="送信" disabled={isSending}>
                  <FontAwesomeIcon icon={faPaperPlane} size="sm" />
                </button>
              </form>
            </div>
          )}
        </main>
      ) : (
        <div className={styles.noChatSelected}>
          <h3 className={styles.noChatTitle}>チャットを選択してください</h3>
          <p className={styles.noChatText}>左側のメッセージリストからスレッドを選択して会話を開始できます。</p>
        </div>
      )}
      {/* 画像拡大モーダル */}
      {zoomImageUrl && (
        <div 
          className={styles.modalOverlay}
          onClick={() => setZoomImageUrl(null)}
        >
          <button className={styles.modalCloseButton}>&times;</button>
          <div className={styles.modalContent}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImageUrl}
              alt="拡大画像"
              className={`${styles.modalImage} ${styles.noSelectImage}`}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ pointerEvents: "none" }}
            />
          </div>
        </div>
      )}
      {/* 右クリック送信取り消しコンテキストメニュー */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => handleCancelMessage(contextMenu.messageId)}
          >
            <FontAwesomeIcon icon={faUndo} style={{ marginRight: "6px" }} />
            送信取り消し
          </button>
        </div>
      )}
    </div>
  );
}
