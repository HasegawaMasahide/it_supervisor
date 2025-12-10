<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TODO App - デモ用</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            width: 100%;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }

        .warning {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }

        .warning h2 {
            color: #856404;
            font-size: 1.2em;
            margin-bottom: 10px;
        }

        .warning ul {
            color: #856404;
            margin-left: 20px;
        }

        .warning li {
            margin: 5px 0;
        }

        .info {
            background: #d1ecf1;
            border: 2px solid #17a2b8;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }

        .info h3 {
            color: #0c5460;
            margin-bottom: 10px;
        }

        .info p {
            color: #0c5460;
            line-height: 1.6;
        }

        .endpoint-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }

        .endpoint-list h3 {
            color: #333;
            margin-bottom: 10px;
        }

        .endpoint-list code {
            background: #e9ecef;
            padding: 5px 10px;
            border-radius: 3px;
            display: block;
            margin: 5px 0;
            font-family: 'Courier New', monospace;
            color: #495057;
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
            margin-right: 5px;
        }

        .badge-get { background: #28a745; color: white; }
        .badge-post { background: #007bff; color: white; }
        .badge-put { background: #ffc107; color: #333; }
        .badge-delete { background: #dc3545; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>TODO App</h1>
        <p style="color: #666; margin-bottom: 20px;">IT資産監査サービス - デモ用アプリケーション</p>

        <div class="warning">
            <h2>⚠️ 警告: このアプリケーションには意図的な脆弱性が含まれています</h2>
            <ul>
                <li>SQLインジェクション脆弱性</li>
                <li>XSS（クロスサイトスクリプティング）脆弱性</li>
                <li>認証・認可の不備</li>
                <li>機密情報のハードコーディング</li>
                <li>N+1クエリ問題</li>
                <li>コード品質の問題（高い循環的複雑度、重複コードなど）</li>
            </ul>
            <p style="margin-top: 10px; font-weight: bold;">本番環境では絶対に使用しないでください。</p>
        </div>

        <div class="info">
            <h3>📋 このアプリについて</h3>
            <p>
                このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されました。
                実際の現場で見つかるような様々な問題を意図的に含んでおり、
                監査ツール群の動作確認や、改善提案のサンプルとして使用できます。
            </p>
        </div>

        <div class="endpoint-list">
            <h3>🔗 API エンドポイント</h3>

            <h4 style="margin-top: 15px; color: #555;">認証</h4>
            <code><span class="badge badge-post">POST</span>/api/register</code>
            <code><span class="badge badge-post">POST</span>/api/login</code>
            <code><span class="badge badge-post">POST</span>/api/logout</code>
            <code><span class="badge badge-get">GET</span>/api/user</code>

            <h4 style="margin-top: 15px; color: #555;">TODO管理</h4>
            <code><span class="badge badge-get">GET</span>/api/todos</code>
            <code><span class="badge badge-post">POST</span>/api/todos</code>
            <code><span class="badge badge-get">GET</span>/api/todos/{id}</code>
            <code><span class="badge badge-put">PUT</span>/api/todos/{id}</code>
            <code><span class="badge badge-delete">DELETE</span>/api/todos/{id}</code>
            <code><span class="badge badge-post">POST</span>/api/todos/{id}/toggle</code>
            <code><span class="badge badge-get">GET</span>/api/todos/stats/summary</code>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #999;">
            <p>監査ツールの使用方法は <code>/demo/ANALYSIS_GUIDE.md</code> を参照してください</p>
        </div>
    </div>

    <!-- SECURITY ISSUE: XSS vulnerability - user data displayed without escaping -->
    <script>
        // ISSUE: Sensitive data in frontend JavaScript
        const API_KEY = 'sk_test_51234567890abcdef';
        const DEBUG_MODE = true;

        if (DEBUG_MODE) {
            console.log('API Key:', API_KEY);
            console.log('App initialized');
        }

        // ISSUE: eval() usage - code injection risk
        function executeUserCode(code) {
            eval(code);  // CRITICAL: Never use eval() with user input
        }
    </script>
</body>
</html>
