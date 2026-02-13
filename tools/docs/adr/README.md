# Architecture Decision Records (ADRs)

このディレクトリには、`@it-supervisor/tools`プロジェクトの主要なアーキテクチャ決定を記録したADR(Architecture Decision Records)が含まれています。

## ADRとは

ADRは、ソフトウェアアーキテクチャに関する重要な決定を文書化するための軽量な手法です。各ADRは以下の要素を含みます:

- **Status**: 決定の現在の状態(Accepted, Deprecated, Supersededなど)
- **Context**: なぜこの決定が必要だったのか
- **Decision**: 何を決定したのか
- **Consequences**: この決定の結果としてどうなるか(良い点と悪い点の両方)

## ADR一覧

| ADR番号 | タイトル | Status | 日付 |
|---------|---------|--------|------|
| [ADR-001](./001-monorepo-structure.md) | モノレポ構造の採用 | Accepted | 2026-02-11 |
| [ADR-002](./002-logger-package.md) | 専用ログパッケージの作成 | Accepted | 2026-02-11 |
| [ADR-003](./003-test-strategy.md) | テスト戦略とカバレッジ目標 | Accepted | 2026-02-11 |
| [ADR-004](./004-cicd-approach.md) | CI/CDアプローチ | Accepted | 2026-02-11 |

## ADRの作成方法

新しいADRを作成する際は、以下のテンプレートを使用してください:

```markdown
# ADR-XXX: [タイトル]

**Status**: [Proposed/Accepted/Deprecated/Superseded]
**Date**: YYYY-MM-DD
**Author**: [名前または役割]

## Context

この決定が必要になった背景や問題を説明します。

## Decision

何を決定したかを明確に記述します。

## Consequences

### 良い点

- 利点1
- 利点2

### 悪い点

- 欠点1
- 欠点2

### リスク

- リスク1とその緩和策

## Alternatives Considered

検討した代替案とそれらを採用しなかった理由。
```

## 参考資料

- [Architecture Decision Records](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
