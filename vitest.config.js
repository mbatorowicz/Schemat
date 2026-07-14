import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/main.js"],
      thresholds: {
        lines: 25,
        functions: 30,
        branches: 25,
        statements: 25,
      },
    },
  },
});
