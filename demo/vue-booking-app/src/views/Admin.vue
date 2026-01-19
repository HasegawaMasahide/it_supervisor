<template>
  <div class="admin">
    <h1>管理者ページ</h1>

    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="admin-content">
      <!-- スタッフ管理 -->
      <section v-if="activeTab === 'staff'" class="staff-section">
        <h2>スタッフ管理</h2>
        <button @click="showAddStaffModal = true">スタッフを追加</button>
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
              <th>担当サービス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="staff in staffList" :key="staff.id">
              <td>{{ staff.name }}</td>
              <td>{{ staff.email }}</td>
              <td>{{ staff.services.join(', ') }}</td>
              <td>
                <button @click="editStaff(staff)">編集</button>
                <button @click="deleteStaff(staff.id)" class="btn-danger">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- サービス管理 -->
      <section v-if="activeTab === 'services'" class="services-section">
        <h2>サービス管理</h2>
        <button @click="showAddServiceModal = true">サービスを追加</button>
        <table>
          <thead>
            <tr>
              <th>サービス名</th>
              <th>価格</th>
              <th>所要時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in serviceList" :key="service.id">
              <td>{{ service.name }}</td>
              <td>¥{{ service.price.toLocaleString() }}</td>
              <td>{{ service.duration }}分</td>
              <td>
                <button @click="editService(service)">編集</button>
                <button @click="deleteService(service.id)" class="btn-danger">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 設定 -->
      <section v-if="activeTab === 'settings'" class="settings-section">
        <h2>システム設定</h2>
        <form @submit.prevent="saveSettings">
          <div class="form-group">
            <label>営業開始時間</label>
            <input v-model="settings.openTime" type="time" />
          </div>
          <div class="form-group">
            <label>営業終了時間</label>
            <input v-model="settings.closeTime" type="time" />
          </div>
          <div class="form-group">
            <label>予約間隔（分）</label>
            <input v-model.number="settings.slotInterval" type="number" />
          </div>
          <div class="form-group">
            <label>キャンセル可能時間（時間前）</label>
            <input v-model.number="settings.cancelDeadline" type="number" />
          </div>
          <button type="submit">保存</button>
        </form>
      </section>

      <!-- 顧客管理 -->
      <section v-if="activeTab === 'customers'" class="customers-section">
        <h2>顧客管理</h2>
        <input v-model="customerSearch" placeholder="顧客を検索..." />
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
              <th>電話</th>
              <th>予約回数</th>
              <th>メモ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in filteredCustomers" :key="customer.id">
              <td>{{ customer.name }}</td>
              <td>{{ customer.email }}</td>
              <td>{{ customer.phone }}</td>
              <td>{{ customer.bookingCount }}</td>
              <!-- ISSUE: XSS脆弱性 -->
              <td v-html="customer.notes"></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Admin',
  data() {
    return {
      activeTab: 'staff',
      tabs: [
        { id: 'staff', label: 'スタッフ' },
        { id: 'services', label: 'サービス' },
        { id: 'customers', label: '顧客' },
        { id: 'settings', label: '設定' }
      ],
      showAddStaffModal: false,
      showAddServiceModal: false,
      customerSearch: '',
      // ISSUE: 設定をローカル状態で管理（Vuexと不整合の可能性）
      settings: {
        openTime: '09:00',
        closeTime: '18:00',
        slotInterval: 30,
        cancelDeadline: 24
      }
    };
  },
  computed: {
    staffList() {
      return this.$store.state.staff;
    },
    serviceList() {
      return this.$store.state.services;
    },
    customerList() {
      return this.$store.state.customers;
    },
    // ISSUE: バリデーションの重複（BookingFormと同じロジック）
    filteredCustomers() {
      if (!this.customerSearch) return this.customerList;
      const query = this.customerSearch.toLowerCase();
      return this.customerList.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query)
      );
    }
  },
  methods: {
    editStaff(staff) {
      console.log('Edit staff:', staff);
    },
    // ISSUE: 確認ダイアログなしで削除
    async deleteStaff(staffId) {
      await this.$store.dispatch('deleteStaff', staffId);
    },
    editService(service) {
      console.log('Edit service:', service);
    },
    async deleteService(serviceId) {
      await this.$store.dispatch('deleteService', serviceId);
    },
    // ISSUE: バリデーションなし
    async saveSettings() {
      await this.$store.dispatch('updateSettings', this.settings);
      alert('設定を保存しました');
    }
  },
  mounted() {
    // ISSUE: 管理者権限の再チェックなし（ルートガードのみに依存）
    this.$store.dispatch('fetchStaff');
    this.$store.dispatch('fetchServices');
    this.$store.dispatch('fetchCustomers');
  }
};
</script>

<style scoped>
.admin {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.admin-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
}
.admin-tabs button {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
}
.admin-tabs button.active {
  color: #42b983;
  border-bottom: 2px solid #42b983;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
th, td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}
th {
  background: #f5f5f5;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
}
.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 200px;
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
