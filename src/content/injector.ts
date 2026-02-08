import { createApp } from "vue";
import { createLogger } from "../utils/logger";
import tailwindStyles from '../assets/style.css?inline';
import ContentMasterLayer from "./ContentMasterLayer.vue";
import { createPinia } from "pinia";
import { useUIStore } from "../stores/ui.store";
import { i18n } from "../i18n";

const logger = createLogger("Injector");

export function setupVueApp(): ReturnType<typeof useUIStore> | void {
  if (document.querySelector('#isnap-master-layer')) return;

  const host = document.createElement("div");
  host.id = "isnap-host";
  host.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;";
  
  const shadow = host.attachShadow({ mode: 'open' });
  const styleTag = document.createElement("style");
  styleTag.textContent = tailwindStyles;
  shadow.appendChild(styleTag);
  
  logger.info(`Injected styles length: ${tailwindStyles.length} chars`);

  const root = document.createElement('div');
  root.id = 'isnap-app-root';
  root.style.cssText = "width: 100%; height: 100%; pointer-events: none;";
  shadow.appendChild(root);

  const app = createApp(ContentMasterLayer);
  const pinia = createPinia();
  
  const atProperties = tailwindStyles.slice(tailwindStyles.indexOf('@property'))
  const style = document.createElement('style')
  style.innerText = atProperties
  document.head.appendChild(style)

  app.use(pinia);
  app.use(i18n);
  const uiStore = useUIStore(pinia);
  app.mount(root);
  
  document.body.appendChild(host);
  logger.info("Vue app injected into the page.");

  return uiStore;
}