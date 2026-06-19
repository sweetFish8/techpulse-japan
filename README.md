# TechPulse Japan

Qiita、Hacker News、GitHubの公開データを横断し、日本と海外の技術トレンドを可視化するダッシュボードです。

## Features

- 24時間・7日・30日の期間切り替え
- 媒体、カテゴリ、キーワードによる絞り込み
- AI / ML、Web、Mobile、Data、DevOps、Securityへの自動分類
- カテゴリ分布と媒体別モメンタムの可視化
- 各媒体内で正規化した独自のPulse Score
- 一部APIが停止しても利用可能なフォールトトレラント設計
- 15分単位のサーバーキャッシュ

## Data Sources

- [Qiita API v2](https://qiita.com/api/v2/docs)
- [Hacker News Search API](https://hn.algolia.com/api)
- [GitHub REST API](https://docs.github.com/en/rest/search/search)

媒体ごとに反応指標が異なるため、いいね・ポイント・スターを直接比較していません。各媒体の取得結果内で最大値を100として正規化し、コミュニティ内での相対的な勢いを `Pulse Score` として表示します。

## Tech Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Recharts
- Lucide Icons

## Getting Started

```bash
npm install
npm run dev
```

`http://localhost:3000` を開いてください。APIトークンなしでも動作します。

```bash
GITHUB_TOKEN=your_token
QIITA_TOKEN=your_token
```

トークンを設定するとAPIのレート制限を緩和できます。

## Architecture

```text
src/
├── app/
│   ├── api/trends/route.ts
│   └── page.tsx
├── components/dashboard.tsx
└── lib/
    ├── trends.ts
    └── types.ts
```

外部APIのレスポンスはサーバー側で共通の `TrendItem` 型へ変換します。クライアントは媒体固有のレスポンス形式に依存せず、検索・集計・可視化だけを担当します。
