<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>ダッシュボード</h1>
      <p>{{ greeting }}, {{ userName }}さん</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>今日の予約</h3>
        <p class="stat-number">{{ todayBookings.length }}</p>
      </div>
      <div class="stat-card">
        <h3>今週の予約</h3>
        <p class="stat-number">{{ weekBookings.length }}</p>
      </div>
      <div class="stat-card">
        <h3>今月の売上</h3>
        <p class="stat-number">¥{{ monthlyRevenue.toLocaleString() }}</p>
      </div>
      <div class="stat-card">
        <h3>キャンセル率</h3>
        <p class="stat-number">{{ cancellationRate }}%</p>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="calendar-section">
        <Calendar
          :staffId="selectedStaffId"
          :serviceId="selectedServiceId"
        />
      </div>

      <div class="sidebar">
        <div class="upcoming-bookings">
          <h3>直近の予約</h3>
          <!-- ISSUE: XSS脆弱性 - v-html -->
          <div v-for="booking in upcomingBookings" :key="booking.id" class="booking-item">
            <p><strong>{{ booking.customerName }}</strong></p>
            <p>{{ formatDateTime(booking) }}</p>
            <p v-html="booking.customerNote"></p>
          </div>
        </div>

        <div class="notifications">
          <h3>通知</h3>
          <div v-for="notification in notifications" :key="notification.id" class="notification-item">
            <!-- ISSUE: XSS脆弱性 -->
            <p v-html="notification.message"></p>
            <span class="time">{{ notification.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <BookingList @edit="handleEditBooking" />
  </div>
</template>

<script>
import moment from 'moment';
import Calendar from '../components/Calendar.vue';
import BookingList from '../components/BookingList.vue';

// ISSUE: 巨大なコンポーネント（本来は分割すべき）
export default {
  name: 'Dashboard',
  components: { Calendar, BookingList },
  data() {
    return {
      selectedStaffId: null,
      selectedServiceId: null,
      // ISSUE: ローカル状態とVuex状態の重複
      localBookings: [],
      localNotifications: []
    };
  },
  computed: {
    userName() {
      return this.$store.state.user?.name || 'ゲスト';
    },
    greeting() {
      const hour = new Date().getHours();
      if (hour < 12) return 'おはようございます';
      if (hour < 18) return 'こんにちは';
      return 'こんばんは';
    },
    bookings() {
      return this.$store.state.bookings;
    },
    notifications() {
      return this.$store.state.notifications;
    },
    // ISSUE: 重い計算が毎回実行される（メモ化なし）
    todayBookings() {
      const today = moment().format('YYYY-MM-DD');
      return this.bookings.filter(b => b.date === today);
    },
    weekBookings() {
      const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
      return this.bookings.filter(b => b.date >= startOfWeek && b.date <= endOfWeek);
    },
    monthlyRevenue() {
      const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
      const monthBookings = this.bookings.filter(
        b => b.date >= startOfMonth && b.status === 'confirmed'
      );
      // ISSUE: サービス価格を毎回取得
      return monthBookings.reduce((sum, b) => {
        const service = this.$store.state.services.find(s => s.id === b.serviceId);
        return sum + (service?.price || 0);
      }, 0);
    },
    cancellationRate() {
      if (this.bookings.length === 0) return 0;
      const cancelled = this.bookings.filter(b => b.status === 'cancelled').length;
      return Math.round((cancelled / this.bookings.length) * 100);
    },
    upcomingBookings() {
      const now = moment();
      return this.bookings
        .filter(b => moment(`${b.date} ${b.time}`).isAfter(now) && b.status !== 'cancelled')
        .sort((a, b) => moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`)))
        .slice(0, 5);
    }
  },
  methods: {
    formatDateTime(booking) {
      return `${moment(booking.date).format('M/D(ddd)')} ${booking.time}`;
    },
    handleEditBooking(booking) {
      // ISSUE: 編集機能が未実装
      console.log('Edit booking:', booking);
      alert('編集機能は準備中です');
    },
    // ISSUE: 大量データの一括取得
    async fetchAllData() {
      await Promise.all([
        this.$store.dispatch('fetchBookings'),
        this.$store.dispatch('fetchServices'),
        this.$store.dispatch('fetchStaff'),
        this.$store.dispatch('fetchCustomers')
      ]);
    }
  },
  // ISSUE: マウント時に全データを取得（ページネーションなし）
  mounted() {
    this.fetchAllData();
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
.dashboard-header {
  margin-bottom: 30px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}
.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}
.stat-number {
  font-size: 2em;
  font-weight: bold;
  color: #42b983;
}
.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.upcoming-bookings,
.notifications {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.booking-item,
.notification-item {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
.notification-item .time {
  font-size: 0.8em;
  color: #999;
}
</style>
