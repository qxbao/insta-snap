import { createApp } from "vue";
import Dashboard from "./Dashboard.vue";
import "../assets/style.css";
import { createPinia } from "pinia";
import { i18n } from "../i18n";
import { withErrorBoundary } from "../utils/error-boundary";
import { useAppStore } from "../stores/app.store";

const pinia = createPinia();
const app = createApp(withErrorBoundary(Dashboard));
const appStore = useAppStore(pinia);

app.use(pinia);
app.use(i18n);
app.mount("#app");

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "session") {
    for (const key in changes) {
      if (key == "lastsync") {
        await appStore.loadTrackedUsers();
        await appStore.loadStorageMetadata();
        break;
      }
    }
  }
});
