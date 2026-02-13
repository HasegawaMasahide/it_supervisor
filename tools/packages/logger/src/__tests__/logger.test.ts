import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, LogLevel, LogEntry } from '../index.js';

describe('Logger', () => {
  let mockOutput: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOutput = vi.fn();
  });

  describe('constructor', () => {
    it('should create logger with default options', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom options', () => {
      const logger = new Logger({
        level: LogLevel.DEBUG,
        context: 'test',
        color: false,
        timestamp: false,
        output: mockOutput,
      });

      logger.debug('test message');
      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'DEBUG',
          message: 'test message',
          context: 'test',
        })
      );
    });
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      const logger = new Logger({ level: LogLevel.DEBUG, output: mockOutput });
      logger.debug('debug message', { key: 'value' });

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'DEBUG',
          message: 'debug message',
          data: { key: 'value' },
        })
      );
    });

    it('should log info messages', () => {
      const logger = new Logger({ output: mockOutput });
      logger.info('info message');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'INFO',
          message: 'info message',
        })
      );
    });

    it('should log warn messages', () => {
      const logger = new Logger({ output: mockOutput });
      logger.warn('warning message');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'WARN',
          message: 'warning message',
        })
      );
    });

    it('should log error messages', () => {
      const logger = new Logger({ output: mockOutput });
      logger.error('error message');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          message: 'error message',
        })
      );
    });

    it('should log Error objects', () => {
      const logger = new Logger({ output: mockOutput });
      const error = new Error('Test error');
      logger.error('error occurred', error);

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'ERROR',
          message: 'error occurred',
          data: error,
        })
      );
    });
  });

  describe('level filtering', () => {
    it('should not log below minimum level', () => {
      const logger = new Logger({ level: LogLevel.WARN, output: mockOutput });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockOutput).toHaveBeenCalledTimes(2); // Only WARN and ERROR
      expect(mockOutput).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ level: 'WARN' })
      );
      expect(mockOutput).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ level: 'ERROR' })
      );
    });

    it('should respect SILENT level', () => {
      const logger = new Logger({ level: LogLevel.SILENT, output: mockOutput });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockOutput).not.toHaveBeenCalled();
    });

    it('should update log level dynamically', () => {
      const logger = new Logger({ level: LogLevel.ERROR, output: mockOutput });

      logger.info('should not log');
      expect(mockOutput).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.INFO);
      logger.info('should log');
      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'INFO' })
      );
    });
  });

  describe('context', () => {
    it('should include context in log entries', () => {
      const logger = new Logger({ context: 'MyApp', output: mockOutput });
      logger.info('test');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'MyApp',
        })
      );
    });

    it('should create child logger with nested context', () => {
      const parentLogger = new Logger({ context: 'App', output: mockOutput });
      const childLogger = parentLogger.child('Module');

      childLogger.info('test');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'App:Module',
        })
      );
    });

    it('should create child logger from logger without context', () => {
      const parentLogger = new Logger({ output: mockOutput });
      const childLogger = parentLogger.child('Module');

      childLogger.info('test');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'Module',
        })
      );
    });
  });

  describe('timestamp', () => {
    it('should include timestamp in log entries', () => {
      const logger = new Logger({ output: mockOutput });
      logger.info('test');

      const call = mockOutput.mock.calls[0][0] as LogEntry;
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format timestamp as ISO string', () => {
      const logger = new Logger({ output: mockOutput });
      const beforeTime = new Date();
      logger.info('test');
      const afterTime = new Date();

      const call = mockOutput.mock.calls[0][0] as LogEntry;
      const logTime = new Date(call.timestamp);

      expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('data formatting', () => {
    it('should log primitive data types', () => {
      const logger = new Logger({ output: mockOutput });

      logger.info('string', 'test');
      logger.info('number', 123);
      logger.info('boolean', true);

      expect(mockOutput).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: 'test' })
      );
      expect(mockOutput).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: 123 })
      );
      expect(mockOutput).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ data: true })
      );
    });

    it('should log object data', () => {
      const logger = new Logger({ output: mockOutput });
      const obj = { key: 'value', nested: { prop: 123 } };

      logger.info('test', obj);

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({ data: obj })
      );
    });

    it('should log array data', () => {
      const logger = new Logger({ output: mockOutput });
      const arr = [1, 2, 3];

      logger.info('test', arr);

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({ data: arr })
      );
    });

    it('should log Error objects', () => {
      const logger = new Logger({ output: mockOutput });
      const error = new Error('Test error');

      logger.error('failed', error);

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({ data: error })
      );
    });

    it('should handle undefined data', () => {
      const logger = new Logger({ output: mockOutput });

      logger.info('test');

      expect(mockOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test',
          data: undefined,
        })
      );
    });
  });

  describe('default output formatting', () => {
    it('should format log messages to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = new Logger({ color: false, timestamp: false });

      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));

      consoleSpy.mockRestore();
    });

    it('should use console.error for WARN and ERROR levels', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = new Logger({ color: false, timestamp: false });

      logger.warn('warning');
      logger.error('error');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WARN')
      );
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ERROR')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should include context in formatted output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = new Logger({ context: 'TestApp', color: false, timestamp: false });

      logger.info('test');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TestApp]'));

      consoleSpy.mockRestore();
    });
  });

  describe('color formatting', () => {
    it('should include ANSI color codes when color=true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = new Logger({ color: true, timestamp: false });

      logger.info('test');

      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/\x1b\[\d+m/); // Contains ANSI codes

      consoleSpy.mockRestore();
    });

    it('should not include ANSI color codes when color=false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = new Logger({ color: false, timestamp: false });

      logger.info('test');

      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).not.toMatch(/\x1b\[\d+m/); // No ANSI codes

      consoleSpy.mockRestore();
    });
  });
});
