import { defineConfig } from "vite-plus";
import { lint } from "./lint/index.ts";

// Fixtures are test data and skills are shipped prose: never format, never lint
const fixtures = ["packages/qol-mini/tests/fixtures/**", "packages/qol-mini/skills/**"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  // Markdown is prose and tables written by hand: never reflowed
  fmt: { ignorePatterns: [...fixtures, "**/*.md"] },
  lint,
  run: {
    cache: true,
    tasks: {
      // Style law: every source and test file under 50 lines
      lines: { command: "node scripts/lines.ts", cache: false },
      // Publish safety: pnpm pack must resolve catalog: and keep bin
      packcheck: { command: "node scripts/packcheck.ts", cache: false },
    },
  },
});
