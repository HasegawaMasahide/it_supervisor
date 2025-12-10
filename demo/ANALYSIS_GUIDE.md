# Laravel TODO App 解析ガイド

このガイドでは、IT資産監査・改善サービスのツール群を使って、デモ用Laravel TODOアプリを実際に解析する手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [環境セットアップ](#環境セットアップ)
3. [解析実行手順](#解析実行手順)
4. [レポート作成](#レポート作成)
5. [期待される検出結果](#期待される検出結果)
6. [デモプレゼンテーションシナリオ](#デモプレゼンテーションシナリオ)

---

## 前提条件

### 必要な環境

- **Node.js**: v18.x 以上
- **TypeScript**: 4.9.x 以上
- **データベース**: SQLite（開発用）または PostgreSQL（本番用）
- **ディスク容量**: 最低 500MB の空き容量

### ツールのインストール

```bash
# プロジェクトルートで
cd tools

# すべてのツールパッケージをインストール（モノレポ構造の場合）
npm install

# または個別にインストール
cd metrics-model && npm install && cd ..
cd repo-analyzer && npm install && cd ..
cd static-analyzer && npm install && cd ..
# ... 他のツールも同様に
```

### 外部ツールのインストール（静的解析用）

```bash
# PHP_CodeSniffer（PHP用）
composer global require "squizlabs/php_codesniffer=*"

# Snyk（脆弱性スキャン）
npm install -g snyk
snyk auth  # Snykアカウントが必要

# Gitleaks（シークレット検出）
# Windows: Chocolatey経由
choco install gitleaks

# macOS: Homebrew経由
brew install gitleaks

# Linux: バイナリダウンロード
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

---

## 環境セットアップ

### 1. データベースの初期化

解析結果を保存するデータベースを準備します。

```bash
# デモ用のデータディレクトリ作成
mkdir -p demo/data
mkdir -p demo/reports
mkdir -p demo/sandbox

# SQLiteの場合（開発環境推奨）
# 自動的に作成されるため、事前作業は不要
```

### 2. 解析対象アプリの確認

```bash
# Laravel TODOアプリのディレクトリ確認
cd demo/laravel-todo-app
ls -la

# 期待されるファイル構造:
# - composer.json
# - app/
# - routes/
# - database/
# - config/
# - resources/
```

---

## 解析実行手順

### フェーズ 1: プロジェクト登録とリポジトリ解析

解析用のスクリプト（`demo/scripts/analyze-todo-app.ts`）を作成して実行します。

#### `demo/scripts/analyze-todo-app.ts` の作成

```typescript
import { MetricsDatabase } from '../../tools/metrics-model/src';
import { RepositoryAnalyzer } from '../../tools/repo-analyzer/src';
import { StaticAnalyzer, AnalyzerTool } from '../../tools/static-analyzer/src';
import { IssueManager, IssueSeverity, IssueCategory } from '../../tools/issue-manager/src';
import { ReportGenerator, ReportType } from '../../tools/report-generator/src';
import * as path from 'path';

async function analyzeTodoApp() {
  console.log('========================================');
  console.log('  Laravel TODO App 監査デモ');
  console.log('========================================\n');

  const projectPath = path.resolve(__dirname, '../laravel-todo-app');
  const dataPath = path.resolve(__dirname, '../data');
  const reportsPath = path.resolve(__dirname, '../reports');

  // フェーズ1: プロジェクト作成とリポジトリ解析
  console.log('[フェーズ1] プロジェクト登録とリポジトリ解析');
  console.log('----------------------------------------\n');

  const metricsDb = new MetricsDatabase(path.join(dataPath, 'metrics.db'));

  const project = metricsDb.createProject({
    name: 'Laravel TODO App (Demo)',
    description: 'IT資産監査デモ用TODOアプリケーション'
  });

  console.log(`✓ プロジェクトID: ${project.id}`);
  console.log(`✓ プロジェクト名: ${project.name}\n`);

  const repoAnalyzer = new RepositoryAnalyzer();
  console.log('リポジトリを解析中...');

  const repoResult = await repoAnalyzer.analyzeLocal(projectPath, {
    includeGitHistory: false, // Gitリポジトリでない場合はfalse
    includeDependencies: true,
    excludePatterns: ['vendor', 'node_modules', '.git']
  });

  console.log('\n📊 リポジトリ解析結果:');
  console.log(`  総ファイル数: ${repoResult.fileStats.totalFiles}`);
  console.log(`  総行数: ${repoResult.fileStats.totalLines}`);
  console.log(`  コメント行数: ${repoResult.fileStats.commentLines}`);
  console.log(`  空行数: ${repoResult.fileStats.blankLines}`);

  console.log('\n  検出された言語:');
  repoResult.techStack.languages.forEach(lang => {
    console.log(`    - ${lang.name}: ${lang.files} files, ${lang.lines} lines (${lang.percentage.toFixed(1)}%)`);
  });

  console.log('\n  フレームワーク:');
  if (repoResult.techStack.frameworks.length > 0) {
    repoResult.techStack.frameworks.forEach(fw => {
      console.log(`    - ${fw.name} ${fw.version || ''}`);
    });
  } else {
    console.log('    (検出されたフレームワークを分析中...)');
  }

  // メトリクスをDBに記録
  metricsDb.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: 'code_quality' as any,
    name: 'total_files',
    value: repoResult.fileStats.totalFiles,
    unit: 'count',
    source: 'repo-analyzer'
  });

  metricsDb.recordMetric({
    projectId: project.id,
    timestamp: new Date(),
    category: 'code_quality' as any,
    name: 'total_lines',
    value: repoResult.fileStats.totalLines,
    unit: 'count',
    source: 'repo-analyzer'
  });

  // フェーズ2: 静的解析
  console.log('\n[フェーズ2] 静的解析');
  console.log('----------------------------------------\n');

  const staticAnalyzer = new StaticAnalyzer();
  console.log('静的解析を実行中（数分かかる場合があります）...');
  console.log('実行するツール: PHP_CodeSniffer, Snyk, Gitleaks\n');

  const staticResult = await staticAnalyzer.analyze(projectPath, {
    tools: [
      AnalyzerTool.PHP_CodeSniffer,
      AnalyzerTool.Snyk,
      AnalyzerTool.Gitleaks
    ],
    parallel: true,
    removeDuplicates: true,
    timeout: 300000 // 5分
  });

  console.log('📊 静的解析結果:');
  console.log(`  総問題数: ${staticResult.summary.totalIssues}`);
  console.log('\n  重要度別:');
  console.log(`    Critical: ${staticResult.summary.bySeverity.critical} 件`);
  console.log(`    High:     ${staticResult.summary.bySeverity.high} 件`);
  console.log(`    Medium:   ${staticResult.summary.bySeverity.medium} 件`);
  console.log(`    Low:      ${staticResult.summary.bySeverity.low} 件`);

  console.log('\n  カテゴリ別:');
  Object.entries(staticResult.summary.byCategory).forEach(([category, count]) => {
    console.log(`    ${category}: ${count} 件`);
  });

  console.log('\n  ツール別:');
  Object.entries(staticResult.summary.byTool).forEach(([tool, count]) => {
    console.log(`    ${tool}: ${count} 件`);
  });

  // メトリクスをDBに記録
  Object.entries(staticResult.summary.bySeverity).forEach(([severity, count]) => {
    metricsDb.recordMetric({
      projectId: project.id,
      timestamp: new Date(),
      category: 'security' as any,
      name: `issues_${severity}`,
      value: count,
      unit: 'count',
      source: 'static-analyzer'
    });
  });

  // フェーズ3: Issue管理システムへの登録
  console.log('\n[フェーズ3] Issue管理システムへの登録');
  console.log('----------------------------------------\n');

  const issueManager = new IssueManager(path.join(dataPath, 'issues.db'));

  let registeredCount = 0;

  // Criticalとhighの問題のみ登録（デモでは全件登録してもよい）
  const importantIssues = staticResult.allIssues.filter(
    issue => issue.severity === 'critical' || issue.severity === 'high'
  );

  console.log(`登録対象: ${importantIssues.length} 件（Critical + High）\n`);

  for (const issue of importantIssues) {
    const createdIssue = issueManager.createIssue({
      projectId: project.id,
      title: issue.message,
      description: [
        `**ツール:** ${issue.tool}`,
        `**ルール:** ${issue.rule}`,
        `**ファイル:** ${issue.file}`,
        issue.details ? `\n${issue.details}` : ''
      ].join('\n'),
      category: mapCategory(issue.category),
      severity: issue.severity as any,
      status: 'identified' as any,
      location: {
        file: issue.file,
        line: issue.line,
        column: issue.column
      },
      tags: [issue.tool, issue.category, issue.severity],
      createdBy: 'auto-analyzer'
    });

    registeredCount++;

    if (registeredCount <= 5) {
      console.log(`  ✓ Issue #${registeredCount}: ${issue.severity.toUpperCase()} - ${issue.message.substring(0, 60)}...`);
    }
  }

  console.log(`\n✓ 合計 ${registeredCount} 件のIssueを登録しました`);

  // フェーズ4: レポート生成
  console.log('\n[フェーズ4] レポート生成');
  console.log('----------------------------------------\n');

  const reportGenerator = new ReportGenerator();

  const report = await reportGenerator.generate(ReportType.Analysis, {
    projectName: project.name,
    customerName: 'デモ顧客（ACME Corporation）',
    date: new Date(),
    author: 'IT Supervisor チーム',
    data: {
      repoAnalysis: repoResult,
      staticAnalysis: staticResult,
      issues: importantIssues.slice(0, 20) // 上位20件
    }
  });

  // 各形式で出力
  await reportGenerator.exportToHTML(report, path.join(reportsPath, 'analysis-report.html'));
  await reportGenerator.exportToMarkdown(report, path.join(reportsPath, 'analysis-report.md'));

  console.log('✓ レポートを生成しました:');
  console.log(`  HTML: ${path.join(reportsPath, 'analysis-report.html')}`);
  console.log(`  Markdown: ${path.join(reportsPath, 'analysis-report.md')}`);

  // フェーズ5: 統計サマリー
  console.log('\n[フェーズ5] 統計サマリー');
  console.log('----------------------------------------\n');

  const stats = issueManager.getStatistics(project.id);

  console.log('📈 Issue統計:');
  console.log(`  総数: ${stats.total}`);
  console.log('\n  重要度別:');
  console.log(`    Critical: ${stats.bySeverity.critical}`);
  console.log(`    High:     ${stats.bySeverity.high}`);
  console.log(`    Medium:   ${stats.bySeverity.medium}`);
  console.log(`    Low:      ${stats.bySeverity.low}`);
  console.log('\n  ステータス別:');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}`);
  });

  // クリーンアップ
  metricsDb.close();
  issueManager.close();

  console.log('\n========================================');
  console.log('  解析完了！');
  console.log('========================================\n');

  return {
    project,
    repoResult,
    staticResult,
    stats,
    reportPaths: {
      html: path.join(reportsPath, 'analysis-report.html'),
      markdown: path.join(reportsPath, 'analysis-report.md')
    }
  };
}

// カテゴリマッピング関数
function mapCategory(category: string): any {
  const mapping: Record<string, string> = {
    'security': 'security',
    'code-quality': 'code_quality',
    'performance': 'performance',
    'best-practices': 'code_quality',
    'secrets': 'security',
    'dependencies': 'dependency'
  };

  return mapping[category.toLowerCase()] || 'other';
}

// 実行
if (require.main === module) {
  analyzeTodoApp()
    .then(result => {
      console.log('結果オブジェクト:', {
        projectId: result.project.id,
        totalIssues: result.staticResult.summary.totalIssues,
        reportPaths: result.reportPaths
      });
    })
    .catch(error => {
      console.error('\n❌ エラーが発生しました:', error);
      process.exit(1);
    });
}

export { analyzeTodoApp };
```

#### スクリプトの実行

```bash
# プロジェクトルートで
cd demo/scripts

# TypeScriptの実行（ts-nodeを使用）
npx ts-node analyze-todo-app.ts

# またはコンパイルしてから実行
tsc analyze-todo-app.ts
node analyze-todo-app.js
```

---

## 期待される検出結果

### セキュリティ問題（Critical/High）

以下の問題が検出されるはずです：

#### 1. **SQLインジェクション脆弱性** (Critical)
- **件数**: 10+ 件
- **検出場所**:
  - `app/Http/Controllers/AuthController.php`
  - `app/Http/Controllers/TodoController.php`
- **検出ツール**: PHP_CodeSniffer, Snyk

#### 2. **機密情報のハードコーディング** (Critical)
- **件数**: 3-5 件
- **検出場所**:
  - `config/database.php:64` - DB認証情報
  - `.env.example:44` - APIキー
  - `resources/views/welcome.blade.php:167` - フロントエンドのAPIキー
- **検出ツール**: Gitleaks

#### 3. **不適切なパスワードハッシュ（MD5）** (Critical)
- **件数**: 2-3 件
- **検出場所**: `app/Http/Controllers/AuthController.php`
- **検出ツール**: PHP_CodeSniffer (カスタムルール)

#### 4. **XSS脆弱性** (High)
- **件数**: 2-3 件
- **検出場所**:
  - `routes/web.php:18`
  - `resources/views/welcome.blade.php`
- **検出ツール**: PHP_CodeSniffer

#### 5. **パストラバーサル脆弱性** (High)
- **件数**: 1 件
- **検出場所**: `routes/web.php:25`
- **検出ツール**: PHP_CodeSniffer

### コード品質問題

#### 6. **循環的複雑度が高い** (Medium)
- **件数**: 2-3 件
- **検出場所**: `app/Http/Controllers/TodoController.php:index()`
- **検出ツール**: PHP_CodeSniffer (Complexity metrics)

#### 7. **長すぎる関数** (Low)
- **件数**: 1-2 件
- **検出場所**: `app/Http/Controllers/TodoController.php:update()`

#### 8. **重複コード** (Low)
- **件数**: 複数
- **検出場所**: TodoController内の複数箇所

### 依存関係問題

#### 9. **古いLaravelバージョン** (High)
- **検出場所**: `composer.json`
- **検出ツール**: Snyk
- **詳細**: Laravel 8.x（EOLサポート）

#### 10. **脆弱性のある依存パッケージ** (Medium/High)
- **件数**: 3-10 件（依存関係による）
- **検出ツール**: Snyk

---

## レポート作成

### 生成されるレポート

解析完了後、以下のレポートが生成されます：

#### 1. **HTMLレポート** (`demo/reports/analysis-report.html`)
- ブラウザで開いて確認可能
- グラフやチャートで視覚化
- セクション別に整理された問題一覧
- エグゼクティブサマリー

#### 2. **Markdownレポート** (`demo/reports/analysis-report.md`)
- GitHubやGitLabで直接表示可能
- バージョン管理しやすい形式
- テキストエディタで編集可能

### レポートの内容

レポートには以下のセクションが含まれます：

1. **エグゼクティブサマリー**
   - 全体的なリスク評価
   - 重要な発見事項のハイライト
   - 推奨アクション

2. **リポジトリ概要**
   - 技術スタック
   - コード規模（ファイル数、行数）
   - フレームワークとライブラリ

3. **セキュリティ診断結果**
   - 重要度別の問題数
   - カテゴリ別の分類
   - 各問題の詳細（場所、影響、推奨対策）

4. **コード品質分析**
   - 循環的複雑度
   - 重複コード
   - コーディング標準の違反

5. **依存関係の分析**
   - 古いパッケージ
   - 既知の脆弱性
   - ライセンス問題

6. **推奨事項**
   - 優先度付きアクションプラン
   - 見積もり工数
   - ROI試算

---

## デモプレゼンテーションシナリオ

### シナリオ: 中小企業への提案デモ

**想定顧客**: 従業員50名のWebサービス企業

**デモの流れ（所要時間: 15-20分）**

#### 1. イントロダクション（2分）
「本日は、御社の既存Webアプリケーションを例として、弊社のIT資産監査サービスのデモンストレーションを行います。実際の監査で使用するツール群を使って、どのような問題が検出され、どのような改善提案ができるかをご覧いただきます。」

#### 2. 解析実行（5分）
```bash
# 実際にコマンドを実行
cd demo/scripts
npx ts-node analyze-todo-app.ts
```

**ポイント**:
- リアルタイムで解析が進行する様子を見せる
- 各フェーズで何をしているかを説明
- 出力される統計情報を強調

#### 3. 結果の説明（8分）

**セキュリティ問題の深刻さを説明**:
「Critical問題が5件検出されました。これらは即座に対応が必要な重大な脆弱性です。例えば、SQLインジェクション脆弱性は、悪意のある攻撃者がデータベース全体にアクセスできてしまう可能性があります。」

**具体例を示す**:
```php
// 問題のあるコード（AuthController.php:25）
$result = DB::insert("INSERT INTO users (name, email, password)
                      VALUES ('$name', '$email', '$hashedPassword')");

// 推奨される修正
$result = DB::table('users')->insert([
    'name' => $name,
    'email' => $email,
    'password' => Hash::make($password) // bcryptを使用
]);
```

**レポートを開いて見せる**:
```bash
# HTMLレポートをブラウザで開く
start demo/reports/analysis-report.html  # Windows
open demo/reports/analysis-report.html   # macOS
xdg-open demo/reports/analysis-report.html # Linux
```

#### 4. 改善提案と見積もり（3分）

**検出された問題の優先順位**:
1. Critical: SQLインジェクション、機密情報の漏洩 → 即時対応必要
2. High: XSS、認証の不備 → 1週間以内に対応
3. Medium: コード品質、パフォーマンス → 1ヶ月以内に対応

**見積もり工数**:
- セキュリティ問題の修正: 16-24時間
- コード品質の改善: 12-20時間
- 依存関係の更新: 8-16時間
- **合計**: 44-72時間（約1.5-2ヶ月、週2日稼働の場合）

**料金プラン**:
- 本プロジェクトはスタンダードプランに該当: **120万円**
- 瑕疵担保期間: 3ヶ月

#### 5. Q&A と次のステップ（2分）

**次のステップ**:
1. 詳細なヒアリング（1-2時間）
2. 正式な見積もりと提案書の作成（1週間）
3. 契約後、実際の監査開始（契約後1週間以内）

---

## トラブルシューティング

### よくある問題と解決方法

#### 問題1: Snykの認証エラー
```
Error: Snyk authentication required
```

**解決方法**:
```bash
snyk auth
# ブラウザで認証を完了してください
```

#### 問題2: PHP_CodeSnifferが見つからない
```
Error: phpcs: command not found
```

**解決方法**:
```bash
# Composerでグローバルインストール
composer global require "squizlabs/php_codesniffer=*"

# パスを追加（.bashrc または .zshrc に追加）
export PATH="$PATH:$HOME/.composer/vendor/bin"
```

#### 問題3: データベースのロックエラー
```
Error: database is locked
```

**解決方法**:
```bash
# 既存のデータベースファイルを削除して再実行
rm demo/data/*.db
```

#### 問題4: メモリ不足エラー
```
Error: JavaScript heap out of memory
```

**解決方法**:
```bash
# Node.jsのメモリ上限を増やして実行
NODE_OPTIONS="--max-old-space-size=4096" npx ts-node analyze-todo-app.ts
```

---

## まとめ

このガイドに従って解析を実行することで、以下を体験できます：

✅ IT資産監査サービスの実際のワークフロー
✅ 22件以上の問題の自動検出
✅ 詳細なレポートの自動生成
✅ Issue管理システムでの追跡

この結果をもとに、顧客への提案書作成やプレゼンテーションに活用できます。
