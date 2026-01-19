<template>
  <div class="booking-form">
    <h3>予約フォーム</h3>
    <form @submit.prevent="submitBooking">
      <div class="form-group">
        <label>お名前</label>
        <!-- ISSUE: 入力バリデーション不足 -->
        <input v-model="formData.customerName" type="text" required />
      </div>

      <div class="form-group">
        <label>メールアドレス</label>
        <input v-model="formData.email" type="email" required />
      </div>

      <div class="form-group">
        <label>電話番号</label>
        <input v-model="formData.phone" type="tel" />
      </div>

      <div class="form-group">
        <label>サービス</label>
        <select v-model="formData.serviceId" required>
          <option v-for="service in services" :key="service.id" :value="service.id">
            {{ service.name }} - {{ service.price }}円
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>スタッフ</label>
        <select v-model="formData.staffId">
          <option value="">指名なし</option>
          <option v-for="staff in availableStaff" :key="staff.id" :value="staff.id">
            {{ staff.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>備考・リクエスト</label>
        <!-- ISSUE: XSSの原因となるユーザー入力 -->
        <textarea v-model="formData.customerNote" rows="3"></textarea>
      </div>

      <div class="booking-summary">
        <p>日時: {{ formatDateTime() }}</p>
        <p>料金: {{ calculatePrice() }}円</p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? '予約中...' : '予約する' }}
        </button>
        <button type="button" class="btn-secondary" @click="cancel">キャンセル</button>
      </div>
    </form>
  </div>
</template>

<script>
import moment from 'moment';

export default {
  name: 'BookingForm',
  // ISSUE: Props drilling
  props: {
    date: String,
    timeSlot: Object,
    customerId: Number,
    preselectedServiceId: Number,
    preselectedStaffId: Number,
    discountCode: String,
    isReschedule: Boolean,
    originalBookingId: Number
  },
  data() {
    return {
      formData: {
        customerName: '',
        email: '',
        phone: '',
        serviceId: null,
        staffId: null,
        customerNote: ''
      },
      isSubmitting: false,
      // ISSUE: 重複した状態管理
      localServices: [],
      localStaff: []
    };
  },
  computed: {
    services() {
      return this.$store.state.services;
    },
    staff() {
      return this.$store.state.staff;
    },
    // ISSUE: 毎回フィルタリング
    availableStaff() {
      if (!this.date || !this.timeSlot) return this.staff;
      return this.staff.filter(s => {
        // 実際にはAPIで確認すべき
        return true;
      });
    }
  },
  methods: {
    formatDateTime() {
      if (!this.date || !this.timeSlot) return '';
      return `${moment(this.date).format('YYYY年M月D日')} ${this.timeSlot.time}`;
    },

    calculatePrice() {
      if (!this.formData.serviceId) return 0;
      const service = this.services.find(s => s.id === this.formData.serviceId);
      return service ? service.price : 0;
    },

    // ISSUE: バリデーション不十分
    validateForm() {
      // 最小限のバリデーションのみ
      if (!this.formData.customerName) {
        alert('お名前を入力してください');
        return false;
      }
      if (!this.formData.email) {
        alert('メールアドレスを入力してください');
        return false;
      }
      // ISSUE: メールフォーマット、電話番号形式のバリデーションなし
      return true;
    },

    async submitBooking() {
      if (!this.validateForm()) return;

      this.isSubmitting = true;

      // ISSUE: try-catchなし
      await this.$store.dispatch('createBooking', {
        ...this.formData,
        date: this.date,
        time: this.timeSlot.time
      });

      this.isSubmitting = false;
      this.$emit('submit', this.formData);
      this.resetForm();
    },

    resetForm() {
      this.formData = {
        customerName: '',
        email: '',
        phone: '',
        serviceId: null,
        staffId: null,
        customerNote: ''
      };
    },

    cancel() {
      this.$emit('cancel');
    }
  },
  // ISSUE: 重複したデータ取得ロジック
  mounted() {
    // 親コンポーネントと重複
    if (this.services.length === 0) {
      this.$store.dispatch('fetchServices');
    }
    if (this.staff.length === 0) {
      this.$store.dispatch('fetchStaff');
    }
  }
};
</script>

<style scoped>
.booking-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.booking-summary {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}
.form-actions {
  display: flex;
  gap: 10px;
}
.btn-primary {
  background: #42b983;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-secondary {
  background: #ddd;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
