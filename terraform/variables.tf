# IT Supervisor - Terraform Variables

# ===========================================
# 基本設定
# ===========================================

variable "environment" {
  description = "環境名"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "availability_zones" {
  description = "アベイラビリティゾーン"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

# ===========================================
# ネットワーク設定
# ===========================================

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "プライベートサブネットCIDR"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "パブリックサブネットCIDR"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

# ===========================================
# SSL証明書
# ===========================================

variable "certificate_arn" {
  description = "ACM証明書ARN（HTTPSに必要）"
  type        = string
  default     = "" # ACMで発行後に設定
}

# ===========================================
# データベース設定
# ===========================================

variable "database_name" {
  description = "データベース名"
  type        = string
  default     = "it_supervisor"
}

variable "database_username" {
  description = "データベースユーザー名"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "database_password" {
  description = "データベースパスワード"
  type        = string
  sensitive   = true
  # デフォルト値は設定しない（terraform.tfvarsまたは環境変数から取得）
}

variable "rds_min_capacity" {
  description = "RDS Aurora Serverless v2 最小ACU"
  type        = number
  default     = 0.5
}

variable "rds_max_capacity" {
  description = "RDS Aurora Serverless v2 最大ACU"
  type        = number
  default     = 2.0
}

# ===========================================
# Redis設定
# ===========================================

variable "redis_node_type" {
  description = "Redisノードタイプ"
  type        = string
  default     = "cache.t4g.micro"
}

# ===========================================
# ECS設定
# ===========================================

variable "docker_image" {
  description = "Dockerイメージ（ECR）"
  type        = string
  default     = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/it-supervisor:latest"
}

variable "ecs_task_cpu" {
  description = "ECS Task CPU（1024 = 1 vCPU）"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS Task Memory（MB）"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "ECS Service desired count"
  type        = number
  default     = 2
}

variable "ecs_min_capacity" {
  description = "Auto Scaling 最小タスク数"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Auto Scaling 最大タスク数"
  type        = number
  default     = 4
}
