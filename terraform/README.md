# IT Supervisor - Terraform設定

このディレクトリには、AWS ECS/Fargate本番環境を構築するためのTerraform設定が含まれています。

## 📋 前提条件

- Terraform 1.0以上
- AWS CLIの設定済み
- 適切なAWS権限（Administrator推奨）

## 🚀 クイックスタート

### 1. 初期設定

```bash
# S3バケットの作成（Terraform Stateの保存先）
aws s3 mb s3://it-supervisor-terraform-state --region ap-northeast-1

# DynamoDBテーブルの作成（State Lock用）
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 2. 環境変数ファイルの作成

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集して、適切な値を設定
```

### 3. Terraformの実行

```bash
# 初期化
terraform init

# プランの確認
terraform plan

# 適用
terraform apply

# リソース一覧
terraform state list

# 出力値の確認
terraform output
```

## 📦 構成要素

### メインファイル

| ファイル | 説明 |
|---------|------|
| `main.tf` | メインの設定ファイル |
| `variables.tf` | 変数定義 |
| `terraform.tfvars.example` | 変数の例 |

### モジュール（未実装）

将来的に以下のモジュールを実装予定:

```
modules/
├── vpc/           # VPC, サブネット, ルートテーブル
├── ecs/           # ECS Cluster, Service, Task Definition
├── rds/           # RDS Aurora Serverless v2
└── alb/           # Application Load Balancer
```

## 💰 コスト試算

### 月額コスト（目安）

| サービス | スペック | 月額 |
|---------|---------|------|
| ECS Fargate (Web) | 0.5vCPU, 1GB x 2 | $30 |
| ECS Fargate (Worker) | 0.5vCPU, 1GB x 1 | $15 |
| RDS Aurora Serverless v2 | 0.5-2 ACU | $50-150 |
| ElastiCache Redis | cache.t4g.micro | $15 |
| ALB | 1台 | $20 |
| S3 | 100GB | $2.5 |
| CloudWatch Logs | 10GB/月 | $5 |
| **合計** | | **$137-237** |

## 🔐 セキュリティ設定

### Secrets Managerの使用

本番環境では、データベースパスワードなどの機密情報をAWS Secrets Managerに保存することを推奨します。

```bash
# Secretの作成
aws secretsmanager create-secret \
  --name it-supervisor/db-password \
  --secret-string "your-super-secure-password" \
  --region ap-northeast-1

# Terraformで参照
# data "aws_secretsmanager_secret_version" "db_password" {
#   secret_id = "it-supervisor/db-password"
# }
```

### IAM Role（OIDC認証）

GitHub ActionsからのデプロイにはOIDC認証を使用します。

```bash
# 手動でIAM Roleを作成（初回のみ）
# Trust Policyの例は .github/workflows/deploy-ecs.yml を参照
```

## 📝 運用手順

### デプロイ

```bash
# 本番環境へのデプロイ
terraform workspace select production
terraform apply

# 開発環境へのデプロイ
terraform workspace select development
terraform apply
```

### スケーリング

```bash
# ECS Serviceのタスク数を変更
terraform apply -var="ecs_desired_count=4"

# RDS Aurora のACU上限を変更
terraform apply -var="rds_max_capacity=4.0"
```

### ロールバック

```bash
# 前のステートに戻す
terraform state pull > backup.tfstate
terraform apply -replace=module.ecs.aws_ecs_service.main
```

### リソース削除

```bash
# すべてのリソースを削除（注意！）
terraform destroy
```

## 🔍 トラブルシューティング

### State Lockエラー

```bash
# Lockを強制解除
terraform force-unlock <LOCK_ID>
```

### プランが通らない

```bash
# キャッシュをクリア
rm -rf .terraform .terraform.lock.hcl
terraform init
```

## 📚 参考資料

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [アーキテクチャ設計書](../doc/アーキテクチャ設計書.md)

---

**作成者**: IT Supervisor チーム
**更新日**: 2025-12-18
