# IT資産監査レポート

**プロジェクト名**: Laravel TODO App (Demo)
**プロジェクトID**: proj-mizj0848
**実施日**: 2025/12/10

## エグゼクティブサマリー

### 総合評価

| 項目 | 評価 |
|------|------|
| **セキュリティ** | 🔴 要対応 |
| **コード品質** | 🟡 改善推奨 |
| **パフォーマンス** | 🟡 改善推奨 |
| **総合スコア** | **C評価（60/100）** |

### 重要な発見事項

- **Critical問題**: 5件 - 即時対応が必要
- **High問題**: 5件 - 1週間以内に対応推奨
- **総問題数**: 17件

## リポジトリ概要

| 項目 | 値 |
|------|-----|
| 総ファイル数 | 11 |
| 総行数 | 1580 |
| コード行数 | 1106 |
| コメント行数 | 237 |

### プログラミング言語

- **PHP**: 10 files, 1500 lines (85.5%)
- **JavaScript**: 0 files, 0 lines (9.2%)
- **HTML/Blade**: 1 files, 80 lines (5.3%)

### フレームワーク

- **Laravel** 8.75

## セキュリティ診断結果

### 問題の概要

| 重要度 | 件数 |
|--------|------|
| Critical | 5 |
| High | 5 |
| Medium | 5 |
| Low | 2 |

### Critical問題の詳細


#### 1. SQL injection vulnerability detected

- **ファイル**: `app/Http/Controllers/AuthController.php:25`
- **ツール**: PHP_CodeSniffer
- **ルール**: Security.BadFunctions.SQLInjection
- **詳細**: User input is directly embedded in SQL query without sanitization


#### 2. SQL injection in login function

- **ファイル**: `app/Http/Controllers/AuthController.php:42`
- **ツール**: PHP_CodeSniffer
- **ルール**: Security.BadFunctions.SQLInjection
- **詳細**: Email and password parameters are not escaped


#### 3. SQL injection in todo creation

- **ファイル**: `app/Http/Controllers/TodoController.php:85`
- **ツール**: PHP_CodeSniffer
- **ルール**: Security.BadFunctions.SQLInjection
- **詳細**: Title and description are not sanitized


#### 4. Hardcoded database password detected

- **ファイル**: `config/database.php:64`
- **ツール**: Gitleaks
- **ルール**: hardcoded-password
- **詳細**: Production database credentials are hardcoded in source code


#### 5. API key exposed in environment file

- **ファイル**: `.env.example:44`
- **ツール**: Gitleaks
- **ルール**: api-key
- **詳細**: EXTERNAL_API_KEY is hardcoded


## 推奨事項

### 即時対応が必要な項目（Critical）

1. **SQLインジェクション脆弱性の修正** (3件)
   - 推定工数: 8時間
   - 優先度: 最高

2. **機密情報のハードコーディング除去** (2件)
   - 推定工数: 4時間
   - 優先度: 最高

### 1週間以内に対応すべき項目（High）

3. **XSS脆弱性の修正** (2件)
   - 推定工数: 6時間
   - 優先度: 高

4. **認証・認可の実装** (2件)
   - 推定工数: 8時間
   - 優先度: 高

5. **N+1クエリ問題の解消** (1件)
   - 推定工数: 4時間
   - 優先度: 高

## 見積もり

### 工数と費用

| フェーズ | 工数 | 費用 |
|----------|------|------|
| フェーズ1（緊急） | 22h | 30万円 |
| フェーズ2（重要） | 30h | 40万円 |
| フェーズ3（中長期） | 56h | 70万円 |
| **合計** | **108h** | **140万円** |

### ROI試算

- **投資額**: 140万円
- **削減効果**: 年間310万円
- **投資回収期間**: 約5ヶ月
- **3年間ROI**: 563%

---

*このレポートは IT Supervisor ツール群により自動生成されました*
