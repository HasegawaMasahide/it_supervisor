# {{projectName}} 診断レポート

**顧客名**: {{customerName}}
**診断日**: {{date}}
**診断者**: {{author}}
**バージョン**: {{version}}

---

## エグゼクティブサマリー

### 診断結果概要

{{projectName}}の診断を実施した結果、以下の状況が判明しました。

| 項目 | 評価 | コメント |
|------|------|---------|
| 全体的な健全性 | {{overallHealth}} | {{overallHealthComment}} |
| セキュリティリスク | {{securityRisk}} | {{securityRiskComment}} |
| 運用リスク | {{operationalRisk}} | {{operationalRiskComment}} |
| 改善の緊急度 | {{urgency}} | {{urgencyComment}} |

### 主要な発見事項（トップ5）

{{topFindings}}

### 推定改善効果

- **年間運用コスト削減**: 約{{estimatedSavings.annual}}万円
- **障害発生リスク低減**: {{estimatedSavings.riskReduction}}%
- **開発効率向上**: {{estimatedSavings.productivityGain}}%

---

## 詳細診断結果

### 1. セキュリティ

#### 1.1 重大な脆弱性

{{securityCriticalIssues}}

#### 1.2 認証・認可

| チェック項目 | 結果 | 詳細 |
|--------------|------|------|
{{authenticationChecks}}

#### 1.3 データ保護

| チェック項目 | 結果 | 詳細 |
|--------------|------|------|
{{dataProtectionChecks}}

### 2. パフォーマンス

#### 2.1 ボトルネック

{{performanceBottlenecks}}

#### 2.2 リソース使用効率

| 指標 | 現状 | 推奨値 | ギャップ |
|------|------|--------|---------|
{{resourceEfficiency}}

### 3. コード品質

#### 3.1 複雑度分析

| ファイル | 循環的複雑度 | 判定 |
|---------|--------------|------|
{{complexityAnalysis}}

#### 3.2 重複コード

検出された重複: {{duplicateCodeCount}}箇所

{{duplicateCodeDetails}}

#### 3.3 テストカバレッジ

| カテゴリ | カバレッジ | 目標 | 達成率 |
|---------|-----------|------|--------|
{{testCoverage}}

### 4. アーキテクチャ

#### 4.1 設計上の問題

{{architecturalIssues}}

#### 4.2 依存関係

- 直接依存: {{dependencies.direct}}個
- 間接依存: {{dependencies.transitive}}個
- 古いライブラリ: {{dependencies.outdated}}個
- 脆弱性のある依存: {{dependencies.vulnerable}}個

### 5. 運用性

#### 5.1 ログ・監視

| 項目 | 状態 | 推奨事項 |
|------|------|---------|
{{loggingMonitoring}}

#### 5.2 デプロイメント

| 項目 | 状態 | 推奨事項 |
|------|------|---------|
{{deploymentStatus}}

---

## リスクマトリクス

### 影響度×発生確率

```
          影響度
          高    中    低
発生  高  [C1]  [H1]  [M1]
確率  中  [H2]  [M2]  [L1]
      低  [M3]  [L2]  [L3]
```

### リスク一覧

| ID | リスク内容 | 影響度 | 発生確率 | 対策優先度 |
|----|-----------|--------|---------|-----------|
{{riskMatrix}}

---

## 改善優先順位

### 即座に対応が必要（1-2週間以内）

{{priority1Actions}}

### 短期対応（1ヶ月以内）

{{priority2Actions}}

### 中期対応（3ヶ月以内）

{{priority3Actions}}

---

## 改善提案の概要

### 推奨プラン

| プラン | 内容 | 概算費用 | 期間 |
|--------|------|---------|------|
| ミニマム | Critical問題の修正のみ | {{plans.minimum.cost}}万円 | {{plans.minimum.duration}} |
| スタンダード | Critical+High問題の修正 | {{plans.standard.cost}}万円 | {{plans.standard.duration}} |
| フル | 全問題の修正+リファクタリング | {{plans.full.cost}}万円 | {{plans.full.duration}} |

### ROI試算

| プラン | 投資額 | 年間効果 | 回収期間 |
|--------|--------|---------|---------|
{{roiEstimation}}

---

## 次のステップ

1. **改善提案書の作成**
   - 詳細な改善計画の策定
   - 工数・費用見積もり
   - スケジュール作成

2. **優先対応項目の実施**
   - Critical問題の即時対応
   - セキュリティパッチの適用

3. **定期診断の実施**
   - 3ヶ月後のフォローアップ診断推奨

---

## 付録

### A. 診断手法

本診断では以下の手法を使用しました：

1. **静的解析**: ESLint、PHPStan、Snyk等による自動解析
2. **手動レビュー**: シニアエンジニアによるコードレビュー
3. **アーキテクチャ分析**: 依存関係・構造の分析
4. **セキュリティ診断**: OWASP Top 10に基づく診断

### B. 診断対象範囲

{{diagnosisScope}}

### C. 制限事項

- 本診断はソースコードの静的解析に基づくものです
- 実行時の動作・パフォーマンスは含まれていません
- 外部サービス連携部分は対象外です

---

## 免責事項

本レポートは{{date}}時点の診断結果に基づいています。
改善効果の数値は推定値であり、実際の効果を保証するものではありません。

---

*このレポートは IT Supervisor により自動生成されました*
*診断者による最終確認済み*
*生成日時: {{generatedAt}}*
