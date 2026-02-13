# Snyk Security Scanner Container
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    python3 \
    make \
    g++

# Install Snyk CLI globally
RUN npm install -g snyk

# Create wrapper script
RUN echo '#!/bin/sh' > /usr/local/bin/run-snyk.sh && \
    echo 'set -e' >> /usr/local/bin/run-snyk.sh && \
    echo '' >> /usr/local/bin/run-snyk.sh && \
    echo 'REPO_PATH="${1:-.}"' >> /usr/local/bin/run-snyk.sh && \
    echo 'OUTPUT_FORMAT="${2:-json}"' >> /usr/local/bin/run-snyk.sh && \
    echo '' >> /usr/local/bin/run-snyk.sh && \
    echo 'cd "$REPO_PATH"' >> /usr/local/bin/run-snyk.sh && \
    echo '' >> /usr/local/bin/run-snyk.sh && \
    echo '# Check if SNYK_TOKEN is set' >> /usr/local/bin/run-snyk.sh && \
    echo 'if [ -z "$SNYK_TOKEN" ]; then' >> /usr/local/bin/run-snyk.sh && \
    echo '    echo "{\"error\": \"SNYK_TOKEN not set\", \"vulnerabilities\": []}"' >> /usr/local/bin/run-snyk.sh && \
    echo '    exit 0' >> /usr/local/bin/run-snyk.sh && \
    echo 'fi' >> /usr/local/bin/run-snyk.sh && \
    echo '' >> /usr/local/bin/run-snyk.sh && \
    echo '# Run Snyk test' >> /usr/local/bin/run-snyk.sh && \
    echo 'if [ "$OUTPUT_FORMAT" = "json" ]; then' >> /usr/local/bin/run-snyk.sh && \
    echo '    snyk test --json 2>/dev/null || true' >> /usr/local/bin/run-snyk.sh && \
    echo 'else' >> /usr/local/bin/run-snyk.sh && \
    echo '    snyk test' >> /usr/local/bin/run-snyk.sh && \
    echo 'fi' >> /usr/local/bin/run-snyk.sh && \
    chmod +x /usr/local/bin/run-snyk.sh

# Set working directory
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD snyk --version || exit 1

# Default command
ENTRYPOINT ["/usr/local/bin/run-snyk.sh"]
