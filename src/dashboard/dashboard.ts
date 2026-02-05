import { createApp } from 'vue';
import Dashboard from './Dashboard.vue';
import '../assets/style.css';
import { createPinia } from 'pinia';


const pinia = createPinia();
const app = createApp(Dashboard)
app.use(pinia);
app.mount('#app');
