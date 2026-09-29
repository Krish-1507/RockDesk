import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@chat-to-ticket/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 60000,
    hookTimeout: 30000,
    setupFiles: ["./tests/setup.ts"],
  },
});
