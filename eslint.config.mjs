import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message: "Node globals are server-only and must not enter browser assets.",
        },
        {
          name: "process",
          message: "Use import.meta.env with a VITE_ prefix in browser code.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "process",
              message: "Server environment access is forbidden in browser assets.",
            },
          ],
          patterns: [
            {
              group: ["node:*"],
              message: "Node built-ins are server-only and must not enter browser assets.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
      },
    },
  },
);
