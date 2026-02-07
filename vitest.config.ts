import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import Components from "unplugin-vue-components/vite";
import IconsResolver from "unplugin-icons/resolver";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      autoInstall: true,
      compiler: "vue3",
      defaultClass: "inline-block",
    }),
    Components({
      resolvers: [
        IconsResolver({
          prefix: "i",
          enabledCollections: ["fa6-solid"],
        }),
      ],
      dts: false, // Disable during tests
    }),
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", "public"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{js,ts,vue}"],
      exclude: [
        "node_modules/**",
        "src/tests/**",
        "*.config.*",
        "public/**",
        "**/*.d.ts",
        "src/vite-env.d.ts",
        "src/components.d.ts",
        "src/style.d.ts",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
