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
    include: ["src/**/*.test.ts"],
    name: "server",
    setupFiles: [
      fileURLToPath(new URL("../../test/vitest.setup.ts", import.meta.url)),
    ],
  },
});
