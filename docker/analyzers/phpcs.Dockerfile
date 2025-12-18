# PHP_CodeSniffer 静的解析用コンテナ

FROM php:8.2-cli-alpine

# Composerのインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# PHP_CodeSniffer と主要ルールセットのインストール
RUN composer global require \
    "squizlabs/php_codesniffer=*" \
    "phpcompatibility/php-compatibility=*" \
    "wp-coding-standards/wpcs=*"

# パスの設定
ENV PATH="/root/.composer/vendor/bin:${PATH}"

# 作業ディレクトリ
WORKDIR /repos

# 分析スクリプトのコピー
COPY docker/analyzers/scripts/run-phpcs.sh /usr/local/bin/run-phpcs.sh
RUN chmod +x /usr/local/bin/run-phpcs.sh

# PHP_CodeSniffer の設定
RUN phpcs --config-set installed_paths \
    /root/.composer/vendor/phpcompatibility/php-compatibility,\
/root/.composer/vendor/wp-coding-standards/wpcs

# デフォルトコマンド: スリープ状態で待機
CMD ["sleep", "infinity"]
