import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite-plus";

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "package.json"), "utf8")) as {
  version: string;
};

// Each hook is copied alone into the Claude config dir: one config per entry,
// so no bundle shares a chunk with another.
const HOOKS = ["tab-state", "precompact-kaizen", "play", "statusline"];
const one = (entry: string, clean: boolean): object => ({
  entry: [entry],
  clean,
  format: ["esm"],
  platform: "node",
  fixedExtension: false,
  dts: false, // tsgo spawns EBUSY under WSL
  exports: false,
  define: { __QOL_MINI_VERSION__: JSON.stringify(pkg.version) },
});

export default defineConfig({
  pack: [one("src/cli.ts", true), ...HOOKS.map((name) => one(`src/kit/hooks/${name}.ts`, false))],
  test: {
    globalSetup: ["tests/helpers/build.ts"],
    coverage: {
      include: ["src/**"],
      reporter: ["text-summary", "text"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: { ignorePatterns: ["skills/**", "tests/fixtures/**"] }, // shipped prose and test data
});
