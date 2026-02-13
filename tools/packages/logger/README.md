# @it-supervisor/logger

Lightweight structured logging utility for IT Supervisor Tools.

## Features

- **Multiple log levels**: DEBUG, INFO, WARN, ERROR, SILENT
- **Structured logging**: Consistent log format with timestamp, level, context, and data
- **Colorized output**: ANSI color codes for terminal readability (configurable)
- **Context/namespace support**: Create child loggers with nested contexts
- **Zero dependencies**: No external logging libraries required
- **TypeScript**: Full type safety and IntelliSense support
- **Configurable**: Control log level, colors, timestamps, and output destination

## Installation

```bash
npm install @it-supervisor/logger
```

## Usage

### Basic Usage

```typescript
import { Logger, LogLevel } from '@it-supervisor/logger';

const logger = new Logger({ context: 'MyApp' });

logger.debug('Debugging information', { userId: 123 });
logger.info('Application started');
logger.warn('Deprecated API used');
logger.error('Failed to connect', new Error('Connection refused'));
```

### Creating Child Loggers

```typescript
const appLogger = new Logger({ context: 'App' });
const dbLogger = appLogger.child('Database');
const cacheLogger = appLogger.child('Cache');

dbLogger.info('Connected to database'); // [App:Database] Connected to database
cacheLogger.info('Cache cleared');       // [App:Cache] Cache cleared
```

### Configuring Log Level

```typescript
// Only show warnings and errors
const logger = new Logger({ level: LogLevel.WARN });

logger.debug('This will not be shown');
logger.info('This will not be shown');
logger.warn('This will be shown');
logger.error('This will be shown');
```

### Silent Mode (for production)

```typescript
const logger = new Logger({ level: LogLevel.SILENT });
// All log messages are suppressed
```

### Custom Output

```typescript
// Send logs to a custom destination (e.g., file, external service)
const logger = new Logger({
  output: (entry) => {
    // Write to file, send to log aggregator, etc.
    fs.appendFileSync('app.log', JSON.stringify(entry) + '\n');
  }
});
```

### Disable Colors

```typescript
// Disable ANSI colors (useful for log files)
const logger = new Logger({ color: false });
```

### Disable Timestamps

```typescript
// Remove timestamps from output
const logger = new Logger({ timestamp: false });
```

## API

### `new Logger(options)`

Creates a new logger instance.

**Options:**
- `level?: LogLevel` - Minimum log level (default: `LogLevel.INFO`)
- `context?: string` - Context/namespace for log messages
- `color?: boolean` - Enable colorized output (default: `true`)
- `timestamp?: boolean` - Include timestamp in logs (default: `true`)
- `output?: (entry: LogEntry) => void` - Custom output function

### `logger.debug(message, data?)`

Log a debug message (verbose diagnostics).

### `logger.info(message, data?)`

Log an info message (general information).

### `logger.warn(message, data?)`

Log a warning message (non-critical issues).

### `logger.error(message, data?)`

Log an error message (failures and exceptions).

### `logger.child(subContext)`

Create a child logger with a nested context.

### `logger.setLevel(level)`

Dynamically change the minimum log level.

## Log Levels

| Level | Value | Description |
|-------|-------|-------------|
| `DEBUG` | 0 | Verbose diagnostics for debugging |
| `INFO` | 1 | General informational messages |
| `WARN` | 2 | Non-critical issues and warnings |
| `ERROR` | 3 | Failures and exceptions |
| `SILENT` | 4 | Suppress all log output |

## Log Entry Structure

Each log entry contains:

```typescript
{
  timestamp: string;      // ISO 8601 timestamp
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;        // Log message
  context?: string;       // Logger context/namespace
  data?: unknown;         // Additional data (objects, errors, etc.)
}
```

## Examples

### Production Configuration

```typescript
import { Logger, LogLevel } from '@it-supervisor/logger';

const logger = new Logger({
  context: 'ProductionApp',
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
  color: false,  // Disable colors for log files
});
```

### Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error);
  // Logs: [ERROR] [MyApp] Operation failed
  //   Error: Something went wrong
  //     at riskyOperation (...)
}
```

### Structured Data Logging

```typescript
logger.info('User logged in', {
  userId: 'user-123',
  email: 'user@example.com',
  timestamp: Date.now(),
});
// Logs: [INFO] [Auth] User logged in
//   {
//     "userId": "user-123",
//     "email": "user@example.com",
//     "timestamp": 1234567890
//   }
```

## License

MIT
