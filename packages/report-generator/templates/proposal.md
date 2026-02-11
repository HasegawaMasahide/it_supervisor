# {{projectName}} 改善提案書

**顧客名**: {{customerName}}
**提案日**: {{date}}
**提案者**: {{author}}
**バージョン**: {{version}}

---

## 提案概要

### 背景

{{projectName}}の診断結果に基づき、以下の改善を提案いたします。

### 提案内容サマリー

| 項目 | 内容 |
|------|------|
| 対象システム | {{projectName}} |
| 改善範囲 | {{improvementScope}} |
| 総工数 | {{totalEffort}}人日 |
| 概算費用 | {{totalCost}}万円（税別） |
| 実施期間 | {{implementationPeriod}} |

### 期待効果

- **運用コスト削減**: 年間約{{expectedBenefits.costReduction}}万円
- **障害リスク低減**: {{expectedBenefits.riskReduction}}%減少
- **開発生産性向上**: {{expectedBenefits.productivityGain}}%向上
- **セキュリティ強化**: Critical脆弱性{{expectedBenefits.securityFixes}}件解消

---

## 改善項目詳細

### Phase 1: 緊急対応（{{phase1.duration}}）

#### 1.1 セキュリティ修正

| No | 問題 | 対応内容 | 工数 | 優先度 |
|----|------|---------|------|--------|
{{phase1SecurityItems}}

#### 1.2 クリティカルバグ修正

| No | 問題 | 対応内容 | 工数 | 優先度 |
|----|------|---------|------|--------|
{{phase1BugItems}}

**Phase 1 小計**: {{phase1.effort}}人日 / {{phase1.cost}}万円

---

### Phase 2: 品質改善（{{phase2.duration}}）

#### 2.1 コード品質向上

| No | 対象 | 対応内容 | 工数 |
|----|------|---------|------|
{{phase2QualityItems}}

#### 2.2 パフォーマンス改善

| No | 問題箇所 | 改善内容 | 期待効果 | 工数 |
|----|---------|---------|---------|------|
{{phase2PerformanceItems}}

**Phase 2 小計**: {{phase2.effort}}人日 / {{phase2.cost}}万円

---

### Phase 3: 技術的負債解消（{{phase3.duration}}）

#### 3.1 リファクタリング

| No | 対象 | 内容 | 工数 |
|----|------|------|------|
{{phase3RefactoringItems}}

#### 3.2 テスト整備

| No | 対象 | 内容 | 工数 |
|----|------|------|------|
{{phase3TestItems}}

#### 3.3 ドキュメント整備

| No | 対象 | 内容 | 工数 |
|----|------|------|------|
{{phase3DocItems}}

**Phase 3 小計**: {{phase3.effort}}人日 / {{phase3.cost}}万円

---

## 実装計画

### スケジュール

```
Phase 1: [====] {{phase1.startDate}} - {{phase1.endDate}}
Phase 2:       [========] {{phase2.startDate}} - {{phase2.endDate}}
Phase 3:                  [============] {{phase3.startDate}} - {{phase3.endDate}}
```

### マイルストーン

| マイルストーン | 完了予定日 | 成果物 |
|---------------|-----------|--------|
{{milestones}}

### 体制

| 役割 | 担当 | 工数配分 |
|------|------|---------|
| プロジェクトマネージャー | {{team.pm}} | {{team.pmAllocation}}% |
| シニアエンジニア | {{team.senior}} | {{team.seniorAllocation}}% |
| エンジニア | {{team.engineer}} | {{team.engineerAllocation}}% |

---

## 費用見積もり

### 内訳

| 項目 | 工数 | 単価 | 金額 |
|------|------|------|------|
| Phase 1 実装 | {{phase1.effort}}人日 | {{unitPrice}}万円 | {{phase1.cost}}万円 |
| Phase 2 実装 | {{phase2.effort}}人日 | {{unitPrice}}万円 | {{phase2.cost}}万円 |
| Phase 3 実装 | {{phase3.effort}}人日 | {{unitPrice}}万円 | {{phase3.cost}}万円 |
| プロジェクト管理 | - | - | {{pmCost}}万円 |
| **合計** | **{{totalEffort}}人日** | - | **{{totalCost}}万円** |

※ 上記は税別価格です

### お支払い条件

- 契約時: {{payment.contract}}%
- Phase 1完了時: {{payment.phase1}}%
- Phase 2完了時: {{payment.phase2}}%
- 最終納品時: {{payment.final}}%

---

## リスクと対策

| リスク | 発生確率 | 影響度 | 対策 |
|--------|---------|--------|------|
{{riskMitigation}}

---

## 品質保証

### 瑕疵担保責任

- **期間**: 実装完了後3ヶ月間
- **対象**:
  - コード変更による機能破壊
  - 既存機能の退行（regression）
  - セキュリティ診断の重大な見落とし
- **対象外**:
  - パフォーマンス改善効果の未達
  - 顧客環境起因の問題
  - 第三者サービスの障害

### 品質管理プロセス

1. **自動テスト**: 単体テスト、結合テストの実施
2. **コードレビュー**: 全変更に対するレビュー実施
3. **シニアエンジニア承認**: Critical問題は2名以上でレビュー
4. **ステージング検証**: 本番適用前の動作確認

---

## ROI試算

### 投資対効果

| 項目 | 年間効果 |
|------|---------|
| 運用コスト削減 | {{roi.operationCost}}万円 |
| 障害対応コスト削減 | {{roi.incidentCost}}万円 |
| 開発効率化 | {{roi.developmentEfficiency}}万円 |
| **合計** | **{{roi.total}}万円** |

### 回収期間

投資額 {{totalCost}}万円 ÷ 年間効果 {{roi.total}}万円 = **約{{roi.paybackPeriod}}**で回収

---

## 次のステップ

1. **本提案書のご検討**（～{{nextSteps.reviewDeadline}}）
2. **ご質問・ご要望のヒアリング**
3. **契約締結**
4. **キックオフミーティング**
5. **実装開始**

---

## 付録

### A. 詳細見積もり明細

{{detailedEstimate}}

### B. 技術仕様

{{technicalSpecifications}}

### C. 参考事例

{{referenceProjects}}

---

## お問い合わせ

ご不明点がございましたら、下記までお問い合わせください。

- **担当**: {{contact.name}}
- **メール**: {{contact.email}}
- **電話**: {{contact.phone}}

---

*このレポートは IT Supervisor により自動生成されました*
*担当者による最終確認・調整済み*
*生成日時: {{generatedAt}}*
