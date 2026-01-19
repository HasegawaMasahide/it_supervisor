// ISSUE: APIキーがフロントエンドに露出
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // ISSUE: 本番環境でもソースマップが有効
  productionSourceMap: true,

  // ISSUE: 環境変数でAPIキーを定義（フロントエンドに含まれる）
  chainWebpack: config => {
    config.plugin('define').tap(args => {
      args[0]['process.env'].GOOGLE_MAPS_API_KEY = JSON.stringify('AIzaSyD-FAKE-API-KEY-12345');
      args[0]['process.env'].STRIPE_PUBLIC_KEY = JSON.stringify('pk_live_FAKE_STRIPE_KEY_67890');
      return args;
    });
  }
};
