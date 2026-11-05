import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["tests/server/**/*.spec.ts", "src/**/*.spec.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          globals: true,
          globalSetup: "./tests/integration/setup.ts",
          include: ["tests/server/**/*.integration.ts"],
        },
      },
    ],
  },
});
