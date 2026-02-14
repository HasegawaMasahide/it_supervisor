# ASP.NET Core Legacy System (監査デモ用)

このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されたサンプルアプリです。

## ⚠️ 重要な注意事項

**このアプリには意図的に以下の問題が含まれています：**

### セキュリティ問題
- SQLインジェクション脆弱性（ADO.NETで生SQL使用）
- XSS（クロスサイトスクリプティング）脆弱性
- 認証・認可の不備
- 機密情報のハードコーディング（接続文字列、パスワード）
- パスワードの平文保存
- セッション管理の不備
- 過度な権限付与

### コード品質問題
- レガシーなコーディングスタイル（ASP.NET Core 2.1系）
- 循環的複雑度が高いメソッド
- 重複コード
- 巨大なコントローラー（1000行超）
- グローバル変数・staticフィールドの多用
- エラーハンドリング不足
- 適切でない例外処理（catch-all）

### パフォーマンス問題
- N+1クエリ問題
- 同期的なDB操作（async/await未使用）
- キャッシュ未使用
- 大量データの一括読み込み
- ViewBagの過度な使用

### 依存関係問題
- 古いASP.NET Coreバージョン（2.1、EOL済み）
- 脆弱性のあるパッケージ
- 未使用の依存関係

## 機能

- 従業員管理（CRUD操作）
- 勤怠管理（出退勤記録、休暇申請）
- 経費精算申請・承認
- プロジェクト管理
- レポート生成（CSV、Excel出力）
- 管理者ダッシュボード
- ユーザー認証・権限管理

## 技術スタック

- .NET Core 2.1（EOL済み）
- ASP.NET Core MVC 2.1
- Entity Framework Core 2.1
- SQL Server / SQLite
- jQuery 2.2.4（古い）
- Bootstrap 3.3.7（古い）

## セットアップ

```bash
# .NET Core 2.1 SDKのインストールが必要
# https://dotnet.microsoft.com/download/dotnet/2.1

# パッケージの復元
dotnet restore

# データベースのマイグレーション
dotnet ef database update

# 開発サーバー起動
dotnet run
```

ブラウザで `https://localhost:5001` にアクセス

## プロジェクト構造

```
aspnet-legacy-system/
├── LegacySystem.csproj
├── appsettings.json
├── Program.cs
├── Startup.cs
├── Controllers/
│   ├── EmployeeController.cs
│   ├── AttendanceController.cs
│   └── ExpenseController.cs
├── Models/
│   ├── Employee.cs
│   ├── Attendance.cs
│   └── Expense.cs
├── Data/
│   └── ApplicationDbContext.cs
├── Views/
│   ├── Employee/
│   └── Shared/
└── ISSUES.md
```

## 監査の実施

このアプリケーションを監査するには、プロジェクトルートの `/tools` ディレクトリにあるツール群を使用してください。

詳細な手順は `/demo/ANALYSIS_GUIDE.md` を参照してください。

## 期待される検出結果

- **セキュリティ問題**: 10-12件（Critical 4件、High 6件）
- **コード品質問題**: 12-15件（High 5件、Medium 10件）
- **パフォーマンス問題**: 6-8件（High 3件、Medium 5件）
- **依存関係問題**: 5-7件（High 3件、Medium 4件）

## ライセンス

MIT License（デモ用途のみ）

**警告**: このアプリは本番環境で使用しないでください。教育・デモ目的専用です。
