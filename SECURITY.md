# Security Policy

## Supported Versions

We actively support the following versions of IT Supervisor Tools with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

We take the security of IT Supervisor Tools seriously. If you believe you have found a security vulnerability in any of our packages, please report it to us as described below.

### Where to Report

Please report security vulnerabilities by email to:

**security@example.com**

### What to Include

Please include the following information in your report:

- **Type of issue** (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- **Full paths of source file(s)** related to the manifestation of the issue
- **The location of the affected source code** (tag/branch/commit or direct URL)
- **Any special configuration** required to reproduce the issue
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the issue**, including how an attacker might exploit it

This information will help us triage your report more quickly.

### Response Timeline

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your vulnerability report
- **Assessment**: Within 5 business days, we will provide an assessment of the vulnerability and our remediation timeline
- **Fix Development**: Critical vulnerabilities will be addressed within 14 days; high-severity within 30 days; medium/low within 90 days
- **Disclosure**: Once a fix is available, we will coordinate with you on the disclosure timeline

### Preferred Languages

We prefer all communications to be in **English** or **Japanese (日本語)**.

### Our Commitment

- We will respond to your report promptly and keep you informed throughout the process
- We will not take legal action against security researchers who report vulnerabilities in good faith
- We will credit reporters in security advisories (unless you prefer to remain anonymous)
- We will work with you to understand and resolve the issue quickly

## Security Best Practices for Users

### For Package Users

1. **Keep Packages Updated**: Always use the latest stable version of our packages
   ```bash
   npm update @it-supervisor/*
   ```

2. **Review Dependencies**: Regularly audit dependencies for known vulnerabilities
   ```bash
   npm audit
   ```

3. **Secure Configuration**: Follow security guidelines in each package's README
   - Use environment variables for sensitive configuration
   - Never commit credentials to version control
   - Apply principle of least privilege for database access

4. **Sandbox Isolation**: When using `sandbox-builder`, always use `RESTRICTED` isolation level for untrusted code

### For Contributors

1. **Secure Coding**: Follow secure coding practices
   - Validate all user inputs
   - Use parameterized queries to prevent SQL injection
   - Avoid using `eval()` or executing user-provided code
   - Use `execFile()` instead of `exec()` to prevent shell injection

2. **Dependency Management**: Minimize dependencies and keep them updated
   - Review dependency changes in pull requests
   - Use `npm audit` before committing

3. **Secret Management**: Never commit secrets
   - Use `.gitignore` for sensitive files
   - Use environment variables for credentials
   - Rotate compromised credentials immediately

4. **Code Review**: All code must be reviewed before merge
   - Security-critical changes require review by maintainers
   - Automated security checks must pass

## Known Security Considerations

### Database Packages (metrics-model, issue-manager)

- These packages use **better-sqlite3** which is safe against SQL injection when using parameterized queries
- Always use the provided API methods; do not construct raw SQL queries
- Database files should have appropriate file permissions (600 or 640)

### Static Analysis Package (static-analyzer)

- Executes external tools (ESLint, PHPStan, Snyk, etc.) via `child_process`
- Uses `execFile()` to prevent shell injection
- Enforces timeouts to prevent resource exhaustion
- Should be run in isolated environments for untrusted code

### Sandbox Builder Package (sandbox-builder)

- Creates Docker containers for potentially untrusted code
- Uses network isolation and resource limits
- Snapshots may contain sensitive data; secure snapshot storage appropriately
- Always use `RESTRICTED` isolation level for untrusted code

### Report Generator Package (report-generator)

- Uses Puppeteer to generate PDFs from HTML
- Puppeteer runs a headless Chrome instance; ensure it's kept updated
- Template injection is mitigated by proper escaping
- User-provided markdown is sanitized before HTML conversion

## Security Hall of Fame

We would like to thank the following researchers for responsibly disclosing security issues:

*(No vulnerabilities have been reported yet)*

## Policy Updates

This security policy may be updated from time to time. Please check back regularly for updates.

**Last Updated**: 2026-02-11

---

For general questions about this policy, please contact: **support@example.com**
