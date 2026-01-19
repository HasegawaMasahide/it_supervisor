import axios from 'axios';

// ISSUE: APIキーがフロントエンドコードにハードコーディング
const GOOGLE_MAPS_API_KEY = 'AIzaSyD-FAKE-API-KEY-12345';
const STRIPE_API_KEY = 'pk_live_FAKE_STRIPE_KEY_67890';
const PAYMENT_SECRET_KEY = 'sk_live_FAKE_SECRET_12345';

// ISSUE: 脆弱性のあるaxios 0.21.1を使用
const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// ISSUE: トークンをlocalStorageから取得
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ISSUE: エラーハンドリング不足
api.interceptors.response.use(
  response => response,
  error => {
    // エラーを握りつぶし
    console.log(error);
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  // ISSUE: パスワードリセットトークンがURLに含まれる
  resetPassword: (token, newPassword) =>
    api.post(`/auth/reset-password?token=${token}`, { password: newPassword })
};

export const bookingService = {
  // ISSUE: 全データを一括取得（ページネーションなし）
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  // ISSUE: ユーザー入力をそのままURLに埋め込み
  search: (query) => api.get(`/bookings/search?q=${query}`)
};

export const customerService = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`)
};

export const paymentService = {
  // ISSUE: シークレットキーがフロントエンドに露出
  processPayment: (amount, cardToken) =>
    api.post('/payments', {
      amount,
      cardToken,
      secretKey: PAYMENT_SECRET_KEY
    }),

  getPaymentHistory: () => api.get('/payments/history')
};

// ISSUE: Google Maps APIキーを露出
export const getGoogleMapsUrl = () => {
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
};

export default api;
