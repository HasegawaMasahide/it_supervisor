# Example 07: Full Pipeline

This example demonstrates a complete IT asset audit workflow integrating all packages.

## What This Example Does

A complete end-to-end audit process:

1. **Repository Analysis** (`repo-analyzer`)
   - Clone or analyze local repository
   - Extract language statistics and complexity metrics

2. **Static Analysis** (`static-analyzer`)
   - Run ESLint, Gitleaks, Snyk
   - Identify security issues and code quality problems

3. **Issue Management** (`issue-manager`)
   - Store analysis results as trackable issues
   - Add comments and metadata

4. **Metrics Collection** (`metrics-model`)
   - Record analysis metrics
   - Track improvements over time

5. **Report Generation** (`report-generator`)
   - Generate comprehensive audit report
   - Include charts and statistics

6. **Sandbox Environment** (`sandbox-builder`)
   - Create isolated test environment
   - Run tests and validation

## Running the Example

```bash
npm install
npm run build
npm start
```

See the [main examples README](../README.md) for detailed instructions.

## Key Features

- ✅ Complete audit workflow
- ✅ Integration of all 7 packages
- ✅ Real-world use case
- ✅ Error handling and recovery
- ✅ Centralized logging
- ✅ Performance optimization

## Architecture

```
┌─────────────────┐
│  Input: Git URL │
│  or Local Path  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ repo-analyzer   │ ──┐
│ (Clone/Analyze) │   │
└─────────────────┘   │
                      │
┌─────────────────┐   │
│ static-analyzer │ ──┤ Results
│ (Code Quality)  │   │
└─────────────────┘   │
                      │
         ┌────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ issue-manager   │────▶│ metrics-model    │
│ (Track Issues)  │     │ (Store Metrics)  │
└─────────────────┘     └──────────────────┘
         │                       │
         └───────┬───────────────┘
                 ▼
         ┌──────────────┐
         │report-       │
         │generator     │
         │(HTML/PDF)    │
         └──────────────┘
                 │
                 ▼
         ┌──────────────┐
         │sandbox-      │
         │builder       │
         │(Test Env)    │
         └──────────────┘
```

## Output

- Comprehensive HTML/PDF audit report
- SQLite databases with issues and metrics
- Docker environment for testing
- CSV exports for further analysis

## Related Documentation

- [Usage Examples](../../docs/USAGE_EXAMPLES.md)
- [API Documentation](../../docs/)
