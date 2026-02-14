import pluginVue from "eslint-plugin-vue";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import recommendConfigs from "eslint-plugin-prettier/recommended";

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/node_modules/**", "**/public/**", "**/tests/**"],
  },
  ...pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  recommendConfigs,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
      "vue/no-unused-vars": "warn",
    },
  },
  skipFormatting,
);
