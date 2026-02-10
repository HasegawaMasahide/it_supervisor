# {{projectName}} 分析レポート

**顧客名**: {{customerName}}
**作成日**: {{date}}
**作成者**: {{author}}
**バージョン**: {{version}}

---

## エグゼクティブサマリー

本レポートは、{{projectName}}の技術的な分析結果をまとめたものです。
静的解析ツールおよびリポジトリ解析ツールを使用し、コード品質、セキュリティ、技術的負債の観点から評価を行いました。

### 総合評価

| 評価項目 | スコア | 判定 |
|---------|--------|------|
| コード品質 | {{scores.codeQuality}}/100 | {{scores.codeQualityGrade}} |
| セキュリティ | {{scores.security}}/100 | {{scores.securityGrade}} |
| 保守性 | {{scores.maintainability}}/100 | {{scores.maintainabilityGrade}} |
| 技術的負債 | {{scores.technicalDebt}}/100 | {{scores.technicalDebtGrade}} |

### 重要な発見事項

- **Critical問題**: {{summary.critical}}件
- **High問題**: {{summary.high}}件
- **Medium問題**: {{summary.medium}}件
- **Low問題**: {{summary.low}}件

---

## リポジトリ分析

### 技術スタック

| カテゴリ | 内容 |
|---------|------|
| 主要言語 | {{techStack.primaryLanguage}} |
| フレームワーク | {{techStack.frameworks}} |
| パッケージマネージャー | {{techStack.packageManagers}} |
| データベース | {{techStack.database}} |

### コード統計

| 指標 | 値 |
|------|-----|
| 総ファイル数 | {{fileStats.totalFiles}} |
| 総行数 | {{fileStats.totalLines}} |
| コード行数 | {{fileStats.codeLines}} |
| コメント行数 | {{fileStats.commentLines}} |
| 空行数 | {{fileStats.blankLines}} |

### 言語別構成

{{languageBreakdown}}

---

## 静的解析結果

### 問題の分布

#### 重要度別

| 重要度 | 件数 | 割合 |
|--------|------|------|
| Critical | {{issues.critical.count}} | {{issues.critical.percentage}}% |
| High | {{issues.high.count}} | {{issues.high.percentage}}% |
| Medium | {{issues.medium.count}} | {{issues.medium.percentage}}% |
| Low | {{issues.low.count}} | {{issues.low.percentage}}% |

#### カテゴリ別

| カテゴリ | 件数 |
|---------|------|
| セキュリティ | {{categories.security}} |
| パフォーマンス | {{categories.performance}} |
| コード品質 | {{categories.codeQuality}} |
| スタイル | {{categories.style}} |

### Critical問題の詳細

{{criticalIssuesDetail}}

### High問題の詳細

{{highIssuesDetail}}

---

## セキュリティ分析

### 脆弱性サマリー

| 脆弱性タイプ | 件数 | リスクレベル |
|--------------|------|--------------|
{{securityVulnerabilities}}

### 依存関係の脆弱性

{{dependencyVulnerabilities}}

---

## 技術的負債

### 概要

推定技術的負債: **{{technicalDebt.estimatedHours}}時間**（約{{technicalDebt.estimatedDays}}日）

### 内訳

| 項目 | 工数（時間） | 優先度 |
|------|--------------|--------|
{{technicalDebtBreakdown}}

---

## 推奨事項

### 即座に対応すべき項目（Critical/High）

{{immediateActions}}

### 短期的に対応すべき項目（Medium）

{{shortTermActions}}

### 中長期的に対応すべき項目（Low）

{{longTermActions}}

---

## 次のステップ

1. Critical問題の修正計画策定
2. セキュリティパッチの適用
3. 詳細診断の実施（オプション）
4. 改善提案書の作成

---

## 付録

### A. 使用した解析ツール

- ESLint（JavaScript/TypeScript）
- PHP_CodeSniffer（PHP）
- PHPStan（PHP静的解析）
- Snyk（セキュリティ・依存関係）
- Gitleaks（シークレット検出）

### B. 解析対象ファイル一覧

{{analyzedFilesList}}

---

*このレポートは IT Supervisor により自動生成されました*
*生成日時: {{generatedAt}}*
