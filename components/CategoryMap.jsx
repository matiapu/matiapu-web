"use client";

import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import Link from 'next/link';
import styles from './CategoryMap.module.css';

// ダミーデータを返す関数 (後でAPI呼び出しに置き換え可能)
const getLocationsData = async () => {
  // TODO: 後ほどここにAPI呼び出しを実装
  // const response = await fetch('/api/locations');
  // return response.json();
  
  return [
    { id: 1, name: "おしゃれカフェA", lat: 35.681228, lng: 139.767052, category: "disaster" },
    { id: 2, name: "ラーメン店B", lat: 35.683500, lng: 139.765000, category: "road" },
    { id: 3, name: "緑の公園C", lat: 35.678000, lng: 139.769000, category: "shop" },
    { id: 1, name: "静かなカフェD", lat: 35.685000, lng: 139.771000, category: "disaster" },
    { id: 2, name: "通報エリアA", lat: 35.682000, lng: 139.768000, category: "report" }
  ];
};

const categoryStyles = {
  disaster: { background: "#8B4513", glyph: "🔥", label: "災害" },
  road: { background: "#FF8C00", glyph: "🚗", label: "道路" },
  shop: { background: "#2E8B57", glyph: "🏪", label: "お店" },
  report: { background: "#FF0000", glyph: "📞", label: "通報" },
  default: { background: "#808080", glyph: "？", label: "その他" }
};

function CategoryMap() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const cardRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedLocation(null);
  };

  // コンポーネントマウント時にデータ取得
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setError(null);
        const data = await getLocationsData();
        setLocations(data);
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
    const handleDocumentClick = (event) => {
      if (cardRef.current && cardRef.current.contains(event.target)) {
        return;
      }
      
      const path = event.composedPath ? event.composedPath() : [];
      const isPinClick = (event.target.closest && event.target.closest('[data-pin="true"]')) ||
        path.some(el => el.getAttribute && el.getAttribute('data-pin') === 'true');
      
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
      
      <APIProvider apiKey={API_KEY}>
        <div className={styles.mapContainer}>
          
          <Map
            defaultCenter={{ lat: 35.681228, lng: 139.767052 }}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            onClick={() => setSelectedLocation(null)}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              zoomControl: true
            }}
          >
            {/* フィルタリングされた配列をループしてピンを配置 */}
            {filteredLocations.map((data, index) => {
              // カテゴリに応じたスタイルを取得（なければdefault）
              const style = categoryStyles[data.category] || categoryStyles.default;
              const isSelected = selectedLocation && selectedLocation.lat === data.lat && selectedLocation.lng === data.lng;

              return (
                <AdvancedMarker
                  key={index}
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
                <Link href={`/posts/${selectedLocation.id}`} className={styles.cardLink}>
                  詳細ページを見る
                </Link>
              </div>
            </div>
          )}
          
        </div>
      </APIProvider>
    </div>
  );
}

export default CategoryMap;