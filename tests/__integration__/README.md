# End-to-End Integration Tests

このディレクトリには、複数のパッケージが連携して動作することを検証するE2Eインテグレーションテストが含まれています。

## テストスイート

### 1. Full Pipeline Test (`full-pipeline.test.ts`)
完全な監査パイプラインをテスト:
- リポジトリ分析 (repo-analyzer)
- 静的解析 (static-analyzer)
- メトリクス保存 (metrics-model)
- 問題管理 (issue-manager)
- レポート生成 (report-generator)

**実行時間**: ~30秒
**カバレッジ**: 全パッケージの統合

### 2. Security Workflow Test (`security-workflow.test.ts`)
セキュリティ監査ワークフローをテスト:
- 脆弱性スキャン
- セキュリティメトリクス保存
- セキュリティレポート生成
- 経時的な改善トラッキング

**実行時間**: ~20秒
**カバレッジ**: セキュリティ関連機能

### 3. Error Propagation Test (`error-propagation.test.ts`)
エラーハンドリングと復旧をテスト:
- 無効な入力の処理
- データベースエラー
- ファイルシステムエラー
- 部分的な障害からの復旧
- 同時実行操作の安全性

**実行時間**: ~15秒
**カバレッジ**: エラーハンドリング

### 4. Performance Test (`performance.test.ts`)
パフォーマンスとスケーラビリティをテスト:
- 100ファイルのリポジトリ分析
- 1000メトリクスの保存
- 500問題の一括作成
- 大規模レポート生成
- メモリ効率
- ページネーション
- 同時実行操作

**実行時間**: ~60秒
**カバレッジ**: パフォーマンス最適化

## テストの実行

### すべてのE2Eテストを実行
```bash
npm test -- tests/__integration__
```

### 特定のテストスイートを実行
```bash
# フルパイプラインテストのみ
npm test -- tests/__integration__/full-pipeline.test.ts

# セキュリティワークフローのみ
npm test -- tests/__integration__/security-workflow.test.ts

# エラー伝播テストのみ
npm test -- tests/__integration__/error-propagation.test.ts

# パフォーマンステストのみ
npm test -- tests/__integration__/performance.test.ts
```

### ウォッチモードで実行
```bash
npm run test:watch -- tests/__integration__
```

## テストデータ

すべてのテストは `.tmp/` ディレクトリに一時的なテストデータを作成します:
- テストリポジトリ
- テストデータベース
- 生成されたレポート

これらは各テストの終了時に自動的にクリーンアップされます。

## 前提条件

### 必須
- Node.js >= 18.0.0
- すべてのパッケージがビルド済み (`npm run build`)

### オプション
- Docker (sandbox-builderのテスト用)
- 外部静的解析ツール (ESLint, PHPStan, Gitleaks等) - 利用可能な場合のみ使用

## CI/CDでの実行

これらのE2Eテストは、以下のタイミングで自動実行されます:
- Pull Request作成時
- mainブランチへのpush時
- リリース前

GitHub Actions workflowでは、必要な依存関係が自動的にインストールされます。

## トラブルシューティング

### タイムアウトエラー
パフォーマンステストは最大60秒かかる場合があります。vitestの設定でタイムアウトを延長:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 60000 // 60秒
  }
});
```

### メモリ不足
大規模データセットのテストで`FATAL ERROR: Reached heap limit`が発生する場合:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### 一時ファイルのクリーンアップ
テストが中断された場合、手動でクリーンアップ:

```bash
rm -rf .tmp/integration-test
rm -rf .tmp/security-test
rm -rf .tmp/error-test
rm -rf .tmp/performance-test
```

## ベストプラクティス

1. **独立性**: 各テストは他のテストに依存しない
2. **クリーンアップ**: すべてのリソースは`afterAll`で解放
3. **タイムアウト**: 長時間実行されるテストには適切なタイムアウトを設定
4. **エラーメッセージ**: 失敗時に診断しやすい明確なアサーション
5. **モック**: 外部依存は可能な限りモック化

## メトリクス

### テストカバレッジ目標
- **統合パス**: 100% (すべての主要ワークフローをテスト)
- **エラーハンドリング**: 80%以上
- **パフォーマンス**: 主要操作の90%

### 期待されるパフォーマンス
- 100ファイルの分析: <10秒
- 1000メトリクスの保存: <5秒
- 500問題の作成: <3秒
- 大規模レポート生成: <5秒

## 今後の拡張

- [ ] リアルワールドのオープンソースプロジェクトでのテスト
- [ ] CI/CD統合のE2Eテスト
- [ ] クラウドストレージ統合のテスト
- [ ] プラグインシステムのテスト
- [ ] マルチテナント環境のテスト
