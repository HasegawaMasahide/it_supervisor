const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// ISSUE: CORS設定の不備 - 任意のオリジンを許可
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// ISSUE: シークレットキーがハードコーディング
const JWT_SECRET = 'super-secret-key-12345';

// ISSUE: ダミーデータ（本番ではDBを使用すべき）
let users = [
  { id: 1, email: 'admin@example.com', password: 'admin123', name: '管理者', role: 'admin' },
  { id: 2, email: 'user@example.com', password: 'user123', name: 'ユーザー', role: 'user' }
];

let bookings = [];
let services = [
  { id: 1, name: 'カット', price: 4000, duration: 60 },
  { id: 2, name: 'カラー', price: 6000, duration: 90 },
  { id: 3, name: 'パーマ', price: 8000, duration: 120 }
];

let staff = [
  { id: 1, name: '田中', email: 'tanaka@example.com', services: ['カット', 'カラー'] },
  { id: 2, name: '佐藤', email: 'sato@example.com', services: ['カット', 'パーマ'] }
];

// ISSUE: 認証ミドルウェアが不十分
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // ISSUE: トークンの有効期限チェックが不十分
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // ISSUE: エラー詳細を返している
    return res.status(401).json({ error: error.message });
  }
};

// ログイン
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // ISSUE: 入力バリデーション不足
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    // ISSUE: ユーザー存在の有無を推測可能なエラーメッセージ
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // ISSUE: パスワードを含むユーザー情報を返している
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' } // ISSUE: トークンの有効期限が長すぎる
  );

  // ISSUE: ログに機密情報を出力
  console.log(`User logged in: ${email}, password: ${password}`);

  res.json({ token, user });
});

// 予約一覧取得
app.get('/api/bookings', authMiddleware, (req, res) => {
  // ISSUE: ページネーションなし - 全データを返す
  res.json(bookings);
});

// 予約作成
app.post('/api/bookings', authMiddleware, (req, res) => {
  // ISSUE: 入力バリデーション不足
  const booking = {
    id: bookings.length + 1,
    ...req.body,
    createdBy: req.user.id,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  bookings.push(booking);

  // ISSUE: XSSの原因となるデータをそのまま保存
  res.json(booking);
});

// 予約更新
app.put('/api/bookings/:id', authMiddleware, (req, res) => {
  const bookingId = parseInt(req.params.id);
  const index = bookings.findIndex(b => b.id === bookingId);

  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // ISSUE: 権限チェックなし - 他人の予約も変更可能
  bookings[index] = { ...bookings[index], ...req.body };
  res.json(bookings[index]);
});

// 予約削除
app.delete('/api/bookings/:id', authMiddleware, (req, res) => {
  const bookingId = parseInt(req.params.id);

  // ISSUE: 権限チェックなし
  bookings = bookings.filter(b => b.id !== bookingId);
  res.json({ success: true });
});

// サービス一覧
app.get('/api/services', (req, res) => {
  res.json(services);
});

// スタッフ一覧
app.get('/api/staff', (req, res) => {
  res.json(staff);
});

// ISSUE: エラーハンドリングが不十分
app.use((err, req, res, next) => {
  // ISSUE: スタックトレースを返している
  console.error(err.stack);
  res.status(500).json({ error: err.message, stack: err.stack });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // ISSUE: 機密情報をログに出力
  console.log(`JWT Secret: ${JWT_SECRET}`);
});
