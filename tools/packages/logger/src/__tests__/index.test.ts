import { describe, it, expect } from 'vitest';
import { Logger, LogLevel, LogEntry, createLogger } from '../index.js';
import type { LoggerOptions } from '../index.js';

describe('Logger Package Exports', () => {
  describe('Class exports', () => {
    it('should export Logger class', () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger).toBe('function');
    });

    it('should create Logger instance', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Enum exports', () => {
    it('should export LogLevel enum', () => {
      expect(LogLevel).toBeDefined();
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.SILENT).toBe(4);
    });

    it('should have all LogLevel members', () => {
      const levels = Object.keys(LogLevel).filter((key) => isNaN(Number(key)));
      expect(levels).toEqual(['DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT']);
    });
  });

  describe('Helper function exports', () => {
    it('should export createLogger function', () => {
      expect(createLogger).toBeDefined();
      expect(typeof createLogger).toBe('function');
    });

    it('should create Logger with context using createLogger', () => {
      const logger = createLogger('test-app');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should accept options in createLogger', () => {
      const logger = createLogger('test-app', {
        level: LogLevel.DEBUG,
        color: false,
      });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Type exports', () => {
    it('should allow using LogEntry type', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T00:00:00.000Z',
        level: 'INFO',
        message: 'Test message',
        context: 'test',
        data: { foo: 'bar' },
      };

      expect(entry.timestamp).toBe('2025-01-01T00:00:00.000Z');
      expect(entry.level).toBe('INFO');
      expect(entry.message).toBe('Test message');
    });

    it('should allow using LoggerOptions type', () => {
      const options: LoggerOptions = {
        level: LogLevel.DEBUG,
        context: 'test',
        color: false,
        timestamp: true,
      };

      const logger = new Logger(options);
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Integration', () => {
    it('should work with all exports together', () => {
      // Create logger with all exported features
      const logger = createLogger('integration-test', {
        level: LogLevel.DEBUG,
        color: false,
        timestamp: false,
        output: (entry: LogEntry) => {
          expect(entry.level).toBeDefined();
          expect(entry.message).toBeDefined();
        },
      });

      // Use logger methods
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(logger).toBeInstanceOf(Logger);
    });
  });
});
