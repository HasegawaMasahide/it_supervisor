/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output
   * @default LogLevel.INFO
   */
  level?: LogLevel;

  /**
   * Context/namespace for log messages (e.g., package name)
   */
  context?: string;

  /**
   * Enable colorized output (for terminal)
   * @default true
   */
  color?: boolean;

  /**
   * Enable timestamp in log messages
   * @default true
   */
  timestamp?: boolean;

  /**
   * Custom output function (for testing or custom destinations)
   * @default console.log for info/debug, console.error for warn/error
   */
  output?: (entry: LogEntry) => void;
}
