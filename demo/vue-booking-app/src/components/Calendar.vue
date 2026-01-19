<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <button @click="prevMonth">&lt;</button>
      <h2>{{ currentMonthYear }}</h2>
      <button @click="nextMonth">&gt;</button>
    </div>

    <!-- ISSUE: 画像の最適化不足（遅延読み込みなし、サイズ指定なし） -->
    <img :src="calendarBanner" alt="Calendar Banner" />

    <div class="calendar-grid">
      <div
        v-for="day in calendarDays"
        :key="day.date"
        class="calendar-day"
        :class="{ 'has-bookings': hasBookings(day.date), 'selected': isSelected(day.date) }"
        @click="selectDate(day.date)"
      >
        <span class="day-number">{{ day.dayNumber }}</span>
        <div class="booking-count" v-if="hasBookings(day.date)">
          {{ getBookingCount(day.date) }}件
        </div>
        <!-- ISSUE: XSS脆弱性 - v-htmlでユーザー入力をレンダリング -->
        <div class="booking-preview" v-html="getBookingPreview(day.date)"></div>
      </div>
    </div>

    <div class="time-slots" v-if="selectedDate">
      <h3>{{ formatDate(selectedDate) }} の予約枠</h3>
      <div class="time-slot-grid">
        <div
          v-for="slot in getAvailableSlots(selectedDate)"
          :key="slot.time"
          class="time-slot"
          :class="{ 'booked': slot.booked, 'selected': isSlotSelected(slot) }"
          @click="selectTimeSlot(slot)"
        >
          {{ slot.time }}
          <span v-if="slot.booked">(予約済)</span>
        </div>
      </div>
    </div>

    <BookingForm
      v-if="selectedTimeSlot"
      :date="selectedDate"
      :timeSlot="selectedTimeSlot"
      @submit="handleBookingSubmit"
    />
  </div>
</template>

<script>
import moment from 'moment';
import BookingForm from './BookingForm.vue';

// ISSUE: 巨大なコンポーネント（本来は分割すべき）
export default {
  name: 'Calendar',
  components: { BookingForm },
  // ISSUE: Props drilling - 深いコンポーネント階層を通じてpropsを渡す
  props: {
    staffId: Number,
    resourceId: Number,
    serviceId: Number,
    customerId: Number,
    showAdmin: Boolean,
    allowPastBooking: Boolean,
    minDate: String,
    maxDate: String,
    excludeDates: Array,
    workingHours: Object,
    breakTime: Object,
    slotDuration: Number,
    maxBookingsPerSlot: Number
  },
  data() {
    return {
      currentDate: new Date(),
      selectedDate: null,
      selectedTimeSlot: null,
      calendarBanner: '/images/calendar-banner.png',
      // ISSUE: データがローカルにキャッシュされない
      bookingsCache: {}
    };
  },
  computed: {
    // ISSUE: computedではなくmethodsで毎回計算（以下で示す）
    currentMonthYear() {
      return moment(this.currentDate).format('YYYY年M月');
    }
  },
  methods: {
    // ISSUE: 不要な再レンダリング - computed を使用せず methods で毎回計算
    calendarDays() {
      const days = [];
      const start = moment(this.currentDate).startOf('month').startOf('week');
      const end = moment(this.currentDate).endOf('month').endOf('week');

      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        days.push({
          date: current.format('YYYY-MM-DD'),
          dayNumber: current.date(),
          isCurrentMonth: current.month() === moment(this.currentDate).month()
        });
        current.add(1, 'day');
      }
      return days;
    },

    // ISSUE: N+1的な問題 - 各日付ごとにフィルタリング
    hasBookings(date) {
      return this.$store.state.bookings.some(b => b.date === date);
    },

    getBookingCount(date) {
      return this.$store.state.bookings.filter(b => b.date === date).length;
    },

    // ISSUE: XSS脆弱性 - ユーザー入力をHTMLとして返す
    getBookingPreview(date) {
      const bookings = this.$store.state.bookings.filter(b => b.date === date);
      if (bookings.length === 0) return '';
      // ユーザーが入力した予約メモをそのままHTMLとして返す
      return bookings.map(b => `<span class="preview">${b.customerNote}</span>`).join('');
    },

    getAvailableSlots(date) {
      // ISSUE: マジックナンバー
      const slots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          const booked = this.$store.state.bookings.some(
            b => b.date === date && b.time === time
          );
          slots.push({ time, booked });
        }
      }
      return slots;
    },

    prevMonth() {
      this.currentDate = moment(this.currentDate).subtract(1, 'month').toDate();
    },

    nextMonth() {
      this.currentDate = moment(this.currentDate).add(1, 'month').toDate();
    },

    selectDate(date) {
      this.selectedDate = date;
      this.selectedTimeSlot = null;
      this.$store.commit('SET_SELECTED_DATE', date);
    },

    selectTimeSlot(slot) {
      if (!slot.booked) {
        this.selectedTimeSlot = slot;
        this.$store.commit('SET_SELECTED_TIME_SLOT', slot);
      }
    },

    isSelected(date) {
      return this.selectedDate === date;
    },

    isSlotSelected(slot) {
      return this.selectedTimeSlot && this.selectedTimeSlot.time === slot.time;
    },

    formatDate(date) {
      return moment(date).format('M月D日(ddd)');
    },

    // ISSUE: エラーハンドリング不足
    async handleBookingSubmit(bookingData) {
      await this.$store.dispatch('createBooking', {
        ...bookingData,
        date: this.selectedDate,
        time: this.selectedTimeSlot.time
      });
      this.selectedTimeSlot = null;
    }
  },
  mounted() {
    // ISSUE: コンポーネントマウント時に全データを取得
    this.$store.dispatch('fetchBookings');
  }
};
</script>

<style scoped>
.calendar-container {
  padding: 20px;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.calendar-day {
  padding: 10px;
  border: 1px solid #ddd;
  min-height: 80px;
  cursor: pointer;
}
.calendar-day:hover {
  background: #f5f5f5;
}
.calendar-day.selected {
  background: #42b983;
  color: white;
}
.calendar-day.has-bookings {
  background: #e8f5e9;
}
.time-slots {
  margin-top: 20px;
}
.time-slot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.time-slot {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: center;
  cursor: pointer;
}
.time-slot.booked {
  background: #ffebee;
  cursor: not-allowed;
}
.time-slot.selected {
  background: #42b983;
  color: white;
}
</style>
