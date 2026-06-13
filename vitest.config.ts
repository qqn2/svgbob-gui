import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#asciiflow": path.resolve(__dirname, "asciiflow-upstream"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["asciiflow-upstream/client/**/*.test.ts"],
  },
});
