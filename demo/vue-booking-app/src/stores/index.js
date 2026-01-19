import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

// ISSUE: 全ての状態が1つのストアに集約（モジュール分割なし）
export default new Vuex.Store({
  state: {
    user: null,
    token: null,
    bookings: [],
    selectedDate: null,
    selectedTimeSlot: null,
    resources: [],
    staff: [],
    customers: [],
    services: [],
    settings: {},
    notifications: [],
    isLoading: false,
    error: null,
    // ISSUE: 機密情報がstateに含まれる
    apiKey: 'sk_live_FAKE_SECRET_KEY_12345',
    dbPassword: 'admin123'
  },

  // ISSUE: JWTトークンをlocalStorageに保存
  mutations: {
    SET_USER(state, user) {
      state.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    SET_TOKEN(state, token) {
      state.token = token;
      localStorage.setItem('token', token);
    },
    SET_BOOKINGS(state, bookings) {
      state.bookings = bookings;
    },
    ADD_BOOKING(state, booking) {
      state.bookings.push(booking);
    },
    UPDATE_BOOKING(state, updatedBooking) {
      const index = state.bookings.findIndex(b => b.id === updatedBooking.id);
      if (index !== -1) {
        // ISSUE: Vue 2のリアクティビティ問題（直接代入）
        state.bookings[index] = updatedBooking;
      }
    },
    DELETE_BOOKING(state, bookingId) {
      state.bookings = state.bookings.filter(b => b.id !== bookingId);
    },
    SET_SELECTED_DATE(state, date) {
      state.selectedDate = date;
    },
    SET_SELECTED_TIME_SLOT(state, slot) {
      state.selectedTimeSlot = slot;
    },
    SET_RESOURCES(state, resources) {
      state.resources = resources;
    },
    SET_STAFF(state, staff) {
      state.staff = staff;
    },
    SET_CUSTOMERS(state, customers) {
      state.customers = customers;
    },
    SET_SERVICES(state, services) {
      state.services = services;
    },
    SET_SETTINGS(state, settings) {
      state.settings = settings;
    },
    ADD_NOTIFICATION(state, notification) {
      state.notifications.push(notification);
    },
    CLEAR_NOTIFICATIONS(state) {
      state.notifications = [];
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    LOGOUT(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },

  // ISSUE: 適切なgettersの分離がない
  actions: {
    // ISSUE: エラーハンドリング不足
    async login({ commit }, credentials) {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      commit('SET_USER', data.user);
      commit('SET_TOKEN', data.token);
    },

    async fetchBookings({ commit, state }) {
      // ISSUE: 全データを一括取得（ページネーションなし）
      const response = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      const bookings = await response.json();
      commit('SET_BOOKINGS', bookings);
    },

    async createBooking({ commit, state }, bookingData) {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify(bookingData)
      });
      const newBooking = await response.json();
      commit('ADD_BOOKING', newBooking);
    },

    async updateBooking({ commit, state }, bookingData) {
      const response = await fetch(`/api/bookings/${bookingData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify(bookingData)
      });
      const updatedBooking = await response.json();
      commit('UPDATE_BOOKING', updatedBooking);
    },

    async deleteBooking({ commit, state }, bookingId) {
      await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` }
      });
      commit('DELETE_BOOKING', bookingId);
    }
  },

  getters: {
    isAuthenticated: state => !!state.token,
    currentUser: state => state.user,
    allBookings: state => state.bookings,
    // ISSUE: 重い計算がgetterで毎回実行される
    bookingsByDate: state => date => {
      return state.bookings.filter(b => b.date === date);
    }
  }
});
