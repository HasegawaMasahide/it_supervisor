# API連携実装ガイド

**作成日**: 2025-12-18
**目的**: 各種API（Google、Claude、OpenAI等）の連携を堅牢かつメンテナンス可能な形で実装する

---

## 📋 目次

1. [最大の課題と解決方針](#最大の課題と解決方針)
2. [アーキテクチャ設計原則](#アーキテクチャ設計原則)
3. [統一インテグレーション層](#統一インテグレーション層)
4. [サービス別実装ガイド](#サービス別実装ガイド)
5. [認証・認可管理](#認証認可管理)
6. [エラーハンドリング戦略](#エラーハンドリング戦略)
7. [ワークフロー管理](#ワークフロー管理)
8. [監視・デバッグ](#監視デバッグ)
9. [実装の順序](#実装の順序)

---

## 最大の課題と解決方針

### 課題の整理

```typescript
interface IntegrationChallenges {
  複雑性: {
    problem: "6種類以上のAPI（Google×5、Claude、OpenAI）を組み合わせる",
    risk: "各APIの仕様・認証・エラーハンドリングが異なり、コードが複雑化"
  };

  信頼性: {
    problem: "外部APIの障害、レート制限、タイムアウトが発生する",
    risk: "パイプラインの途中で失敗し、データが中途半端な状態になる"
  };

  メンテナンス性: {
    problem: "各APIのバージョンアップ、仕様変更に追従する必要がある",
    risk: "修正箇所が散在し、影響範囲が不明確"
  };

  デバッグ性: {
    problem: "複数のAPIを跨ぐ処理のため、エラーの原因特定が困難",
    risk: "本番環境でのトラブルシューティングに時間がかかる"
  };
}
```

### 解決方針

```typescript
interface Solution {
  principle1_abstraction: {
    strategy: "アダプターパターンで各APIをラップ",
    benefit: "APIの差異を吸収、共通インターフェースで扱える"
  };

  principle2_resilience: {
    strategy: "リトライ・タイムアウト・サーキットブレーカーを標準装備",
    benefit: "一時的な障害を自動復旧"
  };

  principle3_observability: {
    strategy: "すべての処理を構造化ログ・トレースで記録",
    benefit: "問題発生時の追跡が容易"
  };

  principle4_workflow: {
    strategy: "ワークフローエンジンで状態管理",
    benefit: "中断・再開が可能、デバッグが容易"
  };
}
```

---

## アーキテクチャ設計原則

### レイヤー構造

```
┌────────────────────────────────────────────────────────┐
│              Application Layer                          │
│  (ビジネスロジック: DocumentProcessor, MeetingProcessor) │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│             Integration Layer                           │
│  (統一インターフェース: BaseAdapter, with リトライ・ログ)  │
└────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Adapters   │ │   Adapters   │ │   Adapters   │
│              │ │              │ │              │
│ Google APIs  │ │ Claude API   │ │ OpenAI API   │
└──────────────┘ └──────────────┘ └──────────────┘
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Google Cloud │ │  Anthropic   │ │   OpenAI     │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 設計原則

```typescript
const designPrinciples = {
  DRY: {
    principle: "Don't Repeat Yourself",
    application: "リトライ・ログ・エラーハンドリングは共通化"
  },

  SOLID_D: {
    principle: "Dependency Inversion（依存性逆転）",
    application: "具象クラス（各API SDK）ではなく抽象インターフェースに依存"
  },

  FailFast: {
    principle: "早期に失敗を検出",
    application: "APIレスポンスの検証を厳格に、異常があれば即座にエラー"
  },

  Idempotency: {
    principle: "冪等性の確保",
    application: "同じ処理を複数回実行しても結果が同じになるように設計"
  },

  Observability: {
    principle: "可観測性",
    application: "すべての処理に trace_id を付与、構造化ログで記録"
  }
};
```

---

## 統一インテグレーション層

### BaseAdapter 抽象クラス

```typescript
// tools/packages/integration-layer/src/adapters/BaseAdapter.ts

import { Logger } from 'winston';
import pRetry from 'p-retry';
import { v4 as uuidv4 } from 'uuid';

/**
 * すべてのAPIアダプターの基底クラス
 * リトライ、ログ、エラーハンドリングを共通化
 */
export abstract class BaseAdapter<TConfig = unknown> {
  protected logger: Logger;
  protected config: TConfig;
  protected serviceName: string;

  constructor(serviceName: string, config: TConfig, logger: Logger) {
    this.serviceName = serviceName;
    this.config = config;
    this.logger = logger.child({ service: serviceName });
  }

  /**
   * APIリクエストを実行（リトライ・ログ付き）
   */
  protected async executeWithRetry<TResult>(
    operation: () => Promise<TResult>,
    operationName: string,
    options: {
      retries?: number;
      timeout?: number;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<TResult> {
    const traceId = uuidv4();
    const startTime = Date.now();

    this.logger.info('API request started', {
      traceId,
      operationName,
      service: this.serviceName,
    });

    try {
      const result = await pRetry(
        async () => {
          try {
            return await this.withTimeout(operation(), options.timeout ?? 60000);
          } catch (error) {
            this.logger.warn('API request failed, retrying...', {
              traceId,
              operationName,
              error: this.serializeError(error),
              attempt: (error as any).attemptNumber,
            });
            throw error;
          }
        },
        {
          retries: options.retries ?? 3,
          factor: 2, // exponential backoff
          minTimeout: 1000,
          maxTimeout: 10000,
          onFailedAttempt: (error) => {
            if (options.shouldRetry && !options.shouldRetry(error)) {
              throw error; // リトライ不要なエラーは即座に失敗
            }
          },
        }
      );

      const duration = Date.now() - startTime;
      this.logger.info('API request succeeded', {
        traceId,
        operationName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('API request failed after retries', {
        traceId,
        operationName,
        duration,
        error: this.serializeError(error),
      });
      throw new APIError(
        `${this.serviceName}.${operationName} failed`,
        error as Error,
        { traceId, operationName }
      );
    }
  }

  /**
   * タイムアウト処理
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * エラーのシリアライズ（ログ出力用）
   */
  private serializeError(error: unknown): object {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any), // 追加プロパティも含める
      };
    }
    return { error: String(error) };
  }

  /**
   * コスト記録（LLM APIのトークン数等）
   */
  protected async recordCost(
    operationName: string,
    cost: {
      inputTokens?: number;
      outputTokens?: number;
      costUSD?: number;
    }
  ): Promise<void> {
    this.logger.info('API cost recorded', {
      operationName,
      service: this.serviceName,
      ...cost,
    });

    // TODO: PostgreSQL の costs テーブルに記録
  }
}

/**
 * カスタムエラークラス
 */
export class APIError extends Error {
  public readonly service: string;
  public readonly originalError: Error;
  public readonly metadata: Record<string, any>;

  constructor(message: string, originalError: Error, metadata: Record<string, any> = {}) {
    super(message);
    this.name = 'APIError';
    this.originalError = originalError;
    this.metadata = metadata;
    this.service = metadata.service || 'unknown';
  }
}
```

---

## サービス別実装ガイド

### 1. Google Document AI Adapter

```typescript
// tools/packages/integration-layer/src/adapters/GoogleDocumentAIAdapter.ts

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { BaseAdapter } from './BaseAdapter';

interface DocumentAIConfig {
  projectId: string;
  location: string;
  processorId: string;
  credentials?: object;
}

interface ProcessDocumentResult {
  text: string;
  entities: Array<{
    type: string;
    mentionText: string;
    confidence: number;
  }>;
  pages: Array<{
    pageNumber: number;
    blocks: Array<{
      text: string;
      boundingBox: number[];
    }>;
  }>;
}

export class GoogleDocumentAIAdapter extends BaseAdapter<DocumentAIConfig> {
  private client: DocumentProcessorServiceClient;

  constructor(config: DocumentAIConfig, logger: Logger) {
    super('google-document-ai', config, logger);

    this.client = new DocumentProcessorServiceClient({
      projectId: config.projectId,
      credentials: config.credentials,
    });
  }

  /**
   * ドキュメントを処理
   */
  async processDocument(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ProcessDocumentResult> {
    return this.executeWithRetry(
      async () => {
        const name = `projects/${this.config.projectId}/locations/${this.config.location}/processors/${this.config.processorId}`;

        const [result] = await this.client.processDocument({
          name,
          rawDocument: {
            content: fileBuffer,
            mimeType,
          },
        });

        if (!result.document) {
          throw new Error('No document in response');
        }

        // コスト記録
        await this.recordCost('processDocument', {
          costUSD: 0.015, // $1.50/1000pages として計算
        });

        return {
          text: result.document.text || '',
          entities: (result.document.entities || []).map((entity) => ({
            type: entity.type || '',
            mentionText: entity.mentionText || '',
            confidence: entity.confidence || 0,
          })),
          pages: (result.document.pages || []).map((page) => ({
            pageNumber: page.pageNumber || 0,
            blocks: (page.blocks || []).map((block) => ({
              text: block.layout?.textAnchor?.content || '',
              boundingBox: block.layout?.boundingPoly?.vertices?.map(v => v.x || 0) || [],
            })),
          })),
        };
      },
      'processDocument',
      {
        retries: 3,
        timeout: 120000, // OCRは時間がかかるので2分
        shouldRetry: (error) => {
          // レート制限エラーはリトライ
          if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
            return true;
          }
          // その他のクライアントエラーはリトライしない
          if (error.message.includes('400') || error.message.includes('INVALID_ARGUMENT')) {
            return false;
          }
          return true; // デフォルトはリトライ
        },
      }
    );
  }

  /**
   * バッチ処理（複数ドキュメント）
   */
  async processDocumentBatch(
    files: Array<{ buffer: Buffer; mimeType: string; fileName: string }>
  ): Promise<ProcessDocumentResult[]> {
    // 並列度5で実行（レート制限を考慮）
    const results: ProcessDocumentResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((file) =>
          this.processDocument(file.buffer, file.mimeType).catch((error) => {
            this.logger.error('Failed to process document in batch', {
              fileName: file.fileName,
              error,
            });
            throw error;
          })
        )
      );
      results.push(...batchResults);
    }

    return results;
  }
}
```

### 2. Claude API Adapter

```typescript
// tools/packages/integration-layer/src/adapters/ClaudeAdapter.ts

import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from './BaseAdapter';

interface ClaudeConfig {
  apiKey: string;
  model?: string;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
}

export class ClaudeAdapter extends BaseAdapter<ClaudeConfig> {
  private client: Anthropic;

  constructor(config: ClaudeConfig, logger: Logger) {
    super('claude-api', config, logger);

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * メッセージ送信（構造化出力）
   */
  async sendMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<ClaudeResponse> {
    return this.executeWithRetry(
      async () => {
        const response = await this.client.messages.create({
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        // JSONモードの場合、パース検証
        let content = '';
        if (response.content[0].type === 'text') {
          content = response.content[0].text;
        }

        if (options.jsonMode) {
          try {
            JSON.parse(content); // 検証
          } catch (error) {
            throw new Error(`Invalid JSON response: ${content.slice(0, 200)}...`);
          }
        }

        // コスト記録
        await this.recordCost('sendMessage', {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUSD:
            (response.usage.input_tokens / 1_000_000) * 3 +
            (response.usage.output_tokens / 1_000_000) * 15,
        });

        return {
          content,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          stopReason: response.stop_reason || 'unknown',
        };
      },
      'sendMessage',
      {
        retries: 3,
        timeout: 180000, // 3分（長文処理を考慮）
        shouldRetry: (error) => {
          // レート制限・サーバーエラーはリトライ
          if (
            error.message.includes('529') ||
            error.message.includes('overloaded') ||
            error.message.includes('rate_limit')
          ) {
            return true;
          }
          // クライアントエラーはリトライしない
          if (error.message.includes('400') || error.message.includes('invalid_request')) {
            return false;
          }
          return true;
        },
      }
    );
  }

  /**
   * プロンプトキャッシング対応版（長文処理の高速化・コスト削減）
   */
  async sendMessageWithCache(
    cachedContext: string, // キャッシュする長文（システムプロンプト、ドキュメント等）
    userMessage: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ClaudeResponse> {
    return this.executeWithRetry(
      async () => {
        const response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3,
          system: [
            {
              type: 'text',
              text: cachedContext,
              cache_control: { type: 'ephemeral' }, // プロンプトキャッシング
            },
          ],
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        });

        const content =
          response.content[0].type === 'text' ? response.content[0].text : '';

        // キャッシュ効果をログに記録
        const cacheStats = {
          cacheCreationTokens: (response.usage as any).cache_creation_input_tokens || 0,
          cacheReadTokens: (response.usage as any).cache_read_input_tokens || 0,
        };

        this.logger.info('Prompt caching stats', cacheStats);

        await this.recordCost('sendMessageWithCache', {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUSD:
            (response.usage.input_tokens / 1_000_000) * 3 +
            (response.usage.output_tokens / 1_000_000) * 15 +
            (cacheStats.cacheCreationTokens / 1_000_000) * 3.75 +
            (cacheStats.cacheReadTokens / 1_000_000) * 0.3, // キャッシュ読み取りは90%割引
        });

        return {
          content,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          stopReason: response.stop_reason || 'unknown',
        };
      },
      'sendMessageWithCache',
      {
        retries: 3,
        timeout: 180000,
      }
    );
  }
}
```

### 3. Gmail API Adapter

```typescript
// tools/packages/integration-layer/src/adapters/GmailAdapter.ts

import { google } from 'googleapis';
import { BaseAdapter } from './BaseAdapter';

interface GmailConfig {
  credentials: object;
  token: object;
}

interface EmailThread {
  threadId: string;
  subject: string;
  messages: Array<{
    id: string;
    from: string;
    to: string;
    date: string;
    body: string;
    attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      attachmentId: string;
    }>;
  }>;
}

export class GmailAdapter extends BaseAdapter<GmailConfig> {
  private gmail: any;

  constructor(config: GmailConfig, logger: Logger) {
    super('gmail-api', config, logger);

    const auth = new google.auth.OAuth2();
    auth.setCredentials(config.token);

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * ラベルでフィルタしてスレッドを取得
   */
  async getThreadsByLabel(
    labelName: string,
    options: {
      maxResults?: number;
      afterDate?: Date;
    } = {}
  ): Promise<EmailThread[]> {
    return this.executeWithRetry(
      async () => {
        // ラベルIDを取得
        const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
        const label = labelsResponse.data.labels.find(
          (l: any) => l.name === labelName
        );

        if (!label) {
          throw new Error(`Label not found: ${labelName}`);
        }

        // クエリ構築
        let query = `label:${label.id}`;
        if (options.afterDate) {
          const dateStr = options.afterDate.toISOString().split('T')[0].replace(/-/g, '/');
          query += ` after:${dateStr}`;
        }

        // スレッド一覧を取得
        const threadsResponse = await this.gmail.users.threads.list({
          userId: 'me',
          q: query,
          maxResults: options.maxResults || 100,
        });

        const threads = threadsResponse.data.threads || [];

        // 各スレッドの詳細を取得
        const threadDetails = await Promise.all(
          threads.map((thread: any) => this.getThreadDetail(thread.id))
        );

        return threadDetails;
      },
      'getThreadsByLabel',
      {
        retries: 3,
        timeout: 60000,
      }
    );
  }

  /**
   * スレッド詳細を取得
   */
  private async getThreadDetail(threadId: string): Promise<EmailThread> {
    const response = await this.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = response.data.messages || [];

    return {
      threadId,
      subject: this.getHeader(messages[0], 'Subject'),
      messages: messages.map((msg: any) => ({
        id: msg.id,
        from: this.getHeader(msg, 'From'),
        to: this.getHeader(msg, 'To'),
        date: this.getHeader(msg, 'Date'),
        body: this.extractBody(msg),
        attachments: this.extractAttachments(msg),
      })),
    };
  }

  /**
   * ヘッダー取得
   */
  private getHeader(message: any, headerName: string): string {
    const header = message.payload.headers.find(
      (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header ? header.value : '';
  }

  /**
   * 本文抽出
   */
  private extractBody(message: any): string {
    // テキスト形式を優先
    let body = '';

    const findTextPart = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        for (const subPart of part.parts) {
          const text = findTextPart(subPart);
          if (text) return text;
        }
      }
      return '';
    };

    body = findTextPart(message.payload);

    // HTMLからテキストを抽出（フォールバック）
    if (!body && message.payload.mimeType === 'text/html') {
      const htmlBody = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      // 簡易的なHTML除去（本番では cheerio 等を使用）
      body = htmlBody.replace(/<[^>]*>/g, '');
    }

    return body;
  }

  /**
   * 添付ファイル情報抽出
   */
  private extractAttachments(message: any): Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }> {
    const attachments: any[] = [];

    const findAttachments = (part: any) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        part.parts.forEach(findAttachments);
      }
    };

    findAttachments(message.payload);

    return attachments;
  }

  /**
   * 添付ファイルをダウンロード
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    return this.executeWithRetry(
      async () => {
        const response = await this.gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId,
        });

        return Buffer.from(response.data.data, 'base64');
      },
      'downloadAttachment',
      {
        retries: 3,
        timeout: 120000,
      }
    );
  }
}
```

---

## 認証・認可管理

### Secret Manager統合

```typescript
// tools/packages/integration-layer/src/auth/SecretManager.ts

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManager {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor(projectId: string) {
    this.projectId = projectId;
    this.client = new SecretManagerServiceClient();
  }

  /**
   * シークレット取得（キャッシュ付き）
   */
  async getSecret(secretName: string, version: string = 'latest'): Promise<string> {
    const cacheKey = `${secretName}:${version}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
    const [response] = await this.client.accessSecretVersion({ name });

    if (!response.payload?.data) {
      throw new Error(`Secret not found: ${secretName}`);
    }

    const value = response.payload.data.toString();

    // 5分間キャッシュ
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return value;
  }

  /**
   * 一括取得
   */
  async getSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const secrets = await Promise.all(
      secretNames.map(async (name) => ({
        name,
        value: await this.getSecret(name),
      }))
    );

    return Object.fromEntries(secrets.map((s) => [s.name, s.value]));
  }
}
```

### アダプターファクトリー

```typescript
// tools/packages/integration-layer/src/AdapterFactory.ts

import { GoogleDocumentAIAdapter } from './adapters/GoogleDocumentAIAdapter';
import { ClaudeAdapter } from './adapters/ClaudeAdapter';
import { GmailAdapter } from './adapters/GmailAdapter';
import { SecretManager } from './auth/SecretManager';
import { createLogger } from './logger';

export class AdapterFactory {
  private secretManager: SecretManager;
  private logger = createLogger('AdapterFactory');

  constructor(projectId: string) {
    this.secretManager = new SecretManager(projectId);
  }

  /**
   * Google Document AI アダプター作成
   */
  async createDocumentAIAdapter(): Promise<GoogleDocumentAIAdapter> {
    const credentials = JSON.parse(
      await this.secretManager.getSecret('google-cloud-credentials')
    );
    const projectId = await this.secretManager.getSecret('gcp-project-id');
    const processorId = await this.secretManager.getSecret('documentai-processor-id');

    return new GoogleDocumentAIAdapter(
      {
        projectId,
        location: 'us',
        processorId,
        credentials,
      },
      this.logger
    );
  }

  /**
   * Claude アダプター作成
   */
  async createClaudeAdapter(): Promise<ClaudeAdapter> {
    const apiKey = await this.secretManager.getSecret('claude-api-key');

    return new ClaudeAdapter(
      {
        apiKey,
        model: 'claude-3-5-sonnet-20241022',
      },
      this.logger
    );
  }

  /**
   * Gmail アダプター作成
   */
  async createGmailAdapter(userEmail: string): Promise<GmailAdapter> {
    const credentials = JSON.parse(
      await this.secretManager.getSecret('google-oauth-credentials')
    );
    const token = JSON.parse(
      await this.secretManager.getSecret(`gmail-token-${userEmail}`)
    );

    return new GmailAdapter(
      {
        credentials,
        token,
      },
      this.logger
    );
  }
}
```

---

## エラーハンドリング戦略

### リトライ可能エラーの判定

```typescript
// tools/packages/integration-layer/src/errors/RetryableError.ts

export class RetryableError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * エラーがリトライ可能かを判定
 */
export function isRetryable(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  // リトライすべきエラー
  const retryablePatterns = [
    'timeout',
    'econnreset',
    'enotfound',
    'econnrefused',
    '429', // Rate limit
    '500', // Internal server error
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
    'overloaded',
    'rate_limit',
  ];

  for (const pattern of retryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }

  // リトライすべきでないエラー
  const nonRetryablePatterns = [
    '400', // Bad request
    '401', // Unauthorized
    '403', // Forbidden
    '404', // Not found
    'invalid_request',
    'authentication_error',
  ];

  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return false;
    }
  }

  // デフォルトはリトライ
  return true;
}
```

---

## ワークフロー管理

### Inngest によるワークフロー定義

```typescript
// tools/packages/workflow-engine/src/workflows/DocumentProcessingWorkflow.ts

import { Inngest } from 'inngest';
import { AdapterFactory } from '@it-supervisor/integration-layer';

const inngest = new Inngest({ id: 'it-supervisor' });

/**
 * ドキュメント処理ワークフロー
 * - 中断・再開が可能
 * - 各ステップでリトライ
 * - 処理状態をDBに保存
 */
export const documentProcessingWorkflow = inngest.createFunction(
  {
    id: 'document-processing',
    retries: 3,
  },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { projectId, fileUrl, fileName, mimeType } = event.data;

    // Step 1: ファイルをダウンロード
    const fileBuffer = await step.run('download-file', async () => {
      const response = await fetch(fileUrl);
      return Buffer.from(await response.arrayBuffer());
    });

    // Step 2: Document AI で OCR
    const extractedData = await step.run('ocr-processing', async () => {
      const factory = new AdapterFactory(process.env.GCP_PROJECT_ID!);
      const docAI = await factory.createDocumentAIAdapter();

      return await docAI.processDocument(fileBuffer, mimeType);
    });

    // Step 3: Claude で構造化
    const structuredData = await step.run('structure-extraction', async () => {
      const factory = new AdapterFactory(process.env.GCP_PROJECT_ID!);
      const claude = await factory.createClaudeAdapter();

      const prompt = `
        以下のドキュメントから、プロジェクトに関する情報を抽出してください：

        ${extractedData.text}

        抽出すべき情報：
        - 現状の課題
        - 改善したいポイント
        - 予算感
        - 技術スタック

        JSON形式で出力してください。
      `;

      const response = await claude.sendMessage(
        [{ role: 'user', content: prompt }],
        'あなたはIT資産監査プロジェクトのヒアリング情報を整理するアシスタントです。',
        { jsonMode: true }
      );

      return JSON.parse(response.content);
    });

    // Step 4: PostgreSQL に保存
    await step.run('save-to-db', async () => {
      // Prisma で保存
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.hearing.create({
        data: {
          projectId,
          sourceType: 'document',
          originalFileUrl: fileUrl,
          originalFileName: fileName,
          mimeType,
          extractedText: extractedData.text,
          structuredData: structuredData,
          processedAt: new Date(),
          processedBy: 'google-document-ai + claude-3.5-sonnet',
        },
      });
    });

    return { success: true, projectId, fileName };
  }
);
```

### Inngest のメリット

```typescript
const inngestBenefits = {
  durability: {
    description: "各ステップの結果を永続化",
    benefit: "障害発生時に途中から再開可能"
  },

  observability: {
    description: "ワークフローの進行状況をダッシュボードで可視化",
    benefit: "デバッグが容易"
  },

  retry: {
    description: "ステップごとにリトライポリシーを設定",
    benefit: "一時的な障害を自動復旧"
  },

  scheduling: {
    description: "遅延実行、定期実行が可能",
    benefit: "バッチ処理やリマインダーに活用"
  },

  local: {
    description: "ローカル環境でも同じコードで動作",
    benefit: "開発体験が良い"
  }
};
```

---

## 監視・デバッグ

### 構造化ログ

```typescript
// tools/packages/integration-layer/src/logger.ts

import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export function createLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      // Cloud Logging
      loggingWinston,

      // コンソール（開発環境）
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
}
```

### トレーシング

```typescript
// tools/packages/integration-layer/src/tracing.ts

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(new TraceExporter({
    projectId: process.env.GCP_PROJECT_ID,
  }))
);
provider.register();

registerInstrumentations({
  instrumentations: [new HttpInstrumentation()],
});

/**
 * 関数をトレーシング
 */
export function traced<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('it-supervisor');
  const span = tracer.startSpan(operationName);

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 実装の順序

### Phase 1: 基盤構築（Week 1）

```bash
# 優先度1: 基盤
✓ BaseAdapter 実装
✓ Logger、Tracing セットアップ
✓ SecretManager 実装
✓ AdapterFactory 実装

# 優先度2: 最もシンプルなアダプター（Gmail）
✓ GmailAdapter 実装
✓ 単体テスト
✓ 動作確認
```

### Phase 2: コアアダプター（Week 2）

```bash
# 優先度3: Document AI（OCR）
✓ GoogleDocumentAIAdapter 実装
✓ PDF、Word、Excel、画像対応
✓ テスト

# 優先度4: Claude（構造化）
✓ ClaudeAdapter 実装
✓ プロンプトキャッシング対応
✓ JSON出力検証
✓ テスト
```

### Phase 3: ワークフロー（Week 3）

```bash
# 優先度5: ワークフロー統合
✓ Inngest セットアップ
✓ DocumentProcessingWorkflow 実装
✓ エンドツーエンドテスト
```

### Phase 4: 残りのアダプター（Week 4）

```bash
# 優先度6: その他のアダプター
✓ GeminiAdapter（会議文字起こし）
✓ NotebookLM統合（手動 or API）
✓ OpenAIAdapter（バックアップ）
```

---

## まとめ

### 成功のカギ

```typescript
const successFactors = {
  abstraction: {
    strategy: "BaseAdapter で共通処理を実装",
    result: "各アダプターは本質的なロジックのみに集中"
  },

  resilience: {
    strategy: "リトライ・タイムアウト・エラーハンドリングを標準装備",
    result: "一時的な障害に強い"
  },

  observability: {
    strategy: "構造化ログ・トレーシングで可視化",
    result: "デバッグが容易"
  },

  workflow: {
    strategy: "Inngest でワークフロー管理",
    result: "中断・再開が可能、複雑な処理も整理"
  },

  incrementalImplementation: {
    strategy: "シンプルなアダプターから段階的に実装",
    result: "早期にフィードバックを得られる"
  }
};
```

### 次のアクション

```bash
# 1. プロジェクト初期化
cd tools/packages
mkdir integration-layer
cd integration-layer
npm init -y

# 2. 依存パッケージインストール
npm install \
  @anthropic-ai/sdk \
  @google-cloud/documentai \
  @google-cloud/secret-manager \
  @google-cloud/logging-winston \
  googleapis \
  p-retry \
  winston \
  uuid

npm install -D \
  @types/node \
  typescript

# 3. BaseAdapter 実装開始
mkdir -p src/adapters
touch src/adapters/BaseAdapter.ts
```

---

**作成者**: IT Supervisor チーム
**参照**: [ヒアリング情報処理パイプライン設計書.md](./ヒアリング情報処理パイプライン設計書.md)
