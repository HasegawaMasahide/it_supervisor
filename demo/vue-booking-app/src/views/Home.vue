<template>
  <div class="home">
    <section class="hero">
      <h1>予約管理システム</h1>
      <p>簡単に予約を管理できます</p>
      <!-- ISSUE: 画像の最適化不足（WebP未使用、サイズ指定なし） -->
      <img src="/images/hero-banner.jpg" alt="Hero" />
    </section>

    <section class="features">
      <div class="feature-card" v-for="feature in features" :key="feature.id">
        <img :src="feature.icon" :alt="feature.title" />
        <h3>{{ feature.title }}</h3>
        <!-- ISSUE: XSS脆弱性の可能性 -->
        <p v-html="feature.description"></p>
      </div>
    </section>

    <section class="login-section" v-if="!isLoggedIn">
      <h2>ログイン</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>メールアドレス</label>
          <input v-model="loginForm.email" type="email" required />
        </div>
        <div class="form-group">
          <label>パスワード</label>
          <input v-model="loginForm.password" type="password" required />
        </div>
        <button type="submit">ログイン</button>
      </form>
    </section>

    <section class="quick-booking" v-else>
      <h2>クイック予約</h2>
      <Calendar />
    </section>
  </div>
</template>

<script>
import Calendar from '../components/Calendar.vue';

export default {
  name: 'Home',
  components: { Calendar },
  data() {
    return {
      loginForm: {
        email: '',
        password: ''
      },
      features: [
        {
          id: 1,
          icon: '/icons/calendar.png',
          title: 'カレンダー予約',
          description: '<strong>直感的</strong>なカレンダーUIで予約'
        },
        {
          id: 2,
          icon: '/icons/notification.png',
          title: '自動通知',
          description: '予約確認・リマインダーを<em>自動送信</em>'
        },
        {
          id: 3,
          icon: '/icons/analytics.png',
          title: '売上分析',
          description: '売上データを<b>リアルタイム</b>で可視化'
        }
      ]
    };
  },
  computed: {
    isLoggedIn() {
      return this.$store.getters.isAuthenticated;
    }
  },
  methods: {
    // ISSUE: エラーハンドリング不足
    async handleLogin() {
      await this.$store.dispatch('login', this.loginForm);
      if (this.$store.getters.isAuthenticated) {
        this.$router.push('/dashboard');
      }
    }
  }
};
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.hero {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #42b983, #35495e);
  color: white;
  border-radius: 8px;
  margin-bottom: 40px;
}
.hero img {
  max-width: 100%;
  margin-top: 20px;
}
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}
.feature-card {
  text-align: center;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.feature-card img {
  width: 64px;
  height: 64px;
  margin-bottom: 15px;
}
.login-section {
  max-width: 400px;
  margin: 0 auto;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
}
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
button {
  width: 100%;
  padding: 12px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
