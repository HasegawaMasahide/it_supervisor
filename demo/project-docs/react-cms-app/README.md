# React CMS App (監査デモ用)

このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されたサンプルアプリです。

## ⚠️ 重要な注意事項

**このアプリには意図的に以下の問題が含まれています：**

### セキュリティ問題
- XSS（クロスサイトスクリプティング）脆弱性（dangerouslySetInnerHTML使用）
- APIキーのハードコーディング
- 認証トークンのlocalStorageへの保存
- CORS設定の不備
- 入力バリデーション不足

### コード品質問題
- 古いクラスコンポーネントの使用（React 16系）
- propTypesではなくTypeScriptを中途半端に導入
- 重複コード・コピペコード
- 肥大化したコンポーネント（500行超）
- グローバル変数の多用
- エラーハンドリング不足

### パフォーマンス問題
- 不要な再レンダリング（shouldComponentUpdate未実装）
- メモ化されていない計算
- 大量のデータを一度に取得
- 画像の最適化不足
- バンドルサイズが大きい

### 依存関係問題
- 古いReactバージョン（16.14.0）
- 脆弱性のあるパッケージ（古いaxios、lodash等）
- 未使用の依存関係
- devDependenciesとdependenciesの混在

## 機能

- ユーザー認証（ログイン・ログアウト）
- 記事の作成・編集・削除・公開
- カテゴリ・タグ管理
- メディアアップロード
- ドラフト保存
- プレビュー機能
- 記事検索・フィルタリング

## 技術スタック

- React 16.14.0（やや古い）
- TypeScript 4.1.2（中途半端な導入）
- axios 0.21.1（脆弱性あり）
- react-router-dom 5.2.0
- lodash 4.17.19（脆弱性あり）
- moment 2.29.1（非推奨、date-fnsへの移行が推奨）
- Redux（古いパターン）

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm start

# ビルド
npm run build

# テスト
npm test
```

## プロジェクト構造

```
react-cms-app/
├── package.json
├── tsconfig.json
├── public/
│   └── index.html
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ArticleList.tsx
│   │   ├── ArticleEditor.tsx
│   │   ├── MediaUploader.tsx
│   │   └── Login.tsx
│   ├── services/
│   │   └── api.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── styles/
│       └── main.css
└── ISSUES.md
```

## 監査の実施

このアプリケーションを監査するには、プロジェクトルートの `/tools` ディレクトリにあるツール群を使用してください。

詳細な手順は `/demo/ANALYSIS_GUIDE.md` を参照してください。

## 期待される検出結果

- **セキュリティ問題**: 8-10件（Critical 3件、High 5件）
- **コード品質問題**: 10-12件（Medium 8件、Low 4件）
- **パフォーマンス問題**: 5-7件（High 2件、Medium 5件）
- **依存関係問題**: 6-8件（High 4件、Medium 4件）

## ライセンス

MIT License（デモ用途のみ）

**警告**: このアプリは本番環境で使用しないでください。教育・デモ目的専用です。
