import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    env: { DEAL_SILENT: "1" },
  },
});
