import pluginVue from "eslint-plugin-vue"
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript"
import stylistic from "@stylistic/eslint-plugin"

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/public/**",
      "**/tests/**",
      "**/coverage/**",
      "eslint.config.js",
    ],
  },
  ...pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  stylistic.configs.recommended,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
      "vue/no-unused-vars": "warn",
    },
  },
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "no-magic-numbers": [
        "warn",
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: false,
        },
      ],
      "@stylistic/brace-style": "off",
      "@stylistic/arrow-parens": "off",
      "@stylistic/operator-linebreak": "off",
      "@stylistic/no-trailing-spaces": ["warn", { skipBlankLines: false }],
      "@stylistic/quotes": ["warn", "double", { avoidEscape: true }],
      "@stylistic/indent": ["warn", 2],
    },
  },
)
