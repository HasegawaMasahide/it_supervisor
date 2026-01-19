import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './stores';

// ISSUE: moment.jsの全ロケールをインポート（バンドルサイズ肥大化）
import moment from 'moment';
import 'moment/locale/ja';

// ISSUE: lodash全体をインポート（tree-shaking不備）
import _ from 'lodash';

Vue.config.productionTip = false;

// ISSUE: グローバル変数として設定
window.moment = moment;
window._ = _;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
