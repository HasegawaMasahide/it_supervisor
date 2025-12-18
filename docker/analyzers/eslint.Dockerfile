# ESLint 静的解析用コンテナ

FROM node:20-alpine

# ESLint と主要プラグインのグローバルインストール
RUN npm install -g \
    eslint@^8.50.0 \
    @typescript-eslint/parser@^6.7.0 \
    @typescript-eslint/eslint-plugin@^6.7.0 \
    eslint-plugin-react@^7.33.0 \
    eslint-plugin-vue@^9.17.0 \
    eslint-plugin-import@^2.28.0 \
    eslint-plugin-jsx-a11y@^6.7.0 \
    eslint-plugin-react-hooks@^4.6.0

# 作業ディレクトリ
WORKDIR /repos

# 分析スクリプトのコピー
COPY docker/analyzers/scripts/run-eslint.sh /usr/local/bin/run-eslint.sh
RUN chmod +x /usr/local/bin/run-eslint.sh

# 非rootユーザーの作成
RUN addgroup -g 1001 -S analyzer && \
    adduser -S analyzer -u 1001

USER analyzer

# デフォルトコマンド: スリープ状態で待機（ジョブ実行時にawake）
CMD ["sleep", "infinity"]
