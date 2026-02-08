import { createApp } from "vue";
import Dashboard from "./Dashboard.vue";
import "../assets/style.css";
import { createPinia } from "pinia";
import { i18n } from "../i18n";

const pinia = createPinia();
const app = createApp(Dashboard);
app.use(pinia);
app.use(i18n);
app.mount("#app");
