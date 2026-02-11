# API Documentation - @it-supervisor/sandbox-builder

解析対象のシステムを安全に動作させるサンドボックス環境を自動構築するパッケージです。

## クラス

### `SandboxBuilder`

サンドボックス環境の検出と構築を行うメインクラス。

#### コンストラクタ

```typescript
new SandboxBuilder()
```

パラメータなしでインスタンスを生成します。

**例:**
```typescript
import { SandboxBuilder } from '@it-supervisor/sandbox-builder';

const builder = new SandboxBuilder();
```

---

### メソッド

#### `detect(appPath: string): Promise<DetectionResult>`

アプリケーションの環境を自動検出します。

**パラメータ:**
- `appPath` (string): アプリケーションのパス

**戻り値:**
- `Promise<DetectionResult>`: 検出結果

**throws:**
- パスが存在しない場合にエラー
- ファイル読み込みエラー

**例:**
```typescript
const detection = await builder.detect('./my-app');

console.log('Environment type:', detection.type);
console.log('Runtime:', detection.details.runtime);
console.log('Version:', detection.details.version);
console.log('Databases:', detection.databases);
console.log('Confidence:', detection.confidence);
```

---

#### `build(appPath: string, options?: BuildOptions): Promise<SandboxEnvironment>`

サンドボックス環境を構築します。

**パラメータ:**
- `appPath` (string): アプリケーションのパス
- `options` (BuildOptions, optional): 構築オプション

**戻り値:**
- `Promise<SandboxEnvironment>`: 構築された環境オブジェクト

**throws:**
- パスが存在しない場合にエラー
- Docker Compose生成エラー
- 環境構築エラー

**例:**
```typescript
const sandbox = await builder.build('./my-app', {
  outputDir: './sandbox-env',
  isolation: IsolationLevel.RESTRICTED
});

console.log('Environment created:', sandbox.path);
console.log('Services:', sandbox.services);
```

---

### `SandboxEnvironment`

構築されたサンドボックス環境を操作するクラス。

#### メソッド

#### `up(options?: { detached?: boolean }): Promise<void>`

サンドボックス環境を起動します。

**パラメータ:**
- `options.detached` (boolean, optional): バックグラウンドで起動するか (デフォルト: true)

**戻り値:**
- `Promise<void>`

**throws:**
- Docker Composeの実行エラー

**例:**
```typescript
await sandbox.up({ detached: true });
console.log('Sandbox is running');
```

---

#### `down(): Promise<void>`

サンドボックス環境を停止します。

**戻り値:**
- `Promise<void>`

**throws:**
- Docker Composeの実行エラー

**例:**
```typescript
await sandbox.down();
console.log('Sandbox stopped');
```

---

#### `restart(): Promise<void>`

サンドボックス環境を再起動します。

**戻り値:**
- `Promise<void>`

**throws:**
- Docker Composeの実行エラー

**例:**
```typescript
await sandbox.restart();
console.log('Sandbox restarted');
```

---

#### `health(): Promise<HealthCheckResult>`

サンドボックス環境のヘルスチェックを実行します。

**戻り値:**
- `Promise<HealthCheckResult>`: ヘルスチェック結果

**例:**
```typescript
const health = await sandbox.health();

console.log('Healthy:', health.healthy);
console.log('Services:', health.services);

if (!health.healthy) {
  console.error('Unhealthy services:',
    health.services.filter(s => s.status !== 'running')
  );
}
```

---

#### `exec(service: string, command: string): Promise<string>`

サンドボックス内でコマンドを実行します。

**パラメータ:**
- `service` (string): サービス名
- `command` (string): 実行するコマンド

**戻り値:**
- `Promise<string>`: コマンドの出力

**throws:**
- コマンド実行エラー

**例:**
```typescript
const output = await sandbox.exec('app', 'npm test');
console.log('Test output:', output);
```

---

#### `snapshot(name: string): Promise<void>`

現在の状態をスナップショットとして保存します。

**パラメータ:**
- `name` (string): スナップショット名

**戻り値:**
- `Promise<void>`

**throws:**
- スナップショット作成エラー

**例:**
```typescript
await sandbox.snapshot('before-migration');
console.log('Snapshot created');
```

---

#### `restore(name: string): Promise<void>`

スナップショットから環境を復元します。

**パラメータ:**
- `name` (string): スナップショット名

**戻り値:**
- `Promise<void>`

**throws:**
- スナップショットが存在しない場合にエラー
- 復元エラー

**例:**
```typescript
await sandbox.restore('before-migration');
console.log('Snapshot restored');
```

---

#### `streamLogs(service?: string, onLog?: (log: string) => void): Promise<void>`

サービスのログをストリーミングします。

**パラメータ:**
- `service` (string, optional): サービス名 (未指定時は全サービス)
- `onLog` (callback, optional): ログ受信時のコールバック

**戻り値:**
- `Promise<void>`

**例:**
```typescript
await sandbox.streamLogs('app', (log) => {
  console.log('[APP]', log);
});
```

---

## インターフェース

### `DetectionResult`

環境検出の結果。

```typescript
interface DetectionResult {
  /** 環境タイプ */
  type: EnvironmentType;

  /** 検出の信頼度(0-100) */
  confidence: number;

  /** 詳細情報 */
  details: {
    runtime?: string;
    version?: string;
    framework?: string;
    packageManager?: string;
    entrypoint?: string;
  };

  /** 検出されたデータベース */
  databases: DatabaseType[];

  /** 使用するポート番号 */
  ports: number[];

  /** 依存関係リスト */
  dependencies: string[];

  /** Dockerfileが存在するか */
  hasDocker: boolean;

  /** docker-compose.ymlが存在するか */
  hasDockerCompose: boolean;
}
```

### `BuildOptions`

環境構築オプション。

```typescript
interface BuildOptions {
  /** 出力先ディレクトリ */
  outputDir?: string;

  /** 隔離レベル */
  isolation?: IsolationLevel;

  /** ベースイメージを上書き */
  baseImage?: string;

  /** 追加の環境変数 */
  env?: Record<string, string>;

  /** 追加のボリューム */
  volumes?: string[];

  /** Docker Compose設定をマージ */
  mergeCompose?: boolean;
}
```

### `HealthCheckResult`

ヘルスチェック結果。

```typescript
interface HealthCheckResult {
  /** 全体として健全か */
  healthy: boolean;

  /** サービス別の状態 */
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error';
    health?: 'healthy' | 'unhealthy' | 'starting';
  }>;

  /** エラーメッセージ */
  error?: string;
}
```

### `DockerComposeConfig`

Docker Compose設定。

```typescript
interface DockerComposeConfig {
  /** バージョン */
  version: string;

  /** サービス定義 */
  services: Record<string, DockerComposeService>;

  /** ネットワーク定義 */
  networks?: Record<string, {
    driver?: string;
    internal?: boolean;
  }>;

  /** ボリューム定義 */
  volumes?: Record<string, {
    driver?: string;
  }>;
}
```

### `DockerComposeService`

Docker Composeサービス定義。

```typescript
interface DockerComposeService {
  /** イメージ名 */
  image?: string;

  /** ビルド設定 */
  build?: {
    context: string;
    dockerfile?: string;
  };

  /** ポートマッピング */
  ports?: string[];

  /** 環境変数 */
  environment?: Record<string, string>;

  /** ボリュームマウント */
  volumes?: string[];

  /** 依存サービス */
  depends_on?: string[];

  /** ネットワーク */
  networks?: string[];

  /** 起動コマンド */
  command?: string;

  /** ヘルスチェック設定 */
  healthcheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
}
```

---

## Enum

### `EnvironmentType`

サポートされている環境タイプ。

```typescript
enum EnvironmentType {
  NodeJS = 'nodejs',
  PHP = 'php',
  Python = 'python',
  DotNet = 'dotnet',
  Java = 'java',
  Ruby = 'ruby',
  Static = 'static',
  Unknown = 'unknown'
}
```

### `DatabaseType`

サポートされているデータベースタイプ。

```typescript
enum DatabaseType {
  MySQL = 'mysql',
  PostgreSQL = 'postgresql',
  MongoDB = 'mongodb',
  SQLite = 'sqlite',
  SQLServer = 'sqlserver',
  Redis = 'redis'
}
```

### `IsolationLevel`

ネットワーク隔離レベル。

```typescript
enum IsolationLevel {
  /** 完全隔離 (インターネットアクセス不可) */
  FULL = 'FULL',

  /** 制限付き (ホワイトリストのみ許可) */
  RESTRICTED = 'RESTRICTED',

  /** 通常 (すべてのネットワークアクセス可能) */
  NORMAL = 'NORMAL'
}
```

---

## 使用例

### 基本的な使用法

```typescript
import { SandboxBuilder, IsolationLevel } from '@it-supervisor/sandbox-builder';

const builder = new SandboxBuilder();

// 1. 環境を検出
const detection = await builder.detect('./my-app');
console.log('Detected:', detection.type, `(${detection.confidence}% confidence)`);

// 2. 環境を構築
const sandbox = await builder.build('./my-app', {
  outputDir: './sandbox',
  isolation: IsolationLevel.RESTRICTED
});

// 3. 環境を起動
await sandbox.up();

// 4. ヘルスチェック
const health = await sandbox.health();
if (health.healthy) {
  console.log('Sandbox is ready!');
}

// 5. コマンド実行
const output = await sandbox.exec('app', 'npm test');
console.log('Test results:', output);

// 6. 環境を停止
await sandbox.down();
```

### スナップショット管理

```typescript
// 環境を起動
await sandbox.up();

// 初期状態を保存
await sandbox.snapshot('initial');

// 何か変更を加える
await sandbox.exec('app', 'npm install new-package');
await sandbox.exec('db', 'mysql < migration.sql');

// 変更後の状態を保存
await sandbox.snapshot('after-changes');

// 初期状態に戻す
await sandbox.restore('initial');

// 確認
const health = await sandbox.health();
console.log('Restored:', health.healthy);
```

### ログのストリーミング

```typescript
// 全サービスのログをストリーミング
await sandbox.streamLogs(undefined, (log) => {
  console.log(log);
});

// 特定サービスのログのみ
await sandbox.streamLogs('app', (log) => {
  if (log.includes('ERROR')) {
    console.error('Application error:', log);
  }
});
```

### カスタム環境変数の設定

```typescript
const sandbox = await builder.build('./my-app', {
  outputDir: './sandbox',
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true',
    API_KEY: 'test-key-123'
  }
});

await sandbox.up();
```

### 複数データベースの構築

```typescript
const detection = await builder.detect('./my-app');

// 検出されたデータベースを確認
console.log('Databases:', detection.databases);
// ['mysql', 'redis']

const sandbox = await builder.build('./my-app');

// MySQLとRedisの両方が自動的に構築される
await sandbox.up();

// データベースに接続してテスト
const mysqlOutput = await sandbox.exec('db', 'mysql -u root -ppassword -e "SHOW DATABASES;"');
console.log('MySQL databases:', mysqlOutput);

const redisOutput = await sandbox.exec('cache', 'redis-cli PING');
console.log('Redis status:', redisOutput);
```

### 既存のDocker Composeとマージ

```typescript
const sandbox = await builder.build('./my-app', {
  mergeCompose: true  // 既存のdocker-compose.ymlと統合
});

await sandbox.up();
```

### ネットワーク隔離テスト

```typescript
// 完全隔離モード
const sandbox = await builder.build('./my-app', {
  isolation: IsolationLevel.FULL
});

await sandbox.up();

// インターネットアクセスできないことを確認
try {
  await sandbox.exec('app', 'curl https://example.com');
  console.error('Isolation failed: internet access possible');
} catch (error) {
  console.log('Isolation working: internet access blocked');
}

await sandbox.down();
```

### エラーハンドリング

```typescript
try {
  const sandbox = await builder.build('./my-app');
  await sandbox.up();

  const health = await sandbox.health();
  if (!health.healthy) {
    console.error('Unhealthy services:');
    health.services
      .filter(s => s.status !== 'running')
      .forEach(s => {
        console.error(`- ${s.name}: ${s.status}`);
      });
  }

  await sandbox.down();
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Application path does not exist');
  } else if (error.message.includes('Docker')) {
    console.error('Docker is not running or not installed');
  } else {
    console.error('Build failed:', error.message);
  }
}
```

---

## ベストプラクティス

### 環境の適切なクリーンアップ

```typescript
const sandbox = await builder.build('./my-app');

try {
  await sandbox.up();
  // テストやタスクを実行
} finally {
  // 必ず停止とクリーンアップを実行
  await sandbox.down();
}
```

### タイムアウトの設定

```typescript
const timeout = setTimeout(() => {
  console.warn('Health check timeout');
}, 30000);

try {
  const health = await sandbox.health();
  clearTimeout(timeout);
} catch (error) {
  clearTimeout(timeout);
  throw error;
}
```

### リソース制限

Docker Composeファイルを直接編集してリソース制限を追加:

```yaml
services:
  app:
    # ... 他の設定 ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

---

## トラブルシューティング

### ポート競合

```typescript
const detection = await builder.detect('./my-app');

// 使用するポートを確認
console.log('Required ports:', detection.ports);

// 別のポートを使用
const sandbox = await builder.build('./my-app', {
  env: {
    PORT: '8080'  // デフォルトの3000から変更
  }
});
```

### ログの確認

```typescript
// 詳細なログを出力
await sandbox.streamLogs(undefined, (log) => {
  console.log(new Date().toISOString(), log);
});
```

---

## 関連リンク

- [パッケージREADME](../README.md)
- [使用例](../../../docs/USAGE_EXAMPLES.md)
