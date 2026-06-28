# oasis-test — 組織内文書・会計管理システム

組織内で文書や会計情報の作成・承認を行うためのWebアプリケーションです。GitHub Pages 上の React
フロントエンドと、自作サーバー上の Rust 製 REST API で構成されています。

---

## 目次

- [システム概要](#システム概要)
- [アーキテクチャ](#アーキテクチャ)
- [認証フロー](#認証フロー)
- [ディレクトリ構成](#ディレクトリ構成)
- [フロントエンド](#フロントエンド)
- [バックエンド](#バックエンド)
- [Nginx 設定](#nginx-設定)
- [データベース設計](#データベース設計)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [デプロイ手順](#デプロイ手順)
- [環境変数](#環境変数)

---

## システム概要

| 項目               | 内容                                               |
| ------------------ | -------------------------------------------------- |
| フロントエンド     | React (Vite) + TypeScript                          |
| バックエンド       | Rust (Axum + SQLx) × 4サービス                     |
| データベース       | PostgreSQL 16                                      |
| 認証               | Firebase Authentication (Google ログイン)          |
| リバースプロキシ   | Nginx                                              |
| ホスティング       | GitHub Pages (フロントエンド) / 自作サーバー (API) |
| コンテナ           | Docker / Docker Compose                            |
| コードフォーマット | Biome.js                                           |

---

## アーキテクチャ

```
ブラウザ (GitHub Pages)
  │
  │ HTTPS (外部ポート:2130 → サーバーの443番に転送)
  ▼
Nginx (443番ポート / SSL終端)
  │
  ├─ /internal/auth/verify → auth サービス (3002番)
  │    Firebase IDトークンを検証し、X-User-Id ヘッダを返す
  │
  ├─ /api/users/  → user-org サービス (3003番)
  │    利用者・組織管理 API
  │
  ├─ /api/files/  → file サービス (3004番)
  │    ファイル・文書管理 API
  │
  └─ /api/accounting/ → accounting サービス (3005番)
       会計管理 API

各 API サービス
  └─ PostgreSQL (各サービス専用 / 内部ネットワークのみ)
```

### ネットワーク構成

- Docker 外部ネットワーク `shared_backend` で各サービスが Nginx と通信
- PostgreSQL は各 Compose プロジェクトの内部ネットワークにのみ属し、外部に公開しない
- 外部からのアクセスはすべて Nginx を経由する

---

## 認証フロー

```
1. ユーザーがブラウザで Google ログインボタンをクリック
2. Firebase Authentication が Google の OAuth 画面を表示
3. 認証成功後、Firebase が IDトークン（JWT）を発行
4. フロントエンドが全 API リクエストの Authorization ヘッダに
   "Bearer <IDトークン>" を付与
5. Nginx が auth_request で auth サービス (3002番) にサブリクエストを送信
6. auth サービスが Google の公開鍵を使って IDトークンを検証
7. 検証成功時、auth サービスが X-User-Id・X-User-Email ヘッダを返す
8. Nginx がこれらのヘッダを各 API サービスに転送
9. 各 API サービスは X-User-Id を使って利用者を特定し、処理を実行
```

### 未登録ユーザーの処理

- ログイン後、フロントエンドが `/api/users/me` を呼び出す
- `404` が返った場合（DB に firebase_uid が未登録）はオンボーディング画面に遷移
- 管理者が DB に firebase_uid を登録することで通常利用が可能になる

### 注意事項

- 組織アカウントでの Firebase アクセスに制限があるため、当面は `gmail.com` ドメインのアカウントで
  Firebase プロジェクトを管理する
- Google の公開鍵は定期的にローテーションされるため、auth サービスは `moka`
  クレートを使って公開鍵をキャッシュしている（TTL: 1時間）

---

## ディレクトリ構成

### フロントエンド

```
~/oasis-test/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions (main push → Pages デプロイ)
├── public/
│   └── 404.html                # SPA ルーティング対策
├── src/
│   ├── lib/
│   │   ├── firebase.ts         # Firebase 初期化
│   │   └── api.ts              # Axios インスタンス (IDトークン自動付与)
│   ├── hooks/
│   │   └── useAuth.ts          # Firebase 認証状態管理
│   ├── components/
│   │   ├── AuthGuard.tsx       # 認証・登録チェック
│   │   ├── Layout.tsx          # 共通レイアウト
│   │   └── Sidebar.tsx         # サイドバーナビゲーション
│   ├── pages/
│   │   ├── LoginPage.tsx       # ログイン画面
│   │   ├── DashboardPage.tsx   # ダッシュボード
│   │   ├── UsersPage.tsx       # 利用者管理
│   │   ├── DocumentsPage.tsx   # 文書管理
│   │   └── AccountingPage.tsx  # 会計管理
│   └── App.tsx                 # ルーティング定義
├── .env                        # 環境変数 (Git 管理外)
├── .env.example                # 環境変数サンプル
├── vite.config.ts
└── package.json
```

### バックエンド

```
~/docker/
├── auth/                       # 認証サービス (3002番)
│   ├── docker-compose.yml
│   ├── .env
│   └── app/
│       ├── Cargo.toml
│       ├── Dockerfile
│       └── src/
│           └── main.rs
│
├── user-org/                   # 利用者・組織管理 API (3003番)
│   ├── docker-compose.yml
│   ├── .env
│   └── app/
│       ├── Cargo.toml
│       ├── Dockerfile
│       ├── migrations/
│       │   └── 0001_init.sql
│       └── src/
│           ├── main.rs
│           ├── db.rs
│           ├── models.rs
│           └── routes/
│               ├── mod.rs
│               ├── users.rs
│               └── orgs.rs
│
├── file/                       # ファイル管理 API (3004番)
│   ├── docker-compose.yml
│   ├── .env
│   └── app/
│       ├── Cargo.toml
│       ├── Dockerfile
│       ├── migrations/
│       │   └── 0001_init.sql
│       └── src/
│           ├── main.rs
│           ├── db.rs
│           ├── models.rs
│           └── routes/
│               ├── mod.rs
│               ├── documents.rs
│               └── signatures.rs
│
└── accounting/                 # 会計管理 API (3005番)
    ├── docker-compose.yml
    ├── .env
    └── app/
        ├── Cargo.toml
        ├── Dockerfile
        ├── migrations/
        │   └── 0001_init.sql
        └── src/
            ├── main.rs
            ├── db.rs
            ├── models.rs
            └── routes/
                ├── mod.rs
                ├── payments.rs
                ├── collections.rs
                ├── advances.rs
                └── transfers.rs
```

---

## フロントエンド

### 技術スタック

| ライブラリ       | バージョン | 用途                           |
| ---------------- | ---------- | ------------------------------ |
| React            | 18         | UIフレームワーク               |
| Vite             | 5          | ビルドツール                   |
| TypeScript       | 5          | 型安全                         |
| react-router-dom | 6          | クライアントサイドルーティング |
| firebase         | 10         | 認証                           |
| axios            | 1          | HTTP クライアント              |
| Biome.js         | -          | Linter / Formatter             |

### ページ一覧

| パス          | コンポーネント   | 説明                                     |
| ------------- | ---------------- | ---------------------------------------- |
| `/login`      | `LoginPage`      | Google ログインボタン                    |
| `/onboarding` | `Onboarding`     | 未登録ユーザー向け案内                   |
| `/`           | `DashboardPage`  | 利用者数・文書数・支払申請数の概要       |
| `/users`      | `UsersPage`      | 利用者一覧・検索・登録・CSV インポート   |
| `/documents`  | `DocumentsPage`  | 文書一覧・バージョン管理・論理削除・復元 |
| `/accounting` | `AccountingPage` | 支払申請の一覧・登録・承認・却下         |

### 認証ガード

`AuthGuard` コンポーネントがすべての保護されたページをラップしています。

- Firebase の認証状態を監視（`onAuthStateChanged`）
- 未ログインの場合 `/login` にリダイレクト
- `/api/users/me` を呼び出し、`404` の場合 `/onboarding` にリダイレクト
- それ以外のエラー（401・500 等）は画面を表示する（エラーハンドリング）

### API クライアント

`src/lib/api.ts` の Axios インスタンスに request インターセプターを設定しています。

- リクエスト前に `user.getIdToken(true)` で最新のIDトークンを取得
- `Authorization: Bearer <token>` ヘッダを自動付与

### SPA ルーティング対策

GitHub Pages は SPA のクライアントサイドルーティングを直接サポートしないため、`public/404.html`
でリダイレクト処理を行っています。

---

## バックエンド

### 共通事項

- フレームワーク: Axum 0.7
- ORM: SQLx 0.8 (コンパイル時クエリチェック)
- ランタイム: Tokio
- マイグレーション: SQLx Migrator（起動時に自動実行）
- 各サービスは `shared_backend` Docker ネットワークに接続

### auth サービス (3002番)

Firebase IDトークンを検証する軽量サービスです。

**エンドポイント:**

| メソッド | パス           | 説明                                                     |
| -------- | -------------- | -------------------------------------------------------- |
| GET      | `/auth/verify` | IDトークンを検証し、X-User-Id・X-User-Email ヘッダを返す |

**処理の流れ:**

1. `Authorization: Bearer <token>` ヘッダからトークンを取り出す
2. JWT ヘッダの `kid` を取得
3. Google の公開鍵エンドポイントから証明書を取得（`moka` クレートでキャッシュ）
4. `jsonwebtoken` クレートで RSA256 署名を検証
5. audience / issuer を Firebase プロジェクト ID で検証
6. 成功時に `X-User-Id: <firebase_uid>` と `X-User-Email: <email>` ヘッダを返す

### user-org サービス (3003番)

利用者と組織を管理する API です。

**エンドポイント:**

| メソッド | パス            | 説明                                                   |
| -------- | --------------- | ------------------------------------------------------ |
| GET      | `/users`        | 利用者一覧（氏名・ステータス・入会日範囲で絞り込み可） |
| POST     | `/users`        | 利用者登録                                             |
| GET      | `/users/me`     | 自分の利用者情報を取得（X-User-Id で検索）             |
| POST     | `/users/import` | CSV ファイルから利用者を一括インポート                 |
| GET      | `/orgs`         | 組織一覧                                               |
| POST     | `/orgs`         | 組織登録                                               |

### file サービス (3004番)

文書とファイルバージョンを管理する API です。

**エンドポイント:**

| メソッド | パス                               | 説明                                       |
| -------- | ---------------------------------- | ------------------------------------------ |
| GET      | `/documents`                       | 文書一覧（タイトルで絞り込み可）           |
| POST     | `/documents`                       | 文書登録                                   |
| GET      | `/documents/:doc_id/versions`      | 指定文書のバージョン一覧                   |
| POST     | `/documents/:doc_id/versions`      | バージョン追加（バージョン番号は自動採番） |
| POST     | `/versions/:version_id/delete`     | バージョンの論理削除                       |
| POST     | `/versions/:version_id/restore`    | バージョンの復元                           |
| GET      | `/versions/:version_id/signatures` | 署名一覧                                   |
| POST     | `/versions/:version_id/signatures` | 署名（SHA-256 ハッシュを保存）             |

### accounting サービス (3005番)

会計申請を管理する API です。

**エンドポイント:**

| メソッド | パス                       | 説明                             |
| -------- | -------------------------- | -------------------------------- |
| GET      | `/payments`                | 支払申請一覧                     |
| POST     | `/payments`                | 支払申請登録                     |
| POST     | `/payments/:id/approve`    | 支払申請承認                     |
| POST     | `/payments/:id/reject`     | 支払申請却下                     |
| GET      | `/collections`             | 集金申請一覧                     |
| POST     | `/collections`             | 集金申請登録                     |
| POST     | `/collections/:id/approve` | 集金申請承認                     |
| GET      | `/advances`                | 仮払申請一覧                     |
| POST     | `/advances`                | 仮払申請登録                     |
| POST     | `/advances/:id/settle`     | 仮払清算（実費合計・差額を記録） |
| GET      | `/transfers`               | 資金移動申請一覧                 |
| POST     | `/transfers`               | 資金移動申請登録                 |
| POST     | `/transfers/:id/approve`   | 資金移動申請承認                 |

---

## Nginx 設定

設定ファイルは `/etc/nginx/conf.d/oasis-test.conf` に配置しています。

### ポート構成

| 外部ポート          | サーバー内部ポート | 説明             |
| ------------------- | ------------------ | ---------------- |
| 2130 (ルーター転送) | 443                | HTTPS (SSL 終端) |

### auth_request の動作

```nginx
location /api/users {
    auth_request /internal/auth/verify;         # サブリクエストで認証
    auth_request_set $x_user_id $upstream_http_x_user_id;
    proxy_set_header X-User-Id $x_user_id;      # 認証結果を転送
    rewrite ^/api/users/(.*)$ /users/$1 break;  # パスを変換
    rewrite ^/api/users$ /users break;
    proxy_pass http://user_org_service;
}
```

### CORS 設定

各 API エンドポイントで OPTIONS リクエスト（プリフライト）を処理しています。

```nginx
set $cors_origin "https://あなたのGitHubユーザー名.github.io";

if ($request_method = OPTIONS) {
    add_header Access-Control-Allow-Origin  $cors_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Max-Age 86400 always;
    return 204;
}
```

### SSL 証明書

Let's Encrypt (Certbot) で取得した証明書を使用しています。

- 認証方式: DNS-01 チャレンジ（`certbot-dns-duckdns` プラグイン）
- 自動更新: `systemd` タイマーで管理（`sudo certbot renew --dry-run` で確認）

---

## データベース設計

### user-org サービス (PostgreSQL)

#### `user_type` — 利用者種別マスタ

| カラム | 型       | 制約     | 説明                           |
| ------ | -------- | -------- | ------------------------------ |
| id     | SMALLINT | PK       | 1:正会員, 2:準会員, 3:名誉会員 |
| name   | TEXT     | NOT NULL | 種別名                         |

#### `organization` — 組織情報

| カラム     | 型          | 制約                   | 説明                   |
| ---------- | ----------- | ---------------------- | ---------------------- |
| id         | UUID        | PK                     |                        |
| name       | TEXT        | NOT NULL               | 組織名                 |
| parent_id  | UUID        | FK(自己参照), NULL許容 | 親組織（Root は NULL） |
| created_at | TIMESTAMPTZ | NOT NULL               | 作成日時               |

#### `position` — 役職情報

| カラム | 型   | 制約              | 説明     |
| ------ | ---- | ----------------- | -------- |
| id     | UUID | PK                |          |
| name   | TEXT | NOT NULL          | 役職名   |
| org_id | UUID | FK → organization | 所属組織 |

#### `app_user` — 利用者情報

| カラム          | 型          | 制約                           | 説明                                  |
| --------------- | ----------- | ------------------------------ | ------------------------------------- |
| id              | UUID        | PK                             |                                       |
| last_name       | TEXT        | NOT NULL                       | 姓                                    |
| first_name      | TEXT        | NOT NULL                       | 名                                    |
| last_name_kana  | TEXT        | NOT NULL                       | 姓（カナ）                            |
| first_name_kana | TEXT        | NOT NULL                       | 名（カナ）                            |
| email           | TEXT        | NOT NULL, UNIQUE               | メールアドレス                        |
| firebase_uid    | TEXT        | UNIQUE, NULL許容               | Firebase の UID（ログイン時に紐付け） |
| user_type_id    | SMALLINT    | FK → user_type                 | 利用者種別                            |
| joined_at       | DATE        | NOT NULL                       | 入会日                                |
| status          | TEXT        | CHECK(active/inactive/pending) | 状態                                  |
| created_at      | TIMESTAMPTZ | NOT NULL                       | 作成日時                              |

#### `user_position` — 利用者役職対応

| カラム      | 型   | 制約          |
| ----------- | ---- | ------------- |
| user_id     | UUID | FK → app_user |
| position_id | UUID | FK → position |

---

### file サービス (PostgreSQL)

#### `document` — 文書情報

| カラム      | 型          | 制約     | 説明              |
| ----------- | ----------- | -------- | ----------------- |
| id          | UUID        | PK       |                   |
| title       | TEXT        | NOT NULL | 文書タイトル      |
| description | TEXT        | NULL許容 | 説明              |
| created_by  | UUID        | NOT NULL | 作成者の利用者 ID |
| created_at  | TIMESTAMPTZ | NOT NULL | 作成日時          |

#### `file_version` — ファイルバージョン情報

| カラム      | 型          | 制約                                      | 説明                        |
| ----------- | ----------- | ----------------------------------------- | --------------------------- |
| id          | UUID        | PK                                        |                             |
| document_id | UUID        | FK → document                             | 親文書                      |
| version_no  | INTEGER     | NOT NULL, UNIQUE(document_id, version_no) | バージョン番号（自動採番）  |
| file_name   | TEXT        | NOT NULL                                  | ファイル名                  |
| file_path   | TEXT        | NOT NULL                                  | 保存パス                    |
| file_size   | BIGINT      | NOT NULL                                  | ファイルサイズ（バイト）    |
| mime_type   | TEXT        | NOT NULL                                  | MIMEタイプ                  |
| uploaded_by | UUID        | NOT NULL                                  | アップロード者              |
| uploaded_at | TIMESTAMPTZ | NOT NULL                                  | アップロード日時            |
| deleted_at  | TIMESTAMPTZ | NULL許容                                  | 論理削除日時（NULL = 有効） |

#### `signature` — 署名情報

| カラム          | 型          | 制約              | 説明               |
| --------------- | ----------- | ----------------- | ------------------ |
| id              | UUID        | PK                |                    |
| file_version_id | UUID        | FK → file_version | 署名対象バージョン |
| signed_by       | UUID        | NOT NULL          | 署名者             |
| sha256_hash     | TEXT        | NOT NULL          | SHA-256 ハッシュ値 |
| signed_at       | TIMESTAMPTZ | NOT NULL          | 署名日時           |

---

### accounting サービス (PostgreSQL)

#### `budget_item` — 予算項目

| カラム      | 型            | 制約     | 説明                     |
| ----------- | ------------- | -------- | ------------------------ |
| id          | UUID          | PK       |                          |
| name        | TEXT          | NOT NULL | 項目名（例: 行事補助費） |
| amount      | NUMERIC(12,2) | NOT NULL | 予算額                   |
| fiscal_year | INTEGER       | NOT NULL | 対象年度                 |
| created_at  | TIMESTAMPTZ   | NOT NULL |                          |

#### `payment_request` — 支払申請

| カラム         | 型            | 制約                                  | 説明     |
| -------------- | ------------- | ------------------------------------- | -------- |
| id             | UUID          | PK                                    |          |
| budget_item_id | UUID          | FK → budget_item, NULL許容            | 予算項目 |
| requested_by   | UUID          | NOT NULL                              | 申請者   |
| amount         | NUMERIC(12,2) | NOT NULL                              | 金額     |
| description    | TEXT          | NOT NULL                              | 内容     |
| payee          | TEXT          | NOT NULL                              | 支払先   |
| status         | TEXT          | CHECK(pending/approved/rejected/paid) | 状態     |
| requested_at   | TIMESTAMPTZ   | NOT NULL                              | 申請日時 |

#### `collection_request` — 集金申請

| カラム         | 型            | 制約                                        | 説明           |
| -------------- | ------------- | ------------------------------------------- | -------------- |
| id             | UUID          | PK                                          |                |
| requested_by   | UUID          | NOT NULL                                    | 申請者         |
| amount         | NUMERIC(12,2) | NOT NULL                                    | 一人当たり金額 |
| description    | TEXT          | NOT NULL                                    | 名目           |
| target_user_id | UUID          | NOT NULL                                    | 集金対象者     |
| status         | TEXT          | CHECK(pending/approved/collected/cancelled) | 状態           |
| requested_at   | TIMESTAMPTZ   | NOT NULL                                    | 申請日時       |

#### `advance_request` — 仮払申請

| カラム         | 型            | 制約                                     | 説明     |
| -------------- | ------------- | ---------------------------------------- | -------- |
| id             | UUID          | PK                                       |          |
| budget_item_id | UUID          | FK → budget_item, NULL許容               | 予算項目 |
| requested_by   | UUID          | NOT NULL                                 | 申請者   |
| amount         | NUMERIC(12,2) | NOT NULL                                 | 概算金額 |
| description    | TEXT          | NOT NULL                                 | 内容     |
| status         | TEXT          | CHECK(pending/approved/settled/rejected) | 状態     |
| requested_at   | TIMESTAMPTZ   | NOT NULL                                 | 申請日時 |

#### `advance_settlement` — 仮払清算

| カラム             | 型            | 制約                 | 説明                |
| ------------------ | ------------- | -------------------- | ------------------- |
| id                 | UUID          | PK                   |                     |
| advance_request_id | UUID          | FK → advance_request | 対象仮払申請        |
| actual_amount      | NUMERIC(12,2) | NOT NULL             | 実費合計            |
| difference         | NUMERIC(12,2) | NOT NULL             | 差額（実費 - 概算） |
| settled_by         | UUID          | NOT NULL             | 清算者              |
| settled_at         | TIMESTAMPTZ   | NOT NULL             | 清算日時            |

#### `transfer_request` — 資金移動申請

| カラム         | 型            | 制約                             | 説明           |
| -------------- | ------------- | -------------------------------- | -------------- |
| id             | UUID          | PK                               |                |
| from_budget_id | UUID          | FK → budget_item                 | 移動元予算項目 |
| to_budget_id   | UUID          | FK → budget_item                 | 移動先予算項目 |
| amount         | NUMERIC(12,2) | NOT NULL                         | 金額           |
| description    | TEXT          | NOT NULL                         | 内容           |
| requested_by   | UUID          | NOT NULL                         | 申請者         |
| status         | TEXT          | CHECK(pending/approved/rejected) | 状態           |
| requested_at   | TIMESTAMPTZ   | NOT NULL                         | 申請日時       |

#### `diversion_request` — 流用申請

| カラム         | 型            | 制約                             | 説明           |
| -------------- | ------------- | -------------------------------- | -------------- |
| id             | UUID          | PK                               |                |
| from_budget_id | UUID          | FK → budget_item                 | 移動元予算項目 |
| to_budget_id   | UUID          | FK → budget_item                 | 移動先予算項目 |
| amount         | NUMERIC(12,2) | NOT NULL                         | 金額           |
| description    | TEXT          | NOT NULL                         | 内容           |
| requested_by   | UUID          | NOT NULL                         | 申請者         |
| approved_by    | UUID          | NULL許容                         | 承認者         |
| status         | TEXT          | CHECK(pending/approved/rejected) | 状態           |
| requested_at   | TIMESTAMPTZ   | NOT NULL                         | 申請日時       |

#### `payment_instruction` — 出金指示

| カラム             | 型          | 制約                 | 説明         |
| ------------------ | ----------- | -------------------- | ------------ |
| id                 | UUID        | PK                   |              |
| payment_request_id | UUID        | FK → payment_request | 対象支払申請 |
| instructed_by      | UUID        | NOT NULL             | 指示者       |
| instructed_at      | TIMESTAMPTZ | NOT NULL             | 指示日時     |
| note               | TEXT        | NULL許容             | 備考         |

#### `receipt` — 証憑

| カラム             | 型          | 制約                           | 説明             |
| ------------------ | ----------- | ------------------------------ | ---------------- |
| id                 | UUID        | PK                             |                  |
| payment_request_id | UUID        | FK → payment_request, NULL許容 | 対象支払申請     |
| advance_request_id | UUID        | FK → advance_request, NULL許容 | 対象仮払申請     |
| file_path          | TEXT        | NOT NULL                       | ファイルパス     |
| uploaded_by        | UUID        | NOT NULL                       | アップロード者   |
| uploaded_at        | TIMESTAMPTZ | NOT NULL                       | アップロード日時 |

---

## 開発環境のセットアップ

### 前提条件

- Node.js 20 以上
- Rust 1.82 以上
- Docker / Docker Compose
- サーバーへの SSH アクセス

### フロントエンドのセットアップ

```bash
git clone https://github.com/あなたのGitHubユーザー名/oasis-test.git
cd oasis-test
npm install
cp .env.example .env.local
# .env.local に Firebase の設定値と API_BASE_URL を記入
npm run dev
```

### ローカルでの API 接続

`vite.config.ts` のプロキシ設定でサーバーの IP を指定します。

```ts
server: {
  proxy: {
    '/api/users':      { target: 'http://192.168.1.x:3003', changeOrigin: true, rewrite: path => path.replace(/^\/api\/users\/(.*)$/, '/users/$1') },
    '/api/files':      { target: 'http://192.168.1.x:3004', changeOrigin: true, rewrite: path => path.replace(/^\/api\/files/, '') },
    '/api/accounting': { target: 'http://192.168.1.x:3005', changeOrigin: true, rewrite: path => path.replace(/^\/api\/accounting/, '') },
  }
}
```

### バックエンドのセットアップ

```bash
# Docker ネットワーク作成（初回のみ）
docker network create shared_backend

# 各サービスを起動
cd ~/docker/auth       && docker compose up -d --build
cd ~/docker/user-org   && docker compose up -d --build
cd ~/docker/file       && docker compose up -d --build
cd ~/docker/accounting && docker compose up -d --build
```

---

## デプロイ手順

### フロントエンド (GitHub Pages)

git flow を使用しています。

```bash
# 機能開発
git flow feature start 機能名
# ... 実装 ...
git flow feature finish 機能名

# リリース
git flow release start 1.x.x
git flow release finish 1.x.x
git push origin main develop --tags
```

`main` ブランチへの push をトリガーに GitHub Actions が自動でビルド・デプロイします。

### バックエンド

コードを変更した場合は該当サービスを再ビルドします。

```bash
cd ~/docker/user-org
docker compose up -d --build
```

マイグレーションは起動時に自動で実行されます。テーブル構造を変更する場合は新しいマイグレーションファイルを追加してください（既存ファイルは編集しない）。

```bash
# 例: 新しいマイグレーション
touch ~/docker/user-org/app/migrations/0002_add_column.sql
```

---

## 環境変数

### フロントエンド (.env)

| 変数名                      | 説明                     | 取得元                                   |
| --------------------------- | ------------------------ | ---------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | Firebase API キー        | Firebase コンソール → プロジェクトの設定 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 認証ドメイン    | 同上                                     |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase プロジェクト ID | 同上                                     |
| `VITE_FIREBASE_APP_ID`      | Firebase アプリ ID       | 同上                                     |
| `VITE_API_BASE_URL`         | API のベース URL         | 自作サーバーのドメイン                   |

本番環境では GitHub リポジトリの Settings → Secrets and variables → Actions に登録します。

### バックエンド (各サービスの .env)

| サービス   | 変数名                | 説明                     |
| ---------- | --------------------- | ------------------------ |
| auth       | `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| user-org   | `DATABASE_URL`        | PostgreSQL 接続文字列    |
| file       | `DATABASE_URL`        | PostgreSQL 接続文字列    |
| accounting | `DATABASE_URL`        | PostgreSQL 接続文字列    |

---

## CSV インポート仕様

利用者を CSV ファイルから一括インポートできます。

### CSV フォーマット

```csv
last_name,first_name,last_name_kana,first_name_kana,email,user_type_id,joined_at,status
山田,太郎,ヤマダ,タロウ,taro@gmail.com,1,2024-04-01,active
```

### 仕様

- ヘッダー行必須
- `email` が重複する場合はスキップ（エラーにはならない）
- バリデーションエラーの行はスキップし、エラー内容をレスポンスに含める
- `status` を省略した場合は `active` が設定される

---

## ライセンス

このプロジェクトは組織内利用を目的としたプライベートリポジトリです。
