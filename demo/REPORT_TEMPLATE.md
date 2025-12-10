# IT資産監査レポート

**プロジェクト名**: {{projectName}}
**顧客名**: {{customerName}}
**実施日**: {{date}}
**担当者**: {{author}}

---

## エグゼクティブサマリー

### 総合評価

| 項目 | 評価 | 詳細 |
|------|------|------|
| **セキュリティ** | 🔴 要対応 | Critical問題 {{criticalCount}} 件検出 |
| **コード品質** | 🟡 改善推奨 | 循環的複雑度の高い関数が複数存在 |
| **パフォーマンス** | 🟡 改善推奨 | N+1クエリ問題が検出 |
| **保守性** | 🟡 改善推奨 | ドキュメント不足、技術的負債あり |
| **総合スコア** | **C評価（60/100）** | 早急な改善が必要 |

### 重要な発見事項

1. **Critical セキュリティ脆弱性（即時対応必要）**
   - SQLインジェクション脆弱性: {{sqlInjectionCount}} 件
   - 機密情報のハードコーディング: {{secretsCount}} 件
   - 不適切な認証実装: {{authIssuesCount}} 件

2. **技術的負債**
   - 古いフレームワークバージョン（Laravel 8.x、EOLサポート）
   - 依存パッケージの脆弱性: {{dependencyVulnerabilities}} 件

3. **パフォーマンス問題**
   - N+1クエリ問題により、レスポンス時間が最大10倍遅延
   - インデックス欠如によるクエリパフォーマンス低下

### 推定リスク

**セキュリティインシデント発生時の想定損害**:
- 個人情報漏洩: 500万円〜2,000万円
- システムダウンタイム: 50万円/日
- ブランドイメージ毀損: 測定困難だが甚大

**現状維持した場合の年間追加コスト**:
- セキュリティリスク対応: 200万円
- パフォーマンス問題による機会損失: 100万円
- 技術的負債の利息: 80万円
- **合計**: 約380万円/年

---

## 1. リポジトリ概要

### 1.1 プロジェクト基本情報

| 項目 | 値 |
|------|-----|
| リポジトリパス | {{repositoryPath}} |
| 総ファイル数 | {{totalFiles}} |
| 総行数 | {{totalLines}} |
| コメント行数 | {{commentLines}} ({{commentRatio}}%) |
| 空行数 | {{blankLines}} |
| 実コード行数 | {{codeLines}} |

### 1.2 技術スタック

#### プログラミング言語

| 言語 | ファイル数 | 行数 | 割合 |
|------|-----------|------|------|
{{#each languages}}
| {{name}} | {{files}} | {{lines}} | {{percentage}}% |
{{/each}}

#### フレームワーク・ライブラリ

{{#each frameworks}}
- **{{name}}** {{version}}
  {{#if eolStatus}}
  - ⚠️ **サポート終了**: {{eolDate}}
  {{/if}}
{{/each}}

#### データベース

{{#each databases}}
- {{name}} {{version}}
{{/each}}

### 1.3 コードメトリクス

```
総行数: {{totalLines}}
├─ コード: {{codeLines}} ({{codeRatio}}%)
├─ コメント: {{commentLines}} ({{commentRatio}}%)
└─ 空行: {{blankLines}} ({{blankRatio}}%)
```

---

## 2. セキュリティ診断結果

### 2.1 問題の概要

**総問題数**: {{totalIssues}}

| 重要度 | 件数 | 割合 |
|--------|------|------|
| Critical | {{criticalCount}} | {{criticalPercentage}}% |
| High | {{highCount}} | {{highPercentage}}% |
| Medium | {{mediumCount}} | {{mediumPercentage}}% |
| Low | {{lowCount}} | {{lowPercentage}}% |

### 2.2 カテゴリ別分類

| カテゴリ | 件数 | 主な問題 |
|----------|------|----------|
| セキュリティ | {{securityCount}} | SQLインジェクション、XSS、認証不備 |
| コード品質 | {{codeQualityCount}} | 高い複雑度、重複コード |
| パフォーマンス | {{performanceCount}} | N+1クエリ、インデックス欠如 |
| 依存関係 | {{dependencyCount}} | 古いパッケージ、既知の脆弱性 |

### 2.3 Critical 問題の詳細

{{#each criticalIssues}}
#### {{@index}}. {{title}}

**重要度**: 🔴 Critical
**CVSS Score**: {{cvssScore}}
**カテゴリ**: {{category}}

**場所**:
```
ファイル: {{file}}
行: {{line}}{{#if column}}:{{column}}{{/if}}
```

**問題の詳細**:
{{description}}

**影響**:
{{impact}}

**現在のコード**:
```{{language}}
{{currentCode}}
```

**推奨される修正**:
```{{language}}
{{recommendedFix}}
```

**参考資料**:
{{#each references}}
- [{{title}}]({{url}})
{{/each}}

---
{{/each}}

### 2.4 High 問題の詳細

{{#each highIssues}}
#### {{@index}}. {{title}}

**重要度**: 🟠 High
**CVSS Score**: {{cvssScore}}
**カテゴリ**: {{category}}

**場所**: `{{file}}:{{line}}`

**問題の詳細**: {{description}}

**推奨対策**: {{recommendation}}

---
{{/each}}

---

## 3. コード品質分析

### 3.1 循環的複雑度

**基準値**: 10以下が望ましい、15以上は要改善

| ファイル | 関数 | 複雑度 | 評価 |
|----------|------|--------|------|
{{#each complexityIssues}}
| {{file}} | {{function}} | {{complexity}} | {{#if (gt complexity 15)}}🔴 要改善{{else if (gt complexity 10)}}🟡 注意{{else}}🟢 OK{{/if}} |
{{/each}}

### 3.2 重複コード

**検出された重複ブロック**: {{duplicateBlocksCount}}
**重複行数**: {{duplicateLinesCount}} (総コード行数の {{duplicateRatio}}%)

主な重複箇所:
{{#each duplicateBlocks}}
- `{{file1}}:{{line1}}` と `{{file2}}:{{line2}}` ({{lines}} 行)
{{/each}}

### 3.3 長すぎる関数

**基準値**: 50行以下が望ましい、100行以上は要改善

{{#each longFunctions}}
- `{{file}}:{{line}}` - {{functionName}}() ({{lines}} 行)
{{/each}}

### 3.4 コーディング標準違反

{{#each codingStandardViolations}}
- **{{rule}}**: {{count}} 件
  - 例: `{{exampleFile}}:{{exampleLine}}`
{{/each}}

---

## 4. パフォーマンス分析

### 4.1 データベースクエリ

#### N+1クエリ問題

**検出箇所**: {{n1QueriesCount}} 件

{{#each n1Queries}}
##### {{@index}}. {{location}}

**問題のコード**:
```php
{{code}}
```

**推定影響**:
- 1,000件のデータで **1,001回のクエリ** 実行
- レスポンス時間: 通常の **10-100倍**

**推奨修正**:
```php
{{recommendation}}
```
{{/each}}

#### インデックス欠如

以下のテーブルでインデックスの追加を推奨:

{{#each missingIndexes}}
- **{{table}}**
  - カラム: {{columns}}
  - 理由: {{reason}}
  - 推定改善効果: クエリ速度 {{improvement}}倍
{{/each}}

### 4.2 不要なデータ取得

{{#each unnecessaryDataFetching}}
- `{{file}}:{{line}}` - `SELECT *` の使用
  - 使用カラム: {{usedColumns}}
  - 取得カラム: {{fetchedColumns}}
  - 無駄なデータ転送: {{wastedBytes}}
{{/each}}

---

## 5. 依存関係の分析

### 5.1 パッケージ一覧

| パッケージ | 現在 | 最新 | 状態 |
|-----------|------|------|------|
{{#each packages}}
| {{name}} | {{currentVersion}} | {{latestVersion}} | {{#if isOutdated}}🟡 更新推奨{{else if hasVulnerability}}🔴 脆弱性あり{{else}}🟢 最新{{/if}} |
{{/each}}

### 5.2 セキュリティ脆弱性

{{#each vulnerabilities}}
#### {{@index}}. {{packageName}} ({{severity}})

**脆弱性ID**: {{cveId}}
**CVSS Score**: {{cvssScore}}
**影響**: {{impact}}

**修正方法**: `{{packageName}}` を {{fixedVersion}} 以上にアップデート

```bash
{{#if isComposer}}
composer update {{packageName}}
{{else}}
npm update {{packageName}}
{{/if}}
```
{{/each}}

### 5.3 ライセンス問題

{{#if licenseIssues}}
以下のパッケージでライセンス確認が必要:

{{#each licenseIssues}}
- **{{package}}**: {{license}} ({{concern}})
{{/each}}
{{else}}
ライセンス上の問題は検出されませんでした。
{{/if}}

---

## 6. 改善提案

### 6.1 優先順位付きアクションプラン

#### フェーズ1: 緊急対応（即時〜1週間）

**目的**: Critical問題の修正

| No | タスク | 工数 | 担当 |
|----|--------|------|------|
| 1 | SQLインジェクション脆弱性の修正 | 8h | シニアエンジニア |
| 2 | 機密情報のハードコーディング除去 | 4h | エンジニア |
| 3 | パスワードハッシュ化の改善 | 4h | エンジニア |
| 4 | 認証・認可の修正 | 6h | シニアエンジニア |

**合計工数**: 22時間
**推定費用**: 30万円

#### フェーズ2: 重要な改善（2〜4週間）

**目的**: High問題の修正とコード品質改善

| No | タスク | 工数 | 担当 |
|----|--------|------|------|
| 5 | XSS脆弱性の修正 | 6h | エンジニア |
| 6 | N+1クエリ問題の解消 | 8h | エンジニア |
| 7 | インデックスの追加 | 4h | エンジニア |
| 8 | 循環的複雑度の改善 | 12h | エンジニア |

**合計工数**: 30時間
**推定費用**: 40万円

#### フェーズ3: 中長期改善（1〜2ヶ月）

**目的**: Medium問題の修正と技術的負債の解消

| No | タスク | 工数 | 担当 |
|----|--------|------|------|
| 9 | 依存パッケージの更新 | 12h | エンジニア |
| 10 | 重複コードのリファクタリング | 16h | エンジニア |
| 11 | テストカバレッジの向上 | 20h | エンジニア |
| 12 | ドキュメントの整備 | 8h | エンジニア |

**合計工数**: 56時間
**推定費用**: 70万円

### 6.2 総工数と費用

| フェーズ | 工数 | 費用 | 期間 |
|----------|------|------|------|
| フェーズ1（緊急） | 22h | 30万円 | 1週間 |
| フェーズ2（重要） | 30h | 40万円 | 3週間 |
| フェーズ3（中長期） | 56h | 70万円 | 8週間 |
| **合計** | **108h** | **140万円** | **12週間** |

**適用プラン**: スタンダードプラン（100-150万円）

### 6.3 ROI試算

**投資額**: 140万円

**削減できるコスト**:
- セキュリティインシデントリスク: 500万円（発生確率30%）= 150万円/年
- パフォーマンス改善による機会損失削減: 100万円/年
- 保守工数削減（月10時間 × 12ヶ月 × 5,000円）: 60万円/年

**合計削減効果**: 約310万円/年

**投資回収期間**: 約5ヶ月
**3年間のROI**: (310万円 × 3年 - 140万円) / 140万円 = **563%**

---

## 7. Before/After比較

### 7.1 改善前（現状）

| 指標 | 値 |
|------|-----|
| Critical問題 | {{beforeCritical}} |
| High問題 | {{beforeHigh}} |
| 総問題数 | {{beforeTotal}} |
| セキュリティスコア | {{beforeSecurityScore}}/100 |
| コード品質スコア | {{beforeQualityScore}}/100 |
| パフォーマンススコア | {{beforePerformanceScore}}/100 |
| **総合スコア** | **{{beforeOverallScore}}/100** |

### 7.2 改善後（推定）

| 指標 | 値 | 改善率 |
|------|-----|--------|
| Critical問題 | 0 | ✅ -100% |
| High問題 | 0 | ✅ -100% |
| 総問題数 | {{afterTotal}} | 🟢 -{{improvementPercentage}}% |
| セキュリティスコア | 95/100 | 🟢 +{{securityImprovement}} |
| コード品質スコア | 85/100 | 🟢 +{{qualityImprovement}} |
| パフォーマンススコア | 90/100 | 🟢 +{{performanceImprovement}} |
| **総合スコア** | **90/100** | **🟢 +{{overallImprovement}}** |

---

## 8. 次のステップ

### 8.1 推奨スケジュール

```
Week 1-2:  フェーズ1（緊急対応）
  └─ Critical問題の修正
  └─ セキュリティパッチのリリース

Week 3-6:  フェーズ2（重要な改善）
  └─ High問題の修正
  └─ パフォーマンス最適化

Week 7-12: フェーズ3（中長期改善）
  └─ Medium問題の修正
  └─ テストとドキュメント整備

Week 13:   効果測定と報告
  └─ Before/After比較
  └─ 最終レポート作成
```

### 8.2 契約条件

**サービスプラン**: スタンダード
**料金**: 140万円（税別）
**期間**: 12週間
**瑕疵担保**: 実装完了後3ヶ月間

**含まれるサービス**:
- ✅ 診断レポート（本レポート）
- ✅ コード修正・実装
- ✅ テスト（単体・結合）
- ✅ 効果測定レポート
- ✅ ドキュメント整備
- ✅ 3ヶ月間の瑕疵担保

**追加オプション**（別料金）:
- 継続的監視（月5万円）
- 保守サポート（月10万円）
- 追加機能開発（都度見積）

### 8.3 お問い合わせ

本レポートについてご不明な点がございましたら、以下までご連絡ください。

**IT Supervisor チーム**
Email: contact@it-supervisor.example.com
電話: 03-1234-5678
営業時間: 平日 10:00-18:00

---

## 付録

### A. 使用ツール一覧

| ツール | バージョン | 用途 |
|--------|-----------|------|
| repo-analyzer | 1.0.0 | リポジトリ解析 |
| static-analyzer | 1.0.0 | 静的解析オーケストレーター |
| PHP_CodeSniffer | 3.7.x | PHPコード解析 |
| Snyk | latest | 脆弱性スキャン |
| Gitleaks | 8.18.x | シークレット検出 |

### B. 用語集

- **CVSS Score**: 共通脆弱性評価システム。0-10のスケールで脆弱性の深刻度を評価
- **SQLインジェクション**: データベースクエリに悪意のあるコードを注入する攻撃
- **XSS**: クロスサイトスクリプティング。Webページに悪意のあるスクリプトを注入する攻撃
- **N+1クエリ**: 1つのクエリで取得できるデータをN+1回のクエリで取得してしまう問題
- **循環的複雑度**: コードの複雑さを表す指標。高いほど理解・テストが困難

### C. 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Laravel Security Best Practices](https://laravel.com/docs/security)

---

**レポート作成日**: {{generatedDate}}
**レポートバージョン**: 1.0
**次回レビュー推奨日**: {{nextReviewDate}}
