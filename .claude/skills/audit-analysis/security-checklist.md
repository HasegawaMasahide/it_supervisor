# セキュリティチェックリスト（言語別）

AIセマンティック分析時の参考資料。各言語・フレームワーク固有の脆弱性パターン。

## PHP / Laravel

### SQLインジェクション
- `DB::raw()` に未サニタイズの入力
- `whereRaw()` にユーザー入力を直接連結
- `DB::select(DB::raw("SELECT ... WHERE id = $id"))` パターン
- Eloquent外での直接クエリ

### XSS
- Blade テンプレートで `{!! $var !!}` の使用（エスケープ無し）
- `@php echo $var @endphp` パターン
- JavaScript内に直接PHPの変数を埋め込み

### 認証・認可
- ミドルウェア `auth` の適用漏れ
- `Gate::define` / `Policy` の未実装
- パスワードの平文保存

### CSRF
- `@csrf` トークンの欠如（POST/PUT/DELETEフォーム）
- API ルートの認証不備

---

## Python / Django

### SQLインジェクション
- `cursor.execute(f"SELECT ... {user_input}")` — f-string内のSQL
- `Model.objects.raw()` に未サニタイズ入力
- `extra()`, `RawSQL()` の使用

### XSS
- テンプレートで `|safe` フィルター、`{% autoescape off %}`
- `mark_safe()` にユーザー入力

### Django固有
- `DEBUG = True` の本番残留
- `ALLOWED_HOSTS = ['*']`
- `SECRET_KEY` のハードコード
- `SECURE_SSL_REDIRECT = False`
- `SESSION_COOKIE_SECURE = False`

### 認証
- `@login_required` の欠如
- カスタム認証バックエンドの脆弱性
- パスワードバリデーションの不足

---

## JavaScript / React / Vue

### XSS
- React: `dangerouslySetInnerHTML` にユーザー入力
- Vue: `v-html` ディレクティブにユーザー入力
- `document.write()`, `innerHTML` の直接使用
- `eval()`, `new Function()` の使用

### 認証・認可
- JWTトークンの`localStorage`保存（XSS経由で窃取可能）
- クライアントサイドのみの認可チェック
- API呼び出し時の認証ヘッダー欠如

### 依存関係
- `package.json` の `*` バージョン指定
- 古い依存関係（特にセキュリティパッチ未適用）

---

## Java / Spring Boot

### SQLインジェクション
- `JdbcTemplate.query()` に文字列連結SQL
- JPQL/HQLでの文字列連結
- Native Query内のパラメータ未バインド

### Spring固有
- `@CrossOrigin("*")` — 過度に緩いCORS
- Spring Security設定の不備（`.permitAll()`の過剰使用）
- アクチュエーターエンドポイントの公開
- `@RequestMapping` の不適切なHTTPメソッド制限

### デシリアライズ
- 信頼できないデータの `ObjectInputStream` デシリアライズ
- Jackson のデフォルト型指定

---

## C# / ASP.NET Core

### SQLインジェクション
- `FromSqlRaw()` に文字列連結
- `ExecuteSqlRaw()` にユーザー入力
- ADO.NET の `SqlCommand` パラメータ未使用

### XSS
- Razor: `@Html.Raw()` にユーザー入力
- `[AllowHtml]` 属性の不適切な使用

### ASP.NET固有
- `appsettings.json` に接続文字列のハードコード
- HTTPS リダイレクション未設定
- CORS `AllowAnyOrigin()` と `AllowCredentials()` の併用
- Anti-forgery token の欠如
- `[Authorize]` 属性の欠如
