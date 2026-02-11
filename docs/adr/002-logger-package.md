# ADR-002: 専用ログパッケージの作成

**Status**: Accepted
**Date**: 2026-02-11
**Author**: IT Supervisor Tools Development Team

## Context

プロジェクト内で42個の`console.log`/`console.error`呼び出しが散在していました。これにより以下の問題が発生していました:

- ログレベルの制御ができない(DEBUG/INFO/WARN/ERRORの区別がない)
- 本番環境でログを無効化できない
- ログフォーマットが統一されていない
- テスト時にログ出力をモックできない
- タイムスタンプやコンテキスト情報の追加が難しい

## Decision

`@it-supervisor/logger`パッケージを新規作成し、すべてのパッケージで統一されたロギング機構を使用します。

**仕様**:
```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  child(context: string): Logger;
  setLevel(level: LogLevel): void;
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}
```

**設定方法**:
- 環境変数`LOG_LEVEL`でログレベルを制御(デフォルト: INFO)
- `createLogger(options)`でロガーインスタンスを作成

## Consequences

### 良い点

1. **統一されたロギング**: すべてのパッケージで一貫したログフォーマット
2. **ログレベル制御**: 環境変数で簡単に制御可能
3. **本番環境対応**: `LOG_LEVEL=SILENT`でログを完全に無効化
4. **構造化ログ**: タイムスタンプ、ログレベル、コンテキストを自動付与
5. **テスト容易性**: モック可能なロガーインターフェース
6. **ゼロ依存**: 外部依存なしで軽量(< 200 LOC)
7. **カラー出力**: ログレベルに応じた色分け表示(開発時の視認性向上)

### 悪い点

1. **新しい依存関係**: すべてのパッケージがloggerに依存
2. **移行コスト**: 既存の`console.*`呼び出しを置換する必要がある
3. **学習コスト**: 新しいAPIを開発者が学ぶ必要がある

### リスク

- **循環依存**: loggerが他のパッケージに依存しないように設計(ゼロ依存)
- **パフォーマンス**: 各ログ呼び出しのオーバーヘッドは微小(< 1ms)

## Alternatives Considered

### 1. 既存ログライブラリ(winston, pino, bunyan)
- **メリット**: 豊富な機能、プラグインエコシステム
- **デメリット**: 大きな依存関係、学習曲線、過剰な機能
- **不採用理由**:
  - winston: 112 dependencies
  - pino: 47 dependencies
  - bunyan: メンテナンス停滞
  - シンプルなログ機能のみ必要

### 2. console.* のまま維持
- **メリット**: 追加の依存なし、学習不要
- **デメリット**: ログレベル制御不可、本番環境での制御困難
- **不採用理由**: 本番環境での運用性が低い

### 3. debug ライブラリ
- **メリット**: 軽量、環境変数でのフィルタリング
- **デメリット**: デバッグ専用で、INFO/WARN/ERRORレベルの区別がない
- **不採用理由**: 本番環境のロギングには不十分

## Implementation Details

**移行実績**:
- sandbox-builder: 13 console.* → logger
- static-analyzer: 10 console.* → logger
- repo-analyzer: 3 console.* → logger
- report-generator: 5 console.* → logger
- metrics-model: 1 console.* → logger
- examples: 7ファイル更新
- benchmarks: 3ファイル更新
- tests: 3ファイル更新

**テスト**: 25ユニットテスト + 10統合テスト = 35テスト(全て合格)
