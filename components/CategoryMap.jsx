"use client";

import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const locationsFromDB = [
  { name: "おしゃれカフェA", lat: 35.681228, lng: 139.767052, category: "cafe" },
  { name: "ラーメン店B", lat: 35.683500, lng: 139.765000, category: "food" },
  { name: "緑の公園C", lat: 35.678000, lng: 139.769000, category: "park" },
  { name: "静かなカフェD", lat: 35.685000, lng: 139.771000, category: "cafe" },
  { name: "通報エリアA", lat: 35.682000, lng: 139.768000, category: "report" }
];

const categoryStyles = {
  cafe: { background: "#8B4513", glyph: "🔥", label: "災害" },
  food: { background: "#FF8C00", glyph: "🚗", label: "道路" },
  park: { background: "#2E8B57", glyph: "🏪", label: "お店" },
  report: { background: "#FF0000", glyph: "📞", label: "通報" },
  default: { background: "#808080", glyph: "？", label: "その他" }
};

function CategoryMap() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const [selectedCategory, setSelectedCategory] = useState(null); 


  // 表示するピンをフィルタリング
  const filteredLocations = selectedCategory 
    ? locationsFromDB.filter(data => data.category === selectedCategory)
    : locationsFromDB;

  // ユニークなカテゴリ一覧を取得
  const uniqueCategories = Array.from(
    new Set(locationsFromDB.map(data => data.category))
  );

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* カテゴリボタンセクション */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        display: 'flex', 
        gap: '10px', 
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '15px 20px',
        borderRadius: '8px',
        // boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
        
        {/* すべて表示ボタン */}
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '10px 30px',
            backgroundColor: selectedCategory === null ? '#333' : '#ccc',
            color: selectedCategory === null ? '#fff' : '#000',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: selectedCategory === null ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
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
              style={{
                padding: '10px 30px',
                backgroundColor: isSelected ? style.background : '#ffffffc7',
                color: isSelected ? '#fff' : '#000',
                border: `2px solid ${style.background}`,
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                transition: 'all 0.2s ease'
              }}
            >
              {style.label}
            </button>
          );
        })}
      </div>
      
      <APIProvider apiKey={API_KEY}>
        <div style={{ height: '600px', width: '100%', position: 'relative' }}>
          
          <Map
            defaultCenter={{ lat: 35.681228, lng: 139.767052 }}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
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