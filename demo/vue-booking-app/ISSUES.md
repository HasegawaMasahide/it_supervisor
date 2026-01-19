# このアプリケーションに含まれる問題一覧

監査ツールで検出されるべき問題のリストです。

## 🔴 Critical セキュリティ問題

### 1. XSS脆弱性（v-html使用）
**場所:**
- [src/components/BookingList.vue:45](src/components/BookingList.vue#L45)
- [src/views/Dashboard.vue:78](src/views/Dashboard.vue#L78)

**詳細:**
ユーザー入力をv-htmlで直接レンダリングしており、XSS攻撃に脆弱です。

**影響度:** Critical
**CVSS Score:** 7.5

### 2. APIキーのフロントエンド露出
**場所:**
- [src/services/api.js:8-12](src/services/api.js#L8-L12)
- [vue.config.js:15](vue.config.js#L15)

**詳細:**
外部APIキー（Google Maps、決済サービス等）がフロントエンドコードにハードコーディングされています。

**影響度:** Critical
**CVSS Score:** 8.2

### 3. JWT トークンのlocalStorage保存
**場所:**
- [src/services/api.js:35](src/services/api.js#L35)
- [src/stores/index.js:28](src/stores/index.js#L28)

**詳細:**
JWTトークンをlocalStorageに保存しており、XSS攻撃でトークンが盗まれる可能性があります。

**影響度:** High
**CVSS Score:** 7.1

### 4. 認証バイパス可能なルートガード
**場所:**
- [src/router/index.js:45-52](src/router/index.js#L45-L52)

**詳細:**
ルートガードがlocalStorageのトークン存在のみをチェックしており、トークンの有効性を検証していません。

**影響度:** Critical
**CVSS Score:** 8.5

### 5. CORS設定の不備
**場所:**
- [server/index.js:12-15](server/index.js#L12-L15)

**詳細:**
`Access-Control-Allow-Origin: *` が設定されており、任意のオリジンからのリクエストを許可しています。

**影響度:** High
**CVSS Score:** 6.8

### 6. 入力バリデーション不足
**場所:**
- [src/components/BookingForm.vue:89-102](src/components/BookingForm.vue#L89-L102)
- [server/index.js:78-85](server/index.js#L78-L85)

**詳細:**
フロントエンド・バックエンドともに入力バリデーションが不十分です。

**影響度:** High
**CVSS Score:** 6.5

## 🟡 パフォーマンス問題

### 7. 不要な再レンダリング
**場所:**
- [src/components/Calendar.vue:120-145](src/components/Calendar.vue#L120-L145)

**詳細:**
computed プロパティを使用せず、methodsで毎回計算を行っているため、不要な再レンダリングが発生しています。

**影響度:** High
**推定影響:** レンダリング性能が50%以上低下

### 8. SSR/CSRハイドレーション問題
**場所:**
- [src/App.vue:25-30](src/App.vue#L25-L30)
- [nuxt.config.js:45](nuxt.config.js#L45)

**詳細:**
サーバーサイドレンダリングとクライアントサイドレンダリングで状態が一致せず、ハイドレーションエラーが発生しています。

**影響度:** Medium
**推定影響:** 初期表示のちらつき、コンソールエラー

### 9. 大量データの一括取得
**場所:**
- [src/services/api.js:55-60](src/services/api.js#L55-L60)
- [src/views/Dashboard.vue:95](src/views/Dashboard.vue#L95)

**詳細:**
ページネーションや仮想スクロールを使用せず、全予約データを一括取得しています。

**影響度:** High
**推定影響:** 1000件以上の予約で著しいパフォーマンス低下

### 10. バンドルサイズ肥大化
**場所:**
- [package.json](package.json)
- [vue.config.js](vue.config.js)

**詳細:**
- moment.jsの全ロケールがバンドルに含まれている
- lodash全体をインポート（tree-shaking不備）
- 未使用のコンポーネントがバンドルに含まれている

**影響度:** Medium
**推定影響:** バンドルサイズが必要以上に500KB以上増加

### 11. 画像の最適化不足
**場所:**
- [src/components/Calendar.vue:15](src/components/Calendar.vue#L15)
- [src/views/Home.vue:25-30](src/views/Home.vue#L25-L30)

**詳細:**
画像の遅延読み込み、WebP形式への変換、適切なサイズ指定がありません。

**影響度:** Medium
**推定影響:** LCP（Largest Contentful Paint）が3秒以上

## 🔵 コード品質問題

### 12. Options APIとComposition APIの混在
**場所:**
- [src/components/](src/components/) - 全体的に混在

**詳細:**
同一プロジェクト内でOptions APIとComposition APIが混在しており、一貫性がありません。

**影響度:** Medium
**技術的負債:** コードの理解とメンテナンスが困難

### 13. Vuex状態管理の複雑化
**場所:**
- [src/stores/index.js](src/stores/index.js)

**詳細:**
- 全ての状態が1つのストアに集約されている
- モジュール分割されていない
- 適切なgetters/actionsの分離がない

**影響度:** High
**技術的負債:** 状態追跡とデバッグが困難

### 14. 巨大なコンポーネント（600行超）
**場所:**
- [src/components/Calendar.vue](src/components/Calendar.vue) - 650行
- [src/views/Dashboard.vue](src/views/Dashboard.vue) - 580行

**詳細:**
1つのコンポーネントが複数の責務を持ち、肥大化しています。

**影響度:** Medium
**技術的負債:** テストとメンテナンスが困難

### 15. Props drilling
**場所:**
- [src/components/TimeSlotPicker.vue](src/components/TimeSlotPicker.vue)
- [src/components/BookingForm.vue](src/components/BookingForm.vue)

**詳細:**
深いコンポーネント階層を通じてpropsを渡しており、provide/injectやストアを使用していません。

**影響度:** Medium
**技術的負債:** プロパティの追跡とリファクタリングが困難

### 16. 型定義の不備（any多用）
**場所:**
- [src/types/](src/types/) - 全般

**詳細:**
TypeScriptを導入しているが、any型が多用されており、型安全性が確保されていません。

**影響度:** Medium
**技術的負債:** ランタイムエラーのリスク増加

### 17. エラーハンドリング不足
**場所:**
- [src/services/api.js](src/services/api.js) - 全般
- [src/stores/index.js](src/stores/index.js) - 全般

**詳細:**
API呼び出しのエラーハンドリングが不十分で、ユーザーへの適切なフィードバックがありません。

**影響度:** Medium
**技術的負債:** ユーザー体験の低下

### 18. 重複コード
**場所:**
- [src/components/BookingForm.vue:120-150](src/components/BookingForm.vue#L120-L150)
- [src/views/Admin.vue:200-230](src/views/Admin.vue#L200-L230)

**詳細:**
同じバリデーションロジックが複数箇所に重複しています。

**影響度:** Low
**技術的負債:** 変更時に複数箇所の修正が必要

## 📦 依存関係問題

### 19. 古いVue 2.x
**場所:**
- [package.json:12](package.json#L12)

**詳細:**
Vue 2.xはLTS期間中ですが、Vue 3への移行が推奨されています。新機能（Composition API、Teleport等）が使用できません。

**影響度:** Medium
**推奨:** Vue 3.xへのアップグレード

### 20. 非推奨のVuex
**場所:**
- [package.json:14](package.json#L14)

**詳細:**
VuexはPiniaに置き換えられることが推奨されています。

**影響度:** Medium
**推奨:** Piniaへの移行

### 21. 脆弱性のあるaxios
**場所:**
- [package.json:18](package.json#L18)

**詳細:**
axios 0.21.1にはSSRF脆弱性（CVE-2021-3749）があります。

**影響度:** High
**推奨:** axios 1.x以上へのアップグレード

### 22. 古いカレンダーライブラリ
**場所:**
- [package.json:22](package.json#L22)

**詳細:**
vue-calの古いバージョンを使用しており、Vue 3対応版への移行が必要です。

**影響度:** Medium
**推奨:** @vuepic/vue-datepicker等への移行

### 23. 非推奨のmoment.js
**場所:**
- [package.json:25](package.json#L25)

**詳細:**
moment.jsはメンテナンスモードであり、day.jsやdate-fnsへの移行が推奨されています。

**影響度:** Low
**推奨:** day.jsまたはdate-fnsへの移行

## 📊 問題のサマリー

| 深刻度 | 件数 | カテゴリ |
|--------|------|----------|
| Critical | 4件 | セキュリティ |
| High | 8件 | セキュリティ、パフォーマンス、コード品質 |
| Medium | 9件 | すべて |
| Low | 2件 | コード品質、依存関係 |

**合計:** 23件の問題

## 推定改善工数

- セキュリティ問題の修正: 20-28時間
- パフォーマンス問題の修正: 12-16時間
- コード品質の改善: 16-24時間
- 依存関係の更新とテスト: 12-20時間

**合計推定工数:** 60-88時間（7.5-11営業日）
