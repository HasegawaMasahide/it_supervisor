/**
 * 環境タイプ
 */
export enum EnvironmentType {
  NodeJS = 'nodejs',
  PHP = 'php',
  Python = 'python',
  DotNet = 'dotnet',
  Java = 'java',
  Ruby = 'ruby',
  Static = 'static',
  Unknown = 'unknown'
}

/**
 * データベースタイプ
 */
export enum DatabaseType {
  MySQL = 'mysql',
  PostgreSQL = 'postgresql',
  MongoDB = 'mongodb',
  SQLite = 'sqlite',
  SQLServer = 'sqlserver',
  Redis = 'redis'
}

/**
 * 隔離レベル
 */
export enum IsolationLevel {
  /** 完全隔離（インターネットアクセス不可） */
  FULL = 'FULL',
  /** 制限付き（ホワイトリストのみ許可） */
  RESTRICTED = 'RESTRICTED',
  /** 通常（すべてのネットワークアクセス可能） */
  NORMAL = 'NORMAL'
}

/**
 * 環境検出結果
 */
export interface DetectionResult {
  type: EnvironmentType;
  confidence: number;
  details: {
    runtime?: string;
    version?: string;
    framework?: string;
    packageManager?: string;
    entrypoint?: string;
  };
  databases: DatabaseType[];
  ports: number[];
  dependencies: string[];
  hasDocker: boolean;
  hasDockerCompose: boolean;
}

/**
 * Docker Composeサービス定義
 */
export interface DockerComposeService {
  image?: string;
  build?: {
    context: string;
    dockerfile?: string;
  };
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
  networks?: string[];
  command?: string;
  healthcheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
}

/**
 * Docker Compose設定
 */
export interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerComposeService>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

/**
 * Dockerfile生成設定
 */
export interface DockerfileConfig {
  baseImage: string;
  workdir: string;
  copy: Array<{ src: string; dest: string }>;
  run: string[];
  cmd: string[];
  expose: number[];
  env?: Record<string, string>;
}

/**
 * サンドボックス構築オプション
 */
export interface SandboxBuildOptions {
  /** 出力ディレクトリ */
  outputDir: string;
  /** 環境タイプを明示的に指定 */
  type?: EnvironmentType;
  /** 隔離レベル */
  isolation?: IsolationLevel;
  /** データベースを追加するか */
  includeDatabase?: boolean;
  /** DBダンプファイル */
  dbDumpFile?: string;
  /** 既存のDockerファイルを使用 */
  useExistingDocker?: boolean;
  /** ポートマッピング */
  portMapping?: Record<number, number>;
  /** 環境変数 */
  environment?: Record<string, string>;
}

/**
 * サンドボックス環境
 */
export interface SandboxEnvironment {
  id: string;
  path: string;
  type: EnvironmentType;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  createdAt: Date;
  ports: Record<string, number>;
  services: string[];
}

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  healthy: boolean;
  services: Record<string, ServiceHealth>;
  timestamp: Date;
}

/**
 * サービスヘルス
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'starting';
  message?: string;
  uptime?: number;
}

/**
 * スナップショット情報
 */
export interface Snapshot {
  name: string;
  createdAt: Date;
  size: number;
  description?: string;
}
