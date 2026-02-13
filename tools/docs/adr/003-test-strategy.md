# ADR-003: テスト戦略とカバレッジ目標

**Status**: Accepted
**Date**: 2026-02-11
**Author**: IT Supervisor Tools Development Team

## Context

TypeScriptモノレポプロジェクトで、以下の課題がありました:

- テストフレームワークが決まっていない
- カバレッジ目標が不明確
- パッケージごとにテスト方法がバラバラ
- E2Eテストの戦略が定義されていない
- ネイティブ依存関係(better-sqlite3, puppeteer)のモック方法が不明

## Decision

**テストフレームワーク**: Vitest
**カバレッジツール**: @vitest/coverage-v8
**カバレッジ目標**:
- Statements: 80%
- Branches: 70%
- Functions: 80%
- Lines: 80%

**テスト階層**:
1. **ユニットテスト**: `packages/*/src/__tests__/*.test.ts`
   - 各パッケージの公開APIとコアロジックをテスト
   - 外部依存(fs, child_process, git)はモック

2. **統合テスト**: `tests/__integration__/*.test.ts`
   - パッケージ間の連携をテスト
   - 実際のファイルシステムとデータベースを使用

3. **E2Eテスト**: `tests/__integration__/*.test.ts`
   - 完全なワークフロー(分析→集計→レポート生成)をテスト
   - 実際のプロジェクトサンプルを使用

## Consequences

### 良い点

1. **高速テスト実行**: Vitestは並列実行とHMRをサポート
2. **TypeScript統合**: tsconfig.jsonを自動認識、型チェック統合
3. **統一されたテストAPI**: jest互換のAPI、学習コスト低
4. **リアルタイムフィードバック**: watch modeで開発中の継続的テスト
5. **カバレッジレポート**: HTML/JSON/テキスト形式で出力
6. **CI統合**: GitHub Actionsで自動実行、カバレッジしきい値チェック

### 悪い点

1. **スキップテスト**: Vitestのfsモック制限により11テストをスキップ
2. **ネイティブ依存**: better-sqlite3とpuppeteerはCI環境でセットアップ必要
3. **E2E複雑性**: 実際のDocker環境テストは困難(モックで代替)

### リスク

- **カバレッジの質**: 数値目標だけでなく、エッジケースのテストを重視
- **テスト時間**: E2Eテストが長時間化する可能性(並列実行で緩和)

## Alternatives Considered

### 1. Jest
- **メリット**: デファクトスタンダード、豊富なエコシステム
- **デメリット**: ESM対応が不完全、TypeScript設定が複雑
- **不採用理由**: Vitestの方が高速で、ESM/TypeScriptのサポートが優れている

### 2. Mocha + Chai
- **メリット**: 柔軟性が高い、歴史が長い
- **デメリット**: 複数ライブラリの組み合わせが必要、設定が複雑
- **不採用理由**: 統合されたテストフレームワークが望ましい

### 3. AVA
- **メリット**: 並列実行、シンプルなAPI
- **デメリット**: エコシステムが小さい、jest互換性なし
- **不採用理由**: jest互換APIの方が学習コストが低い

## Test Coverage Achievements

**現在のカバレッジ** (2026-02-11):
| パッケージ | Statements | Branches | Functions | Lines |
|-----------|-----------|----------|-----------|-------|
| metrics-model | 96.31% | 81.60% | 92.85% | 96.19% |
| sandbox-builder | 95.64% | 86.36% | 91.66% | 95.76% |
| issue-manager | 95.19% | 89.70% | 97.43% | 95.30% |
| report-generator | 89.10% | 82.22% | 86.11% | 89.47% |
| logger | 85.71% | 78.37% | 92.30% | 85.71% |
| static-analyzer | 69.38% | 58.45% | 76.92% | 69.86% |
| repo-analyzer | 65.61% | 67.83% | 67.39% | 64.70% |
| **全体** | **83.99%** | **75.67%** | **85.14%** | **84.19%** |

**テスト数**: 391 passed, 33 skipped (424 total)

## Future Improvements

- [ ] Vitestのfsモック問題を解決し、スキップテストを有効化
- [ ] E2Eテストの実装(現在33テストがAPI不整合でスキップ中)
- [ ] mutation testingの導入(Strykerなど)
- [ ] visual regression testingの導入(Playwrightなど)
