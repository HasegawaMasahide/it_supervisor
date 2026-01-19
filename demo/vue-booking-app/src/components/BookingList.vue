<template>
  <div class="booking-list">
    <h2>予約一覧</h2>

    <div class="filters">
      <input v-model="searchQuery" placeholder="検索..." @input="filterBookings" />
      <select v-model="statusFilter" @change="filterBookings">
        <option value="">全て</option>
        <option value="confirmed">確定</option>
        <option value="pending">保留</option>
        <option value="cancelled">キャンセル</option>
      </select>
    </div>

    <table class="booking-table">
      <thead>
        <tr>
          <th>日時</th>
          <th>顧客名</th>
          <th>サービス</th>
          <th>スタッフ</th>
          <th>ステータス</th>
          <th>メモ</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="booking in filteredBookings" :key="booking.id">
          <td>{{ formatDateTime(booking) }}</td>
          <td>{{ booking.customerName }}</td>
          <td>{{ getServiceName(booking.serviceId) }}</td>
          <td>{{ getStaffName(booking.staffId) }}</td>
          <td>
            <span :class="['status-badge', booking.status]">
              {{ getStatusLabel(booking.status) }}
            </span>
          </td>
          <!-- ISSUE: XSS脆弱性 - v-htmlでユーザー入力をレンダリング -->
          <td v-html="booking.customerNote"></td>
          <td>
            <button @click="editBooking(booking)">編集</button>
            <button @click="cancelBooking(booking.id)" class="btn-danger">キャンセル</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ISSUE: ページネーションなし - 全データを一度に表示 -->
    <p class="booking-count">全 {{ filteredBookings.length }} 件</p>
  </div>
</template>

<script>
import moment from 'moment';

export default {
  name: 'BookingList',
  data() {
    return {
      searchQuery: '',
      statusFilter: '',
      filteredBookings: []
    };
  },
  computed: {
    bookings() {
      return this.$store.state.bookings;
    },
    services() {
      return this.$store.state.services;
    },
    staff() {
      return this.$store.state.staff;
    }
  },
  methods: {
    // ISSUE: 毎回全データをフィルタリング（メモ化なし）
    filterBookings() {
      let result = [...this.bookings];

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(b =>
          b.customerName.toLowerCase().includes(query) ||
          b.email.toLowerCase().includes(query) ||
          (b.customerNote && b.customerNote.toLowerCase().includes(query))
        );
      }

      if (this.statusFilter) {
        result = result.filter(b => b.status === this.statusFilter);
      }

      this.filteredBookings = result;
    },

    formatDateTime(booking) {
      return `${moment(booking.date).format('M/D')} ${booking.time}`;
    },

    // ISSUE: N+1的な問題 - 各行でfindを実行
    getServiceName(serviceId) {
      const service = this.services.find(s => s.id === serviceId);
      return service ? service.name : '-';
    },

    getStaffName(staffId) {
      if (!staffId) return '指名なし';
      const staffMember = this.staff.find(s => s.id === staffId);
      return staffMember ? staffMember.name : '-';
    },

    getStatusLabel(status) {
      const labels = {
        confirmed: '確定',
        pending: '保留',
        cancelled: 'キャンセル'
      };
      return labels[status] || status;
    },

    editBooking(booking) {
      this.$emit('edit', booking);
    },

    // ISSUE: 確認ダイアログなし
    async cancelBooking(bookingId) {
      await this.$store.dispatch('deleteBooking', bookingId);
      this.filterBookings();
    }
  },
  watch: {
    bookings: {
      handler() {
        this.filterBookings();
      },
      immediate: true
    }
  }
};
</script>

<style scoped>
.booking-list {
  padding: 20px;
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.filters input,
.filters select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.booking-table {
  width: 100%;
  border-collapse: collapse;
}
.booking-table th,
.booking-table td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}
.booking-table th {
  background: #f5f5f5;
}
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.status-badge.confirmed {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-badge.pending {
  background: #fff3e0;
  color: #ef6c00;
}
.status-badge.cancelled {
  background: #ffebee;
  color: #c62828;
}
.btn-danger {
  background: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 5px;
}
</style>
