# Public Catalog

`yaml_files` 内のYAMLを統合し、カタログサイト向けにAPIとフロントエンドを提供します。

## 構成

- `app/` FastAPIで構築したカタログAPI
- `frontend/` Vite + React + TypeScript の静的フロントエンド（GitHub Pages対応）
- `yaml_files/` カタログの元データ（publiccode.yml形式）

## API

### 依存関係

```
python -m pip install -r requirements.txt
```

### 起動

```
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### CORS

API側で `CORS_ORIGINS` を設定すると、GitHub Pages などのフロントからアクセスできます。

```
export CORS_ORIGINS="http://localhost:5173,https://<user>.github.io"
```

### エンドポイント

- `GET /health` ヘルスチェック
- `GET /catalog` 一覧（検索・絞り込み・ページング）
- `GET /catalog/{id}` 詳細（YAML生データを含む）
- `GET /catalog/filters` フィルタ候補

`/catalog` クエリ例:

- `q`: キーワード検索
- `category`, `platform`, `license`, `status`, `type`, `language` (カンマ区切り)
- `page`, `page_size`
- `sort` (`name` / `releaseDate`)
- `order` (`asc` / `desc`)

## フロントエンド

### 依存関係

```
cd frontend
npm install
```

### 起動

```
cd frontend
VITE_API_BASE=http://localhost:8000 npm run dev
```

### 環境変数

`.env.example` を参考に設定します。

- `VITE_API_BASE` APIのベースURL
- `VITE_SITE_TITLE` 画面タイトル（ページタイトルも同期）
- `BASE_PATH` GitHub Pages の base パス

## GitHub Pages デプロイ

`.github/workflows/deploy-pages.yml` で自動デプロイされます。

1. GitHub Actions の Variables に以下を追加
   - `VITE_API_BASE`: APIの公開URL
   - `VITE_SITE_TITLE`: 任意のサイト名
2. GitHub Pages の Source を **GitHub Actions** に設定
3. `main` ブランチへ push

ワークフロー内で `BASE_PATH` を `/<repo>/` としてビルドします。
