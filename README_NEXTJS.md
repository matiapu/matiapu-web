# Next.js への移行メモ

- 開発サーバー: `npm run dev`（Next.js）
- ビルド: `npm run build`
- 本番起動: `npm run start`

移行手順の概要:
1. 依存に `next` を追加（既に package.json を更新済み）
2. `pages/_app.jsx` にグローバル CSS を読み込む
3. `pages/index.jsx` にルートページを追加
4. 必要に応じて `src/` 内のコンポーネントを `pages/` または `app/` に移す
