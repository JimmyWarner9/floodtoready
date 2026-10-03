import { fileURLToPath } from "node:url";

export const workspaceAliases = {
  "@banjir-ready/contracts": fileURLToPath(
    new URL("./packages/contracts/src/index.ts", import.meta.url),
  ),
  "@banjir-ready/fixtures": fileURLToPath(
    new URL("./packages/fixtures/src/index.ts", import.meta.url),
  ),
  "@banjir-ready/test-support": fileURLToPath(
    new URL("./packages/test-support/src/index.ts", import.meta.url),
  ),
} as const;

export const deterministicVitestOptions = {
  clearMocks: true,
  environment: "node",
  fileParallelism: false,
  globals: false,
  maxWorkers: 1,
  minWorkers: 1,
  passWithNoTests: true,
  restoreMocks: true,
  retry: 0,
  sequence: {
    concurrent: false,
    seed: 20_250_308,
    shuffle: false,
  },
  unstubEnvs: true,
  unstubGlobals: true,
} as const;
