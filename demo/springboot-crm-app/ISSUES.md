# このアプリケーションに含まれる問題一覧

監査ツールで検出されるべき問題のリストです。

## 🔴 Critical セキュリティ問題

### 1. SQLインジェクション脆弱性
**場所:**
- [src/main/java/com/example/crm/repository/CustomerRepository.java:45-52](src/main/java/com/example/crm/repository/CustomerRepository.java#L45-L52)
- [src/main/java/com/example/crm/service/CustomerService.java:78](src/main/java/com/example/crm/service/CustomerService.java#L78)

**詳細:**
Native Queryで文字列連結によりSQLを組み立てており、SQLインジェクション攻撃に脆弱です。

```java
// 脆弱なコード例
@Query(value = "SELECT * FROM customers WHERE name LIKE '%" + name + "%'", nativeQuery = true)
List<Customer> searchByName(String name);
```

**影響度:** Critical
**CVSS Score:** 9.8

### 2. 機密情報のハードコーディング
**場所:**
- [src/main/resources/application.properties:8-12](src/main/resources/application.properties#L8-L12)
- [src/main/java/com/example/crm/service/EmailService.java:25](src/main/java/com/example/crm/service/EmailService.java#L25)

**詳細:**
データベースパスワード、APIキー、メールサーバー認証情報がソースコードにハードコーディングされています。

**影響度:** Critical
**CVSS Score:** 9.1

### 3. 不適切な認証実装
**場所:**
- [src/main/java/com/example/crm/config/SecurityConfig.java:28-45](src/main/java/com/example/crm/config/SecurityConfig.java#L28-L45)

**詳細:**
- Basic認証のみで、セッション管理がない
- パスワードが平文で保存されている
- ブルートフォース対策がない

**影響度:** Critical
**CVSS Score:** 8.8

### 4. XSS脆弱性
**場所:**
- [src/main/resources/templates/customer/detail.html:35](src/main/resources/templates/customer/detail.html#L35)
- [src/main/resources/templates/deal/list.html:48](src/main/resources/templates/deal/list.html#L48)

**詳細:**
Thymeleafで`th:utext`を使用しており、HTMLエスケープされないため、XSS攻撃に脆弱です。

**影響度:** High
**CVSS Score:** 7.5

### 5. ログに機密情報出力
**場所:**
- [src/main/java/com/example/crm/controller/CustomerController.java:67](src/main/java/com/example/crm/controller/CustomerController.java#L67)
- [src/main/java/com/example/crm/service/AuthService.java:45](src/main/java/com/example/crm/service/AuthService.java#L45)

**詳細:**
パスワード、クレジットカード情報、個人情報がログに出力されています。

**影響度:** High
**CVSS Score:** 7.2

### 6. CSRF対策の不備
**場所:**
- [src/main/java/com/example/crm/config/SecurityConfig.java:52](src/main/java/com/example/crm/config/SecurityConfig.java#L52)

**詳細:**
`csrf().disable()`でCSRF対策が無効化されています。

**影響度:** High
**CVSS Score:** 6.8

### 7. 過度な権限付与
**場所:**
- [src/main/java/com/example/crm/config/SecurityConfig.java:35-40](src/main/java/com/example/crm/config/SecurityConfig.java#L35-L40)

**詳細:**
全ユーザーに管理者権限が付与されており、最小権限の原則に違反しています。

**影響度:** High
**CVSS Score:** 7.5

## 🟡 パフォーマンス問題

### 8. N+1クエリ問題
**場所:**
- [src/main/java/com/example/crm/service/CustomerService.java:95-105](src/main/java/com/example/crm/service/CustomerService.java#L95-L105)
- [src/main/java/com/example/crm/repository/DealRepository.java:28](src/main/java/com/example/crm/repository/DealRepository.java#L28)

**詳細:**
顧客一覧取得時に、各顧客の商談を個別にクエリしており、N+1問題が発生しています。

**影響度:** High
**推定影響:** 100件の顧客で101回のクエリが発行される

### 9. LazyInitializationException
**場所:**
- [src/main/java/com/example/crm/model/Customer.java:45](src/main/java/com/example/crm/model/Customer.java#L45)
- [src/main/java/com/example/crm/controller/CustomerController.java:82](src/main/java/com/example/crm/controller/CustomerController.java#L82)

**詳細:**
`FetchType.LAZY`の関連エンティティをトランザクション外でアクセスしようとしてエラーが発生します。

**影響度:** High
**推定影響:** 特定の画面でエラーが発生

### 10. トランザクション境界の不適切な設定
**場所:**
- [src/main/java/com/example/crm/service/DealService.java:45-78](src/main/java/com/example/crm/service/DealService.java#L45-L78)

**詳細:**
長時間トランザクションでDBコネクションを占有しています。また、読み取り専用トランザクションの指定がありません。

**影響度:** Medium
**推定影響:** 高負荷時にコネクション枯渇

### 11. キャッシュ未使用
**場所:**
- [src/main/java/com/example/crm/service/MasterDataService.java](src/main/java/com/example/crm/service/MasterDataService.java)

**詳細:**
マスターデータ（業種、地域、ステータス等）を毎回DBから取得しています。

**影響度:** Medium
**推定影響:** 不要なDB負荷

### 12. コネクションプールの設定不備
**場所:**
- [src/main/resources/application.properties:15-18](src/main/resources/application.properties#L15-L18)

**詳細:**
コネクションプールのサイズが小さく、タイムアウト設定も不適切です。

**影響度:** High
**推定影響:** 高負荷時にコネクション待ちでタイムアウト

## 🔵 コード品質問題

### 13. God Class（巨大なServiceクラス）
**場所:**
- [src/main/java/com/example/crm/service/CustomerService.java](src/main/java/com/example/crm/service/CustomerService.java) - 1200行
- [src/main/java/com/example/crm/service/DealService.java](src/main/java/com/example/crm/service/DealService.java) - 950行

**詳細:**
1つのServiceクラスが複数の責務を持ち、肥大化しています。

**影響度:** High
**技術的負債:** テストとメンテナンスが非常に困難

### 14. XML設定ファイルの肥大化
**場所:**
- [src/main/resources/applicationContext.xml](src/main/resources/applicationContext.xml) - 500行

**詳細:**
Javaベースの設定（@Configuration）ではなく、XMLベースの設定が肥大化しています。

**影響度:** Medium
**技術的負債:** 設定の追跡と変更が困難

### 15. レイヤー間の責務混在
**場所:**
- [src/main/java/com/example/crm/controller/CustomerController.java:125-180](src/main/java/com/example/crm/controller/CustomerController.java#L125-L180)

**詳細:**
ControllerでビジネスロジックやDB操作を直接行っており、Service層を適切に使用していません。

**影響度:** High
**技術的負債:** テスト困難、コード重複

### 16. 例外処理の不備
**場所:**
- [src/main/java/com/example/crm/service/](src/main/java/com/example/crm/service/) - 全般

**詳細:**
- `catch (Exception e)` でキャッチオール
- 例外を握りつぶし（空のcatchブロック）
- 適切なロギングなし

**影響度:** Medium
**技術的負債:** 問題の特定とデバッグが困難

### 17. テストカバレッジ不足
**場所:**
- [src/test/](src/test/) - 全般

**詳細:**
ユニットテストが20%程度しかなく、重要なビジネスロジックがテストされていません。

**影響度:** Medium
**技術的負債:** リグレッションリスク

### 18. 重複コード
**場所:**
- [src/main/java/com/example/crm/service/CustomerService.java:200-250](src/main/java/com/example/crm/service/CustomerService.java#L200-L250)
- [src/main/java/com/example/crm/service/DealService.java:180-230](src/main/java/com/example/crm/service/DealService.java#L180-L230)

**詳細:**
バリデーションロジックや変換ロジックが複数箇所に重複しています。

**影響度:** Medium
**技術的負債:** 変更時に複数箇所の修正が必要

### 19. マジックナンバー・マジックストリング
**場所:**
- [src/main/java/com/example/crm/service/DealService.java:95, 112, 145](src/main/java/com/example/crm/service/DealService.java#L95)

**詳細:**
定数として定義すべき値（ステータスコード、閾値等）がハードコードされています。

**影響度:** Low
**技術的負債:** 可読性と保守性の低下

## 📦 依存関係問題

### 20. 古いSpring Framework 4.x
**場所:**
- [pom.xml:25](pom.xml#L25)

**詳細:**
Spring Framework 4.3.xはEOL（2020年末）済みで、セキュリティアップデートがありません。

**影響度:** Critical
**推奨:** Spring 5.x / Spring Boot 2.x以上へのアップグレード

### 21. 古いJava 8
**場所:**
- [pom.xml:12](pom.xml#L12)

**詳細:**
Java 8は無料の長期サポートが終了しており、新機能（Records、Pattern Matching等）も使用できません。

**影響度:** High
**推奨:** Java 17以上へのアップグレード

### 22. 脆弱性のあるJackson
**場所:**
- [pom.xml:45](pom.xml#L45)

**詳細:**
jackson-databind 2.9.xには複数の重大な脆弱性（CVE-2019-14540等）があります。

**影響度:** Critical
**推奨:** jackson-databind 2.15以上へのアップグレード

### 23. 脆弱性のあるLog4j
**場所:**
- [pom.xml:52](pom.xml#L52)

**詳細:**
Log4j 1.xまたは古い2.xにはLog4Shell脆弱性（CVE-2021-44228）があります。

**影響度:** Critical
**推奨:** Log4j 2.17以上へのアップグレード、またはLogback移行

### 24. 非推奨のAPI使用
**場所:**
- [src/main/java/com/example/crm/](src/main/java/com/example/crm/) - 複数箇所

**詳細:**
`@Deprecated`マークされたAPIを使用しています（Date型、StringUtils等）。

**影響度:** Low
**推奨:** 新しいAPIへの移行

## 📊 問題のサマリー

| 深刻度 | 件数 | カテゴリ |
|--------|------|----------|
| Critical | 6件 | セキュリティ、依存関係 |
| High | 12件 | すべて |
| Medium | 8件 | パフォーマンス、コード品質 |
| Low | 2件 | コード品質、依存関係 |

**合計:** 28件の問題

## 推定改善工数

- セキュリティ問題の修正: 24-32時間
- パフォーマンス問題の修正: 16-24時間
- コード品質の改善: 20-32時間
- 依存関係の更新とテスト: 24-40時間

**合計推定工数:** 84-128時間（10.5-16営業日）
