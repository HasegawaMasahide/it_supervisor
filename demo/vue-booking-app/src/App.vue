<template>
  <div id="app">
    <nav class="navbar">
      <router-link to="/">ホーム</router-link>
      <router-link to="/dashboard">ダッシュボード</router-link>
      <router-link to="/admin" v-if="isAdmin">管理者</router-link>
      <span v-if="user">{{ user.name }}</span>
    </nav>
    <router-view />
  </div>
</template>

<script>
// ISSUE: Options APIとComposition APIの混在（このファイルはOptions API）
export default {
  name: 'App',
  data() {
    return {
      // ISSUE: SSR/CSRハイドレーション問題 - クライアント側でのみ変わる値
      currentTime: new Date().toISOString(),
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    isAdmin() {
      // ISSUE: フロントエンドでの権限チェックのみ（バイパス可能）
      return this.$store.state.user?.role === 'admin';
    }
  },
  mounted() {
    // ISSUE: 認証状態をlocalStorageから復元
    const token = localStorage.getItem('token');
    if (token) {
      this.$store.commit('SET_TOKEN', token);
      // ISSUE: トークンの有効性を検証せずにユーザー情報を設定
      const userData = localStorage.getItem('user');
      if (userData) {
        this.$store.commit('SET_USER', JSON.parse(userData));
      }
    }
  }
};
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.navbar {
  padding: 20px;
  background: #35495e;
}
.navbar a {
  color: #42b983;
  margin-right: 20px;
}
</style>
