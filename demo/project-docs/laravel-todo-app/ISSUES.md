# このアプリケーションに含まれる問題一覧

監査ツールで検出されるべき問題のリストです。

## 🔴 Critical セキュリティ問題

### 1. SQLインジェクション脆弱性
**場所:**
- [app/Http/Controllers/AuthController.php:24-26](app/Http/Controllers/AuthController.php#L24-L26) - register()
- [app/Http/Controllers/AuthController.php:42](app/Http/Controllers/AuthController.php#L42) - login()
- [app/Http/Controllers/TodoController.php](app/Http/Controllers/TodoController.php) - 複数箇所

**詳細:**
生のSQL文字列に直接変数を埋め込んでおり、SQLインジェクション攻撃に脆弱です。

**影響度:** Critical
**CVSS Score:** 9.8

### 2. 不適切なパスワードハッシュ化（MD5使用）
**場所:**
- [app/Http/Controllers/AuthController.php:23](app/Http/Controllers/AuthController.php#L23)
- [app/Http/Controllers/AuthController.php:42](app/Http/Controllers/AuthController.php#L42)

**詳細:**
MD5は暗号学的に安全でなく、レインボーテーブル攻撃に脆弱です。bcryptやArgon2を使用すべきです。

**影響度:** Critical
**CVSS Score:** 8.1

### 3. XSS（クロスサイトスクリプティング）脆弱性
**場所:**
- [routes/web.php:16-19](routes/web.php#L16-L19) - hello/{name}
- [resources/views/welcome.blade.php:166-171](resources/views/welcome.blade.php#L166-L171)

**詳細:**
ユーザー入力をエスケープせずにHTMLに出力しています。

**影響度:** High
**CVSS Score:** 7.5

### 4. 認証・認可の不備
**場所:**
- [app/Http/Controllers/TodoController.php:117](app/Http/Controllers/TodoController.php#L117) - show()
- [app/Http/Controllers/TodoController.php:233](app/Http/Controllers/TodoController.php#L233) - destroy()
- [routes/api.php:18-24](routes/api.php#L18-L24)

**詳細:**
- TODOが現在のユーザーに属しているかの確認が欠落
- APIルートに認証ミドルウェアが適用されていない

**影響度:** Critical
**CVSS Score:** 8.8

### 5. 機密情報のハードコーディング
**場所:**
- [config/database.php:59-68](config/database.php#L59-L68) - 本番DB認証情報
- [.env.example:44](..env.example#L44) - APIキー
- [resources/views/welcome.blade.php:167](resources/views/welcome.blade.php#L167)

**詳細:**
パスワード、APIキーなどの機密情報がソースコードに直接記述されています。

**影響度:** Critical
**CVSS Score:** 9.1

### 6. パストラバーサル脆弱性
**場所:**
- [routes/web.php:22-30](routes/web.php#L22-L30) - download/{filename}

**詳細:**
ファイルパスの検証がなく、`../`を使った任意のファイル読み取りが可能です。

**影響度:** High
**CVSS Score:** 7.7

### 7. 情報漏洩（デバッグエンドポイント）
**場所:**
- [routes/api.php:29-32](routes/api.php#L29-L32) - /debug/phpinfo
- [routes/api.php:35-40](routes/api.php#L35-L40) - /debug/config

**詳細:**
本番環境でデバッグ情報が公開されています。

**影響度:** High
**CVSS Score:** 7.5

### 8. CSRF保護の欠如
**場所:**
- [app/Http/Controllers/AuthController.php:18](app/Http/Controllers/AuthController.php#L18)

**詳細:**
状態を変更するエンドポイントでCSRF保護がありません。

**影響度:** Medium
**CVSS Score:** 6.5

### 9. レート制限の欠如
**場所:**
- [routes/api.php:16-17](routes/api.php#L16-L17) - 認証エンドポイント

**詳細:**
ブルートフォース攻撃を防ぐレート制限がありません。

**影響度:** Medium
**CVSS Score:** 5.3

### 10. eval()の使用（コードインジェクション）
**場所:**
- [resources/views/welcome.blade.php:173-175](resources/views/welcome.blade.php#L173-L175)

**詳細:**
eval()は任意のコード実行を許可する危険な関数です。

**影響度:** Critical
**CVSS Score:** 9.0

## 🟡 パフォーマンス問題

### 11. N+1クエリ問題
**場所:**
- [app/Http/Controllers/TodoController.php:63-66](app/Http/Controllers/TodoController.php#L63-L66)

**詳細:**
各TODOに対して個別にユーザー情報を取得しており、TODOが100件あれば101回のクエリが実行されます。

**影響度:** High
**推定影響:** レスポンス時間が10倍以上遅くなる可能性

### 12. 不要なデータの取得
**場所:**
- [app/Http/Controllers/AuthController.php:91](app/Http/Controllers/AuthController.php#L91)

**詳細:**
`SELECT *` で全カラムを取得していますが、一部のカラムしか使用していません。

**影響度:** Medium
**推定影響:** メモリ使用量の不要な増加

### 13. 複数の個別クエリ（集約可能）
**場所:**
- [app/Http/Controllers/TodoController.php:264-270](app/Http/Controllers/TodoController.php#L264-L270)

**詳細:**
統計情報を5つの個別クエリで取得していますが、1つの集約クエリで実行可能です。

**影響度:** Medium
**推定影響:** 5倍のDB負荷

### 14. インデックスの欠如
**場所:**
- [database/migrations/2024_01_01_000002_create_todos_table.php:22](database/migrations/2024_01_01_000002_create_todos_table.php#L22)

**詳細:**
頻繁に検索される `user_id` と `is_completed` にインデックスがありません。

**影響度:** High
**推定影響:** 大量データで著しいパフォーマンス低下

## 🔵 コード品質問題

### 15. 循環的複雑度が高い（> 10）
**場所:**
- [app/Http/Controllers/TodoController.php:29-68](app/Http/Controllers/TodoController.php#L29-L68) - index()

**詳細:**
ネストされたif-else文が多く、循環的複雑度が15以上あります。

**影響度:** Medium
**技術的負債:** テストが困難、バグが混入しやすい

### 16. 長すぎる関数（> 100行）
**場所:**
- [app/Http/Controllers/TodoController.php:135-222](app/Http/Controllers/TodoController.php#L135-L222) - update()

**詳細:**
1つの関数が100行以上あり、複数の責務を持っています。

**影響度:** Medium
**技術的負債:** 保守性の低下

### 17. 重複コード
**場所:**
- [app/Http/Controllers/TodoController.php:175-187](app/Http/Controllers/TodoController.php#L175-L187) - 優先度ラベル
- [app/Http/Controllers/TodoController.php:189-202](app/Http/Controllers/TodoController.php#L189-L202) - ステータスラベル

**詳細:**
同じロジックが複数箇所に重複しています。

**影響度:** Low
**技術的負債:** 変更時に複数箇所の修正が必要

### 18. マジックナンバー
**場所:**
- [app/Http/Controllers/TodoController.php:146](app/Http/Controllers/TodoController.php#L146) - priority値 1, 5
- [app/Http/Controllers/TodoController.php:195-199](app/Http/Controllers/TodoController.php#L195-L199) - 86400, 259200

**詳細:**
定数として定義すべき数値がハードコードされています。

**影響度:** Low
**技術的負債:** 可読性の低下

### 19. エラーハンドリングの不足
**場所:**
- 全体的に欠如

**詳細:**
例外処理やバリデーションが不十分です。

**影響度:** Medium
**技術的負債:** 予期しないエラーでアプリケーションがクラッシュ

### 20. 入力バリデーションの欠如
**場所:**
- [app/Http/Controllers/TodoController.php:77-80](app/Http/Controllers/TodoController.php#L77-L80) - store()
- [app/Http/Controllers/AuthController.php:21-23](app/Http/Controllers/AuthController.php#L21-L23) - register()

**詳細:**
ユーザー入力の検証が行われていません。

**影響度:** High
**技術的負債:** セキュリティリスク、データ整合性の問題

## 📦 依存関係問題

### 21. 古いLaravelバージョン
**場所:**
- [composer.json:11](composer.json#L11)

**詳細:**
Laravel 8.xは2023年にサポートが終了しており、セキュリティアップデートがありません。

**影響度:** High
**推奨:** Laravel 10.x 以上へのアップグレード

### 22. 脆弱性のある可能性のあるパッケージ
**場所:**
- [composer.json](composer.json) - 全般

**詳細:**
依存パッケージのバージョンが古く、既知の脆弱性が含まれている可能性があります。

**影響度:** Medium to High
**推奨:** `composer audit` の実行と依存関係の更新

## 📊 問題のサマリー

| 深刻度 | 件数 | カテゴリ |
|--------|------|----------|
| Critical | 5件 | セキュリティ |
| High | 7件 | セキュリティ、パフォーマンス、コード品質 |
| Medium | 8件 | すべて |
| Low | 2件 | コード品質 |

**合計:** 22件の問題

## 推定改善工数

- セキュリティ問題の修正: 16-24時間
- パフォーマンス問題の修正: 8-12時間
- コード品質の改善: 12-20時間
- 依存関係の更新とテスト: 8-16時間

**合計推定工数:** 44-72時間（5.5-9営業日）
