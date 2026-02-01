import { defineConfig } from "vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    crx({ manifest: manifest satisfies ManifestV3Export }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    cors: {
      origin: ["chrome-extension://lkhdgfhpbplamljkpcpiblkjpdfjfhaa"],
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
        dashboard: 'dashboard.html',
      },
    },
  }
});
