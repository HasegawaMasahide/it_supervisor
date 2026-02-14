# IT資産監査ワークフローガイド

IT Supervisor Tools を使って、対象リポジトリの解析から報告完了までを行う手順をまとめたガイドです。

---

## 前提：セットアップ

```bash
cd tools
npm install
npm run build
```

---

## 全体フロー

```
対象リポジトリ
  │
  ├─ Step 1: プロジェクト作成（metrics-model）
  │
  ├─ Step 2: リポジトリ解析（repo-analyzer）─→ 技術スタック・構造把握
  │                                                  │
  ├─ Step 3: 静的解析（static-analyzer）──────→ 問題検出 ──┤
  │                                                        │
  │                              metrics-model ←───────────┘ メトリクス記録
  │                                                        │
  ├─ Step 4: Issue登録（issue-manager）────────→ 問題の管理・追跡
  │
  ├─ Step 5: サンドボックス構築（sandbox-builder）→ Docker環境で安全に改善実装
  │
  ├─ Step 6: 改善実装と効果測定 ───────────────→ Before/After比較
  │
  └─ Step 7: レポート生成（report-generator）──→ HTML/PDF/MDレポート出力
```

---

## Step 1: プロジェクト作成とメトリクスDB初期化

監査対象プロジェクトをDBに登録する。

```typescript
import { MetricsDatabase } from '@it-supervisor/metrics-model';

const metricsDB = new MetricsDatabase('./data/metrics.db');
const project = metricsDB.createProject({
  name: 'Customer Project Alpha',
  description: '顧客の既存Webアプリケーション',
  metadata: { path: './target-repo' }
});
```

---

## Step 2: リポジトリ解析（調査フェーズ）

対象リポジトリの技術スタック・構造・Git履歴を自動分析する。

```typescript
import { RepositoryAnalyzer } from '@it-supervisor/repo-analyzer';

const repoAnalyzer = new RepositoryAnalyzer();
const repoResult = await repoAnalyzer.analyzeLocal('./target-repo', {
  includeGitHistory: true,
  includeDependencies: true,
  excludePatterns: ['node_modules', 'dist', 'vendor']
});
// → 言語、フレームワーク、依存関係、コミット数、コントリビューター等を取得
```

取得結果はメトリクスDBに記録しておく。

```typescript
import { MetricCategory } from '@it-supervisor/metrics-model';

metricsDB.recordMetric({
  projectId: project.id,
  timestamp: new Date(),
  category: MetricCategory.CodeQuality,
  name: 'total_files',
  value: repoResult.fileStats.totalFiles
});

metricsDB.recordMetric({
  projectId: project.id,
  timestamp: new Date(),
  category: MetricCategory.CodeQuality,
  name: 'total_lines',
  value: repoResult.fileStats.totalLines
});
```

---

## Step 3: 静的解析（分析フェーズ）

検出された言語に応じた静的解析ツールを並列実行する。

```typescript
import { StaticAnalyzer, AnalyzerTool } from '@it-supervisor/static-analyzer';

const staticAnalyzer = new StaticAnalyzer();
const staticResult = await staticAnalyzer.analyze('./target-repo', {
  tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks, AnalyzerTool.Snyk],
  parallel: true,
  timeout: 300000
});
// → Critical/High/Medium/Low の問題一覧を取得
```

### 対応ツール一覧

| 言語 | ツール |
|---|---|
| JavaScript/TypeScript | ESLint, TypeScript Compiler |
| PHP | PHPStan, PHP_CodeSniffer, Psalm, PHPMessDetector |
| C# | Roslyn Analyzers, StyleCop |
| 共通 | Gitleaks（秘密情報漏洩）, Snyk（脆弱性）, SonarQube, OWASP Dependency-Check |

---

## Step 4: Issue登録（診断フェーズ）

検出された問題をIssue管理DBに登録し、追跡可能にする。

```typescript
import { IssueManager, IssueStatus, IssueSeverity, IssueCategory } from '@it-supervisor/issue-manager';

const issueManager = new IssueManager('./data/issues.db');

for (const issue of staticResult.allIssues) {
  issueManager.createIssue({
    projectId: project.id,
    title: `[${issue.tool}] ${issue.message}`,
    description: `File: ${issue.file}:${issue.line}\nRule: ${issue.rule}`,
    category: IssueCategory.Security,
    severity: issue.severity as IssueSeverity,
    status: IssueStatus.Identified,
    location: { file: issue.file, line: issue.line },
    tags: [issue.tool, issue.category]
  });
}
```

### Issueステータスのフロー

```
Identified → Diagnosed → Approved → InProgress → Resolved → Closed
```

---

## Step 5: サンドボックス構築（実装フェーズの準備）

改善作業を安全に行うためのDocker環境を自動生成する。

```typescript
import { SandboxBuilder } from '@it-supervisor/sandbox-builder';

const sandboxBuilder = new SandboxBuilder();

// 環境を自動検出（Node.js / PHP / Python / .NET / Java / Ruby 等）
const detection = await sandboxBuilder.detect('./target-repo');

// Docker Compose環境を生成
const sandbox = await sandboxBuilder.build('./target-repo', {
  outputDir: './sandbox-env',
  includeDatabase: detection.databases.length > 0,
  isolation: 'RESTRICTED'
});
```

### CLIでの操作

```bash
sandbox up --env ./sandbox-env              # 起動
sandbox health --env ./sandbox-env          # ヘルスチェック
sandbox snapshot create --name "before-fix" # スナップショット作成
sandbox snapshot restore --name "before-fix" # スナップショット復元
sandbox down --env ./sandbox-env            # 停止
```

---

## Step 6: 改善実装と効果測定

Issue解決後、再度解析してBefore/Afterを比較する。

```typescript
// 改善後の再解析
const afterResult = await staticAnalyzer.analyze('./target-repo', {
  tools: [AnalyzerTool.ESLint, AnalyzerTool.Gitleaks, AnalyzerTool.Snyk],
  parallel: true
});

// Before/After比較
const comparison = metricsDB.compareMetrics(
  project.id,
  'critical_issues',
  beforeDate,
  new Date()
);
// → percentageChange で改善率を算出
```

---

## Step 7: レポート生成（報告フェーズ）

最終的な監査レポートをHTML/PDF/Markdownで出力する。

```typescript
import { ReportGenerator, ReportType } from '@it-supervisor/report-generator';

const reportGenerator = new ReportGenerator();

const report = await reportGenerator.generate(ReportType.Analysis, {
  projectName: project.name,
  customerName: 'ACME Corporation',
  date: new Date(),
  author: 'IT Supervisor Team',
  data: {
    repoAnalysis: repoResult,
    staticAnalysis: staticResult,
    issues: issueManager.searchIssues({ projectId: project.id })
  }
});

await reportGenerator.exportToHTML(report, './reports/audit-report.html');
await reportGenerator.exportToPDF(report, './reports/audit-report.pdf');
await reportGenerator.exportToMarkdown(report, './reports/audit-report.md');
```

### レポートタイプ一覧

| ReportType | フェーズ | 用途 |
|---|---|---|
| SystemOverview | 調査 | システム概要書 |
| Analysis | 分析 | 分析レポート |
| Diagnosis | 診断 | 診断レポート |
| Proposal | 提案 | 改善提案書 |
| Implementation | 実装 | 実装報告書 |
| Measurement | 効果測定 | 効果測定レポート |
| FinalReport | 報告 | 最終報告書 |

---

## Step 8: クリーンアップ

```typescript
metricsDB.close();
issueManager.close();
```

---

## 成果物

各ステップの実行により、以下の成果物が生成される。

| 成果物 | 内容 |
|---|---|
| `data/metrics.db` | メトリクスデータベース（SQLite） |
| `data/issues.db` | Issueデータベース（SQLite） |
| `sandbox-env/` | Docker Compose環境 |
| `reports/audit-report.html` | HTML形式の監査レポート |
| `reports/audit-report.pdf` | PDF形式の監査レポート |
| `reports/audit-report.md` | Markdown形式の監査レポート |

---

## 参考リンク

- [API統合ガイド（5つのE2Eワークフロー例）](./API_INTEGRATION_GUIDE.md)
- [個別ツールの使用例](./USAGE_EXAMPLES.md)
- [フルパイプライン統合サンプル](../examples/07-full-pipeline/)
