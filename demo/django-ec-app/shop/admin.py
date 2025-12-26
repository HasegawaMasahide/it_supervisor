from django.contrib import admin
from .models import Product, Cart, CartItem, Order, OrderItem, Review

# 問題1: 管理画面のカスタマイズ不足 (Low Code Quality)
admin.site.register(Product)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Review)
