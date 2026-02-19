import fs from "fs"

const manifestPath = "./dist/manifest.json"
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

if (manifest.background && manifest.background.service_worker) {
  manifest.background.scripts = [manifest.background.service_worker]
  delete manifest.background.service_worker
}

for (const key in manifest["web_accessible_resources"]) {
  if ("use_dynamic_url" in manifest["web_accessible_resources"][key]) {
    delete manifest["web_accessible_resources"][key]["use_dynamic_url"]
  }
}

manifest.browser_specific_settings = {
  gecko: {
    id: "instasnap@qxbao.dev",
  },
}
const INDENTATION = 2
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, INDENTATION))
console.log("✅ Manifest patched for Firefox!")
