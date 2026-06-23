import { NextResponse } from "next/server";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/src/firebase/firebase";

// 都道府県・地域の代表的な座標（津波発生時の簡易マッピング用）
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  "北海道": { lat: 43.06, lng: 141.35 },
  "青森": { lat: 40.82, lng: 140.74 },
  "岩手": { lat: 39.70, lng: 141.15 },
  "宮城": { lat: 38.27, lng: 140.87 },
  "秋田": { lat: 39.72, lng: 140.10 },
  "山形": { lat: 38.25, lng: 140.34 },
  "福島": { lat: 37.75, lng: 140.47 },
  "茨城": { lat: 36.34, lng: 140.45 },
  "栃木": { lat: 36.56, lng: 139.88 },
  "群馬": { lat: 36.39, lng: 139.06 },
  "埼玉": { lat: 35.86, lng: 139.65 },
  "千葉": { lat: 35.60, lng: 140.12 },
  "東京": { lat: 35.68, lng: 139.76 },
  "神奈川": { lat: 35.45, lng: 139.64 },
  "新潟": { lat: 37.90, lng: 139.02 },
  "富山": { lat: 36.70, lng: 137.21 },
  "石川": { lat: 36.59, lng: 136.63 },
  "福井": { lat: 36.06, lng: 136.22 },
  "山梨": { lat: 35.66, lng: 138.57 },
  "長野": { lat: 36.65, lng: 138.18 },
  "岐阜": { lat: 35.42, lng: 136.76 },
  "静岡": { lat: 34.97, lng: 138.38 },
  "愛知": { lat: 35.18, lng: 136.90 },
  "三重": { lat: 34.73, lng: 136.50 },
  "滋賀": { lat: 35.00, lng: 135.87 },
  "京都": { lat: 35.02, lng: 135.76 },
  "大阪": { lat: 34.69, lng: 135.50 },
  "兵庫": { lat: 34.69, lng: 135.18 },
  "奈良": { lat: 34.68, lng: 135.83 },
  "和歌山": { lat: 34.23, lng: 135.17 },
  "鳥取": { lat: 35.50, lng: 134.24 },
  "島根": { lat: 35.47, lng: 133.05 },
  "岡山": { lat: 34.66, lng: 133.93 },
  "広島": { lat: 34.39, lng: 132.46 },
  "山口": { lat: 34.18, lng: 131.47 },
  "徳島": { lat: 34.07, lng: 134.55 },
  "香川": { lat: 34.34, lng: 134.04 },
  "愛媛": { lat: 33.84, lng: 132.76 },
  "高知": { lat: 33.56, lng: 133.53 },
  "福岡": { lat: 33.60, lng: 130.42 },
  "佐賀": { lat: 33.25, lng: 130.30 },
  "長崎": { lat: 32.74, lng: 129.87 },
  "熊本": { lat: 32.79, lng: 130.74 },
  "大分": { lat: 33.23, lng: 131.60 },
  "宮崎": { lat: 31.91, lng: 131.42 },
  "鹿児島": { lat: 31.56, lng: 130.55 },
  "沖縄": { lat: 26.21, lng: 127.68 }
};

// 中心位置から簡易ポリゴン（8角形）を生成するヘルパー関数
function createPolygonFromCenter(lat: number, lng: number, radiusDegrees = 0.05) {
  const coords: { lat: number; lng: number }[] = [];
  const numSides = 8;
  for (let i = 0; i <= numSides; i++) {
    const angle = (i * 2 * Math.PI) / numSides;
    const dx = radiusDegrees * Math.cos(angle);
    const dy = radiusDegrees * Math.sin(angle);
    coords.push({ lat: lat + dy, lng: lng + dx });
  }
  return {
    type: 'Polygon' as const,
    coordinates: coords
  };
}

// 複数座標を囲むバウンディングボックスポリゴンを生成するヘルパー関数
function createBoundingBoxPolygon(points: { lat: number; lng: number }[], padding = 0.05) {
  if (points.length === 0) {
    return createPolygonFromCenter(35.681228, 139.767052, padding);
  }
  if (points.length === 1) {
    return createPolygonFromCenter(points[0].lat, points[0].lng, padding);
  }
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  minLat -= padding;
  maxLat += padding;
  minLng -= padding;
  maxLng += padding;
  
  return {
    type: 'Polygon' as const,
    coordinates: [
      { lat: minLat, lng: minLng },
      { lat: maxLat, lng: minLng },
      { lat: maxLat, lng: maxLng },
      { lat: minLat, lng: maxLng },
      { lat: minLat, lng: minLng }
    ]
  };
}

// P2P地震情報の時刻文字列 ("YYYY/MM/DD HH:mm:ss.sss") をDateオブジェクトに変換
function parseP2PDateTime(dateTimeStr: string): Date {
  const formatted = dateTimeStr.trim().replace(/\//g, "-").replace(" ", "T");
  return new Date(formatted);
}

// P2P地震情報の maxScale スコア値を気象庁震度階級の文字列に変換
function formatMaxScale(maxScale: number): string {
  switch (maxScale) {
    case 10: return "1";
    case 20: return "2";
    case 30: return "3";
    case 40: return "4";
    case 45: return "5弱";
    case 50: return "5強";
    case 55: return "6弱";
    case 60: return "6強";
    case 70: return "7";
    default: return "不明";
  }
}

export async function GET() {
  try {
    // P2P地震情報 API v2 /history エンドポイントから地震(551)と津波(552)の最新情報を10件取得
    const apiUrl = "https://api.p2pquake.net/v2/history?codes=551&codes=552&limit=10";
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch from P2PQuake API: ${res.status}`);
    }

    const events = await res.json();
    let registeredCount = 0;

    for (const event of events) {
      const { id: eventId, code } = event;
      if (!eventId) continue;

      let disaster_type: '地震' | '津波';
      let occurred_at: Timestamp;
      let danger_zone: any;
      let seismic_intensity: string | undefined;
      let seismic_intensity_code: number | undefined;

      if (code === 551) {
        // 地震情報
        disaster_type = "地震";

        // 震度3以上（maxScale >= 30）のみ登録
        const maxScale = event.earthquake?.maxScale;
        if (typeof maxScale !== "number" || maxScale < 30) {
          continue;
        }
        seismic_intensity = formatMaxScale(maxScale);
        seismic_intensity_code = maxScale;
        
        // 発生日時の取得
        const timeStr = event.earthquake?.time || event.time;
        if (!timeStr) continue;
        occurred_at = Timestamp.fromDate(parseP2PDateTime(timeStr));

        // 震央の座標取得
        const hypocenter = event.earthquake?.hypocenter;
        if (hypocenter && typeof hypocenter.latitude === "number" && typeof hypocenter.longitude === "number") {
          const lat = hypocenter.latitude;
          const lng = hypocenter.longitude;
          
          // マグニチュードに応じてポリゴンサイズ（影響範囲）を動的に決定
          const magnitude = hypocenter.magnitude || 3.0;
          const radiusDegrees = Math.max(0.02, magnitude * 0.02);
          danger_zone = createPolygonFromCenter(lat, lng, radiusDegrees);
        } else {
          // 座標が不明な場合はデフォルト値
          danger_zone = createPolygonFromCenter(35.681228, 139.767052, 0.05);
        }
      } else if (code === 552) {
        // 津波予報
        disaster_type = "津波";

        // 危険性がある場合のみ登録（解除情報はスキップ）
        if (event.cancelled === true) {
          continue;
        }

        // 警告・注意報が出ている地域の一覧から、危険性がある（MajorWarning, Warning, Watch）地域のみ抽出
        const areas = event.areas || [];
        const dangerousAreas = areas.filter((area: any) =>
          area.grade === "MajorWarning" ||
          area.grade === "Warning" ||
          area.grade === "Watch"
        );

        if (dangerousAreas.length === 0) {
          continue;
        }
        
        // 発表日時の取得
        const timeStr = event.issue?.time || event.time;
        if (!timeStr) continue;
        occurred_at = Timestamp.fromDate(parseP2PDateTime(timeStr));

        // 危険性がある地域から座標データを抽出
        const points: { lat: number; lng: number }[] = [];
        for (const area of dangerousAreas) {
          const name = area.name || "";
          for (const [key, coords] of Object.entries(REGION_COORDS)) {
            if (name.includes(key)) {
              points.push(coords);
              break;
            }
          }
        }
        
        // 地域を囲むポリゴンを決定
        danger_zone = createBoundingBoxPolygon(points, 0.1);
      } else {
        continue;
      }

      // Firestoreの disasters コレクションにレコードを保存
      // ドキュメントIDに P2PQuake のイベントIDを使用し、重複登録を防ぐ
      const docRef = doc(db, "disasters", eventId);
      
      const disasterData: any = {
        disaster_type,
        danger_zone,
        occurred_at,
        created_at: Timestamp.now()
      };

      if (seismic_intensity !== undefined) {
        disasterData.seismic_intensity = seismic_intensity;
      }
      if (seismic_intensity_code !== undefined) {
        disasterData.seismic_intensity_code = seismic_intensity_code;
      }

      await setDoc(docRef, disasterData, { merge: true });

      registeredCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${events.length} events from P2PQuake API. Registered/updated ${registeredCount} disasters in Firestore.`,
      processedCount: events.length,
      registeredCount
    });

  } catch (err: any) {
    console.error("Error syncing disasters:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}
