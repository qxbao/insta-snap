import { defineConfig } from "vitest/config";
import Icons from "unplugin-icons/vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";
import tailwindcss from "@tailwindcss/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    vue(),
    visualizer({ open: true }),
    Icons({
      autoInstall: true,
      compiler: "vue3",
      defaultClass: "inline-block",
    }),
    tailwindcss({
      optimize: {
        minify: true,
      },
    }),
    Components({
      resolvers: [
        IconsResolver({
          prefix: "i",
          enabledCollections: ["fa6-solid"],
        }),
      ],
      dts: "src/components.d.ts",
    }),
    crx({ manifest: manifest satisfies ManifestV3Export }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "src/tests/**", "*.config.*", "public/**"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    cors: {
      origin: [
        "chrome-extension://lkhdgfhpbplamljkpcpiblkjpdfjfhaa",
        "chrome-extension://bcgiblflplhlnhndbbbdgplpcedimbkd",
      ],
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "popup.html",
        dashboard: "dashboard.html",
      },
    },
  },
});
