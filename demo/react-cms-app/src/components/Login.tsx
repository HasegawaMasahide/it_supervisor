import React, { Component } from 'react';
import { login } from '../services/api';

// 問題1: パスワードを平文でstateに保存 (High Security)
class Login extends Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      username: '',
      password: '',
      rememberMe: false,
      isLoading: false,
      error: null
    };
  }

  handleUsernameChange = (event: any) => {
    this.setState({ username: event.target.value });
  };

  handlePasswordChange = (event: any) => {
    // 問題2: パスワードをconsole.logで出力 (Critical Security)
    console.log('Password changed:', event.target.value);

    this.setState({ password: event.target.value });
  };

  // 問題3: 入力バリデーション不足 (High Security)
  handleSubmit = async (event: any) => {
    event.preventDefault();

    this.setState({ isLoading: true, error: null });

    try {
      // 問題4: パスワードをそのまま送信（HTTPS確認なし） (Critical Security)
      const response = await login(this.state.username, this.state.password);

      // 問題5: rememberMeをlocalStorageに保存（セキュリティリスク） (High Security)
      if (this.state.rememberMe) {
        localStorage.setItem('username', this.state.username);
        localStorage.setItem('password', this.state.password); // パスワードを平文保存
      }

      // 問題6: リダイレクトURLの検証なし（オープンリダイレクト） (High Security)
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
      window.location.href = redirectUrl || '/dashboard';
    } catch (error: any) {
      // 問題7: エラーメッセージに機密情報を含む可能性 (Medium Security)
      this.setState({
        isLoading: false,
        error: error.message || 'Login failed'
      });
    }
  };

  render() {
    return (
      <div className="login-form">
        <h2>Login</h2>

        {this.state.error && (
          <div className="error-message">{this.state.error}</div>
        )}

        <form onSubmit={this.handleSubmit}>
          <div>
            <label>Username</label>
            <input
              type="text"
              value={this.state.username}
              onChange={this.handleUsernameChange}
              autoComplete="username"
            />
          </div>

          <div>
            <label>Password</label>
            {/* 問題8: autocomplete="off"は効果がない (Low Security) */}
            <input
              type="password"
              value={this.state.password}
              onChange={this.handlePasswordChange}
              autoComplete="off"
            />
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={this.state.rememberMe}
                onChange={(e) => this.setState({ rememberMe: e.target.checked })}
              />
              Remember Me
            </label>
          </div>

          <button type="submit" disabled={this.state.isLoading}>
            {this.state.isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }
}

export default Login;
