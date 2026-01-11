# 改善提案コンテキストMCPサーバー 設計書

## 概要

改善提案コンテキストMCPサーバーは、IT資産監査で発見されたIssueから改善提案を生成する際に、Claude Codeが必要とする最小限のコンテキスト情報を効率的に提供するMCPサーバーです。

## 目的

1. **トークン削減**: ファイル全体を渡さず、問題箇所周辺のみを提供
2. **精度向上**: 過去の類似Issueから学習し、一貫性のある提案を生成
3. **コンテキスト最適化**: 依存関係、設定ファイル等の必要情報のみを抽出
4. **ナレッジベース化**: 過去の改善提案をベクトル検索可能に保存

## 背景

事業計画のTool 8「改善提案テンプレートジェネレーター」では、Claude APIを使って改善提案を半自動生成します。しかし、以下の課題があります：

- **課題1**: ファイル全体を送るとトークン消費が大きい（50K tokens/提案）
- **課題2**: 過去の類似提案を参照できず、一貫性が保てない
- **課題3**: 依存関係や設定ファイルの情報が不足し、提案精度が低い

本MCPサーバーは、これらの課題を解決します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│           Claude Code (MCP Client)                  │
│           ↓ Issue情報を渡す                         │
└─────────────────┬───────────────────────────────────┘
                  │ MCP Protocol
                  │
┌─────────────────▼───────────────────────────────────┐
│      Proposal Context MCP Server                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Context Extractor                           │   │
│  │  1. 問題箇所のコードスニペット抽出           │   │
│  │  2. 依存ライブラリ情報抽出                   │   │
│  │  3. 設定ファイル抽出                         │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐   │
│  │  Vector Search Engine                        │   │
│  │  - 過去Issueのベクトル化                     │   │
│  │  - 類似Issue検索（Top 3）                    │   │
│  │  - 類似提案取得                              │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐   │
│  │  Dependency Analyzer                         │   │
│  │  - package.json/composer.json解析            │   │
│  │  - 使用中のライブラリバージョン確認         │   │
│  │  - 互換性情報取得                            │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐   │
│  │  Token Optimizer                             │   │
│  │  - コンテキスト情報を統合                    │   │
│  │  - トークン数を計算                          │   │
│  │  - 10K tokens以下に最適化                    │   │
│  └──────────────┬───────────────────────────────┘   │
└─────────────────┼────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────┐
│  Storage                                             │
│  - Vector DB (Chroma / PGVector)                     │
│  - Metrics DB (SQLite / PostgreSQL)                  │
│  - File System (Code Snippets Cache)                 │
└──────────────────────────────────────────────────────┘
```

## MCPツール定義

### 1. `get_issue_context`

Issueに関連する最小限のコンテキストを取得します。

**入力パラメータ:**
```typescript
interface GetIssueContextParams {
  issueId: string;
  projectId: string;
  includeSnippet?: boolean;       // コードスニペット（デフォルト: true）
  includeDependencies?: boolean;  // 依存関係情報（デフォルト: true）
  includeConfig?: boolean;        // 設定ファイル（デフォルト: false）
  contextLines?: number;          // 前後の行数（デフォルト: 10）
}
```

**出力:**
```typescript
interface IssueContextResult {
  issue: {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    file: string;
    line: number;
  };
  codeSnippet?: {
    language: string;
    file: string;
    startLine: number;
    endLine: number;
    code: string;              // 問題箇所±10行
    highlightLine: number;     // 問題の行
  };
  dependencies?: {
    direct: Array<{
      name: string;
      version: string;
      latestVersion?: string;
    }>;
    affected?: Array<{         // 問題に関連するライブラリ
      name: string;
      version: string;
      knownIssues?: string[];
    }>;
  };
  configuration?: {
    files: Array<{
      path: string;
      relevantSettings: Record<string, any>;
    }>;
  };
  estimatedTokens: number;     // このコンテキストのトークン数
}
```

**使用例:**
```typescript
// Issue: "lodash の Prototype Pollution 脆弱性"
const context = await mcp.get_issue_context({
  issueId: "ISS-001",
  projectId: "proj-001",
  contextLines: 10
});

// 出力例（トークン最適化済み）
{
  issue: {
    id: "ISS-001",
    title: "Prototype Pollution in lodash",
    category: "security",
    severity: "critical",
    file: "src/utils/helper.js",
    line: 12
  },
  codeSnippet: {
    language: "javascript",
    file: "src/utils/helper.js",
    startLine: 7,
    endLine: 17,
    code: `
      7: const _ = require('lodash');
      8:
      9: function mergeConfig(defaults, custom) {
     10:   // 問題: lodash 4.17.15 の merge は脆弱
     11:   return _.merge(defaults, custom);
     12: }
     13:
     14: module.exports = { mergeConfig };
    `,
    highlightLine: 11
  },
  dependencies: {
    direct: [
      {
        name: "lodash",
        version: "4.17.15",
        latestVersion: "4.17.21"
      }
    ],
    affected: [
      {
        name: "lodash",
        version: "4.17.15",
        knownIssues: ["CVE-2024-12345: Prototype Pollution"]
      }
    ]
  },
  estimatedTokens: 850  // 全ファイル読込(50K) → 850tokensに削減
}
```

---

### 2. `search_similar_proposals`

過去の類似改善提案をベクトル検索で取得します。

**入力パラメータ:**
```typescript
interface SearchSimilarProposalsParams {
  issueId: string;
  projectId?: string;           // 指定しない場合は全プロジェクト対象
  limit?: number;               // 取得件数（デフォルト: 3）
  similarityThreshold?: number; // 類似度閾値 0-1（デフォルト: 0.7）
}
```

**出力:**
```typescript
interface SimilarProposalsResult {
  query: {
    issueId: string;
    issueTitle: string;
    issueCategory: string;
  };
  similar: Array<{
    proposalId: string;
    issueId: string;
    issueTitle: string;
    similarity: number;         // 0-1
    proposal: {
      approach: string;         // 改善アプローチ
      codeExample?: string;     // コード例
      steps: string[];          // 実装ステップ
      risks: string[];          // リスク
      effort: string;           // 見積工数
    };
    outcome?: {                 // 実際の結果（実装済みの場合）
      status: 'success' | 'partial' | 'failed';
      actualEffort?: string;
      lessons?: string;
    };
  }>;
  totalFound: number;
}
```

**使用例:**
```typescript
const similar = await mcp.search_similar_proposals({
  issueId: "ISS-001",
  limit: 3,
  similarityThreshold: 0.75
});

// 出力例
{
  query: {
    issueId: "ISS-001",
    issueTitle: "Prototype Pollution in lodash",
    issueCategory: "security"
  },
  similar: [
    {
      proposalId: "PROP-042",
      issueId: "ISS-042",
      issueTitle: "Prototype Pollution in lodash (別プロジェクト)",
      similarity: 0.95,
      proposal: {
        approach: "lodashを4.17.21にアップグレード。_.merge()の使用箇所を確認し、ユーザー入力を受け付ける箇所では_.mergeWith()に変更",
        codeExample: "const result = _.mergeWith(defaults, userInput, (obj, src) => { ... });",
        steps: [
          "1. package.jsonのlodashバージョンを更新",
          "2. npm install実行",
          "3. _.merge()使用箇所を検索（全12箇所）",
          "4. ユーザー入力を受け付ける3箇所を_.mergeWith()に変更",
          "5. 単体テスト実行"
        ],
        risks: ["下位互換性の問題", "他の依存ライブラリへの影響"],
        effort: "2時間"
      },
      outcome: {
        status: "success",
        actualEffort: "1.5時間",
        lessons: "事前にsnapshot testを追加したことで安全に移行できた"
      }
    }
  ],
  totalFound: 5
}
```

---

### 3. `extract_code_snippet`

指定した位置のコードスニペットを抽出します。

**入力パラメータ:**
```typescript
interface ExtractCodeSnippetParams {
  file: string;
  line: number;
  contextLines?: number;        // 前後の行数（デフォルト: 10）
  includeFunctionScope?: boolean;  // 関数全体を含む（デフォルト: false）
}
```

**出力:**
```typescript
interface CodeSnippetResult {
  file: string;
  language: string;
  snippet: {
    startLine: number;
    endLine: number;
    code: string;
    highlightLine: number;
  };
  context?: {
    functionName?: string;
    className?: string;
    imports?: string[];         // 関連するimport文
  };
  estimatedTokens: number;
}
```

---

### 4. `get_dependency_context`

依存関係の詳細情報を取得します。

**入力パラメータ:**
```typescript
interface GetDependencyContextParams {
  repositoryPath: string;
  packageName?: string;         // 特定パッケージのみ（省略時は全て）
  includeDevDependencies?: boolean;
}
```

**出力:**
```typescript
interface DependencyContextResult {
  packageManager: 'npm' | 'composer' | 'maven' | 'nuget';
  dependencies: Array<{
    name: string;
    version: string;
    latest: string;
    isOutdated: boolean;
    vulnerabilities?: Array<{
      id: string;              // CVE-XXXX
      severity: string;
      fixedIn: string;
    }>;
    usedIn?: string[];         // 使用しているファイル
  }>;
  lockFileHash?: string;       // package-lock.json等のハッシュ
}
```

---

### 5. `store_proposal`

生成した改善提案をベクトルDBに保存します。

**入力パラメータ:**
```typescript
interface StoreProposalParams {
  issueId: string;
  projectId: string;
  proposal: {
    approach: string;
    codeExample?: string;
    steps: string[];
    risks: string[];
    effort: string;
    expectedOutcome: string;
  };
}
```

**出力:**
```typescript
interface StoreProposalResult {
  proposalId: string;
  vectorId: string;             // ベクトルDBでのID
  storedAt: Date;
}
```

---

## データモデル

### Issue Document (ベクトル化対象)

```typescript
interface IssueDocument {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  codeSnippet?: string;
  tags: string[];
  createdAt: Date;

  // ベクトル検索用
  embedding: number[];          // OpenAI text-embedding-3-small (1536次元)
}
```

### Proposal Document (ベクトル化対象)

```typescript
interface ProposalDocument {
  id: string;
  issueId: string;
  projectId: string;
  approach: string;
  codeExample?: string;
  steps: string[];
  risks: string[];
  effort: string;
  outcome?: {
    status: 'success' | 'partial' | 'failed';
    actualEffort?: string;
    lessons?: string;
  };
  createdAt: Date;

  // ベクトル検索用
  embedding: number[];
}
```

## ベクトルデータベース選定

### オプション1: Chroma DB（推奨）

**メリット:**
- Pythonバインディングが充実
- セットアップ簡単
- 小～中規模に最適

**セットアップ:**
```bash
pip install chromadb
```

**使用例:**
```python
import chromadb

client = chromadb.Client()
collection = client.create_collection("proposals")

# Embedding保存
collection.add(
    ids=["PROP-001"],
    embeddings=[[0.1, 0.2, ...]],
    metadatas=[{"issueId": "ISS-001", "projectId": "proj-001"}]
)

# 類似検索
results = collection.query(
    query_embeddings=[[0.1, 0.2, ...]],
    n_results=3
)
```

### オプション2: PostgreSQL + pgvector

**メリット:**
- 既存のPostgreSQLインフラを活用
- ACID準拠
- 大規模データに対応

**セットアップ:**
```sql
CREATE EXTENSION vector;

CREATE TABLE proposals (
    id TEXT PRIMARY KEY,
    issue_id TEXT,
    approach TEXT,
    embedding vector(1536)
);

CREATE INDEX ON proposals USING ivfflat (embedding vector_cosine_ops);
```

**使用例:**
```sql
-- 類似検索
SELECT id, approach, 1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM proposals
WHERE 1 - (embedding <=> '[0.1, 0.2, ...]') > 0.7
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 3;
```

## Embedding生成

### OpenAI Embeddings API

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Issue文書をベクトル化
const issueText = `
  タイトル: ${issue.title}
  説明: ${issue.description}
  カテゴリ: ${issue.category}
  コード: ${issue.codeSnippet}
`;

const embedding = await generateEmbedding(issueText);
```

**コスト:**
- text-embedding-3-small: $0.02 / 1M tokens
- 1Issue当たり約200tokens → $0.000004/Issue
- 10,000 Issues → $0.04

## 実装技術スタック

### 言語・フレームワーク
- **言語**: TypeScript (Node.js)
- **MCPフレームワーク**: `@modelcontextprotocol/sdk`
- **Embedding**: OpenAI API (`openai` npm package)

### ベクトルDB
- **推奨**: Chroma DB (`chromadb` Python → Node.js wrapper)
- **代替**: PostgreSQL + pgvector

### ユーティリティ
- **コード解析**: `@babel/parser` (JavaScript), `tree-sitter` (汎用)
- **依存関係解析**: `npm-check-updates`, `composer show`
- **トークンカウント**: `tiktoken`
- **ロギング**: `winston`

## ディレクトリ構造

```
proposal-context/
├── DESIGN.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # MCPサーバーエントリーポイント
│   ├── tools/
│   │   ├── get-issue-context.ts
│   │   ├── search-similar-proposals.ts
│   │   ├── extract-code-snippet.ts
│   │   ├── get-dependency-context.ts
│   │   └── store-proposal.ts
│   ├── extractors/
│   │   ├── code-snippet-extractor.ts
│   │   ├── dependency-extractor.ts
│   │   └── config-extractor.ts
│   ├── vector/
│   │   ├── embedding-generator.ts
│   │   ├── vector-store.ts         # Chroma/PGVector抽象化
│   │   └── similarity-search.ts
│   ├── analyzers/
│   │   ├── ast-parser.ts           # AST解析
│   │   └── scope-analyzer.ts       # 関数スコープ検出
│   ├── optimizers/
│   │   └── token-optimizer.ts      # トークン数最適化
│   └── utils/
│       ├── logger.ts
│       └── token-counter.ts
├── python/                          # Chroma DB用Pythonラッパー
│   ├── vector_server.py
│   └── requirements.txt
└── README.md
```

## 実装フェーズ

### Phase 1: コンテキスト抽出（5日）
- [ ] コードスニペット抽出実装
- [ ] 依存関係解析実装
- [ ] `get_issue_context` ツール実装
- [ ] トークン最適化

### Phase 2: ベクトル検索基盤（6日）
- [ ] Chroma DBセットアップ
- [ ] Embedding生成実装
- [ ] ベクトル保存・検索実装
- [ ] `search_similar_proposals` ツール実装

### Phase 3: 提案保存（3日）
- [ ] `store_proposal` ツール実装
- [ ] メタデータ管理
- [ ] フィードバックループ（実装結果の保存）

### Phase 4: 最適化・テスト（4日）
- [ ] 検索精度チューニング
- [ ] キャッシング実装
- [ ] ユニットテスト
- [ ] ドキュメント整備

**合計開発期間: 18営業日（3.5週間）**

## パフォーマンス最適化

### 1. Embeddingキャッシュ
- 同じIssueテキストは再計算しない
- Redisでキャッシュ（TTL: 7日）

### 2. コードスニペットキャッシュ
- ファイルハッシュでキャッシュ
- Git commit毎に無効化

### 3. バッチEmbedding生成
- 複数Issueを一度にベクトル化
- API呼び出し回数削減

### 4. トークン最適化
- 不要な空白・コメント削除
- 変数名の短縮は行わない（可読性優先）

## トラブルシューティング

### ベクトル検索の精度が低い
```typescript
// 類似度閾値を調整
const similar = await search({
  threshold: 0.6  // 0.7 → 0.6に下げて結果を増やす
});

// Embeddingモデルを変更
// text-embedding-3-small → text-embedding-3-large
```

### OpenAI APIレート制限
```typescript
// Retry with exponential backoff
import pRetry from 'p-retry';

await pRetry(
  () => generateEmbedding(text),
  { retries: 3, minTimeout: 1000 }
);
```

### トークン数が大きすぎる
```typescript
// contextLinesを減らす
const context = await getIssueContext({
  contextLines: 5  // 10 → 5に削減
});

// 設定ファイルを除外
const context = await getIssueContext({
  includeConfig: false
});
```

## 今後の拡張案

1. **自動フィードバックループ**
   - 実装結果を自動収集
   - 成功率を計算
   - 提案精度を自動改善

2. **マルチモーダル対応**
   - 図表・スクリーンショットの埋め込み
   - Claude Vision APIとの統合

3. **カスタムEmbeddingモデル**
   - ドメイン特化型モデルのファインチューニング
   - プロジェクト固有の用語対応

---

## 参考リンク

- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Chroma DB Documentation](https://docs.trychroma.com/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [tiktoken (トークンカウンタ)](https://github.com/openai/tiktoken)
