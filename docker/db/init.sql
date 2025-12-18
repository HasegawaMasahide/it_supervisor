-- IT Supervisor - PostgreSQL 初期化スクリプト
-- 作成日: 2025-12-18

-- ===========================================
-- 拡張機能の有効化
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID生成
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- テキスト検索の高速化
CREATE EXTENSION IF NOT EXISTS "btree_gin";       -- JSONBインデックス最適化

-- ===========================================
-- テーブル作成
-- ===========================================

-- 顧客テーブル
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    plan VARCHAR(50) CHECK (plan IN ('light', 'standard', 'premium')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url TEXT,
    repository_path TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'discovery'
        CHECK (status IN ('discovery', 'analysis', 'diagnosis', 'proposal', 'implementation', 'measurement', 'reporting', 'completed', 'archived')),
    phase_start_date TIMESTAMP WITH TIME ZONE,
    phase_end_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- メトリクステーブル
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'code_quality', 'security', 'performance', 'maintainability'
    name VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    phase VARCHAR(50) CHECK (phase IN ('before', 'after')),
    tool_name VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Issueテーブル
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL
        CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status VARCHAR(50) NOT NULL DEFAULT 'identified'
        CHECK (status IN ('identified', 'in_progress', 'resolved', 'wont_fix', 'duplicate')),
    category VARCHAR(100), -- 'security', 'performance', 'code_quality', 'best_practice'
    file_path TEXT,
    line_number INTEGER,
    line_range_start INTEGER,
    line_range_end INTEGER,
    code_snippet TEXT,
    tool_name VARCHAR(100),
    rule_id VARCHAR(255),
    suggested_fix TEXT,
    assigned_to VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Issueコメントテーブル
CREATE TABLE IF NOT EXISTS issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- レポートテーブル
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('analysis', 'diagnosis', 'proposal', 'measurement', 'final')),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    file_path TEXT,
    format VARCHAR(20) CHECK (format IN ('pdf', 'html', 'markdown')),
    generated_by VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 監査ログテーブル（すべての操作を記録）
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'create_project', 'run_analysis', 'generate_report', etc.
    resource_type VARCHAR(50), -- 'project', 'issue', 'report', etc.
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 静的解析実行履歴テーブル
CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    issues_found INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ===========================================
-- インデックス作成
-- ===========================================

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);

-- Projects
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Metrics
CREATE INDEX idx_metrics_project_id ON metrics(project_id);
CREATE INDEX idx_metrics_category ON metrics(category);
CREATE INDEX idx_metrics_name ON metrics(name);
CREATE INDEX idx_metrics_measured_at ON metrics(measured_at DESC);
CREATE INDEX idx_metrics_phase ON metrics(phase);
CREATE INDEX idx_metrics_value ON metrics USING GIN (value); -- JSONBインデックス

-- Issues
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX idx_issues_tags ON issues USING GIN (tags);
CREATE INDEX idx_issues_metadata ON issues USING GIN (metadata);

-- Issue Comments
CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX idx_issue_comments_created_at ON issue_comments(created_at DESC);

-- Reports
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated_at ON reports(generated_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Analysis Runs
CREATE INDEX idx_analysis_runs_project_id ON analysis_runs(project_id);
CREATE INDEX idx_analysis_runs_tool_name ON analysis_runs(tool_name);
CREATE INDEX idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX idx_analysis_runs_started_at ON analysis_runs(started_at DESC);

-- ===========================================
-- トリガー: updated_at 自動更新
-- ===========================================

-- トリガー関数の作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 初期データの投入（開発環境用）
-- ===========================================

-- デモ顧客の作成
INSERT INTO customers (id, name, email, company_name, plan, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'テスト太郎', 'test@example.com', '株式会社テスト', 'standard', 'active'),
    ('00000000-0000-0000-0000-000000000002', '開発花子', 'dev@example.com', '開発株式会社', 'premium', 'active')
ON CONFLICT (id) DO NOTHING;

-- デモプロジェクトの作成
INSERT INTO projects (id, customer_id, name, description, status) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Laravel TODOアプリ監査', 'サンプルプロジェクト', 'analysis')
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- ビュー作成（よく使うクエリの最適化）
-- ===========================================

-- プロジェクトサマリービュー
CREATE OR REPLACE VIEW project_summary AS
SELECT
    p.id,
    p.name,
    p.status,
    c.company_name,
    c.plan,
    COUNT(DISTINCT i.id) AS total_issues,
    COUNT(DISTINCT i.id) FILTER (WHERE i.severity = 'critical') AS critical_issues,
    COUNT(DISTINCT i.id) FILTER (WHERE i.severity = 'high') AS high_issues,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'resolved') AS resolved_issues,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN issues i ON p.id = i.project_id
GROUP BY p.id, c.company_name, c.plan;

-- メトリクス比較ビュー（Before/After）
CREATE OR REPLACE VIEW metrics_comparison AS
SELECT
    project_id,
    category,
    name,
    MAX(CASE WHEN phase = 'before' THEN value END) AS before_value,
    MAX(CASE WHEN phase = 'after' THEN value END) AS after_value,
    MAX(CASE WHEN phase = 'before' THEN measured_at END) AS before_measured_at,
    MAX(CASE WHEN phase = 'after' THEN measured_at END) AS after_measured_at
FROM metrics
GROUP BY project_id, category, name;

-- ===========================================
-- パフォーマンス最適化設定
-- ===========================================

-- 統計情報の収集
ANALYZE;

-- VACUUM（初期化時は不要だが、定期実行推奨）
-- VACUUM ANALYZE;

-- ===========================================
-- 完了メッセージ
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IT Supervisor Database Initialized Successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database: it_supervisor';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'Indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Views created: %', (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public');
    RAISE NOTICE '========================================';
END $$;
