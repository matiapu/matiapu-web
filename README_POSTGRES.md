# PostgreSQL (local) — 設定と起動

前提: Docker (Docker Desktop) がインストールされていること。

設定ファイル:
- `.env.postgres` — DB ユーザー/パスワード/DB 名を定義
- `docker-compose.postgres.yml` — Postgres サービス定義

起動:
```bash
npm run pg:up
# または
docker-compose -f docker-compose.postgres.yml up -d
```

停止:
```bash
npm run pg:down
```

ログ確認:
```bash
npm run pg:logs
```

接続例:
```bash
# psql があれば
psql -h localhost -U postgres -d matiapu_db -W
```

メモ:
- `.env.postgres` の `POSTGRES_PASSWORD` は実運用では強力なものに変更してください。
- ポート `5432` が他で使用中の場合は `docker-compose.postgres.yml` を編集してください。

セキュリティと Git:
- `.env.postgres` は機密情報を含むため Git にコミットしないでください。リポジトリには `.env.postgres.example` を用意しています。
- もし誤って `node_modules` やビルド生成ファイルをコミットしてしまった場合、ローカルで次のコマンドを実行してインデックスから削除してください:

```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules from repository"
```

