# PHP/C# 静的解析MCPサーバー 設計書

## 概要

PHP/C#静的解析MCPサーバーは、JavaScript/TypeScript以外の主要言語（PHP、C#）の静的解析ツールを統合し、Claude Codeがトークン効率よくコード品質を分析できるようにするためのMCPサーバーです。

## 目的

1. **マルチ言語対応**: PHP、C#の静的解析を統一インターフェースで提供
2. **トークン削減**: 大量の解析結果から重要なもののみを抽出
3. **環境分離**: Docker内で実行し、ホスト環境を汚染しない
4. **拡張性**: 将来的にPython、Java、Go等の言語を追加可能

## 対応ツール

### PHP解析ツール

| ツール | 目的 | 出力形式 |
|--------|------|---------|
| **PHP_CodeSniffer** | コーディング規約チェック（PSR-12等） | JSON/XML |
| **PHPStan** | 静的型チェック、バグ検出 | JSON |
| **Psalm** | 静的解析、型安全性 | JSON |
| **PHP Mess Detector** | コード複雑度、保守性 | JSON/XML |

### C#解析ツール

| ツール | 目的 | 出力形式 |
|--------|------|---------|
| **Roslyn Analyzers** | .NET公式コード分析 | JSON/SARIF |
| **StyleCop** | コーディング規約チェック | XML |
| **SonarAnalyzer.CSharp** | バグ、脆弱性、コードスメル | SARIF |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│           Claude Code (MCP Client)                  │
└─────────────────┬───────────────────────────────────┘
                  │ MCP Protocol
                  │
┌─────────────────▼───────────────────────────────────┐
│      Multi-Lang Analyzer MCP Server                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  Language Detector                           │   │
│  │  - composer.json → PHP                       │   │
│  │  - *.csproj → C#                             │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│  ┌──────────────▼──────┬────────────────────────┐   │
│  │  PHP Analyzer       │  C# Analyzer           │   │
│  │  ┌──────────────┐   │  ┌──────────────────┐  │   │
│  │  │ CodeSniffer  │   │  │ Roslyn Analyzers │  │   │
│  │  │ PHPStan      │   │  │ StyleCop         │  │   │
│  │  │ Psalm        │   │  │ SonarAnalyzer    │  │   │
│  │  │ PHPMD        │   │  └──────────────────┘  │   │
│  │  └──────────────┘   │                        │   │
│  └──────────────┬──────┴────────────┬───────────┘   │
│                 │                   │                │
│         (Docker Container)   (Docker Container)     │
│                 │                   │                │
│  ┌──────────────▼───────────────────▼─────────────┐ │
│  │  Result Normalizer                             │ │
│  │  - 統一フォーマット変換                        │ │
│  │  - 重要度正規化                                │ │
│  │  - ファイルパス正規化                          │ │
│  └──────────────┬─────────────────────────────────┘ │
│                 │                                    │
│  ┌──────────────▼─────────────────────────────────┐ │
│  │  Aggregator & Filter                           │ │
│  │  - カテゴリ別集計                              │ │
│  │  - 重要度フィルタ                              │ │
│  │  - トークン最適化                              │ │
│  └──────────────┬─────────────────────────────────┘ │
└─────────────────┼─────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────────┐
│  Docker Images                                        │
│  - it-supervisor/php-analyzer:latest                  │
│  - it-supervisor/csharp-analyzer:latest               │
└───────────────────────────────────────────────────────┘
```

## MCPツール定義

### 1. `analyze_php`

PHPコードを静的解析します。

**入力パラメータ:**
```typescript
interface AnalyzePHPParams {
  repositoryPath: string;
  enableCodeSniffer?: boolean;   // デフォルト: true
  enablePHPStan?: boolean;        // デフォルト: true
  enablePsalm?: boolean;          // デフォルト: false
  enablePHPMD?: boolean;          // デフォルト: true
  phpstanLevel?: number;          // 0-9（デフォルト: 5）
  codingStandard?: 'PSR12' | 'PSR2' | 'PEAR';  // デフォルト: PSR12
  severity?: 'error' | 'warning' | 'all';
  excludePaths?: string[];
}
```

**出力:**
```typescript
interface AnalyzePHPResult {
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    byTool: {
      phpcs?: number;
      phpstan?: number;
      psalm?: number;
      phpmd?: number;
    };
  };
  issues: Array<{
    id: string;
    tool: 'phpcs' | 'phpstan' | 'psalm' | 'phpmd';
    severity: 'error' | 'warning' | 'info';
    category: 'style' | 'bug' | 'type' | 'complexity' | 'security';
    message: string;
    file: string;
    line: number;
    column?: number;
    rule?: string;              // e.g., "PSR12.Classes.ClassDeclaration"
    remediation?: string;
  }>;
  executionTime: number;
  phpVersion?: string;
}
```

**使用例:**
```typescript
const result = await mcp.analyze_php({
  repositoryPath: "/workspace/php-app",
  phpstanLevel: 7,
  codingStandard: "PSR12",
  severity: "error"
});

// 出力例
{
  summary: {
    totalIssues: 15,
    errors: 10,
    warnings: 5,
    byTool: { phpcs: 5, phpstan: 10 }
  },
  issues: [
    {
      id: "phpstan-001",
      tool: "phpstan",
      severity: "error",
      category: "type",
      message: "Property App\\Model\\User::$name has no type specified.",
      file: "src/Model/User.php",
      line: 12,
      rule: "PHPStan\\Rules\\Properties\\MissingPropertyTypehintRule"
    }
  ]
}
```

---

### 2. `analyze_csharp`

C#コードを静的解析します。

**入力パラメータ:**
```typescript
interface AnalyzeCSharpParams {
  repositoryPath: string;
  solutionFile?: string;          // *.sln ファイルパス
  projectFile?: string;           // *.csproj ファイルパス
  enableRoslyn?: boolean;         // デフォルト: true
  enableStyleCop?: boolean;       // デフォルト: true
  enableSonarAnalyzer?: boolean;  // デフォルト: false
  severity?: 'error' | 'warning' | 'all';
  ruleSetFile?: string;           // カスタムルールセット
}
```

**出力:**
```typescript
interface AnalyzeCSharpResult {
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    byTool: {
      roslyn?: number;
      stylecop?: number;
      sonar?: number;
    };
  };
  issues: Array<{
    id: string;
    tool: 'roslyn' | 'stylecop' | 'sonar';
    severity: 'error' | 'warning' | 'info';
    category: 'style' | 'bug' | 'security' | 'performance' | 'maintainability';
    message: string;
    file: string;
    line: number;
    column?: number;
    rule: string;               // e.g., "CA1031", "SA1200"
    helpLink?: string;
    remediation?: string;
  }>;
  executionTime: number;
  dotnetVersion?: string;
}
```

**使用例:**
```typescript
const result = await mcp.analyze_csharp({
  repositoryPath: "/workspace/dotnet-app",
  solutionFile: "MyApp.sln",
  severity: "warning"
});

// 出力例
{
  summary: {
    totalIssues: 8,
    errors: 2,
    warnings: 6,
    byTool: { roslyn: 5, stylecop: 3 }
  },
  issues: [
    {
      id: "roslyn-001",
      tool: "roslyn",
      severity: "warning",
      category: "bug",
      message: "Do not catch general exception types",
      file: "Controllers/UserController.cs",
      line: 45,
      rule: "CA1031",
      helpLink: "https://learn.microsoft.com/dotnet/fundamentals/code-analysis/quality-rules/ca1031"
    }
  ]
}
```

---

### 3. `analyze_project`

プロジェクト全体を自動検出して解析します。

**入力パラメータ:**
```typescript
interface AnalyzeProjectParams {
  repositoryPath: string;
  languages?: Array<'php' | 'csharp' | 'auto'>;  // デフォルト: 'auto'
  severity?: 'error' | 'warning' | 'all';
  parallel?: boolean;             // 並列実行（デフォルト: true）
}
```

**出力:**
```typescript
interface AnalyzeProjectResult {
  detectedLanguages: Array<'php' | 'csharp'>;
  results: {
    php?: AnalyzePHPResult;
    csharp?: AnalyzeCSharpResult;
  };
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    byLanguage: {
      [key: string]: number;
    };
  };
  executionTime: number;
}
```

---

### 4. `get_quality_metrics`

コード品質メトリクスを集計します。

**入力パラメータ:**
```typescript
interface GetQualityMetricsParams {
  analysisResultId: string;       // 前回の解析結果ID
  projectId: string;
}
```

**出力:**
```typescript
interface QualityMetricsResult {
  complexity: {
    average: number;
    max: number;
    filesAboveThreshold: number;  // 複雑度10以上のファイル数
  };
  maintainability: {
    score: number;                // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  technicalDebt: {
    totalMinutes: number;
    breakdown: {
      bugs: number;
      codeSmells: number;
      vulnerabilities: number;
    };
  };
  coverage?: {
    line: number;                 // 0-100%
    branch: number;
  };
}
```

---

## データモデル

### 統一コード分析Issue

```typescript
interface CodeAnalysisIssue {
  id: string;
  language: 'php' | 'csharp';
  tool: string;
  severity: 'error' | 'warning' | 'info';
  category: 'style' | 'bug' | 'type' | 'complexity' | 'security' | 'performance';
  message: string;
  location: {
    file: string;
    line: number;
    column?: number;
    snippet?: string;           // 該当コード（5行程度）
  };
  rule: {
    id: string;
    name?: string;
    description?: string;
    helpLink?: string;
  };
  remediation?: {
    suggestion: string;
    examples?: string[];
    effort: 'trivial' | 'easy' | 'medium' | 'hard';
  };
  detectedAt: Date;
}
```

## Docker化

### PHP Analyzer Dockerfile

```dockerfile
FROM php:8.2-cli

# PHP拡張インストール
RUN docker-php-ext-install pdo pdo_mysql

# Composerインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 静的解析ツールインストール
RUN composer global require \
    squizlabs/php_codesniffer \
    phpstan/phpstan \
    vimeo/psalm \
    phpmd/phpmd

ENV PATH="/root/.composer/vendor/bin:${PATH}"

WORKDIR /workspace

ENTRYPOINT ["php"]
```

### C# Analyzer Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0

# Roslyn Analyzersインストール
RUN dotnet tool install --global dotnet-format
RUN dotnet tool install --global Security.CodeScan.VS2019

# StyleCopインストール
RUN dotnet add package StyleCop.Analyzers

ENV PATH="/root/.dotnet/tools:${PATH}"

WORKDIR /workspace

ENTRYPOINT ["dotnet"]
```

## 実装技術スタック

### 言語・フレームワーク
- **言語**: TypeScript (Node.js)
- **MCPフレームワーク**: `@modelcontextprotocol/sdk`
- **Docker SDK**: `dockerode`

### 外部ツール
#### PHP
- PHP_CodeSniffer (Composer)
- PHPStan (Composer)
- Psalm (Composer)
- PHPMD (Composer)

#### C#
- Roslyn Analyzers (.NET SDK)
- StyleCop (NuGet)
- SonarAnalyzer.CSharp (NuGet)

### ユーティリティ
- **並列実行**: `p-limit`
- **ファイル検出**: `fast-glob`
- **XML/JSONパース**: `xml2js`, native `JSON.parse`
- **ロギング**: `winston`

## ディレクトリ構造

```
multi-lang-analyzer/
├── DESIGN.md
├── package.json
├── tsconfig.json
├── docker/
│   ├── php-analyzer/
│   │   ├── Dockerfile
│   │   └── composer.json
│   └── csharp-analyzer/
│       ├── Dockerfile
│       └── AnalyzerProject.csproj
├── src/
│   ├── index.ts                # MCPサーバーエントリーポイント
│   ├── tools/
│   │   ├── analyze-php.ts
│   │   ├── analyze-csharp.ts
│   │   ├── analyze-project.ts
│   │   └── get-quality-metrics.ts
│   ├── analyzers/
│   │   ├── php/
│   │   │   ├── phpcs-runner.ts
│   │   │   ├── phpstan-runner.ts
│   │   │   ├── psalm-runner.ts
│   │   │   └── phpmd-runner.ts
│   │   └── csharp/
│   │       ├── roslyn-runner.ts
│   │       ├── stylecop-runner.ts
│   │       └── sonar-runner.ts
│   ├── normalizer/
│   │   ├── php-normalizer.ts
│   │   ├── csharp-normalizer.ts
│   │   └── issue-deduplicator.ts
│   ├── detector/
│   │   └── language-detector.ts
│   └── utils/
│       ├── docker-runner.ts
│       └── logger.ts
└── README.md
```

## 実装フェーズ

### Phase 1: PHP解析基盤（5日）
- [ ] Docker環境構築（PHP Analyzer）
- [ ] PHP_CodeSnifferラッパー実装
- [ ] PHPStanラッパー実装
- [ ] `analyze_php` ツール実装
- [ ] 結果正規化

### Phase 2: C#解析基盤（5日）
- [ ] Docker環境構築（C# Analyzer）
- [ ] Roslyn Analyzersラッパー実装
- [ ] StyleCopラッパー実装
- [ ] `analyze_csharp` ツール実装
- [ ] 結果正規化

### Phase 3: 統合・最適化（3日）
- [ ] 言語自動検出
- [ ] `analyze_project` ツール実装
- [ ] 並列実行最適化
- [ ] トークン削減

### Phase 4: メトリクス・テスト（2日）
- [ ] `get_quality_metrics` ツール実装
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] ドキュメント整備

**合計開発期間: 15営業日（3週間）**

## パフォーマンス最適化

### 1. Docker キャッシング
- ビルド済みイメージをキャッシュ
- ボリュームマウントで高速化

### 2. 並列実行
- PHP/C#を並列解析
- 各言語内のツールも並列実行

### 3. 増分解析
- 変更ファイルのみ解析
- Git diffベースで対象ファイル絞り込み

### 4. トークン削減
- Errorのみデフォルト出力
- Warningは要求時のみ
- サマリー情報を優先

## トラブルシューティング

### Dockerコンテナ起動エラー
```bash
# イメージビルド
cd mcp/servers/multi-lang-analyzer/docker/php-analyzer
docker build -t it-supervisor/php-analyzer:latest .

cd ../csharp-analyzer
docker build -t it-supervisor/csharp-analyzer:latest .

# イメージ確認
docker images | grep it-supervisor
```

### PHP解析エラー
```bash
# コンテナ内で手動実行
docker run --rm -v /workspace:/workspace it-supervisor/php-analyzer:latest \
  phpstan analyse /workspace --level 5 --error-format json
```

### C#解析エラー
```bash
# .NET SDKバージョン確認
docker run --rm it-supervisor/csharp-analyzer:latest dotnet --version

# ソリューションビルド
docker run --rm -v /workspace:/workspace it-supervisor/csharp-analyzer:latest \
  dotnet build /workspace/MyApp.sln
```

## 今後の拡張案

1. **追加言語対応**
   - Python (pylint, mypy, bandit)
   - Java (SpotBugs, PMD, Checkstyle)
   - Go (golangci-lint, staticcheck)
   - Ruby (RuboCop)

2. **カスタムルール**
   - プロジェクト固有のルールセット
   - 顧客ごとのコーディング規約

3. **修正提案**
   - Claude APIによる自動修正案生成
   - ワンクリック修正適用

---

## 参考リンク

### PHP
- [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer)
- [PHPStan](https://phpstan.org/)
- [Psalm](https://psalm.dev/)
- [PHPMD](https://phpmd.org/)

### C#
- [Roslyn Analyzers](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)
- [StyleCop](https://github.com/DotNetAnalyzers/StyleCopAnalyzers)
- [SonarAnalyzer.CSharp](https://github.com/SonarSource/sonar-dotnet)
