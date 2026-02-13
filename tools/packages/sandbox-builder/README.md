# @it-supervisor/sandbox-builder

解析対象のシステムを安全に動作させるサンドボックス環境を自動構築します。

## 機能

- 環境の自動検出（Node.js、PHP、Python、.NET等）
- Docker Compose自動生成
- データベースコンテナの自動追加
- ネットワーク分離
- スナップショット管理
- ヘルスチェック

## インストール

```bash
npm install @it-supervisor/sandbox-builder
```

## CLI使用例

```bash
# 環境を検出
sandbox detect --path ./target-app

# 環境を構築
sandbox build --path ./target-app --output ./sandbox-env

# 環境を起動
sandbox up --env ./sandbox-env

# 環境を停止
sandbox down --env ./sandbox-env

# ヘルスチェック
sandbox health --env ./sandbox-env

# スナップショット作成
sandbox snapshot create --env ./sandbox-env --name "before-change"

# スナップショットから復元
sandbox snapshot restore --env ./sandbox-env --name "before-change"
```

## プログラムからの使用

```typescript
import { SandboxBuilder } from '@it-supervisor/sandbox-builder';

const builder = new SandboxBuilder();

// 環境検出
const detection = await builder.detect('./target-app');
console.log('Detected:', detection.type);

// 環境構築
const sandbox = await builder.build('./target-app', {
  outputDir: './sandbox-env',
  isolation: 'RESTRICTED'
});

// 環境起動
await sandbox.up();

// ヘルスチェック
const health = await sandbox.health();
console.log('Healthy:', health.healthy);

// 環境停止
await sandbox.down();
```

## API リファレンス

詳細は[API Documentation](./docs/api.md)を参照してください。
