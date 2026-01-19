# Spring Boot CRM App (監査デモ用)

このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されたサンプルアプリです。

## ⚠️ 重要な注意事項

**このアプリには意図的に以下の問題が含まれています：**

### セキュリティ問題
- SQLインジェクション脆弱性（Native Query使用）
- 機密情報のハードコーディング（DB接続情報、APIキー）
- 不適切な認証実装（Basic認証のみ）
- XSS脆弱性（Thymeleafのth:utext使用）
- CSRF対策の不備
- ログに機密情報出力
- 過度な権限付与（管理者権限の乱用）

### コード品質問題
- God Class（巨大なServiceクラス）
- XML設定ファイルの肥大化
- アノテーション過多
- レイヤー間の責務混在
- テストカバレッジ不足
- 例外処理の不備（catch-all）

### パフォーマンス問題
- N+1クエリ問題（JPA/Hibernateの誤用）
- 遅延読み込みの問題（LazyInitializationException）
- トランザクション境界の不適切な設定
- キャッシュ未使用
- コネクションプールの設定不備

### 依存関係問題
- 古いSpring Framework（4.3.x系、EOL済み）
- 脆弱性のあるパッケージ
- 非推奨のAPI使用

## 機能

- 顧客情報管理（CRUD操作）
- 商談・案件管理
- 営業活動履歴
- 売上予測・レポート
- タスク・リマインダー
- メール連携
- ダッシュボード

## 技術スタック

- Java 8（EOL済み）
- Spring Framework 4.3.30（EOL済み）
- Spring Boot 1.5.22
- Hibernate 5.2.x
- MySQL 5.7
- Thymeleaf 2.x
- Maven

## セットアップ

```bash
# パッケージのビルド
mvn clean package

# アプリケーション起動
java -jar target/crm-app.jar

# または
mvn spring-boot:run
```

ブラウザで `http://localhost:8080` にアクセス

## プロジェクト構造

```
springboot-crm-app/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/example/crm/
│   │   │   ├── CrmApplication.java
│   │   │   ├── controller/
│   │   │   │   ├── CustomerController.java
│   │   │   │   ├── DealController.java
│   │   │   │   └── ReportController.java
│   │   │   ├── service/
│   │   │   │   ├── CustomerService.java
│   │   │   │   └── DealService.java
│   │   │   ├── repository/
│   │   │   │   ├── CustomerRepository.java
│   │   │   │   └── DealRepository.java
│   │   │   ├── model/
│   │   │   │   ├── Customer.java
│   │   │   │   ├── Deal.java
│   │   │   │   └── Activity.java
│   │   │   └── config/
│   │   │       └── SecurityConfig.java
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── applicationContext.xml
│   │       └── templates/
│   └── test/
└── ISSUES.md
```

## 監査の実施

このアプリケーションを監査するには、プロジェクトルートの `/tools` ディレクトリにあるツール群を使用してください。

詳細な手順は `/demo/ANALYSIS_GUIDE.md` を参照してください。

## 期待される検出結果

- **セキュリティ問題**: 10-12件（Critical 5件、High 7件）
- **コード品質問題**: 10-14件（High 4件、Medium 10件）
- **パフォーマンス問題**: 6-8件（High 4件、Medium 4件）
- **依存関係問題**: 5-7件（Critical 2件、High 5件）

## ライセンス

MIT License（デモ用途のみ）

**警告**: このアプリは本番環境で使用しないでください。教育・デモ目的専用です。
