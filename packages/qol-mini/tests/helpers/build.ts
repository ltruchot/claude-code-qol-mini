import { execa } from "execa";

// The installer copies the bundles in dist/: build them once per test run
export async function setup(): Promise<void> {
  await execa("vp", ["pack"], { cwd: `${import.meta.dirname}/../..` });
}
