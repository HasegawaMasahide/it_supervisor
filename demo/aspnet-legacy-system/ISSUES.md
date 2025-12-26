# ASP.NET Core Legacy System - 意図的に含まれる問題一覧

このドキュメントは、デモ用レガシー社内管理システムに意図的に含まれている問題の完全なリストです。

## 概要

| カテゴリ | Critical | High | Medium | Low | 合計 |
|----------|----------|------|--------|-----|------|
| セキュリティ | 7 | 9 | 6 | 0 | 22 |
| コード品質 | 0 | 5 | 8 | 3 | 16 |
| パフォーマンス | 0 | 4 | 2 | 0 | 6 |
| 依存関係 | 0 | 3 | 1 | 0 | 4 |
| **合計** | **7** | **21** | **17** | **3** | **48** |

---

## セキュリティ問題（22件）

### Critical（7件）

#### 1. 接続文字列に機密情報をハードコーディング
- **ファイル**: `appsettings.json:3-5`
- **問題**: DB接続文字列にユーザー名・パスワードを平文で記載
- **影響**: ソースコード漏洩時のDB侵害
- **修正工数**: 2時間
- **修正方法**: Azure Key Vault、環境変数の使用

#### 2. APIキーのハードコーディング
- **ファイル**: `appsettings.json:13-18`
- **問題**: 外部APIキーとシークレットを平文で記載
- **影響**: API不正利用、課金攻撃
- **修正工数**: 2時間
- **修正方法**: Key Vault、Secret Managerの使用

#### 3. 管理者パスワードのハードコーディング
- **ファイル**: `appsettings.json:29-32`
- **問題**: 管理者認証情報をJSONに記載
- **影響**: 管理者アカウント侵害
- **修正工数**: 3時間
- **修正方法**: Identity、外部認証プロバイダーの使用

#### 4. DeveloperExceptionPageを本番環境で使用
- **ファイル**: `Startup.cs:66-69`
- **問題**: 常にDeveloperExceptionPageを有効化
- **影響**: スタックトレース、内部情報の漏洩
- **修正工数**: 1時間
- **修正方法**: env.IsDevelopment()のみで有効化

#### 5. SQLインジェクション脆弱性
- **ファイル**: `Controllers/EmployeeController.cs:32-50`
- **問題**: ユーザー入力を直接SQL文字列に結合
- **影響**: データベース改ざん、情報漏洩、権限昇格
- **修正工数**: 4時間
- **修正方法**: パラメータ化クエリ、ORMの使用

#### 6. パスワードを平文で保存
- **ファイル**: `Models/Employee.cs:14`、`Controllers/EmployeeController.cs:81-85`
- **問題**: パスワードをハッシュ化せずにDB保存
- **影響**: データ漏洩時の全パスワード露出
- **修正工数**: 4時間
- **修正方法**: ASP.NET Core Identity、BCryptの使用

#### 7. 機密情報をCSVエクスポート
- **ファイル**: `Controllers/EmployeeController.cs:184-202`
- **問題**: パスワード、SSN、給与をエクスポート
- **影響**: 機密情報の大量漏洩
- **修正工数**: 2時間
- **修正方法**: エクスポート項目の制限、権限チェック

### High（9件）

#### 8. HTTPを許可
- **ファイル**: `Program.cs:16`
- **問題**: HTTPSと並行してHTTPを有効化
- **影響**: 通信の盗聴、中間者攻撃
- **修正工数**: 1時間
- **修正方法**: HTTPSのみに制限

#### 9. CORS設定が緩い（AllowAnyOrigin + AllowCredentials）
- **ファイル**: `Startup.cs:47-53`
- **問題**: すべてのオリジンからの認証付きリクエストを許可
- **影響**: CSRF攻撃、データ窃取
- **修正工数**: 2時間
- **修正方法**: 許可オリジンのホワイトリスト化

#### 10. HTTPSリダイレクトなし
- **ファイル**: `Startup.cs:71-72`
- **問題**: UseHttpsRedirection()がコメントアウト
- **影響**: HTTP通信の許容
- **修正工数**: 0.5時間
- **修正方法**: コメント解除、強制HTTPS

#### 11. 認証クッキーのセキュリティ設定不備
- **ファイル**: `Startup.cs:56-62`
- **問題**: HttpOnly=false、SecurePolicy=None
- **影響**: JavaScriptからのクッキー窃取、HTTP送信
- **修正工数**: 1時間
- **修正方法**: HttpOnly=true、SecurePolicy=Always

#### 12. 認証・認可チェック不足（Create）
- **ファイル**: `Controllers/EmployeeController.cs:75-85`
- **問題**: 誰でも従業員を作成可能
- **影響**: 不正なユーザー登録
- **修正工数**: 2時間
- **修正方法**: [Authorize]属性、ロールベース認可

#### 13. 認可チェック不足（Delete）
- **ファイル**: `Controllers/EmployeeController.cs:165-175`
- **問題**: 誰でも従業員を削除可能
- **影響**: 不正なデータ削除
- **修正工数**: 2時間
- **修正方法**: ロールベース認可、所有者チェック

#### 14. 機密情報の表示
- **ファイル**: `Controllers/EmployeeController.cs:178-194`
- **問題**: パスワード、SSN、給与をViewBagで表示
- **影響**: 機密情報の不適切な露出
- **修正工数**: 2時間
- **修正方法**: DTOの使用、フィールドのマスキング

#### 15. XSS脆弱性（Html.Raw）
- **ファイル**: `Views/Employee/List.cshtml:23`
- **問題**: ユーザー入力をエスケープせずに表示
- **影響**: スクリプトインジェクション
- **修正工数**: 1時間
- **修正方法**: @employeeでエスケープ、サニタイズ

#### 16. XSSの可能性（Description）
- **ファイル**: `Models/Expense.cs:18`
- **問題**: Descriptionフィールドにサニタイズなし
- **影響**: XSS攻撃
- **修正工数**: 2時間
- **修正方法**: 入力バリデーション、出力エスケープ

### Medium（6件）

#### 17. 本番環境でDebugログ出力
- **ファイル**: `appsettings.json:8-11`
- **問題**: LogLevelがすべてDebug
- **影響**: 性能低下、ログサイズ増大、情報漏洩
- **修正工数**: 0.5時間
- **修正方法**: 本番はWarning以上に設定

#### 18. セッション設定が緩い
- **ファイル**: `Startup.cs:38-43`、`appsettings.json:27`
- **問題**: IdleTimeout=1年、HttpOnly=false
- **影響**: セッションハイジャックのリスク増大
- **修正工数**: 1時間
- **修正方法**: 適切なタイムアウト（20分）、HttpOnly=true

#### 19. セキュリティヘッダーの設定なし
- **ファイル**: `Startup.cs:80-81`
- **問題**: X-Frame-Options、X-Content-Type-Options等なし
- **影響**: クリックジャッキング、MIME sniffing攻撃
- **修正工数**: 2時間
- **修正方法**: ミドルウェアでヘッダー追加

#### 20. Hsts未使用
- **ファイル**: `Startup.cs:74-75`
- **問題**: UseHsts()がコメントアウト
- **影響**: HTTPS強制が不完全
- **修正工数**: 0.5時間
- **修正方法**: コメント解除、適切な設定

#### 21. バリデーション不足（Employee）
- **ファイル**: `Models/Employee.cs:10-27`
- **問題**: Required、StringLength等の属性なし
- **影響**: 不正なデータ入力
- **修正工数**: 2時間
- **修正方法**: DataAnnotations追加

#### 22. 例外の詳細をユーザーに表示
- **ファイル**: `Controllers/EmployeeController.cs:206-209`
- **問題**: StackTraceを含むエラーメッセージを表示
- **影響**: 内部情報の漏洩
- **修正工数**: 1時間
- **修正方法**: 汎用エラーメッセージ、ログ記録

---

## コード品質問題（16件）

### High（5件）

#### 23. DbContextをSingletonで登録
- **ファイル**: `Startup.cs:28-34`
- **問題**: DbContextは本来Scoped、Singletonは不適切
- **影響**: スレッドセーフでない、メモリリーク
- **修正工数**: 2時間
- **修正方法**: AddDbContext()の使用

#### 24. 巨大なメソッド、循環的複雑度が高い
- **ファイル**: `Controllers/EmployeeController.cs:88-162`
- **問題**: Updateメソッドが複雑すぎる
- **影響**: テスト困難、保守性低下
- **修正工数**: 4時間
- **修正方法**: メソッド分割、FluentValidationの使用

#### 25. DbContextをフィールドで保持
- **ファイル**: `Controllers/EmployeeController.cs:15-17`
- **問題**: Singletonとの組み合わせで危険
- **影響**: 並行処理での不具合
- **修正工数**: 2時間
- **修正方法**: 適切なDI、Scopedライフタイム

#### 26. ModelStateバリデーションのスキップ
- **ファイル**: `Controllers/EmployeeController.cs:77-85`
- **問題**: ModelStateをチェックしていない
- **影響**: 不正なデータの保存
- **修正工数**: 1時間
- **修正方法**: if (!ModelState.IsValid)チェック

#### 27. 例外処理が不適切（catch-all）
- **ファイル**: `Controllers/EmployeeController.cs:204`
- **問題**: Exception全般をcatchして詳細表示
- **影響**: 予期しない動作、情報漏洩
- **修正工数**: 2時間
- **修正方法**: 特定例外のキャッチ、適切なログ記録

### Medium（8件）

#### 28. グローバル変数の使用（Configuration）
- **ファイル**: `Startup.cs:19`
- **問題**: 静的フィールドで設定を保持
- **影響**: テスト困難、依存性の問題
- **修正工数**: 2時間
- **修正方法**: IOptions<T>パターンの使用

#### 29. グローバル変数の使用（キャッシュ）
- **ファイル**: `Controllers/EmployeeController.cs:21`
- **問題**: static Listでキャッシュ
- **影響**: スレッドセーフでない、メモリリーク
- **修正工数**: 3時間
- **修正方法**: IMemoryCache、IDistributedCacheの使用

#### 30. 論理削除ではなく物理削除
- **ファイル**: `Controllers/EmployeeController.cs:165-175`
- **問題**: Removeで物理削除
- **影響**: データ復元不可
- **修正工数**: 2時間
- **修正方法**: IsDeletedフラグの活用

#### 31. 論理削除フラグのフィルタ漏れ
- **ファイル**: `Models/Employee.cs:26`、クエリ全般
- **問題**: IsDeletedでフィルタしていない
- **影響**: 削除済みデータの表示
- **修正工数**: 2時間
- **修正方法**: グローバルクエリフィルタの実装

#### 32. エラーハンドリング不足（Parse）
- **ファイル**: `Controllers/EmployeeController.cs:225-230`
- **問題**: int.Parse()で例外の可能性
- **影響**: アプリクラッシュ
- **修正工数**: 1時間
- **修正方法**: int.TryParse()の使用

#### 33. カスケード削除の設定不足
- **ファイル**: `Data/ApplicationDbContext.cs:22-23`
- **問題**: OnDeleteの設定が明示的でない
- **影響**: 意図しないデータ削除
- **修正工数**: 1時間
- **修正方法**: OnDelete動作の明示的設定

#### 34. AddMvcの古いパターン
- **ファイル**: `Startup.cs:26`
- **問題**: AddMvc()は非推奨
- **影響**: 不要な機能の有効化
- **修正工数**: 1時間
- **修正方法**: AddControllersWithViews()の使用

#### 35. ViewBagの過度な使用
- **ファイル**: `Controllers/EmployeeController.cs:189-192`
- **問題**: 複数のViewBagで情報を渡す
- **影響**: 型安全性の欠如
- **修正工数**: 2時間
- **修正方法**: ViewModelの使用

### Low（3件）

#### 36. マジックナンバー（カラムインデックス）
- **ファイル**: `Controllers/EmployeeController.cs:43-49`
- **問題**: reader.GetInt32(0)等のハードコード
- **影響**: 可読性低下、保守困難
- **修正工数**: 1時間
- **修正方法**: 名前付きアクセス、ORMの使用

#### 37. バリデーションなし（WorkHours）
- **ファイル**: `Models/Attendance.cs:18`
- **問題**: WorkHoursが負の値も許容
- **影響**: 不正なデータ
- **修正工数**: 0.5時間
- **修正方法**: [Range(0, 24)]追加

#### 38. 型の不一致（stringをintに変換）
- **ファイル**: `Controllers/EmployeeController.cs:225`
- **問題**: パラメータ型がstring、intで使用
- **影響**: 実行時エラーの可能性
- **修正工数**: 0.5時間
- **修正方法**: パラメータ型をintに変更

---

## パフォーマンス問題（6件）

### High（4件）

#### 39. async/await未使用
- **ファイル**: `Controllers/EmployeeController.cs:65-70`
- **問題**: 同期的なToList()、SaveChanges()
- **影響**: スレッドブロック、スケーラビリティ低下
- **修正工数**: 3時間
- **修正方法**: ToListAsync()、SaveChangesAsync()の使用

#### 40. N+1クエリ問題
- **ファイル**: `Controllers/EmployeeController.cs:65-70`、`Views/Employee/List.cshtml:30`
- **問題**: Include()なしでナビゲーションプロパティにアクセス
- **影響**: データベースクエリ数の増大
- **修正工数**: 2時間
- **修正方法**: Include()、ThenInclude()の使用

#### 41. インデックスの欠如
- **ファイル**: `Data/ApplicationDbContext.cs:18-19`
- **問題**: Email、Departmentにインデックスなし
- **影響**: 検索クエリの遅延
- **修正工数**: 1時間
- **修正方法**: HasIndex()の追加

#### 42. 全データを一括取得
- **ファイル**: `Controllers/EmployeeController.cs:199-202`
- **問題**: Exportで全従業員データをメモリに読み込み
- **影響**: メモリ枯渇、アプリクラッシュ
- **修正工数**: 3時間
- **修正方法**: ストリーミング、ページング

### Medium（2件）

#### 43. 不適切なキャッシュ（staticフィールド）
- **ファイル**: `Controllers/EmployeeController.cs:213-220`
- **問題**: staticフィールドでキャッシュ、無効化なし
- **影響**: 古いデータの表示、メモリリーク
- **修正工数**: 2時間
- **修正方法**: IMemoryCacheの使用、適切な有効期限

#### 44. ViewBagの過度な使用（パフォーマンス）
- **ファイル**: `Controllers/EmployeeController.cs:189-192`
- **問題**: 複数のViewBag設定
- **影響**: リフレクションのオーバーヘッド
- **修正工数**: 1時間
- **修正方法**: 強く型付けされたViewModelの使用

---

## 依存関係問題（4件）

### High（3件）

#### 45. 古いASP.NET Core 2.1（EOL済み）
- **ファイル**: `LegacySystem.csproj:4`、`LegacySystem.csproj:9`
- **問題**: .NET Core 2.1はEOL済み
- **影響**: セキュリティパッチなし、脆弱性
- **修正工数**: 12時間（破壊的変更対応）
- **修正方法**: .NET 8にアップグレード

#### 46. 脆弱性のあるNewtonsoft.Json
- **ファイル**: `LegacySystem.csproj:12`
- **問題**: Newtonsoft.Json 11.0.2に既知の脆弱性
- **影響**: DoS、リモートコード実行の可能性
- **修正工数**: 2時間
- **修正方法**: 13.0.1以上にアップグレード

#### 47. 脆弱性のあるSystem.Data.SqlClient
- **ファイル**: `LegacySystem.csproj:20`
- **問題**: System.Data.SqlClient 4.5.0に脆弱性
- **影響**: SQLインジェクションのリスク増大
- **修正工数**: 2時間
- **修正方法**: Microsoft.Data.SqlClientへの移行

### Medium（1件）

#### 48. 未使用のパッケージ（AutoMapper）
- **ファイル**: `LegacySystem.csproj:18`
- **問題**: AutoMapperが使われていない
- **影響**: ビルドサイズ増加
- **修正工数**: 0.5時間
- **修正方法**: パッケージ削除または活用

---

## 推奨修正順序

1. **Critical Security問題**: 1-7（最優先）
2. **High Security問題**: 8-16
3. **High Dependency問題**: 45-47（脆弱性対応）
4. **High Code Quality問題**: 23-27
5. **High Performance問題**: 39-42
6. その他（Medium、Low）

## 総修正工数見積もり

- **Critical**: 18時間
- **High**: 53時間
- **Medium**: 26時間
- **Low**: 2時間
- **合計**: **99時間**（約13人日）

---

**最終更新日**: 2025-12-25
