# ADR-004: CI/CDアプローチ

**Status**: Accepted
**Date**: 2026-02-11
**Author**: IT Supervisor Tools Development Team

## Context

モノレポプロジェクトで、以下のCI/CD要件がありました:

- コードの品質保証(lint, type-check, test)
- 自動テストとカバレッジチェック
- 複雑度分析とパフォーマンスベンチマーク
- npm公開の自動化
- GitHub Releasesの作成

CI/CDプラットフォームの選択肢:
- GitHub Actions
- CircleCI
- Travis CI
- GitLab CI

## Decision

**CI/CDプラットフォーム**: GitHub Actions

**ワークフロー構成**:

### 1. CI Workflow (.github/workflows/ci.yml)
7つのジョブを並列実行:

```yaml
jobs:
  lint:         # ESLint
  type-check:   # TypeScript型チェック
  complexity:   # eslintccで複雑度分析
  test:         # Vitest単体テスト
  coverage:     # カバレッジ測定 + Codecov連携
  benchmark:    # パフォーマンスベンチマーク
  build:        # TypeScriptビルド
```

**マトリックス戦略**: Node.js 18.x, 20.x で並列テスト

### 2. Release Workflow (.github/workflows/release.yml)
3つのジョブで順次実行:

```yaml
jobs:
  validate:     # リリース前の検証
  publish-npm:  # npm公開
  create-release: # GitHub Release作成
```

**トリガー**: `v*`タグのpush時

### 3. Reusable Composite Action
Puppeteerセットアップを共通化:
- `.github/actions/setup-puppeteer/action.yml`
- システム依存関係のインストール

## Consequences

### 良い点

1. **GitHubネイティブ**: GitHubとの統合が最も緊密
2. **無料プラン**: パブリックリポジトリは無料、無制限
3. **豊富なアクション**: Marketplace経由で再利用可能
4. **マトリックスビルド**: Node.js複数バージョンで並列テスト
5. **キャッシュ機能**: node_modulesをキャッシュして高速化
6. **Secrets管理**: NPM_TOKENなどを安全に管理
7. **並列実行**: 7ジョブ並列で約5分以内に完了

### 悪い点

1. **ベンダーロックイン**: GitHub以外への移行が困難
2. **ワークフロー構文**: YAML構文の学習が必要
3. **デバッグの難しさ**: ローカルでのワークフロー再現が困難(act使用で緩和)

### リスク

- **APIレート制限**: npm outdated実行時にレート制限(Access token expired)
  - 緩和策: CI環境では実行しない
- **依存関係の脆弱性**: 定期的にnpm auditを実行
  - 緩和策: Dependabotを有効化

## Alternatives Considered

### 1. CircleCI
- **メリット**: 高速、強力なキャッシュ
- **デメリット**: 無料プランの制限(月1,000分)、追加コスト
- **不採用理由**: GitHub Actionsで十分な機能があり、無料

### 2. Travis CI
- **メリット**: 歴史が長い、設定がシンプル
- **デメリット**: 無料プランの大幅縮小、パフォーマンス低下
- **不採用理由**: Travis CIの開発が停滞気味

### 3. GitLab CI
- **メリット**: 強力なCI/CD機能
- **デメリット**: GitHubからの移行が必要、エコシステムが異なる
- **不採用理由**: GitHubリポジトリを使用する前提

### 4. Jenkins
- **メリット**: 完全な制御、豊富なプラグイン
- **デメリット**: 自前のサーバー管理が必要、保守コスト高
- **不採用理由**: マネージドサービスの方が運用コストが低い

## Implementation Details

### CI実行時間
- **Lint**: ~15秒
- **Type-check**: ~20秒
- **Complexity**: ~15秒
- **Test**: ~40秒
- **Coverage**: ~60秒
- **Benchmark**: ~120秒 (continue-on-error)
- **Build**: ~30秒
- **合計**: 約5分(並列実行)

### カバレッジ連携
- Codecov: `CODECOV_TOKEN`を使用してカバレッジレポートをアップロード
- バッジ: README.mdに表示

### リリース自動化
1. `npm run release:patch` (scripts/release.sh実行)
2. バージョンバンプ → CHANGELOG更新 → git tag作成
3. `git push --follow-tags` でCIトリガー
4. npm公開 → GitHub Release作成

### Pre-commit Hooks
- husky + lint-staged
- ESLint自動修正 → 関連テスト実行 → 型チェック
- コミット前の品質保証

## Future Improvements

- [ ] セマンティックバージョニング自動化(conventional-changelog)
- [ ] Dependabot自動マージ(低リスクの更新)
- [ ] Docker imageビルドとpush
- [ ] E2Eテストの統合(実際のDocker環境)
- [ ] Lighthouseスコア測定(ドキュメントサイト)
