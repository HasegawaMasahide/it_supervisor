# {{projectName}} 分析レポート

**顧客名**: {{customerName}}
**作成日**: {{date}}
{{#if author}}**作成者**: {{author}}{{/if}}
{{#if version}}**バージョン**: {{version}}{{/if}}

---

## エグゼクティブサマリー

本レポートは、{{projectName}}の技術的な分析結果をまとめたものです。
静的解析ツールおよびリポジトリ解析ツールを使用し、コード品質、セキュリティ、技術的負債の観点から評価を行いました。

### 総合評価

| 評価項目 | スコア | 判定 |
|---------|--------|------|
{{#if scores}}| コード品質 | {{scores.codeQuality}}/100 | {{scoreLabel scores.codeQuality}} |
| セキュリティ | {{scores.security}}/100 | {{scoreLabel scores.security}} |
| 保守性 | {{scores.maintainability}}/100 | {{scoreLabel scores.maintainability}} |
| 技術的負債 | {{scores.technicalDebt}}/100 | {{scoreLabel scores.technicalDebt}} |{{else}}| コード品質 | -/100 | 未評価 |
| セキュリティ | -/100 | 未評価 |
| 保守性 | -/100 | 未評価 |
| 技術的負債 | -/100 | 未評価 |{{/if}}

### 重要な発見事項

{{#if summary}}- **Critical問題**: {{summary.criticalIssues}}件
- **High問題**: {{summary.highIssues}}件
- **Medium問題**: {{summary.mediumIssues}}件
- **Low問題**: {{summary.lowIssues}}件
- **合計**: {{summary.totalIssues}}件{{else}}- 問題の検出結果はありません。{{/if}}

---

## リポジトリ分析

{{#if repository}}| 項目 | 内容 |
|------|------|
| リポジトリ名 | {{repository.name}} |
| Gitリポジトリ | {{#if repository.hasGit}}はい{{else}}いいえ{{/if}} |
| CI/CD | {{#if repository.hasCI}}設定済み{{else}}未設定{{/if}} |
| Dockerfile | {{#if repository.hasDockerfile}}あり{{else}}なし{{/if}} |{{/if}}

### 技術スタック

{{#if languages}}| 言語 | 割合 | 行数 |
|------|------|------|
{{#each languages}}| {{name}} | {{percentage}}% | {{formatNumber lines}} |
{{/each}}{{else}}言語情報が取得できませんでした。{{/if}}

### フレームワーク

{{#if frameworks}}| フレームワーク | バージョン | 検出信頼度 |
|--------------|----------|-----------|
{{#each frameworks}}| {{name}} | {{version}} | {{confidence}} |
{{/each}}{{else}}フレームワークは検出されませんでした。{{/if}}

### コード統計

{{#if summary}}| 指標 | 値 |
|------|-----|
| 総ファイル数 | {{formatNumber summary.totalFiles}} |
| 総行数 | {{formatNumber summary.totalLines}} |
| コード行数 | {{formatNumber summary.totalCodeLines}} |{{/if}}

---

## 静的解析結果

### 問題の分布

#### 重要度別

{{#if summary}}| 重要度 | 件数 | 割合 |
|--------|------|------|
| Critical | {{summary.criticalIssues}} | {{calcPercent summary.criticalIssues summary.totalIssues}}% |
| High | {{summary.highIssues}} | {{calcPercent summary.highIssues summary.totalIssues}}% |
| Medium | {{summary.mediumIssues}} | {{calcPercent summary.mediumIssues summary.totalIssues}}% |
| Low | {{summary.lowIssues}} | {{calcPercent summary.lowIssues summary.totalIssues}}% |{{else}}静的解析結果がありません。{{/if}}

{{#if categoryCounts}}#### カテゴリ別

| カテゴリ | 件数 |
|---------|------|
{{#each categoryCounts}}| {{name}} | {{count}} |
{{/each}}{{/if}}

{{#if securityIssues}}### Critical/High問題の詳細

| 重要度 | カテゴリ | 問題 | ファイル | 推奨対応 |
|--------|---------|------|---------|---------|
{{#each securityIssues}}| {{severityBadge severity}} | {{category}} | {{title}} | {{file}} | {{recommendation}} |
{{/each}}{{/if}}

---

## 品質メトリクス

{{#if qualityMetrics}}| 指標 | 値 | 単位 | 状態 |
|------|-----|------|------|
{{#each qualityMetrics}}| {{name}} | {{formatNumber value}} | {{unit}} | {{status}} |
{{/each}}{{/if}}

---

## 推奨事項

{{#if recommendations}}{{#each recommendations}}### {{priority}}: {{title}}

{{description}}

- **想定工数**: {{effort}}
- **期待効果**: {{impact}}

{{/each}}{{else}}改善提案はありません。{{/if}}

---

## 次のステップ

{{#if summary}}{{#if (gt summary.criticalIssues 0)}}1. Critical問題の即時修正（{{summary.criticalIssues}}件）
{{/if}}{{#if (gt summary.highIssues 0)}}1. High問題の早期修正計画策定（{{summary.highIssues}}件）
{{/if}}1. 詳細診断の実施（オプション）
1. 改善提案書の作成{{else}}1. 詳細な解析の実施
1. 改善提案書の作成{{/if}}

---

## 付録

### A. 使用した解析ツール

{{#if toolsUsed}}{{#each toolsUsed}}- {{this}}
{{/each}}{{else}}- 情報がありません{{/if}}

### B. 解析対象サマリー

{{#if summary}}- 対象ファイル数: {{formatNumber summary.totalFiles}}
- 対象コード行数: {{formatNumber summary.totalCodeLines}}{{/if}}

---

*このレポートは IT Supervisor により自動生成されました*
*生成日時: {{generatedAt}}*
