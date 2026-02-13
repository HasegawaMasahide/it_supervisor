/**
 * メトリクスのカテゴリ
 */
export enum MetricCategory {
  Security = 'security',
  Performance = 'performance',
  CodeQuality = 'code_quality',
  TechnicalDebt = 'technical_debt',
  Custom = 'custom'
}

/**
 * メトリクスの値の型
 */
export type MetricValue = number | string | boolean;

/**
 * メトリクスレコード
 */
export interface MetricRecord {
  /** レコードID（自動生成） */
  id?: string;
  /** プロジェクトID */
  projectId: string;
  /** 収集日時 */
  timestamp: Date;
  /** メトリクスカテゴリ */
  category: MetricCategory;
  /** メトリクス名 */
  name: string;
  /** メトリクス値 */
  value: MetricValue;
  /** 単位（例: count, ms, percentage） */
  unit?: string;
  /** 収集元ツール名 */
  source: string;
  /** 備考・メモ */
  notes?: string;
  /** タグ（複数指定可能） */
  tags?: string[];
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * メトリクス検索条件
 */
export interface MetricQuery {
  /** プロジェクトID */
  projectId?: string;
  /** カテゴリフィルター */
  category?: MetricCategory;
  /** メトリクス名フィルター */
  name?: string;
  /** 開始日時 */
  from?: Date;
  /** 終了日時 */
  to?: Date;
  /** タグフィルター */
  tags?: string[];
  /** 並び順（デフォルト: timestamp desc） */
  orderBy?: 'timestamp' | 'category' | 'name';
  /** 昇順/降順 */
  order?: 'asc' | 'desc';
  /** 取得件数上限 */
  limit?: number;
  /** オフセット */
  offset?: number;
}

/**
 * メトリクス集計結果
 */
export interface MetricAggregation {
  category: MetricCategory;
  name: string;
  count: number;
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  latest?: MetricValue;
}

/**
 * Before/After比較結果
 */
export interface MetricComparison {
  projectId: string;
  category: MetricCategory;
  name: string;
  beforeValue: MetricValue;
  afterValue: MetricValue;
  beforeDate: Date;
  afterDate: Date;
  change: number | null; // 数値の場合のみ差分を計算
  changePercentage: number | null; // 数値の場合のみ変化率を計算
  unit?: string;
}

/**
 * プロジェクト情報
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * メトリクスエクスポート形式
 */
export interface MetricsExport {
  version: string;
  exportDate: Date;
  projects: Project[];
  metrics: MetricRecord[];
}
