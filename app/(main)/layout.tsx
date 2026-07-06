"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";
import { getUserProfile } from "@/src/firebase/userDb";
import Header from "@/components/Header";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const isTopPage = pathname === "/";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const data = await getUserProfile(user.uid);

          if (data) {
            // プロフィール詳細登録が未完了の場合は詳細登録画面へ強制移動
            if (!data.isProfileCompleted && !data.isRegistered) {
              if (data.userType === "shop") {
                router.replace("/signup/store/details");
              } else {
                router.replace("/signup/details");
              }
              return;
            }
          } else {
            // ドキュメントが無い場合も登録未完了とみなす
            router.replace("/signup/details");
            return;
          }
        } catch (err) {
          console.error("Layout auth check error:", err);
        } finally {
          setChecking(false);
        }
      } else {
        // ログインしていない場合（セッションが無ければ proxy.js がログインへ促す）
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div style={spinnerContainerStyle}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#003db3" }} />
        <p style={{ marginTop: "12px", color: "#7b8ab8", fontSize: "14px" }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <main>
        {!isTopPage && <Header />}
        {children}
      </main>
    </div>
  );
}

const spinnerContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  backgroundColor: "#f5f8ff",
};