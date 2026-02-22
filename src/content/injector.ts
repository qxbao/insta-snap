import { createApp } from "vue"
import { createLogger, Logger } from "../utils/logger"
import tailwindStyles from "../assets/style.css?inline"
import ContentMasterLayer from "./ContentMasterLayer.vue"
import { createPinia } from "pinia"
import { useUIStore } from "../stores/ui.store"
import { i18n } from "../i18n"
import { retrieveUserFollowersAndFollowing, saveUserInfo } from "../utils/instagram"

const BUTTON_CONTAINER_ID = "isnap-snapshot-button-container"
const BUTTON_STYLES =
  "margin-left: 16px; padding: 7px 15px; background-color: #c6213f; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: .8rem; font-weight: 500;"

const logger = createLogger("Injector")

export function setupVueApp(): ReturnType<typeof useUIStore> | void {
  if (document.querySelector("#isnap-master-layer")) return

  const host = document.createElement("div")
  host.id = "isnap-host"
  host.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;"

  const shadow = host.attachShadow({ mode: "open" })
  const styleTag = document.createElement("style")
  styleTag.textContent = tailwindStyles
  shadow.appendChild(styleTag)

  logger.info(`Injected styles length: ${tailwindStyles.length} chars`)

  const root = document.createElement("div")
  root.id = "isnap-app-root"
  root.style.cssText = "width: 100%; height: 100%; pointer-events: none;"
  shadow.appendChild(root)

  const app = createApp(ContentMasterLayer)
  const pinia = createPinia()

  const atProperties = tailwindStyles.slice(tailwindStyles.indexOf("@property"))
  const style = document.createElement("style")
  style.innerText = atProperties
  document.head.appendChild(style)

  app.use(pinia)
  app.use(i18n)
  const uiStore = useUIStore(pinia)
  app.mount(root)

  document.body.appendChild(host)
  logger.info("Vue app injected into the page.")

  return uiStore
}

export function injectSnapshotButton(logger?: Logger, store?: ReturnType<typeof useUIStore>) {
  if (document.querySelector(`#${BUTTON_CONTAINER_ID}`)) {
    logger?.info("Snapshot button already exists, skipping injection")
    return
  }
  const usernameEl = document.querySelector("main h2")
  const username = usernameEl?.textContent?.trim() || ""
  const usernameParentDiv = usernameEl?.parentElement?.parentElement?.parentElement
  const container = document.createElement("div")
  container.id = BUTTON_CONTAINER_ID
  container.style.cssText = "display: flex; align-items: center; margin-top: 8px;"
  const button = document.createElement("button")
  button.textContent = "Take Snapshot"
  button.style.cssText = BUTTON_STYLES
  button.addEventListener("click", async () => {
    await saveUserInfo(username, logger)
    await retrieveUserFollowersAndFollowing(username, logger, store)
  })
  container.appendChild(button)
  usernameParentDiv?.appendChild(container)
}
