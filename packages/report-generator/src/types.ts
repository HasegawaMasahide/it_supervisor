/**
 * レポートタイプ
 */
export enum ReportType {
  SystemOverview = 'system-overview',
  Analysis = 'analysis',
  Diagnosis = 'diagnosis',
  Proposal = 'proposal',
  Implementation = 'implementation',
  Measurement = 'measurement',
  FinalReport = 'final-report'
}

/**
 * 出力フォーマット
 */
export enum OutputFormat {
  PDF = 'pdf',
  HTML = 'html',
  Markdown = 'markdown'
}

/**
 * レポート設定
 */
export interface ReportConfig {
  /** プロジェクト名 */
  projectName: string;
  /** 顧客名 */
  customerName: string;
  /** レポート日付 */
  date: Date;
  /** 著者 */
  author?: string;
  /** バージョン */
  version?: string;
  /** 会社ロゴパス */
  logoPath?: string;
  /** カスタムCSS */
  customCSS?: string;
  /** データ */
  data: Record<string, any>;
}

/**
 * レポートセクション
 */
export interface ReportSection {
  title: string;
  level: number;
  content: string;
  subsections?: ReportSection[];
}

/**
 * レポート
 */
export interface Report {
  type: ReportType;
  config: ReportConfig;
  sections: ReportSection[];
  toc: TableOfContents[];
  generatedAt: Date;
}

/**
 * 目次
 */
export interface TableOfContents {
  title: string;
  level: number;
  anchor: string;
  page?: number;
}

/**
 * テンプレート変数
 */
export interface TemplateVariables {
  projectName: string;
  customerName: string;
  date: string;
  author?: string;
  version?: string;
  [key: string]: any;
}
