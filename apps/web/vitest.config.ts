import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import {
  deterministicVitestOptions,
  workspaceAliases,
} from "../../tooling.shared";

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    ...deterministicVitestOptions,
    css: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    include: ["src/**/*.test.{ts,tsx}"],
    name: "web",
    setupFiles: [
      fileURLToPath(new URL("../../test/vitest.setup.ts", import.meta.url)),
      fileURLToPath(new URL("../../test/vitest.web.setup.ts", import.meta.url)),
    ],
  },
});
