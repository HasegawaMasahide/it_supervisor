# Examples

This directory contains example projects demonstrating how to use the `@it-supervisor/tools` packages.

## Available Examples

### 1. Basic Static Analysis (`01-static-analysis/`)
Demonstrates how to use `@it-supervisor/static-analyzer` to analyze a code repository for security issues and code quality problems.

**Packages used:**
- `@it-supervisor/static-analyzer`
- `@it-supervisor/logger`

**What it shows:**
- Setting up static analysis tools (ESLint, Gitleaks, Snyk)
- Running analysis on a sample project
- Handling analysis results
- Configuring log levels

---

### 2. Repository Analysis (`02-repository-analysis/`)
Shows how to use `@it-supervisor/repo-analyzer` to analyze Git repositories and extract metrics like language statistics, complexity, and dependencies.

**Packages used:**
- `@it-supervisor/repo-analyzer`
- `@it-supervisor/logger`

**What it shows:**
- Analyzing local Git repositories
- Detecting programming languages and frameworks
- Calculating code complexity
- Analyzing dependency graphs
- Detecting entry points

---

### 3. Report Generation (`03-report-generation/`)
Demonstrates generating professional reports in HTML, Markdown, and PDF formats.

**Packages used:**
- `@it-supervisor/report-generator`
- `@it-supervisor/logger`

**What it shows:**
- Creating custom report templates
- Generating HTML reports with charts
- Exporting to Markdown and PDF
- Using built-in templates
- Multi-language support

---

### 4. Docker Sandbox (`04-docker-sandbox/`)
Shows how to create isolated Docker environments for testing and analysis.

**Packages used:**
- `@it-supervisor/sandbox-builder`
- `@it-supervisor/logger`

**What it shows:**
- Auto-detecting project types (Node.js, PHP, Python)
- Generating Docker Compose configurations
- Building and managing sandbox environments
- Creating and restoring snapshots
- Streaming logs from containers

---

### 5. Issue Tracking (`05-issue-tracking/`)
Demonstrates issue management capabilities for tracking security findings and code quality issues.

**Packages used:**
- `@it-supervisor/issue-manager`
- `@it-supervisor/logger`

**What it shows:**
- Creating and managing issues
- Searching and filtering issues
- Adding comments and attachments
- Generating statistics
- Exporting issues to CSV
- Label management

---

### 6. Metrics Collection (`06-metrics-collection/`)
Shows how to collect, store, and analyze metrics over time.

**Packages used:**
- `@it-supervisor/metrics-model`
- `@it-supervisor/logger`

**What it shows:**
- Recording metrics (numeric, string, boolean)
- Querying metrics with filters
- Aggregating metrics by category
- Comparing metrics over time
- Exporting/importing metrics (JSON, CSV)
- Using transactions

---

### 7. Full Pipeline (`07-full-pipeline/`)
A complete end-to-end example integrating all packages to perform a comprehensive IT asset audit.

**Packages used:**
- All 7 packages

**What it shows:**
- Complete audit workflow:
  1. Clone/analyze repository with `repo-analyzer`
  2. Run static analysis with `static-analyzer`
  3. Store results in `issue-manager` and `metrics-model`
  4. Generate comprehensive reports with `report-generator`
  5. Create isolated test environment with `sandbox-builder`
- Real-world integration patterns
- Error handling across packages
- Centralized logging

---

## Running the Examples

Each example is a standalone TypeScript project. To run an example:

```bash
# Navigate to the example directory
cd examples/01-static-analysis

# Install dependencies
npm install

# Build the example
npm run build

# Run the example
npm start
```

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- For examples 4 and 7 (Docker sandbox): Docker and Docker Compose installed

## Example Structure

Each example follows this structure:

```
01-static-analysis/
├── README.md           # Detailed explanation and instructions
├── package.json        # Example-specific dependencies
├── tsconfig.json       # TypeScript configuration
├── src/
│   └── index.ts       # Main example code
└── sample-project/    # Sample data/project to analyze (if applicable)
```

## Learning Path

We recommend exploring the examples in this order:

1. **Start with 01-03**: Learn the core packages individually
2. **Continue with 04-06**: Explore advanced features
3. **Finish with 07**: See how everything integrates

## Additional Resources

- [API Documentation](../docs/)
- [Usage Examples](../docs/USAGE_EXAMPLES.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)

## Support

If you encounter issues with these examples, please:
1. Check the README.md in each example directory
2. Review the [troubleshooting section](../docs/USAGE_EXAMPLES.md#troubleshooting)
3. [Open an issue](https://github.com/your-org/it-supervisor-tools/issues)
