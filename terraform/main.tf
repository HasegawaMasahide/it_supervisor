# IT Supervisor - Terraform Main Configuration
# Phase 2: AWS ECS/Fargate 本番環境

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Terraform State の保存先（S3バックエンド）
  # 初回実行前に手動でS3バケットを作成してください
  backend "s3" {
    bucket         = "it-supervisor-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# ===========================================
# Provider設定
# ===========================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "IT-Supervisor"
      ManagedBy   = "Terraform"
    }
  }
}

# ===========================================
# VPC・ネットワーク
# ===========================================

module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

# ===========================================
# ALB (Application Load Balancer)
# ===========================================

module "alb" {
  source = "./modules/alb"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn    = var.certificate_arn # ACMで発行したSSL証明書
}

# ===========================================
# RDS Aurora Serverless v2
# ===========================================

module "rds" {
  source = "./modules/rds"

  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  database_name     = var.database_name
  master_username   = var.database_username
  master_password   = var.database_password # Secrets Managerから取得を推奨

  min_capacity      = var.rds_min_capacity
  max_capacity      = var.rds_max_capacity
}

# ===========================================
# ElastiCache (Redis)
# ===========================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.environment}-it-supervisor-redis"
  subnet_ids = module.vpc.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name        = "${var.environment}-it-supervisor-redis"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.ecs.ecs_tasks_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-it-supervisor-redis"
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.environment}-it-supervisor"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name = "${var.environment}-it-supervisor-redis"
  }
}

# ===========================================
# ECS Cluster & Services
# ===========================================

module "ecs" {
  source = "./modules/ecs"

  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_target_group_arn  = module.alb.target_group_arn

  # Database接続情報
  database_url          = "postgresql://${var.database_username}:${var.database_password}@${module.rds.cluster_endpoint}:5432/${var.database_name}"
  redis_url             = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"

  # Docker Image
  docker_image          = var.docker_image

  # タスク設定
  task_cpu              = var.ecs_task_cpu
  task_memory           = var.ecs_task_memory
  desired_count         = var.ecs_desired_count

  # Auto Scaling
  min_capacity          = var.ecs_min_capacity
  max_capacity          = var.ecs_max_capacity
}

# ===========================================
# S3 (レポート保存用)
# ===========================================

resource "aws_s3_bucket" "reports" {
  bucket = "${var.environment}-it-supervisor-reports"

  tags = {
    Name = "${var.environment}-it-supervisor-reports"
  }
}

resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ライフサイクルポリシー（90日後にGlacierに移行）
resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    id     = "archive-old-reports"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365 # 1年後に削除
    }
  }
}

# ===========================================
# CloudWatch Logs
# ===========================================

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.environment}-it-supervisor"
  retention_in_days = 30

  tags = {
    Name = "${var.environment}-it-supervisor-logs"
  }
}

# ===========================================
# Outputs
# ===========================================

output "alb_dns_name" {
  description = "ALBのDNS名"
  value       = module.alb.alb_dns_name
}

output "database_endpoint" {
  description = "RDSエンドポイント"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redisエンドポイント"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "レポート保存用S3バケット名"
  value       = aws_s3_bucket.reports.id
}

output "ecs_cluster_name" {
  description = "ECSクラスター名"
  value       = module.ecs.cluster_name
}
