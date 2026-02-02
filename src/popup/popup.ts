import { createApp } from 'vue';
import Popup from './Popup.vue';
import '../assets/style.css';
import { createPinia } from 'pinia';
const app = createApp(Popup);

const pinia = createPinia();
app.use(pinia)
app.mount('#app');