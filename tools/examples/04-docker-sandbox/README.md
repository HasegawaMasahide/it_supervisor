# Example 04: Docker Sandbox

This example demonstrates how to use `@it-supervisor/sandbox-builder` to create isolated environments.

## What This Example Does

1. Auto-detects project type (Node.js, PHP, Python, etc.)
2. Generates Docker Compose configuration
3. Creates and manages sandbox environments
4. Creates snapshots for backup/restore
5. Streams logs from containers

## Prerequisites

- Docker
- Docker Compose

## Running the Example

```bash
npm install
npm run build
npm start
```

See the [main examples README](../README.md) for detailed instructions.

## Key Features

- ✅ Auto-detection of project types
- ✅ Docker Compose generation
- ✅ Environment lifecycle management (up, down, restart)
- ✅ Snapshot versioning and restoration
- ✅ Log streaming
- ✅ Health checks

## Related Documentation

- [Sandbox Builder API](../../packages/sandbox-builder/docs/api.md)
