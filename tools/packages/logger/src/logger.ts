import { LogLevel, LogEntry, LoggerOptions } from './types.js';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  context: '\x1b[35m', // Magenta
  timestamp: '\x1b[90m', // Gray
};

/**
 * Lightweight structured logger
 *
 * @example
 * ```typescript
 * const logger = new Logger({ context: 'MyApp', level: LogLevel.DEBUG });
 * logger.info('Application started');
 * logger.debug('Debug info', { userId: 123 });
 * logger.error('Error occurred', new Error('Failed'));
 * ```
 */
export class Logger {
  private options: Required<LoggerOptions>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level ?? LogLevel.INFO,
      context: options.context ?? '',
      color: options.color ?? true,
      timestamp: options.timestamp ?? true,
      output: options.output ?? this.defaultOutput.bind(this),
    };
  }

  /**
   * Log a debug message (verbose diagnostics)
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message (general information)
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message (non-critical issues)
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message (failures and exceptions)
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Create a child logger with a sub-context
   */
  child(subContext: string): Logger {
    const childContext = this.options.context
      ? `${this.options.context}:${subContext}`
      : subContext;

    return new Logger({
      ...this.options,
      context: childContext,
    });
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // Skip if below minimum level
    if (level < this.options.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level] as keyof typeof LogLevel,
      message,
      context: this.options.context,
      data,
    };

    this.options.output(entry);
  }

  /**
   * Default output formatter
   */
  private defaultOutput(entry: LogEntry): void {
    const parts: string[] = [];

    // Timestamp
    if (this.options.timestamp) {
      const ts = this.colorize('timestamp', entry.timestamp);
      parts.push(`[${ts}]`);
    }

    // Log level
    const levelStr = this.colorize(
      entry.level.toLowerCase() as keyof typeof COLORS,
      entry.level.padEnd(5)
    );
    parts.push(levelStr);

    // Context
    if (entry.context) {
      const ctx = this.colorize('context', `[${entry.context}]`);
      parts.push(ctx);
    }

    // Message
    parts.push(entry.message);

    // Data
    if (entry.data !== undefined) {
      const dataStr = this.formatData(entry.data);
      parts.push(dataStr);
    }

    const output = parts.join(' ');

    // Use console.error for WARN and ERROR, console.log for others
    if (entry.level === 'WARN' || entry.level === 'ERROR') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Apply ANSI color codes if enabled
   */
  private colorize(type: keyof typeof COLORS, text: string): string {
    if (!this.options.color) {
      return text;
    }
    return `${COLORS[type]}${text}${COLORS.reset}`;
  }

  /**
   * Format data for output
   */
  private formatData(data: unknown): string {
    if (data instanceof Error) {
      return `\n  ${data.stack || data.message}`;
    }

    if (typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data, null, 2)
          .split('\n')
          .map((line, i) => (i === 0 ? line : `  ${line}`))
          .join('\n');
      } catch {
        return String(data);
      }
    }

    return String(data);
  }
}

/**
 * Create a logger instance with the given context
 */
export function createLogger(context: string, options?: Omit<LoggerOptions, 'context'>): Logger {
  return new Logger({ ...options, context });
}
