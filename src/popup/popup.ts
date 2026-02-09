import { createApp } from 'vue';
import Popup from './Popup.vue';
import '../assets/style.css';
import { createPinia } from 'pinia';
import { ActionType } from '../constants/actions';
import { useAppStore } from '../stores/app.store';
import { i18n } from '../i18n';
const app = createApp(Popup);
const pinia = createPinia();
const appStore = useAppStore(pinia);
app.use(pinia)
app.use(i18n)
app.mount('#app');

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type == ActionType.SYNC_LOCKS) {
    appStore.loadLocks();
  } else if (message.type == ActionType.NOTIFY_SNAPSHOT_COMPLETE) {
    const userId = message.payload;
    appStore.unlockUser(userId);
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session") {
    for (const key in changes) {
      if (key == "lastsync") {
        appStore.loadTrackedUsers();
        break;
      }
    }
  }
});