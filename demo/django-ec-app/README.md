# Django EC App (監査デモ用)

このアプリケーションは、IT資産監査・改善サービスのデモンストレーション用に作成されたサンプルアプリです。

## ⚠️ 重要な注意事項

**このアプリには意図的に以下の問題が含まれています：**

### セキュリティ問題
- SQLインジェクション脆弱性（生のSQLクエリ使用）
- XSS（クロスサイトスクリプティング）脆弱性
- CSRF対策の不備
- 機密情報のハードコーディング（SECRET_KEY、API Key）
- 不適切な認証・認可実装
- パスワードのプレーンテキスト保存
- セッション管理の不備

### コード品質問題
- 循環的複雑度が高い関数
- 重複コード
- 長すぎる関数（200行超）
- グローバル変数の使用
- エラーハンドリング不足
- 型ヒントなし

### パフォーマンス問題
- N+1クエリ問題
- select_related/prefetch_related未使用
- 不要なデータの取得
- インデックスの欠如
- キャッシュ未使用

### 依存関係問題
- 古いDjangoバージョン（2.2系、EOL済み）
- 脆弱性のあるパッケージ
- 未使用の依存関係

## 機能

- ユーザー認証（会員登録・ログイン）
- 商品一覧・詳細表示
- カートへの追加・削除
- 注文処理
- 決済処理（ダミー）
- 注文履歴表示
- 商品検索・フィルタリング
- 管理画面（商品・注文管理）

## 技術スタック

- Python 3.8
- Django 2.2.28（LTS、ただしEOL済み）
- SQLite3
- requests 2.25.1（脆弱性あり）
- Pillow 8.1.0（脆弱性あり）
- django-debug-toolbar 3.2

## セットアップ

```bash
# 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# データベースのマイグレーション
python manage.py migrate

# スーパーユーザーの作成
python manage.py createsuperuser

# 開発サーバー起動
python manage.py runserver
```

## プロジェクト構造

```
django-ec-app/
├── requirements.txt
├── manage.py
├── ec_project/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── shop/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── forms.py
│   ├── admin.py
│   └── templates/
│       ├── product_list.html
│       └── product_detail.html
└── ISSUES.md
```

## 監査の実施

このアプリケーションを監査するには、プロジェクトルートの `/tools` ディレクトリにあるツール群を使用してください。

詳細な手順は `/demo/ANALYSIS_GUIDE.md` を参照してください。

## 期待される検出結果

- **セキュリティ問題**: 12-15件（Critical 5件、High 7件）
- **コード品質問題**: 8-10件（High 3件、Medium 7件）
- **パフォーマンス問題**: 6-8件（High 4件、Medium 4件）
- **依存関係問題**: 4-6件（High 3件、Medium 3件）

## ライセンス

MIT License（デモ用途のみ）

**警告**: このアプリは本番環境で使用しないでください。教育・デモ目的専用です。
