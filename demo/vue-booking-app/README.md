# Vue.js Booking App (監査デモ用)

このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されたサンプルアプリです。

## ⚠️ 重要な注意事項

**このアプリには意図的に以下の問題が含まれています：**

### セキュリティ問題
- XSS脆弱性（v-html使用）
- APIキーのハードコーディング（フロントエンドに露出）
- JWT トークンのlocalStorage保存
- 認証バイパス可能なルートガード
- CORS設定の不備
- 入力バリデーション不足

### コード品質問題
- Vuex/Piniaの状態管理の複雑化
- Options APIとComposition APIの混在
- 巨大なコンポーネント（600行超）
- Props drilling（深いコンポーネント階層）
- 型定義の不備（any多用）
- エラーハンドリング不足

### パフォーマンス問題
- 不要な再レンダリング（computed未使用）
- SSR/CSRハイドレーション問題
- 大量データの一括取得（ページネーションなし）
- 画像の最適化不足
- バンドルサイズ肥大化（tree-shaking不備）

### 依存関係問題
- 古いVue 2.x（Vue 3移行推奨）
- 脆弱性のあるパッケージ
- 非推奨のVuex（Pinia移行推奨）
- 古いカレンダーライブラリ

## 機能

- ユーザー認証（会員登録・ログイン）
- 予約カレンダー表示
- 予約の作成・変更・キャンセル
- スタッフ・リソース管理
- 予約通知（メール・プッシュ）
- 管理者ダッシュボード
- 売上レポート

## 技術スタック

- Vue 2.6.14（やや古い）
- Vuex 3.6.2（非推奨）
- Vue Router 3.5.4
- axios 0.21.1（脆弱性あり）
- vue-cal 4.3.0（古いカレンダーライブラリ）
- moment 2.29.1（非推奨）
- Node.js/Express（APIサーバー）

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run serve

# ビルド
npm run build

# APIサーバー起動
npm run server
```

## プロジェクト構造

```
vue-booking-app/
├── package.json
├── vue.config.js
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── components/
│   │   ├── Calendar.vue
│   │   ├── BookingForm.vue
│   │   ├── BookingList.vue
│   │   └── TimeSlotPicker.vue
│   ├── views/
│   │   ├── Home.vue
│   │   ├── Dashboard.vue
│   │   └── Admin.vue
│   ├── stores/
│   │   └── index.js
│   ├── services/
│   │   └── api.js
│   └── router/
│       └── index.js
├── server/
│   └── index.js
└── ISSUES.md
```

## 監査の実施

このアプリケーションを監査するには、プロジェクトルートの `/tools` ディレクトリにあるツール群を使用してください。

詳細な手順は `/demo/ANALYSIS_GUIDE.md` を参照してください。

## 期待される検出結果

- **セキュリティ問題**: 8-10件（Critical 4件、High 6件）
- **コード品質問題**: 12-15件（High 4件、Medium 11件）
- **パフォーマンス問題**: 6-8件（High 3件、Medium 5件）
- **依存関係問題**: 5-7件（High 3件、Medium 4件）

## ライセンス

MIT License（デモ用途のみ）

**警告**: このアプリは本番環境で使用しないでください。教育・デモ目的専用です。
