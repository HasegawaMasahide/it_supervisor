import axios from 'axios';

// 問題1: APIキーのハードコーディング (Critical Security)
const API_KEY = 'sk_live_51HqXYZ123456789abcdefghijk';
const API_SECRET = 'secret_key_abc123xyz789';

// 問題2: HTTPSではなくHTTPを使用 (High Security)
const BASE_URL = 'http://api.example.com/v1';

// 問題3: グローバル変数の使用 (Medium Code Quality)
let currentUser: any = null;
let authToken: any = null;

// 問題4: any型の多用 (Medium Code Quality)
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
  }
});

// 問題5: エラーハンドリング不足 (High Code Quality)
export const login = async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login', {
    username,
    password
  });

  // 問題6: 認証トークンをlocalStorageに平文保存 (Critical Security)
  localStorage.setItem('token', response.data.token);
  localStorage.setItem('user', JSON.stringify(response.data.user));

  authToken = response.data.token;
  currentUser = response.data.user;

  return response.data;
};

// 問題7: SQLインジェクションのような脆弱性 (Critical Security)
// フロントエンドからクエリパラメータを直接構築
export const searchArticles = async (query: string) => {
  const url = `/articles/search?q=${query}&status=published`;
  const response = await apiClient.get(url);
  return response.data;
};

// 問題8: 大量データを一度に取得（ページネーション無し） (High Performance)
export const getAllArticles = async () => {
  const response = await apiClient.get('/articles?limit=10000');
  return response.data;
};

// 問題9: 不要なデータを取得 (Medium Performance)
export const getArticle = async (id: number) => {
  // 全フィールドを取得しているが、一部しか使わない
  const response = await apiClient.get(`/articles/${id}?include=author,comments,tags,categories,revisions,metadata`);
  return response.data;
};

// 問題10: パスワードをログ出力 (Critical Security)
export const register = async (data: any) => {
  console.log('Registering user:', data); // パスワード含む
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

// 問題11: 認証チェック不足 (High Security)
export const deleteArticle = async (id: number) => {
  // 認証トークンのチェックなし
  const response = await apiClient.delete(`/articles/${id}`);
  return response.data;
};

// 問題12: ハードコードされた設定値 (Low Code Quality)
export const uploadMedia = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // 問題: サイズチェックなし、ファイルタイプチェックなし
  const response = await apiClient.post('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000 // 5分 - 長すぎる
  });

  return response.data;
};

// 問題13: 機密情報を含むログ (Medium Security)
export const updateArticle = async (id: number, data: any) => {
  console.log('Updating article:', id, 'with data:', JSON.stringify(data));
  const response = await apiClient.put(`/articles/${id}`, data);
  return response.data;
};

// 問題14: 不適切なキャッシング (Medium Performance)
let cachedArticles: any = null;
let cacheTimestamp: number = 0;

export const getArticlesWithCache = async () => {
  // キャッシュの有効期限チェックなし、メモリリークの可能性
  if (cachedArticles) {
    return cachedArticles;
  }

  cachedArticles = await getAllArticles();
  cacheTimestamp = Date.now();

  return cachedArticles;
};

// 問題15: CORS設定を無効化するような実装 (High Security)
export const fetchExternalContent = async (url: string) => {
  // 外部URLを直接fetchして、XSSの可能性
  const response = await fetch(url, {
    mode: 'no-cors'
  });
  return response.text();
};
