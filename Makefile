# IT Supervisor - Makefile
# Docker環境の管理を簡略化するヘルパーコマンド

.PHONY: help setup build up down restart logs clean test analyze db-console pgadmin backup restore

# デフォルトターゲット
.DEFAULT_GOAL := help

# カラー出力
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## ===========================================
## ヘルプ
## ===========================================

help: ## このヘルプメッセージを表示
	@echo "$(BLUE)IT Supervisor - Docker Management$(NC)"
	@echo ""
	@echo "$(GREEN)使用可能なコマンド:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

## ===========================================
## セットアップ
## ===========================================

setup: ## 初回セットアップ（.env作成、ビルド、起動）
	@echo "$(BLUE)初回セットアップを開始します...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW).env ファイルを作成中...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN).env ファイルを作成しました$(NC)"; \
	else \
		echo "$(YELLOW).env ファイルは既に存在します$(NC)"; \
	fi
	@$(MAKE) build
	@$(MAKE) up
	@echo "$(GREEN)セットアップ完了！$(NC)"
	@echo "$(BLUE)次のコマンドでログを確認できます: make logs$(NC)"

build: ## Dockerイメージをビルド
	@echo "$(BLUE)Dockerイメージをビルド中...$(NC)"
	docker-compose build
	@echo "$(GREEN)ビルド完了$(NC)"

## ===========================================
## コンテナ管理
## ===========================================

up: ## すべてのサービスを起動
	@echo "$(BLUE)サービスを起動中...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)サービス起動完了$(NC)"
	@docker-compose ps

down: ## すべてのサービスを停止
	@echo "$(YELLOW)サービスを停止中...$(NC)"
	docker-compose down
	@echo "$(GREEN)サービス停止完了$(NC)"

restart: ## すべてのサービスを再起動
	@echo "$(YELLOW)サービスを再起動中...$(NC)"
	@$(MAKE) down
	@$(MAKE) up

stop: ## すべてのサービスを停止（ボリュームは保持）
	@echo "$(YELLOW)サービスを停止中...$(NC)"
	docker-compose stop

start: ## 停止中のサービスを開始
	@echo "$(BLUE)サービスを開始中...$(NC)"
	docker-compose start

ps: ## 実行中のコンテナ一覧
	docker-compose ps

## ===========================================
## ログ・監視
## ===========================================

logs: ## すべてのサービスのログを表示（リアルタイム）
	docker-compose logs -f

logs-app: ## appサービスのログを表示
	docker-compose logs -f app

logs-db: ## dbサービスのログを表示
	docker-compose logs -f db

logs-redis: ## redisサービスのログを表示
	docker-compose logs -f redis

## ===========================================
## 開発
## ===========================================

shell: ## appコンテナにシェル接続
	docker-compose exec app sh

shell-db: ## dbコンテナにシェル接続
	docker-compose exec db sh

db-console: ## PostgreSQLコンソールに接続
	docker-compose exec db psql -U postgres -d it_supervisor

redis-console: ## Redisコンソールに接続
	docker-compose exec redis redis-cli

## ===========================================
## ツール
## ===========================================

pgadmin: ## pgAdmin（データベース管理UI）を起動
	@echo "$(BLUE)pgAdminを起動中...$(NC)"
	docker-compose --profile tools up -d pgadmin
	@echo "$(GREEN)pgAdmin起動完了$(NC)"
	@echo "$(YELLOW)ブラウザでアクセス: http://localhost:5050$(NC)"
	@echo "$(YELLOW)Email: admin@it-supervisor.local$(NC)"
	@echo "$(YELLOW)Password: admin$(NC)"

analyze-eslint: ## ESLint解析を実行（REPO_PATH必須）
	@if [ -z "$(REPO_PATH)" ]; then \
		echo "$(RED)エラー: REPO_PATH を指定してください$(NC)"; \
		echo "$(YELLOW)例: make analyze-eslint REPO_PATH=/app/repos/customer-project$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)ESLint解析を実行中: $(REPO_PATH)$(NC)"
	docker-compose exec analyzer-eslint /usr/local/bin/run-eslint.sh $(REPO_PATH) json
	@echo "$(GREEN)解析完了: /repos/eslint-report.json$(NC)"

analyze-phpcs: ## PHPCS解析を実行（REPO_PATH必須、STANDARD=PSR12）
	@if [ -z "$(REPO_PATH)" ]; then \
		echo "$(RED)エラー: REPO_PATH を指定してください$(NC)"; \
		echo "$(YELLOW)例: make analyze-phpcs REPO_PATH=/repos/customer-project$(NC)"; \
		exit 1; \
	fi
	@STANDARD=$${STANDARD:-PSR12}; \
	echo "$(BLUE)PHPCS解析を実行中: $(REPO_PATH) (Standard: $$STANDARD)$(NC)"; \
	docker-compose exec analyzer-phpcs /usr/local/bin/run-phpcs.sh $(REPO_PATH) $$STANDARD
	@echo "$(GREEN)解析完了: /repos/phpcs-report.json$(NC)"

## ===========================================
## データベース管理
## ===========================================

db-migrate: ## データベースマイグレーション実行
	@echo "$(BLUE)マイグレーションを実行中...$(NC)"
	docker-compose exec app npx prisma migrate deploy
	@echo "$(GREEN)マイグレーション完了$(NC)"

db-reset: ## データベースをリセット（警告: 全データ削除）
	@echo "$(RED)警告: すべてのデータが削除されます$(NC)"
	@read -p "続行しますか? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v
	docker-compose up -d db
	@sleep 5
	@echo "$(GREEN)データベースリセット完了$(NC)"

db-backup: ## データベースバックアップ
	@echo "$(BLUE)データベースをバックアップ中...$(NC)"
	@mkdir -p backups
	@BACKUP_FILE=backups/backup-$$(date +%Y%m%d_%H%M%S).sql; \
	docker-compose exec -T db pg_dump -U postgres it_supervisor > $$BACKUP_FILE; \
	echo "$(GREEN)バックアップ完了: $$BACKUP_FILE$(NC)"

db-restore: ## データベースリストア（BACKUP_FILE必須）
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)エラー: BACKUP_FILE を指定してください$(NC)"; \
		echo "$(YELLOW)例: make db-restore BACKUP_FILE=backups/backup-20231201.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)データベースをリストア中: $(BACKUP_FILE)$(NC)"
	@docker-compose exec -T db psql -U postgres it_supervisor < $(BACKUP_FILE)
	@echo "$(GREEN)リストア完了$(NC)"

## ===========================================
## テスト
## ===========================================

test: ## 全テストを実行
	@echo "$(BLUE)テストを実行中...$(NC)"
	docker-compose exec app npm test
	@echo "$(GREEN)テスト完了$(NC)"

test-watch: ## テストをwatch モードで実行
	docker-compose exec app npm run test:watch

lint: ## リント実行
	@echo "$(BLUE)リントを実行中...$(NC)"
	docker-compose exec app npm run lint
	@echo "$(GREEN)リント完了$(NC)"

format: ## コードフォーマット
	@echo "$(BLUE)コードをフォーマット中...$(NC)"
	docker-compose exec app npm run format
	@echo "$(GREEN)フォーマット完了$(NC)"

## ===========================================
## クリーンアップ
## ===========================================

clean: ## コンテナとボリュームを削除（データ削除）
	@echo "$(RED)警告: すべてのコンテナとボリュームが削除されます$(NC)"
	@read -p "続行しますか? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v
	@echo "$(GREEN)クリーンアップ完了$(NC)"

clean-all: ## すべてのDockerリソースを削除（イメージ含む）
	@echo "$(RED)警告: すべてのDockerリソースが削除されます$(NC)"
	@read -p "続行しますか? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down --rmi all -v
	@echo "$(GREEN)完全クリーンアップ完了$(NC)"

prune: ## 未使用のDockerリソースを削除
	@echo "$(YELLOW)未使用のDockerリソースを削除中...$(NC)"
	docker system prune -f
	@echo "$(GREEN)削除完了$(NC)"

## ===========================================
## 情報表示
## ===========================================

info: ## システム情報を表示
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)IT Supervisor - システム情報$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(GREEN)Dockerバージョン:$(NC)"
	@docker --version
	@echo ""
	@echo "$(GREEN)Docker Composeバージョン:$(NC)"
	@docker-compose --version
	@echo ""
	@echo "$(GREEN)実行中のコンテナ:$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(GREEN)ボリューム使用状況:$(NC)"
	@docker volume ls --filter name=it_supervisor
	@echo ""
	@echo "$(GREEN)ネットワーク:$(NC)"
	@docker network ls --filter name=it_supervisor
	@echo "$(BLUE)========================================$(NC)"

status: ## サービスの状態を確認
	@echo "$(BLUE)サービス状態:$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)ヘルスチェック:$(NC)"
	@docker-compose exec db pg_isready -U postgres && echo "$(GREEN)✓ PostgreSQL: OK$(NC)" || echo "$(RED)✗ PostgreSQL: NG$(NC)"
	@docker-compose exec redis redis-cli ping | grep -q PONG && echo "$(GREEN)✓ Redis: OK$(NC)" || echo "$(RED)✗ Redis: NG$(NC)"
