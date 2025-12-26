from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import connection
from django.http import HttpResponse, JsonResponse
from .models import Product, Cart, CartItem, Order, OrderItem, Review
import hashlib
import requests

# 問題1: グローバル変数の使用 (Medium Code Quality)
PAYMENT_API_KEY = 'sk_live_payment_key_12345'


# 問題2: SQLインジェクション脆弱性 (Critical Security)
def product_search(request):
    query = request.GET.get('q', '')

    # 生のSQLクエリを使用、パラメータ化されていない
    with connection.cursor() as cursor:
        sql = f"SELECT * FROM shop_product WHERE name LIKE '%{query}%' OR description LIKE '%{query}%'"
        cursor.execute(sql)
        rows = cursor.fetchall()

    products = []
    for row in rows:
        products.append({
            'id': row[0],
            'name': row[1],
            'description': row[2],
            'price': row[3]
        })

    return render(request, 'product_list.html', {'products': products})


# 問題3: N+1クエリ問題 (High Performance)
def product_list(request):
    products = Product.objects.filter(is_active=True)

    # テンプレート内で各productのreview_countとaverage_ratingを呼び出すとN+1が発生
    return render(request, 'product_list.html', {'products': products})


# 問題4: 認証チェック不足 (High Security)
def add_to_cart(request, product_id):
    # ログインチェックなし
    product = get_object_or_404(Product, id=product_id)

    # 問題5: ユーザーIDをGETパラメータから取得（改ざん可能） (Critical Security)
    user_id = request.GET.get('user_id')
    user = User.objects.get(id=user_id)

    cart, created = Cart.objects.get_or_create(user=user)

    # 問題6: 在庫チェックなし (Medium Code Quality)
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={'quantity': 1}
    )

    if not created:
        cart_item.quantity += 1
        cart_item.save()

    return redirect('cart_detail')


# 問題7: 長すぎる関数、循環的複雑度が高い (High Code Quality)
def checkout(request):
    if not request.user.is_authenticated:
        return redirect('login')

    if request.method == 'POST':
        cart = Cart.objects.get(user=request.user)
        cart_items = cart.cartitem_set.all()

        if not cart_items:
            return HttpResponse('Cart is empty')

        total = 0
        for item in cart_items:
            total += item.product.price * item.quantity

        # 問題8: 決済処理でエラーハンドリング不足 (High Code Quality)
        payment_result = process_payment(total, request.POST.get('card_number'))

        if payment_result['success']:
            # 注文作成
            order = Order.objects.create(
                user=request.user,
                total_price=total,
                shipping_address=request.POST.get('address'),
                status='pending'
            )

            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    price=item.product.price
                )

                # 問題9: 在庫減少処理に競合状態 (High Code Quality)
                item.product.stock -= item.quantity
                item.product.save()

            # カートをクリア
            cart_items.delete()

            return redirect('order_complete', order_id=order.id)
        else:
            return HttpResponse('Payment failed')

    else:
        cart = Cart.objects.get(user=request.user)
        return render(request, 'checkout.html', {'cart': cart})


# 問題10: 機密情報をログ出力 (High Security)
# 問題11: エラーハンドリング不足 (Medium Code Quality)
def process_payment(amount, card_number):
    print(f"Processing payment: Amount={amount}, Card={card_number}")

    # 問題12: HTTPSではなくHTTPで外部API呼び出し (Critical Security)
    # 問題13: SSL証明書検証を無効化 (Critical Security)
    response = requests.post(
        'http://payment-api.example.com/charge',
        json={
            'amount': amount,
            'card_number': card_number,
            'api_key': PAYMENT_API_KEY
        },
        verify=False  # SSL検証無効
    )

    return response.json()


# 問題14: パスワードのハッシュ化が不適切 (Critical Security)
def user_register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')

        # 問題15: 入力バリデーション不足 (High Security)
        # MD5でパスワードハッシュ化（非推奨）
        hashed_password = hashlib.md5(password.encode()).hexdigest()

        # 問題16: Djangoの組み込み認証を使わずに手動でユーザー作成 (High Code Quality)
        user = User(username=username, email=email)
        user.password = hashed_password  # set_password()を使うべき
        user.save()

        return redirect('login')

    return render(request, 'register.html')


# 問題17: CSRF無視 (Critical Security)
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def add_review(request, product_id):
    if request.method == 'POST':
        product = get_object_or_404(Product, id=product_id)

        # 問題18: XSS脆弱性（コメントのサニタイズなし） (High Security)
        comment = request.POST.get('comment')
        rating = request.POST.get('rating')

        # 問題19: ratingのバリデーション不足 (Medium Security)
        Review.objects.create(
            product=product,
            user=request.user,
            rating=rating,
            comment=comment
        )

        return redirect('product_detail', product_id=product_id)


# 問題20: 認可チェック不足 (High Security)
def delete_review(request, review_id):
    # 他人のレビューも削除できる
    review = get_object_or_404(Review, id=review_id)
    review.delete()
    return redirect('product_detail', product_id=review.product.id)


# 問題21: 情報漏洩（エラーメッセージ） (Medium Security)
def user_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        try:
            user = User.objects.get(username=username)
            # MD5でハッシュ化して比較
            hashed_password = hashlib.md5(password.encode()).hexdigest()

            if user.password == hashed_password:
                # 問題22: Djangoの認証機能を使わずに手動ログイン (Medium Code Quality)
                request.session['user_id'] = user.id
                return redirect('product_list')
            else:
                # 問題: パスワードが間違っていることを明示
                return HttpResponse('Password is incorrect')
        except User.DoesNotExist:
            # 問題: ユーザーが存在しないことを明示
            return HttpResponse('User does not exist')

    return render(request, 'login.html')


# 問題23: 型ヒントなし (Low Code Quality)
def product_detail(request, product_id):
    product = get_object_or_404(Product, id=product_id)

    # 問題24: N+1クエリ (Medium Performance)
    reviews = product.review_set.all()

    return render(request, 'product_detail.html', {
        'product': product,
        'reviews': reviews
    })


# 問題25: 管理者チェック不足 (High Security)
def admin_dashboard(request):
    # is_staffやis_superuserのチェックなし
    orders = Order.objects.all()
    return render(request, 'admin_dashboard.html', {'orders': orders})
