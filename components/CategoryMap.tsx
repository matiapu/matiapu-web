"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import styles from './CategoryMap.module.css';
import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import { getDisasters } from '@/src/firebase/disasterDb';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/firebase/firebase';
import { getUserProfile } from '@/src/firebase/userDb';
import { getPosts } from '@/src/firebase/postDb';

declare global {
  interface Window {
    google: any;
  }
}

interface LocationItem {
  id?: string | number;
  name?: string;
  lat: number;
  lng: number;
  category: string;
  isEpicenter?: boolean;
  seismic_intensity?: string;
  isPrefectureIntensity?: boolean;
  prefName?: string;
  intensity?: string;
  scale?: string;
  isTsunami?: boolean;
  authorUserType?: string;
}

interface IntensityColor {
  bg: string;
  text: string;
}

// ユーザー指定の震度カラー
const INTENSITY_COLORS: Record<string, IntensityColor> = {
  "7": { bg: "#800080", text: "#ffffff" },       // 赤紫
  "6強": { bg: "#8B0000", text: "#ffffff" },   // 濃い赤
  "6弱": { bg: "#FF0000", text: "#ffffff" },   // 赤
  "5強": { bg: "#FF8C00", text: "#ffffff" },   // 橙色 (オレンジ)
  "5弱": { bg: "#FFFF00", text: "#000000" },   // 黄色
  "4": { bg: "#FFFDD0", text: "#000000" },       // クリーム色 / 薄い黄色
  "3": { bg: "#0000FF", text: "#ffffff" },       // 青色
  "2": { bg: "#87CEEB", text: "#000000" },       // 水色
  "1": { bg: "#FFFFFF", text: "#000000" }        // 白色
};

interface PrefectureLayersProps {
  locations: LocationItem[];
  selectedCategory: string | null;
}

// 都道府県の境界（GeoJSON）をマップに適用し、震度に応じて色付けするコンポーネント
function PrefectureLayers({ locations, selectedCategory }: PrefectureLayersProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    const dataLayer = map.data;
    let isMounted = true;

    // 一旦マップ上の全GeoJSONフィーチャーをクリア
    dataLayer.forEach((feature) => {
      dataLayer.remove(feature);
    });

    // 災害カテゴリがアクティブな場合のみ色付けを判定
    const isDisasterActive = selectedCategory === "disaster" || selectedCategory === null;
    const prefIntensities: Record<string, LocationItem> = {};

    if (isDisasterActive) {
      for (const loc of locations) {
        if (loc.category === "disaster" && loc.isPrefectureIntensity && loc.prefName) {
          prefIntensities[loc.prefName] = loc;
        }
      }
    }

    const hasActiveIntensities = Object.keys(prefIntensities).length > 0;

    if (hasActiveIntensities) {
      // Geoloniaが提供する日本の都道府県境界の簡易版GeoJSON (約800KB)
      const geoJsonUrl = "https://raw.githubusercontent.com/geolonia/prefecture-tiles/master/prefectures.geojson";

      dataLayer.loadGeoJson(geoJsonUrl, null, (features) => {
        if (!isMounted) return;

        // データレイヤーのスタイルを動的に設定
        dataLayer.setStyle((feature) => {
          const prefName = feature.getProperty("name") as string; // 例: "大阪府", "岩手県"
          const match = prefIntensities[prefName];

          if (match && match.intensity) {
            const intensityStyle = INTENSITY_COLORS[match.intensity] || { bg: "#808080" };
            return {
              fillColor: intensityStyle.bg,
              fillOpacity: 0.5,
              strokeColor: intensityStyle.bg,
              strokeWeight: 1.5,
              visible: true
            };
          }

          // 被災地域以外の都道府県は非表示にして地図をすっきりさせる
          return {
            visible: false
          };
        });
      });
    }

    return () => {
      isMounted = false;
      if (dataLayer) {
        dataLayer.forEach((feature) => {
          dataLayer.remove(feature);
        });
      }
    };
  }, [map, locations, selectedCategory]);

  return null;
}

const PREFECTURE_CODES: Record<string, string> = {
  "北海道": "01", "青森県": "02", "岩手県": "03", "宮城県": "04", "秋田県": "05",
  "山形県": "06", "福島県": "07", "茨城県": "08", "栃木県": "09", "群馬県": "10",
  "埼玉県": "11", "千葉県": "12", "東京都": "13", "神奈川県": "14", "新潟県": "15",
  "富山県": "16", "石川県": "17", "福井県": "18", "山梨県": "19", "長野県": "20",
  "岐阜県": "21", "静岡県": "22", "愛知県": "23", "三重県": "24", "滋賀県": "25",
  "京都府": "26", "大阪府": "27", "兵庫県": "28", "奈良県": "29", "和歌山県": "30",
  "鳥取県": "31", "島根県": "32", "岡山県": "33", "広島県": "34", "山口県": "35",
  "徳島県": "36", "香川県": "37", "愛媛県": "38", "高知県": "39", "福岡県": "40",
  "佐賀県": "41", "長崎県": "42", "熊本県": "43", "大分県": "44", "宮崎県": "45",
  "鹿児島県": "46", "沖縄県": "47"
};

// 点がポリゴン内部にあるかを判定するレイ・キャスティング・アルゴリズム (Point-in-Polygon)
function isPointInPolygon(point: { lat: number; lng: number }, vs: [number, number][]) {
  const x = point.lng;
  const y = point.lat;
  
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// GeoJSONのPolygon内に点があるか判定する関数 (1つ目が外輪、2つ目以降が穴)
function isPointInGeoJSONPolygon(point: { lat: number; lng: number }, polygonCoords: any[][]) {
  if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) return false;
  const inOuter = isPointInPolygon(point, polygonCoords[0]);
  if (!inOuter) return false;
  for (let k = 1; k < polygonCoords.length; k++) {
    if (isPointInPolygon(point, polygonCoords[k])) {
      return false; // 穴の中にあるなら外側
    }
  }
  return true;
}

// GeoJSONのMultiPolygon内に点があるか判定する関数
function isPointInGeoJSONMultiPolygon(point: { lat: number; lng: number }, multiPolygonCoords: any[][][]) {
  if (!Array.isArray(multiPolygonCoords)) return false;
  for (const polygonCoords of multiPolygonCoords) {
    if (isPointInGeoJSONPolygon(point, polygonCoords)) {
      return true;
    }
  }
  return false;
}

interface DistrictLayersProps {
  userAddress: string;
  onDistrictLoad?: (geometry: any) => void;
}

// 日本全国の都道府県に対応した、ユーザーの所属区（または市区町村）以外をグレーアウトするコンポーネント (ダブル・データレイヤー方式)
function DistrictLayers({ userAddress, onDistrictLoad }: DistrictLayersProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    // ユーザー住所から所属する都道府県コードおよび都道府県名を特定
    let prefCode = "";
    let prefName = "";
    for (const [name, code] of Object.entries(PREFECTURE_CODES)) {
      if (userAddress.includes(name)) {
        prefCode = code;
        prefName = name;
        break;
      }
    }

    if (!prefCode || !prefName) {
      if (onDistrictLoad) onDistrictLoad(null);
      return;
    }

    let isMounted = true;

    // 1. 居住都道府県の市区町村境界レイヤー (登録区以外をグレーにする)
    const localDataLayer = new window.google.maps.Data();
    localDataLayer.setMap(map);

    // 2. 他都道府県の境界レイヤー (居住都府県以外をすべてグレーにする)
    const otherPrefDataLayer = new window.google.maps.Data();
    otherPrefDataLayer.setMap(map);

    // 居住都道府県の市区町村データのロード
    const localGeoJsonUrl = `/data/boundaries/${prefCode}.json`;
    fetch(localGeoJsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch boundaries for pref code ${prefCode}`);
        return res.json();
      })
      .then((geoJson) => {
        if (!isMounted) return;
        localDataLayer.addGeoJson(geoJson);

        // ユーザー登録区に一致するフィーチャーを検索し、親にgeometryを伝搬する
        const cleanAddr = userAddress.replace(/\s+/g, '');
        const matchFeature = geoJson.features.find((feature: any) => {
          const n03_003 = feature.properties.N03_003;
          const n03_004 = feature.properties.N03_004;

          if (n03_003) {
            const fullName = n03_003 + (n03_004 || "");
            if (cleanAddr.includes(fullName)) return true;
            if (n03_004 && cleanAddr.includes(n03_004)) {
              const hasOtherCity = cleanAddr.includes("市") && !cleanAddr.includes(n03_003);
              if (!hasOtherCity) return true;
            }
          } else if (n03_004) {
            return cleanAddr.includes(n03_004);
          }
          return false;
        });

        if (matchFeature && matchFeature.geometry) {
          if (onDistrictLoad) onDistrictLoad(matchFeature.geometry);
        } else {
          if (onDistrictLoad) onDistrictLoad(null);
        }

        localDataLayer.setStyle((feature) => {
          const n03_003 = feature.getProperty("N03_003") as string | null | undefined;
          const n03_004 = feature.getProperty("N03_004") as string | null | undefined;
          let isMatch = false;

          if (n03_003) {
            const fullName = n03_003 + (n03_004 || "");
            if (cleanAddr.includes(fullName)) {
              isMatch = true;
            } else if (n03_004 && cleanAddr.includes(n03_004)) {
              const hasOtherCity = cleanAddr.includes("市") && !cleanAddr.includes(n03_003);
              if (!hasOtherCity) {
                isMatch = true;
              }
            }
          } else if (n03_004) {
            isMatch = cleanAddr.includes(n03_004);
          }

          if (isMatch) {
            return {
              fillColor: "transparent",
              fillOpacity: 0.0,
              strokeColor: "#4f46e5", // ハイライト（インディゴブルー）
              strokeWeight: 2.5,
              visible: true,
              zIndex: 2
            };
          } else {
            return {
              fillColor: "#1e293b", // 他区をグレーアウト
              fillOpacity: 0.45,
              strokeColor: "#475569",
              strokeWeight: 1.0,
              visible: true,
              zIndex: 1
            };
          }
        });
      })
      .catch((err) => {
        console.error("Error loading local district layers:", err);
        if (onDistrictLoad) onDistrictLoad(null);
      });

    // 全国都道府県データのロード（他県をグレーにする用）
    const prefGeoJsonUrl = "https://raw.githubusercontent.com/geolonia/prefecture-tiles/master/prefectures.geojson";
    otherPrefDataLayer.loadGeoJson(prefGeoJsonUrl, null, (features) => {
      if (!isMounted) return;

      otherPrefDataLayer.setStyle((feature) => {
        const featurePrefName = feature.getProperty("name") as string;
        
        // 居住都道府県は非表示にする（居住都府県内 is localDataLayerで詳細に描画するため）
        if (featurePrefName === prefName) {
          return {
            visible: false
          };
        }

        // 居住都道府県以外のすべての他県をグレーアウトする
        return {
          fillColor: "#1e293b",
          fillOpacity: 0.45,
          strokeColor: "#475569",
          strokeWeight: 1.0,
          visible: true,
          zIndex: 1
        };
      });
    });

    return () => {
      isMounted = false;
      localDataLayer.setMap(null);
      otherPrefDataLayer.setMap(null);
    };
  }, [map, userAddress]);

  return null;
}

interface CategoryStyle {
  background: string;
  glyph: string;
  label: string;
}

const categoryStyles: Record<string, CategoryStyle> = {
  disaster: { background: "#8B4513", glyph: "🔥", label: "災害" },
  road: { background: "#FF8C00", glyph: "🚗", label: "道路" },
  shop: { background: "#2E8B57", glyph: "🏪", label: "お店" },
  report: { background: "#FF0000", glyph: "📞", label: "通報" },
  default: { background: "#808080", glyph: "？", label: "その他" }
};

// 都道府県の代表的な緯度・経度
const PREFECTURE_COORDS: Record<string, { lat: number; lng: number }> = {
  "北海道": { lat: 43.06417, lng: 141.34694 },
  "青森県": { lat: 40.82444, lng: 140.74 },
  "岩手県": { lat: 39.70361, lng: 141.1525 },
  "宮城県": { lat: 38.26889, lng: 140.87194 },
  "秋田県": { lat: 39.71861, lng: 140.1025 },
  "山形県": { lat: 38.25556, lng: 140.33972 },
  "福島県": { lat: 37.75, lng: 140.46778 },
  "茨城県": { lat: 36.34139, lng: 140.44667 },
  "栃木県": { lat: 36.56583, lng: 139.88361 },
  "群馬県": { lat: 36.39056, lng: 139.06083 },
  "埼玉県": { lat: 35.85694, lng: 139.64889 },
  "千葉県": { lat: 35.60472, lng: 140.12333 },
  "東京都": { lat: 35.6895, lng: 139.6917 },
  "神奈川県": { lat: 35.44778, lng: 139.6425 },
  "新潟県": { lat: 37.90222, lng: 139.02361 },
  "富山県": { lat: 36.69528, lng: 137.21139 },
  "石川県": { lat: 36.59444, lng: 136.62556 },
  "福井県": { lat: 36.06528, lng: 136.22194 },
  "山梨県": { lat: 35.66389, lng: 138.56833 },
  "長野県": { lat: 36.65139, lng: 138.18111 },
  "岐阜県": { lat: 35.42333, lng: 136.76028 },
  "静岡県": { lat: 34.97694, lng: 138.38306 },
  "愛知県": { lat: 35.18028, lng: 136.90667 },
  "三重県": { lat: 34.73028, lng: 136.50861 },
  "滋賀県": { lat: 35.00444, lng: 135.86833 },
  "京都府": { lat: 35.02139, lng: 135.75556 },
  "大阪府": { lat: 34.68639, lng: 135.52 },
  "兵庫県": { lat: 34.69139, lng: 135.18306 },
  "奈良県": { lat: 34.68528, lng: 135.83278 },
  "和歌山県": { lat: 34.22611, lng: 135.1675 },
  "鳥取県": { lat: 35.50361, lng: 134.23833 },
  "島根県": { lat: 35.47222, lng: 133.05056 },
  "岡山県": { lat: 34.66167, lng: 133.935 },
  "広島県": { lat: 34.39639, lng: 132.45944 },
  "山口県": { lat: 34.18583, lng: 131.47139 },
  "徳島県": { lat: 34.06583, lng: 134.55944 },
  "香川県": { lat: 34.34028, lng: 134.04333 },
  "愛媛県": { lat: 33.84167, lng: 132.76611 },
  "高知県": { lat: 33.55972, lng: 133.53111 },
  "福岡県": { lat: 33.60639, lng: 130.41806 },
  "佐賀県": { lat: 33.24944, lng: 130.29972 },
  "長崎県": { lat: 32.74472, lng: 129.87361 },
  "熊本県": { lat: 32.78972, lng: 130.74167 },
  "大分県": { lat: 33.23806, lng: 131.6125 },
  "宮崎県": { lat: 31.91111, lng: 131.42389 },
  "鹿児島県": { lat: 31.56028, lng: 130.55806 },
  "沖縄県": { lat: 26.2125, lng: 127.68111 }
};

interface MapControllerProps {
  center: { lat: number; lng: number };
  zoom: number;
}

// マップの中心とズームを制御するコンポーネント
function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [map, center]);

  useEffect(() => {
    if (map) {
      map.setZoom(zoom);
    }
  }, [map, zoom]);

  return null;
}

interface AddressGeocoderProps {
  address: string;
  onGeocode: (coords: { lat: number; lng: number }) => void;
  skip: boolean;
}

// ユーザーの活動地域（住所）をジオコーディングしてマップの中心を更新するコンポーネント
function AddressGeocoder({ address, onGeocode, skip }: AddressGeocoderProps) {
  const map = useMap();
  const geocodedAddressRef = useRef("");

  useEffect(() => {
    if (skip) return;
    if (!map || !address || !window.google || !window.google.maps) return;
    if (geocodedAddressRef.current === address) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        geocodedAddressRef.current = address;
        const location = results[0].geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        onGeocode(coords);
      } else {
        console.warn("Geocoding failed for address:", address, status);
      }
    });
  }, [map, address, onGeocode, skip]);

  return null;
}

function CategoryMap() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInteracted, setIsInteracted] = useState(false);
  const [userDistrictGeometry, setUserDistrictGeometry] = useState<any>(null);

  useEffect(() => {
    if (isInteracted) return;

    const handleInteraction = (event: any) => {
      // 1. クリック/タッチ/ホイールの座標がヘッダー領域（高さ64px）の場合は無視する
      if (event && typeof event.clientY === 'number') {
        if (event.clientY < 64) {
          return;
        }
      }

      // 2. イベントターゲットがヘッダーWrapper内の場合は無視する
      if (event && event.target && event.target.closest) {
        if (event.target.closest(`.${styles.headerWrapper}`)) {
          return;
        }
      }
      setIsInteracted(true);
    };

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('wheel', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [isInteracted]);

  // マップの表示中心とズーム状態を管理
  const [mapCenter, setMapCenter] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("matiapu_user_region_coords");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return { lat: 35.681228, lng: 139.767052 };
  });

  const [mapZoom, setMapZoom] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("matiapu_user_region_zoom");
      if (cached) {
        return Number(cached);
      }
    }
    return 14;
  });

  const [userAddress, setUserAddress] = useState("");

  // ユーザーのアクティブ地域（住所）を監視・取得
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.address) {
            const { prefecture, addressDetail } = profile.address;
            const pref = (prefecture && prefecture !== "undefined") ? prefecture : "";
            const detail = (addressDetail && addressDetail !== "undefined") ? addressDetail : "";
            const fullAddress = `${pref}${detail}`.trim();
            if (fullAddress) {
              setUserAddress(fullAddress);
            }

            // Set immediate default center based on prefecture
            if (pref && PREFECTURE_COORDS[pref]) {
              const coords = PREFECTURE_COORDS[pref];
              setMapCenter(coords);
              setMapZoom(11);
              localStorage.setItem("matiapu_user_region_coords", JSON.stringify(coords));
              localStorage.setItem("matiapu_user_region_zoom", "11");
            }
          }
        } catch (err) {
          console.error("Failed to load user profile for map centering:", err);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const hasEarthquake = locations.some(loc => loc.category === "disaster" && loc.isEpicenter);

  const handleGeocode = useCallback((coords: { lat: number; lng: number }) => {
    if (hasEarthquake) return;
    setMapCenter(coords);
    setMapZoom(14);
    localStorage.setItem("matiapu_user_region_coords", JSON.stringify(coords));
    localStorage.setItem("matiapu_user_region_zoom", "14");
  }, [hasEarthquake, setMapCenter, setMapZoom]);

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setSelectedLocation(null);
  };

  // コンポーネントマウント時にデータ取得
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setError(null);
        
        // 1. Firestoreから全投稿を取得
        let dbPosts: any[] = [];
        try {
          dbPosts = await getPosts();
        } catch (dbErr) {
          console.error('Firestoreから投稿情報の取得に失敗しました。', dbErr);
        }

        // 各投稿の作成者のユーザープロフィールを取得
        const uids = Array.from(new Set(dbPosts.map(p => p.author_uid).filter(Boolean))) as string[];
        const userProfiles: Record<string, any> = {};
        await Promise.all(
          uids.map(async (uid) => {
            try {
              const profile = await getUserProfile(uid);
              if (profile) {
                userProfiles[uid] = profile;
              }
            } catch (err) {
              console.error(`Error fetching user profile for ${uid}:`, err);
            }
          })
        );

        // 2. 位置情報がある投稿をマッピング
        const nonDisasterLocations = dbPosts
          .map(p => {
            const lat = p.geo_location?.latitude ?? p.location?.latitude;
            const lng = p.geo_location?.longitude ?? p.location?.longitude;
            if (typeof lat !== 'number' || typeof lng !== 'number') return null;

            const content = p.content_text || p.contentText || "";
            const name = content.substring(0, 15) + (content.length > 15 ? "..." : "");

            // カテゴリの決定
            let category = "report"; // デフォルト
            const tags = p.tags || p.tag || p.user_badge || p.userBadge || "";
            if (tags.includes("災害") || p.category === "disaster") {
              category = "disaster";
            } else if (tags.includes("道路") || p.category === "road") {
              category = "road";
            } else if (tags.includes("お店") || p.category === "shop" || p.user_badge === "shop") {
              category = "shop";
            } else if (tags.includes("通報") || p.category === "report") {
              category = "report";
            } else if (p.category) {
              category = p.category;
            }

            const authorProfile = userProfiles[p.author_uid] || {};

            return {
              id: p.id,
              name: name,
              lat: lat,
              lng: lng,
              category: category,
              authorUserType: authorProfile.userType
            } as LocationItem;
          })
          .filter((loc): loc is LocationItem => loc !== null);

        // 2. Firestoreから最新の災害情報を取得
        let firedisasters: any[] = [];
        try {
          firedisasters = await getDisasters();
        } catch (dbErr) {
          console.error('Firestoreから災害情報の取得に失敗しました。', dbErr);
        }

        const disasterLocations: LocationItem[] = [];
        let hasEarthquake = false;
        let latestEpicenterCoords: { lat: number; lng: number } | null = null;

        for (const disaster of firedisasters) {
          if (disaster.disaster_type === '地震') {
            hasEarthquake = true;

            // 震源地の座標を抽出
            let lat = 35.681228;
            let lng = 139.767052;
            if (disaster.danger_zone && Array.isArray(disaster.danger_zone.coordinates)) {
              const firstCoord = disaster.danger_zone.coordinates[0];
              if (firstCoord && typeof firstCoord.lat === 'number' && typeof firstCoord.lng === 'number') {
                lat = firstCoord.lat;
                lng = firstCoord.lng;
              }
            }

            if (!latestEpicenterCoords) {
              latestEpicenterCoords = { lat, lng };
            }

            // 震源地マーカー
            disasterLocations.push({
              name: `震源地 (最大震度:${disaster.seismic_intensity || '不明'})`,
              lat,
              lng,
              category: "disaster",
              isEpicenter: true,
              seismic_intensity: disaster.seismic_intensity
            });

            // 都道府県ごとの震度情報がある場合はそれらもマッピング
            if (disaster.prefecture_intensity) {
              for (const [prefName, prefData] of Object.entries<any>(disaster.prefecture_intensity)) {
                const coords = PREFECTURE_COORDS[prefName];
                if (coords) {
                  disasterLocations.push({
                    name: `${prefName}: 震度${prefData.intensity}`,
                    lat: coords.lat,
                    lng: coords.lng,
                    category: "disaster",
                    isPrefectureIntensity: true,
                    prefName,
                    intensity: prefData.intensity,
                    scale: prefData.scale
                  });
                }
              }
            }
          } else if (disaster.disaster_type === '津波') {
            let lat = 35.681228;
            let lng = 139.767052;
            if (disaster.danger_zone && Array.isArray(disaster.danger_zone.coordinates)) {
              const firstCoord = disaster.danger_zone.coordinates[0];
              if (firstCoord && typeof firstCoord.lat === 'number' && typeof firstCoord.lng === 'number') {
                lat = firstCoord.lat;
                lng = firstCoord.lng;
              }
            }
            disasterLocations.push({
              name: "津波警告エリア",
              lat,
              lng,
              category: "disaster",
              isTsunami: true
            });
          }
        }

        // ロケーションのセット
        const mergedLocations = [...nonDisasterLocations, ...disasterLocations];
        setLocations(mergedLocations);

        // 地震が発生している場合は、デフォルトで「災害」タブを選択し、マップを震源地付近にフォーカス
        if (hasEarthquake) {
          setSelectedCategory('disaster');
          if (latestEpicenterCoords) {
            setMapCenter(latestEpicenterCoords);
            setMapZoom(6.5); // 広域で複数県が見えやすいようズームを6.5に設定
          }
        }

      } catch (error) {
        console.error('位置情報の取得に失敗しました:', error);
        setError('位置情報の読み込みに失敗しました。ページを再度読み込んでしてください。');
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  // ほかのとこクリックしたらボタン消える
  useEffect(() => {
    const handleDocumentClick = (event: any) => {
      if (cardRef.current && cardRef.current.contains(event.target)) {
        return;
      }
      
      const path = event.composedPath ? event.composedPath() : [];
      const isPinClick = (event.target.closest && event.target.closest('[data-pin="true"]')) ||
        path.some((el: any) => el.getAttribute && el.getAttribute('data-pin') === 'true');
      
      if (isPinClick) {
        return;
      }

      setSelectedLocation(null);
    };

    if (selectedLocation) {
      document.addEventListener('click', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [selectedLocation]);

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  if (error) {
    return (
      <div
        className={styles.errorMessage}
        role="alert"
        aria-live="polite"
      >
        <strong>エラー:</strong> {error}
      </div>
    );
  } 

  // 表示するピンをフィルタリング
  let filteredLocations = selectedCategory 
    ? locations.filter(data => data.category === selectedCategory)
    : locations;

  // ユーザー登録区が判別できている場合、その境界線内に位置するピンのみを表示する
  if (userDistrictGeometry) {
    filteredLocations = filteredLocations.filter((loc) => {
      // 震源地や津波警告などの広域な災害マーカーは、フィルタリングの対象外として常に表示
      if (loc.isEpicenter || loc.isPrefectureIntensity || loc.isTsunami) {
        return true;
      }
      
      const point = { lat: loc.lat, lng: loc.lng };
      if (userDistrictGeometry.type === "Polygon") {
        return isPointInGeoJSONPolygon(point, userDistrictGeometry.coordinates);
      } else if (userDistrictGeometry.type === "MultiPolygon") {
        return isPointInGeoJSONMultiPolygon(point, userDistrictGeometry.coordinates);
      }
      return true;
    });
  }

  // ユニークなカテゴリ一覧を取得
  const uniqueCategories = Array.from(
    new Set(locations.map(data => data.category))
  );

  return (
    <>
      <div className={`${styles.headerWrapper} ${isInteracted ? styles.headerHidden : ""}`}>
        <Header />
      </div>
      <div className={`${styles.sideNavWrapper} ${isInteracted ? styles.sideNavVisible : ""}`}>
        <SideNav />
      </div>
      <div className={styles.container}>
        {/* カテゴリボタンセクション */}
        <div className={`${styles.buttonSection} ${isInteracted ? styles.buttonSectionFullscreen : ""}`}>
          
          {/* すべて表示ボタン */}
          <button
            onClick={() => handleCategoryChange(null)}
            className={styles.allButton}
            aria-label="すべてのカテゴリを表示"
            aria-pressed={selectedCategory === null}
          >
            すべて
          </button>

          {/* カテゴリ別ボタン */}
          {uniqueCategories.map(category => {
            const style = categoryStyles[category] || categoryStyles.default;
            const isSelected = selectedCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`${styles.categoryButton} ${isSelected ? '' : styles.categoryButtonInactive}`}
                aria-label={`${style.label}を表示`}
                aria-pressed={isSelected}
                style={{
                  backgroundColor: isSelected ? style.background : '#ffffffc7',
                  color: isSelected ? '#fff' : '#000',
                  borderColor: style.background,
                  fontWeight: isSelected ? 'bold' : 'normal'
                }}
              >
                {style.label}
              </button>
            );
          })}
        </div>
        
        <APIProvider apiKey={API_KEY || ""}>
          <div className={`${styles.mapContainer} ${isInteracted ? styles.mapContainerFullscreen : ""}`}>
            
            <Map
              defaultCenter={{ lat: 35.681228, lng: 139.767052 }}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              onClick={() => setSelectedLocation(null)}
              mapTypeControl={false}
              fullscreenControl={false}
              streetViewControl={false}
              zoomControl={true}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <PrefectureLayers locations={locations} selectedCategory={selectedCategory} />
              <DistrictLayers userAddress={userAddress} onDistrictLoad={setUserDistrictGeometry} />
              <AddressGeocoder address={userAddress} onGeocode={handleGeocode} skip={hasEarthquake} />
              {/* フィルタリングされた配列をループしてピンを配置 */}
              {filteredLocations.map((data, index) => {
                // カテゴリに応じたスタイルを取得（なければdefault）
                const style = categoryStyles[data.category] || categoryStyles.default;
                const isSelected = selectedLocation && selectedLocation.lat === data.lat && selectedLocation.lng === data.lng;
                
                // ユニークなキーを生成
                const markerKey = `${data.category}-${data.lat}-${data.lng}-${data.name || index}`;

                return (
                  <AdvancedMarker
                    key={markerKey}
                    position={{ lat: data.lat, lng: data.lng }}
                    title={data.name}
                    onClick={(e) => {
                      if (e.stop) e.stop();
                      if (e.domEvent && e.domEvent.stopPropagation) {
                        e.domEvent.stopPropagation();
                      }
                      setSelectedLocation(data);
                    }}
                  >
                    <div 
                       className={`${styles.pinWrapper} ${isSelected ? styles.selectedPin : ''}`}
                       data-pin="true"
                    >
                      <Pin
                        background={style.background}
                        borderColor="#FFFFFF"
                        glyph={style.glyph}
                        scale={isSelected ? 1.3 : 1.0}
                      />
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>

            {/* 右側に表示する詳細カード */}
            {selectedLocation && (
              <div ref={cardRef} className={styles.detailCard}>
                <button 
                  className={styles.closeButton} 
                  onClick={() => setSelectedLocation(null)}
                  aria-label="閉じる"
                >
                  ✕
                </button>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{selectedLocation.name}</h3>
                  <span 
                    className={styles.cardBadge} 
                    style={{ backgroundColor: (categoryStyles[selectedLocation.category] || categoryStyles.default).background }}
                  >
                    {(categoryStyles[selectedLocation.category] || categoryStyles.default).label}
                  </span>
                  <Link 
                    href={selectedLocation.authorUserType === 'politician' ? `/politicians/posts/${selectedLocation.id}` : `/posts/${selectedLocation.id}`} 
                    className={styles.cardLink}
                  >
                    詳細ページを見る
                  </Link>
                </div>
              </div>
            )}
            
          </div>
        </APIProvider>
      </div>
    </>
  );
}

export default CategoryMap;