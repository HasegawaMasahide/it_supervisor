# 次のタスク — @it-supervisor/tools

## 優先度: 高（即座に対応すべき）

### Task 13: SandboxControllerの重複メンバー名を修正

**問題**:
`packages/sandbox-builder/src/builder.ts`のSandboxControllerクラスで、`exec`という名前がプロパティ（605行目）とメソッド（903行目）の両方で使用されており、コンパイラが警告を出しています。

**詳細**:
```typescript
// 605行目: プロパティ
private exec = require('child_process').exec;

// 903行目: メソッド
async exec(service: string, command: string): Promise<string> {
```

**修正方法**:
1. プロパティ名を`execRaw`または`execCommand`に変更
2. `streamLogs`メソッド（755行目）での使用箇所を更新
3. テストファイルでモックしている部分を確認・更新

**影響範囲**:
- `packages/sandbox-builder/src/builder.ts`（SandboxControllerクラス）
- `packages/sandbox-builder/src/__tests__/controller.test.ts`（テスト）

**期待される結果**:
- コンパイラ警告が解消される
- すべてのテストが引き続き成功する

---

## 優先度: 高（better-sqlite3依存パッケージ）

### Task 14: metrics-modelのユニットテスト

**目的**: SQLiteメトリクスDBパッケージのテストカバレッジを追加

**実装内容**:
- `packages/metrics-model/src/__tests__/model.test.ts`を作成
- `better-sqlite3`または`sql.js`をモック
- CRUD操作のテスト
- クエリ機能のテスト
- エラーハンドリングのテスト

**注意点**:
- ネイティブモジュール（better-sqlite3）は実際にビルドせず、モックを使用
- またはsql.js（pure JavaScript実装）を使用

### Task 15: issue-managerのユニットテスト

**目的**: イシューCRUD & トラッキングパッケージのテストカバレッジを追加

**実装内容**:
- `packages/issue-manager/src/__tests__/manager.test.ts`を作成
- DBアクセスをモック
- イシューのCRUD操作テスト
- トラッキング機能のテスト
- バリデーションのテスト

---

## 優先度: 中（品質改善）

### Task 16: Puppeteer設定の更新

**目的**: Puppeteer deprecation警告の解消

**実装内容**:
- `packages/report-generator/src/generator.ts`のPuppeteer起動オプションを更新
- `headless: true` → `headless: "new"`に変更
- テストでのPuppeteerモック設定も更新

### Task 17: repo-analyzerのスキップテストを実装

**目的**: 現在スキップされている11個のテストを実装または削除

**実装内容**:
- `packages/repo-analyzer/src/__tests__/analyzer.test.ts`で`.skip`されているテストを確認
- 実装が必要なものは実装
- 不要なものは削除

---

## 優先度: 低（将来的な改善）

### Task 18: コードカバレッジの計測

**目的**: テストカバレッジを可視化

**実装内容**:
- vitestのカバレッジ機能を有効化
- `vitest.config.ts`にカバレッジ設定を追加
- カバレッジ目標を設定（例: 80%以上）
- package.jsonに`test:coverage`スクリプトを追加

### Task 19: CI/CDパイプライン構築

**目的**: 自動テスト実行の仕組みを構築

**実装内容**:
- `.github/workflows/test.yml`を作成
- プルリクエスト時に自動テスト実行
- mainブランチへのマージ前に品質チェック
- カバレッジレポートの自動生成

---

## 推奨作業順序

1. **Task 13**: 重複メンバー名修正（即座に対応）
2. **Task 16**: Puppeteer設定更新（簡単な修正）
3. **Task 17**: スキップテストの確認（既存テストの整理）
4. **Task 14-15**: 残りパッケージのテスト追加（時間がかかる）
5. **Task 18-19**: インフラ改善（optional）
