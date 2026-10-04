import { createRequire } from "node:module";

// Baked by the build, fallback reads package.json when run from source
declare const __QOL_MINI_VERSION__: string | undefined;

function fromPackage(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json") as { version: string };
  return pkg.version;
}

export const VERSION: string =
  typeof __QOL_MINI_VERSION__ === "string" ? __QOL_MINI_VERSION__ : fromPackage();
