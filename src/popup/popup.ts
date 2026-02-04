import { createApp } from 'vue';
import Popup from './Popup.vue';
import '../assets/style.css';
import { createPinia } from 'pinia';
import { ActionType } from '../constants/actions';
import { useSharedStore } from '../stores/shared.store';

const app = createApp(Popup);
const pinia = createPinia();
const sharedStore = useSharedStore(pinia);

app.use(pinia)
app.mount('#app');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type == ActionType.SYNC_LOCKS) {
    sharedStore.loadLocks();
  } else if (message.type == ActionType.NOTIFY_SNAPSHOT_COMPLETE) {
    const userId = message.payload;
    sharedStore.unlockUser(userId);
  }
})