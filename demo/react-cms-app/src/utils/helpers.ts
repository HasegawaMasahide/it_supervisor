// 問題1: eval()の使用 (Critical Security)
export const executeScript = (script: string) => {
  return eval(script);
};

// 問題2: 不適切な日付処理 (Medium Code Quality)
export const formatDate = (date: any) => {
  // moment.jsの非推奨使用
  const moment = require('moment');
  return moment(date).format('YYYY-MM-DD');
};

// 問題3: グローバル変数の使用 (Medium Code Quality)
(window as any).appConfig = {
  apiUrl: 'http://api.example.com',
  apiKey: 'secret_key_123'
};

// 問題4: 安全でない乱数生成 (Medium Security)
export const generateToken = () => {
  return Math.random().toString(36).substring(2, 15);
};

// 問題5: 正規表現のReDoS脆弱性 (High Security)
export const validateEmail = (email: string) => {
  const regex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
};

// 問題6: 型安全性の欠如 (Low Code Quality)
export const deepClone = (obj: any) => {
  return JSON.parse(JSON.stringify(obj));
};
