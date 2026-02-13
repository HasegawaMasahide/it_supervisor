# PHPStan Static Analyzer Container
FROM php:8.2-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    zip \
    unzip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install PHPStan globally
RUN composer global require phpstan/phpstan --no-interaction

# Add Composer bin to PATH
ENV PATH="${PATH}:/root/.composer/vendor/bin"

# Set working directory
WORKDIR /app

# Create wrapper script
RUN echo '#!/bin/sh' > /usr/local/bin/run-phpstan.sh && \
    echo 'set -e' >> /usr/local/bin/run-phpstan.sh && \
    echo '' >> /usr/local/bin/run-phpstan.sh && \
    echo 'REPO_PATH="${1:-.}"' >> /usr/local/bin/run-phpstan.sh && \
    echo 'LEVEL="${2:-5}"' >> /usr/local/bin/run-phpstan.sh && \
    echo 'OUTPUT_FORMAT="${3:-json}"' >> /usr/local/bin/run-phpstan.sh && \
    echo '' >> /usr/local/bin/run-phpstan.sh && \
    echo 'cd "$REPO_PATH"' >> /usr/local/bin/run-phpstan.sh && \
    echo '' >> /usr/local/bin/run-phpstan.sh && \
    echo '# Install project dependencies if composer.json exists' >> /usr/local/bin/run-phpstan.sh && \
    echo 'if [ -f "composer.json" ]; then' >> /usr/local/bin/run-phpstan.sh && \
    echo '    composer install --no-interaction --no-progress 2>/dev/null || true' >> /usr/local/bin/run-phpstan.sh && \
    echo 'fi' >> /usr/local/bin/run-phpstan.sh && \
    echo '' >> /usr/local/bin/run-phpstan.sh && \
    echo '# Run PHPStan' >> /usr/local/bin/run-phpstan.sh && \
    echo 'if [ "$OUTPUT_FORMAT" = "json" ]; then' >> /usr/local/bin/run-phpstan.sh && \
    echo '    phpstan analyse --level="$LEVEL" --error-format=json --no-progress . 2>/dev/null || true' >> /usr/local/bin/run-phpstan.sh && \
    echo 'else' >> /usr/local/bin/run-phpstan.sh && \
    echo '    phpstan analyse --level="$LEVEL" --no-progress .' >> /usr/local/bin/run-phpstan.sh && \
    echo 'fi' >> /usr/local/bin/run-phpstan.sh && \
    chmod +x /usr/local/bin/run-phpstan.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD phpstan --version || exit 1

# Default command
ENTRYPOINT ["/usr/local/bin/run-phpstan.sh"]
