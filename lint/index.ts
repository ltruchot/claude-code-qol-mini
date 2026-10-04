import type { ViteUserConfig } from "vite-plus";
import { OFF_DESIGN } from "./off-design.ts";
import { OFF_STYLE } from "./off-style.ts";
import { OFF_TESTS } from "./off-tests.ts";

type Lint = NonNullable<ViteUserConfig["lint"]>;

// Every oxlint category on, exceptions documented next to their reason
export const lint: Lint = {
  ignorePatterns: ["packages/qol-mini/tests/fixtures/**"],
  jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
  plugins: ["typescript", "unicorn", "oxc", "import", "promise", "node", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "error",
    pedantic: "error",
    perf: "error",
    style: "error",
    restriction: "error",
  },
  rules: {
    "vite-plus/prefer-vite-plus-imports": "error",
    ...OFF_DESIGN,
    ...OFF_STYLE,
    ...OFF_TESTS,
  },
  overrides: [
    // Build scripts talk to the terminal directly
    {
      files: ["scripts/**"],
      rules: { "eslint/no-console": "off", "unicorn/no-process-exit": "off" },
    },
    // Vite requires a default export
    { files: ["**/vite.config.ts"], rules: { "import/no-default-export": "off" } },
  ],
  options: { typeAware: true, typeCheck: true },
};
