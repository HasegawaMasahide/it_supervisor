# @it-supervisor/logger - API Documentation

Comprehensive API reference for the lightweight structured logging utility.

## Table of Contents

- [Classes](#classes)
  - [Logger](#logger-class)
- [Enums](#enums)
  - [LogLevel](#loglevel-enum)
- [Interfaces](#interfaces)
  - [LogEntry](#logentry-interface)
  - [LoggerOptions](#loggeroptions-interface)
- [Helper Functions](#helper-functions)
  - [createLogger](#createlogger-function)

---

## Classes

### Logger Class

The main logger class providing structured logging functionality.

#### Constructor

```typescript
new Logger(options?: LoggerOptions)
```

Creates a new logger instance with the specified configuration.

**Parameters:**
- `options` (optional): Configuration options for the logger

**Example:**
```typescript
import { Logger, LogLevel } from '@it-supervisor/logger';

const logger = new Logger({
  context: 'MyApp',
  level: LogLevel.DEBUG,
  color: true,
  timestamp: true,
});
```

#### Methods

##### `debug(message: string, data?: unknown): void`

Logs a debug message (verbose diagnostics).

**Parameters:**
- `message`: The debug message to log
- `data` (optional): Additional data to include (objects, primitives, errors)

**Example:**
```typescript
logger.debug('Processing user request', { userId: 123, action: 'login' });
```

**Output:**
```
[2026-02-11T16:20:00.000Z] DEBUG [MyApp] Processing user request
  {
    "userId": 123,
    "action": "login"
  }
```

---

##### `info(message: string, data?: unknown): void`

Logs an informational message (general information).

**Parameters:**
- `message`: The info message to log
- `data` (optional): Additional data to include

**Example:**
```typescript
logger.info('Server started', { port: 3000, environment: 'production' });
```

**Output:**
```
[2026-02-11T16:20:00.000Z] INFO [MyApp] Server started
  {
    "port": 3000,
    "environment": "production"
  }
```

---

##### `warn(message: string, data?: unknown): void`

Logs a warning message (non-critical issues).

**Parameters:**
- `message`: The warning message to log
- `data` (optional): Additional data to include

**Example:**
```typescript
logger.warn('Deprecated API used', { endpoint: '/api/v1/users', replacement: '/api/v2/users' });
```

**Output:**
```
[2026-02-11T16:20:00.000Z] WARN [MyApp] Deprecated API used
  {
    "endpoint": "/api/v1/users",
    "replacement": "/api/v2/users"
  }
```

---

##### `error(message: string, data?: unknown): void`

Logs an error message (failures and exceptions).

**Parameters:**
- `message`: The error message to log
- `data` (optional): Additional data to include (often an Error object)

**Example:**
```typescript
try {
  await connectToDatabase();
} catch (error) {
  logger.error('Database connection failed', error);
}
```

**Output:**
```
[2026-02-11T16:20:00.000Z] ERROR [MyApp] Database connection failed
  Error: Connection refused
    at connectToDatabase (/app/db.js:42:15)
    at Server.start (/app/server.js:10:5)
```

---

##### `child(subContext: string): Logger`

Creates a child logger with a nested context.

**Parameters:**
- `subContext`: The sub-context to append to the parent context

**Returns:**
- A new `Logger` instance with the nested context

**Example:**
```typescript
const appLogger = new Logger({ context: 'App' });
const dbLogger = appLogger.child('Database');
const cacheLogger = appLogger.child('Cache');

dbLogger.info('Connected to PostgreSQL');
// Output: [INFO] [App:Database] Connected to PostgreSQL

cacheLogger.info('Cache cleared');
// Output: [INFO] [App:Cache] Cache cleared
```

**Use Cases:**
- Creating module-specific loggers from a parent logger
- Maintaining context hierarchy across application layers
- Organizing logs by component or feature

---

##### `setLevel(level: LogLevel): void`

Dynamically changes the minimum log level.

**Parameters:**
- `level`: The new minimum log level

**Example:**
```typescript
const logger = new Logger({ level: LogLevel.INFO });

logger.debug('This will NOT be shown');
logger.info('This will be shown');

// Enable debug logging at runtime
logger.setLevel(LogLevel.DEBUG);

logger.debug('Now this will be shown');
```

**Use Cases:**
- Toggling verbose logging in development mode
- Reducing log output in production
- Dynamic log level control based on environment variables

---

##### `log(level: LogLevel, message: string, data?: unknown): void`

Internal method for logging at a specific level (used by debug/info/warn/error).

**Parameters:**
- `level`: The log level
- `message`: The message to log
- `data` (optional): Additional data to include

**Note:** This method is primarily for internal use. Use `debug()`, `info()`, `warn()`, or `error()` instead.

---

## Enums

### LogLevel Enum

Defines the available log levels in order of severity.

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}
```

**Values:**

| Level | Value | Description | When to Use |
|-------|-------|-------------|-------------|
| `DEBUG` | 0 | Verbose diagnostics | Development debugging, detailed tracing |
| `INFO` | 1 | General information | Application lifecycle events, major operations |
| `WARN` | 2 | Non-critical issues | Deprecation warnings, fallback behavior |
| `ERROR` | 3 | Failures and exceptions | Error handling, critical failures |
| `SILENT` | 4 | Suppress all output | Testing, when logging is not desired |

**Example:**
```typescript
import { LogLevel } from '@it-supervisor/logger';

const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
});
```

---

## Interfaces

### LogEntry Interface

Represents a structured log entry.

```typescript
interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `timestamp` | `string` | ISO 8601 timestamp (e.g., `"2026-02-11T16:20:00.123Z"`) |
| `level` | `'DEBUG' \| 'INFO' \| 'WARN' \| 'ERROR'` | Log level as string |
| `message` | `string` | The log message |
| `context` | `string` (optional) | Logger context/namespace (e.g., `"App:Database"`) |
| `data` | `unknown` (optional) | Additional structured data |

**Example:**
```typescript
{
  timestamp: "2026-02-11T16:20:00.123Z",
  level: "ERROR",
  message: "Database connection failed",
  context: "App:Database",
  data: Error("Connection timeout")
}
```

**Use Cases:**
- Custom log output formatting
- Sending logs to external services (e.g., Sentry, Datadog)
- Filtering and processing logs programmatically

---

### LoggerOptions Interface

Configuration options for creating a logger instance.

```typescript
interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  color?: boolean;
  timestamp?: boolean;
  output?: (entry: LogEntry) => void;
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `level` | `LogLevel` | `LogLevel.INFO` | Minimum log level to output |
| `context` | `string` | `''` | Context/namespace for log messages |
| `color` | `boolean` | `true` | Enable ANSI colorized output |
| `timestamp` | `boolean` | `true` | Include timestamp in log messages |
| `output` | `(entry: LogEntry) => void` | `console.log/error` | Custom output function |

**Example:**
```typescript
const logger = new Logger({
  level: LogLevel.DEBUG,
  context: 'MyService',
  color: false, // Disable colors for file logging
  timestamp: true,
  output: (entry) => {
    // Custom output: write to file
    fs.appendFileSync('app.log', JSON.stringify(entry) + '\n');
  },
});
```

---

## Helper Functions

### `createLogger` Function

Convenience function for creating a logger with common defaults.

```typescript
function createLogger(context: string, options?: Partial<LoggerOptions>): Logger
```

**Parameters:**
- `context`: The logger context (required)
- `options` (optional): Additional logger options

**Returns:**
- A new `Logger` instance

**Example:**
```typescript
import { createLogger, LogLevel } from '@it-supervisor/logger';

// Quick logger creation with context
const logger = createLogger('static-analyzer', {
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.WARN,
});

logger.info('Analysis started');
```

**Use Cases:**
- Creating loggers for different packages in a monorepo
- Standardized logger creation across modules
- Quick logger setup with minimal configuration

---

## Advanced Usage

### Custom Output Destinations

Send logs to files, external services, or multiple destinations:

```typescript
import { Logger, LogEntry } from '@it-supervisor/logger';

const logger = new Logger({
  output: (entry: LogEntry) => {
    // Write to file
    fs.appendFileSync('app.log', JSON.stringify(entry) + '\n');

    // Send to external logging service
    if (entry.level === 'ERROR') {
      sendToSentry(entry);
    }

    // Still output to console
    console.log(`[${entry.level}] ${entry.message}`);
  },
});
```

### Environment-Based Configuration

Configure logging based on environment:

```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  silent: LogLevel.SILENT,
};

const logger = new Logger({
  level: levelMap[LOG_LEVEL] ?? LogLevel.INFO,
  color: process.env.NODE_ENV !== 'production',
});
```

### Testing with Custom Output

Capture logs during testing:

```typescript
import { Logger, LogEntry } from '@it-supervisor/logger';

const logEntries: LogEntry[] = [];
const testLogger = new Logger({
  output: (entry) => logEntries.push(entry),
});

// Run tests
testLogger.info('Test message');

// Assert on captured logs
expect(logEntries).toHaveLength(1);
expect(logEntries[0].message).toBe('Test message');
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ❌ Bad: Using INFO for debugging
logger.info('Variable x:', x);

// ✅ Good: Use DEBUG for debugging
logger.debug('Variable x:', x);

// ❌ Bad: Using ERROR for warnings
logger.error('Deprecated API used');

// ✅ Good: Use WARN for non-critical issues
logger.warn('Deprecated API used');
```

### 2. Provide Context

```typescript
// ❌ Bad: Generic context
const logger = new Logger({ context: 'App' });

// ✅ Good: Specific, hierarchical context
const logger = new Logger({ context: 'App:Auth:JWT' });
```

### 3. Include Structured Data

```typescript
// ❌ Bad: String interpolation
logger.error(`User ${userId} failed to login with error ${error.message}`);

// ✅ Good: Structured data
logger.error('User login failed', { userId, error });
```

### 4. Use Child Loggers for Modules

```typescript
// ❌ Bad: Creating separate root loggers
const dbLogger = new Logger({ context: 'Database' });
const cacheLogger = new Logger({ context: 'Cache' });

// ✅ Good: Use child loggers
const appLogger = new Logger({ context: 'App' });
const dbLogger = appLogger.child('Database');
const cacheLogger = appLogger.child('Cache');
```

---

## Performance Considerations

- **Log Level Filtering**: Messages below the configured log level are filtered early (minimal overhead)
- **Zero Dependencies**: No external dependencies means fast installation and startup
- **Lazy Formatting**: Data is only formatted when the log level is enabled
- **Production Mode**: Use `LogLevel.WARN` or `LogLevel.ERROR` in production to reduce overhead

---

## License

MIT
