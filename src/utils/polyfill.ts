import browser from "webextension-polyfill"

// @ts-expect-error TODO
if (typeof globalThis.browser === "undefined") {
  // @ts-expect-error Mentioned above
  globalThis.browser = browser
}

export default browser
