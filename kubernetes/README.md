# IT Supervisor - Kubernetes移行計画（Phase 3）

## ⚠️ 重要: 現時点では実装不要

Kubernetesへの移行は、以下の条件を**すべて満たす場合のみ**検討してください:

```typescript
interface K8sMigrationCriteria {
  customerCount: number >= 50;        // 顧客数50社以上
  concurrentProjects: number >= 20;   // 同時プロジェクト20以上
  teamSize: number >= 10;             // エンジニア10名以上
  monthlyRevenue: number >= 10000000; // 月商1000万円以上
  multiCloud: boolean;                // マルチクラウド要件
}
```

**現在の推奨**: AWS ECS/Fargateで十分です。

## 📋 k8sが必要になる理由

1. **大規模なスケール**: 顧客数100社以上、同時実行ジョブ50以上
2. **マルチクラウド**: AWS以外のクラウド（GCP、Azure）への展開
3. **複雑なマイクロサービス**: 10以上のサービスを独立して運用
4. **高度なオートスケーリング**: CPU/メモリ以外の指標（カスタムメトリクス）に基づくスケーリング

## 🚀 移行手順（将来）

### 1. EKSクラスターの構築

```bash
# eksctl を使用した簡単な構築
eksctl create cluster \
  --name it-supervisor-cluster \
  --region ap-northeast-1 \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed
```

### 2. Helm Chartの作成

```yaml
# helm/it-supervisor/values.yaml
replicaCount: 3

image:
  repository: 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/it-supervisor
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### 3. デプロイ

```bash
# Helm Chartのインストール
helm install it-supervisor ./helm/it-supervisor

# アップグレード
helm upgrade it-supervisor ./helm/it-supervisor

# ロールバック
helm rollback it-supervisor 1
```

## 💰 コスト比較

| 項目 | ECS/Fargate | EKS |
|-----|-------------|-----|
| コントロールプレーン | $0 | $73/月 |
| ワーカーノード | オンデマンド課金 | EC2インスタンス代 |
| 運用コスト | 低 | 高 |
| 学習コスト | 低 | 高 |

**結論**: 月商1000万円未満の場合、EKSのコスト・運用負荷は正当化できない。

## 📚 参考資料

- [Amazon EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## 🔗 関連ドキュメント

- [アーキテクチャ設計書](../doc/アーキテクチャ設計書.md#phase-3-kubernetesへの移行)
- [ECS/Fargate設定](../terraform/README.md)

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
**ステータス**: 参考情報（実装予定なし）
