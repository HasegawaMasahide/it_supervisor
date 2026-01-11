# セキュリティスキャンMCPサーバー 設計書

## 概要

セキュリティスキャンMCPサーバーは、複数のセキュリティツール（Gitleaks、Snyk、OWASP Dependency-Check）を統合し、Claude Codeがトークン効率よくセキュリティ脆弱性を分析できるようにするためのMCPサーバーです。

## 目的

1. **トークン削減**: 大量のスキャン結果をClaude Codeに送らず、重要度の高い情報のみを提供
2. **統一フォーマット**: 各ツールの出力を統一フォーマットに変換
3. **重複排除**: 複数ツールが同じ脆弱性を検出した場合に重複を除去
4. **効率化**: 並列実行とキャッシング機構でスキャン時間を短縮

## 対応ツール

### 1. Gitleaks
- **目的**: シークレット検出（API Key、パスワード、トークン等）
- **実行方法**: CLI (`gitleaks detect`)
- **出力形式**: JSON
- **検出対象**: `.git`履歴、現在のファイル

### 2. Snyk
- **目的**: 依存関係の脆弱性検出
- **実行方法**: CLI (`snyk test`)
- **出力形式**: JSON
- **検出対象**: package.json、composer.json、pom.xml等

### 3. OWASP Dependency-Check
- **目的**: 既知の脆弱性（CVE）検出
- **実行方法**: CLI (`dependency-check`)
- **出力形式**: JSON/XML
- **検出対象**: 全依存関係ファイル

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│           Claude Code (MCP Client)                  │
└─────────────────┬───────────────────────────────────┘
                  │ MCP Protocol
                  │
┌─────────────────▼───────────────────────────────────┐
│      Security Scanner MCP Server                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Tool Orchestrator                           │   │
│  │  - 並列実行制御                              │   │
│  │  - タイムアウト管理                          │   │
│  │  - 結果キャッシング                          │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│  ┌──────────────▼──────┬──────────────┬──────────┐  │
│  │  Gitleaks Runner    │ Snyk Runner  │ OWASP   │  │
│  │  - シークレット検出 │ - 依存関係   │ Runner  │  │
│  │  - .git履歴スキャン │   脆弱性     │ - CVE   │  │
│  └──────────────┬──────┴──────┬───────┴────┬─────┘  │
│                 │              │            │        │
│  ┌──────────────▼──────────────▼────────────▼─────┐  │
│  │  Result Normalizer                            │  │
│  │  - 統一フォーマット変換                       │  │
│  │  - 重複除去                                   │  │
│  │  - 重要度正規化 (Critical/High/Medium/Low)    │  │
│  └──────────────┬────────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼────────────────────────────────┐  │
│  │  Filter & Aggregator                          │  │
│  │  - 重要度フィルタリング                       │  │
│  │  - カテゴリ別集計                             │  │
│  │  - トークン最適化出力                         │  │
│  └──────────────┬────────────────────────────────┘  │
└─────────────────┼────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────┐
│  External Tools                                      │
│  - gitleaks (binary)                                 │
│  - snyk (npm package)                                │
│  - dependency-check (jar)                            │
└──────────────────────────────────────────────────────┘
```

## MCPツール定義

### 1. `scan_secrets`

シークレット（API Key、パスワード等）をスキャンします。

**入力パラメータ:**
```typescript
interface ScanSecretsParams {
  repositoryPath: string;        // スキャン対象パス
  scanHistory?: boolean;         // Git履歴もスキャン（デフォルト: true）
  includeAllowList?: string[];   // 除外パターン
  severity?: 'all' | 'high';     // 重要度フィルタ
}
```

**出力:**
```typescript
interface ScanSecretsResult {
  summary: {
    totalFindings: number;
    highSeverity: number;
    mediumSeverity: number;
  };
  findings: Array<{
    id: string;
    severity: 'high' | 'medium' | 'low';
    type: string;              // e.g., "AWS Access Key", "GitHub Token"
    file: string;
    line: number;
    commit?: string;           // Git履歴の場合
    snippet: string;           // 該当箇所（マスク済み）
    remediation: string;       // 修正方法
  }>;
  executionTime: number;       // ミリ秒
}
```

**使用例:**
```typescript
const result = await mcp.scan_secrets({
  repositoryPath: "/workspace/customer-repo",
  scanHistory: true,
  severity: "high"
});

// Claude Codeが受け取る内容（トークン最適化済み）
{
  summary: { totalFindings: 3, highSeverity: 2, mediumSeverity: 1 },
  findings: [
    {
      id: "gitleaks-001",
      severity: "high",
      type: "AWS Access Key",
      file: "config/aws.js",
      line: 12,
      snippet: "AWS_ACCESS_KEY = 'AKIA***************'",
      remediation: "1. トークンを無効化 2. AWS Secrets Managerを使用"
    }
  ]
}
```

---

### 2. `scan_dependencies`

依存関係の脆弱性をスキャンします。

**入力パラメータ:**
```typescript
interface ScanDependenciesParams {
  repositoryPath: string;
  packageManager?: 'npm' | 'composer' | 'maven' | 'auto';  // 自動検出
  severity?: 'critical' | 'high' | 'all';
  includeDevDependencies?: boolean;
}
```

**出力:**
```typescript
interface ScanDependenciesResult {
  summary: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    outdatedPackages: number;
  };
  vulnerabilities: Array<{
    id: string;                // CVE-2024-XXXXX
    severity: 'critical' | 'high' | 'medium' | 'low';
    package: string;
    installedVersion: string;
    fixedVersion?: string;
    title: string;
    description: string;
    cvssScore?: number;
    remediation: string;
    references: string[];      // CVE詳細URL等
  }>;
  executionTime: number;
}
```

**使用例:**
```typescript
const result = await mcp.scan_dependencies({
  repositoryPath: "/workspace/customer-repo",
  severity: "critical"
});

// 出力例
{
  summary: { totalVulnerabilities: 5, critical: 2, high: 3 },
  vulnerabilities: [
    {
      id: "CVE-2024-12345",
      severity: "critical",
      package: "lodash",
      installedVersion: "4.17.15",
      fixedVersion: "4.17.21",
      title: "Prototype Pollution in lodash",
      cvssScore: 9.1,
      remediation: "npm install lodash@4.17.21",
      references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-12345"]
    }
  ]
}
```

---

### 3. `scan_all`

全てのセキュリティスキャンを並列実行します。

**入力パラメータ:**
```typescript
interface ScanAllParams {
  repositoryPath: string;
  enableGitleaks?: boolean;      // デフォルト: true
  enableSnyk?: boolean;          // デフォルト: true
  enableOwasp?: boolean;         // デフォルト: true
  severity?: 'critical' | 'high' | 'all';
  timeoutMs?: number;            // タイムアウト（デフォルト: 300000 = 5分）
}
```

**出力:**
```typescript
interface ScanAllResult {
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: {
      secrets: number;
      dependencies: number;
      cve: number;
    };
  };
  secrets?: ScanSecretsResult;
  dependencies?: ScanDependenciesResult;
  cve?: OWASPScanResult;
  executionTime: number;
  warnings?: string[];           // タイムアウト等
}
```

---

### 4. `aggregate_results`

過去のスキャン結果と比較し、新規・修正済み・継続の分類を行います。

**入力パラメータ:**
```typescript
interface AggregateResultsParams {
  currentScanId: string;
  previousScanId?: string;
  projectId: string;
}
```

**出力:**
```typescript
interface AggregateResultsOutput {
  comparison: {
    newIssues: number;
    resolvedIssues: number;
    continuingIssues: number;
  };
  trend: 'improving' | 'worsening' | 'stable';
  details: {
    new: Array<SecurityFinding>;
    resolved: Array<SecurityFinding>;
    continuing: Array<SecurityFinding>;
  };
}
```

---

## データモデル

### 統一セキュリティFinding

```typescript
interface SecurityFinding {
  id: string;                    // 一意ID
  source: 'gitleaks' | 'snyk' | 'owasp';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'secret' | 'dependency' | 'cve' | 'code';
  title: string;
  description: string;
  location: {
    file?: string;
    line?: number;
    package?: string;
    version?: string;
  };
  remediation: string;
  references: string[];
  detectedAt: Date;
  hash: string;                  // 重複検出用ハッシュ
}
```

### スキャン結果キャッシュ

```typescript
interface ScanCache {
  scanId: string;
  projectId: string;
  repositoryPath: string;
  timestamp: Date;
  findings: SecurityFinding[];
  metadata: {
    gitleaksVersion?: string;
    snykVersion?: string;
    owaspVersion?: string;
  };
}
```

## 実装技術スタック

### 言語・フレームワーク
- **言語**: TypeScript (Node.js)
- **MCPフレームワーク**: `@modelcontextprotocol/sdk`
- **プロセス実行**: `execa` または `child_process`

### 外部ツール
- **Gitleaks**: バイナリ (`gitleaks`)
- **Snyk**: npm package (`snyk`)
- **OWASP Dependency-Check**: Javaアプリ (Docker経由)

### ユーティリティ
- **並列実行**: `p-limit`
- **キャッシュ**: `node-cache` または `redis`
- **ハッシュ**: `crypto` (SHA-256)
- **ロギング**: `winston`

## ディレクトリ構造

```
security-scanner/
├── DESIGN.md                    # この設計書
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # MCPサーバーエントリーポイント
│   ├── tools/
│   │   ├── scan-secrets.ts      # Gitleaksラッパー
│   │   ├── scan-dependencies.ts # Snykラッパー
│   │   ├── scan-cve.ts          # OWASPラッパー
│   │   └── aggregate.ts         # 結果集約
│   ├── runners/
│   │   ├── gitleaks-runner.ts
│   │   ├── snyk-runner.ts
│   │   └── owasp-runner.ts
│   ├── normalizer/
│   │   ├── finding-normalizer.ts
│   │   └── deduplicator.ts
│   ├── cache/
│   │   └── scan-cache.ts
│   └── utils/
│       ├── logger.ts
│       └── hash.ts
├── Dockerfile                   # Docker化
└── README.md
```

## 実装フェーズ

### Phase 1: 基本機能（3日）
- [ ] MCPサーバー骨格実装
- [ ] Gitleaksラッパー実装
- [ ] `scan_secrets` ツール実装
- [ ] 統一フォーマット変換

### Phase 2: 依存関係スキャン（2日）
- [ ] Snykラッパー実装
- [ ] `scan_dependencies` ツール実装
- [ ] 重複除去ロジック

### Phase 3: CVEスキャン（2日）
- [ ] OWASP Dependency-Checkラッパー実装
- [ ] Docker統合
- [ ] `scan_all` ツール実装

### Phase 4: 集約・最適化（1日）
- [ ] `aggregate_results` ツール実装
- [ ] キャッシング機構
- [ ] トークン最適化

### Phase 5: テスト・ドキュメント（2日）
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] ドキュメント整備

**合計開発期間: 10営業日（2週間）**

## セキュリティ考慮事項

### 1. シークレットの取り扱い
- スキャン結果内のシークレットは常にマスク（最初の4文字のみ表示）
- ログファイルにシークレットを記録しない
- キャッシュデータは暗号化

### 2. 実行権限
- 最小権限の原則（読み取り専用）
- サンドボックス内で実行（Docker推奨）
- ファイルシステムアクセス制限

### 3. APIトークン管理
- Snyk TokenはMCP設定から取得
- 環境変数による注入
- トークンのログ出力禁止

## パフォーマンス最適化

### 1. 並列実行
- 3つのツールを並列実行（最大3並列）
- タイムアウト: 5分（設定可能）

### 2. キャッシング
- スキャン結果を24時間キャッシュ
- リポジトリハッシュで変更検出
- 差分スキャン対応

### 3. トークン削減
- Critical/High のみデフォルト出力
- 詳細情報は要求時のみ
- サマリー情報を優先

## トラブルシューティング

### ツールのインストールエラー
```bash
# Gitleaks
brew install gitleaks  # macOS
apt-get install gitleaks  # Ubuntu

# Snyk
npm install -g snyk
snyk auth  # 認証

# OWASP Dependency-Check
docker pull owasp/dependency-check
```

### スキャンタイムアウト
- 大規模リポジトリでは `.gitignore` で不要ファイルを除外
- 並列度を調整
- 個別ツール実行に切り替え

## 今後の拡張案

1. **追加ツール統合**
   - Trivy（コンテナスキャン）
   - Semgrep（SAST）
   - Bandit（Python専用）

2. **CI/CD統合**
   - GitHub Actions連携
   - GitLab CI連携
   - 自動Issue作成

3. **レポート機能**
   - PDF出力
   - HTML Dashboard
   - Slack通知

---

## 参考リンク

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Snyk CLI Documentation](https://docs.snyk.io/snyk-cli)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [MCP SDK Documentation](https://modelcontextprotocol.io/)
