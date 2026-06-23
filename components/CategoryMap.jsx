"use client";

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import styles from './CategoryMap.module.css';
import { getDisasters } from '@/src/firebase/disasterDb';

// ユーザー指定の震度カラー
const INTENSITY_COLORS = {
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

// 都道府県の境界（GeoJSON）をマップに適用し、震度に応じて色付けするコンポーネント
function PrefectureLayers({ locations, selectedCategory }) {
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
    const prefIntensities = {};

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
          const prefName = feature.getProperty("name"); // 例: "大阪府", "岩手県"
          const match = prefIntensities[prefName];

          if (match) {
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

// ダミーデータ（道路・お店・通報など）を返す関数
const getLocationsData = async () => {
  return [
    { name: "おしゃれカフェA", lat: 35.681228, lng: 139.767052, category: "disaster" },
    { name: "ラーメン店B", lat: 35.683500, lng: 139.765000, category: "road" },
    { name: "緑の公園C", lat: 35.678000, lng: 139.769000, category: "shop" },
    { name: "静かなカフェD", lat: 35.685000, lng: 139.771000, category: "disaster" },
    { name: "通報エリアA", lat: 35.682000, lng: 139.768000, category: "report" }
  ];
};

const categoryStyles = {
  disaster: { background: "#8B4513", glyph: "🔥", label: "災害" },
  road: { background: "#FF8C00", glyph: "🚗", label: "道路" },
  shop: { background: "#2E8B57", glyph: "🏪", label: "お店" },
  report: { background: "#FF0000", glyph: "📞", label: "通報" },
  default: { background: "#808080", glyph: "？", label: "その他" }
};

// 都道府県の代表的な緯度・経度
const PREFECTURE_COORDS = {
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

function CategoryMap() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const [locations, setLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // マップの表示中心とズーム状態を管理
  const [mapCenter, setMapCenter] = useState({ lat: 35.681228, lng: 139.767052 });
  const [mapZoom, setMapZoom] = useState(14);

  // コンポーネントマウント時にデータ取得
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setError(null);
        
        // 1. ダミーロケーションから災害以外のものを抽出
        const dummyData = await getLocationsData();
        const nonDisasterLocations = dummyData.filter(data => data.category !== 'disaster');

        // 2. Firestoreから最新の災害情報を取得
        let firedisasters = [];
        try {
          firedisasters = await getDisasters();
        } catch (dbErr) {
          console.error('Firestoreから災害情報の取得に失敗しました。', dbErr);
        }



        const disasterLocations = [];
        let hasEarthquake = false;
        let latestEpicenterCoords = null;

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
              for (const [prefName, prefData] of Object.entries(disaster.prefecture_intensity)) {
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
  const filteredLocations = selectedCategory 
    ? locations.filter(data => data.category === selectedCategory)
    : locations;

  // ユニークなカテゴリ一覧を取得
  const uniqueCategories = Array.from(
    new Set(locations.map(data => data.category))
  );

  return (
    <div className={styles.container}>
      {/* カテゴリボタンセクション */}
      <div className={styles.buttonSection}>
        
        {/* すべて表示ボタン */}
        <button
          onClick={() => setSelectedCategory(null)}
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
              onClick={() => setSelectedCategory(category)}
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


      
      <APIProvider apiKey={API_KEY}>
        <div className={styles.mapContainer}>
          
          <Map
            center={mapCenter}
            zoom={mapZoom}
            onCenterChanged={(e) => setMapCenter(e.detail.center)}
            onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
            mapId="DEMO_MAP_ID"
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              zoomControl: true
            }}
          >
            {/* 日本の都道府県境界GeoJSONレイヤーを重ねて、対象の県のみを震度カラーで塗りつぶす */}
            <PrefectureLayers locations={locations} selectedCategory={selectedCategory} />

            {/* フィルタリングされた配列をループしてピンやテキストラベルを配置 */}
            {filteredLocations.map((data, index) => {
              // 災害カテゴリで、かつ都道府県ごとの震度情報の場合
              if (data.category === "disaster" && data.isPrefectureIntensity) {
                const intensityStyle = INTENSITY_COLORS[data.intensity] || { bg: "#808080", text: "#ffffff" };
                
                return (
                  <AdvancedMarker
                    key={`pref-label-${index}`}
                    position={{ lat: data.lat, lng: data.lng }}
                    title={data.name}
                  >
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#1a1a1a',
                      fontSize: '10px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      boxShadow: '0 1.5px 4px rgba(0,0,0,0.15)',
                      border: `2px solid ${intensityStyle.bg}`,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transform: 'translateY(-50%)'
                    }}>
                      {data.prefName} ({data.intensity})
                    </div>
                  </AdvancedMarker>
                );
              }

              // 震源地マーカーの場合
              if (data.category === "disaster" && data.isEpicenter) {
                return (
                  <AdvancedMarker
                    key={`epi-${index}`}
                    position={{ lat: data.lat, lng: data.lng }}
                    title={data.name}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}>
                      <div style={{
                        backgroundColor: '#FF0000',
                        color: '#ffffff',
                        border: '2px solid #ffffff',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(255,0,0,0.4)',
                        fontSize: '14px'
                      }}>
                        ❌
                      </div>
                      <span style={{
                        backgroundColor: 'rgba(255, 0, 0, 0.9)',
                        color: '#ffffff',
                        fontSize: '10px',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        marginTop: '2px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}>
                        震源地
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              }

              // その他のカテゴリの標準マーカー
              const style = categoryStyles[data.category] || categoryStyles.default;

              return (
                <AdvancedMarker
                  key={index}
                  position={{ lat: data.lat, lng: data.lng }}
                  title={data.name}
                >
                  <Pin
                    background={style.background}
                    borderColor="#FFFFFF"
                    glyph={style.glyph}
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
          
        </div>
      </APIProvider>
    </div>
  );
}

export default CategoryMap;