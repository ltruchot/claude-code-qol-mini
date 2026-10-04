import { expect, test } from "vite-plus/test";
import { exitCode } from "../../src/core/status/exit-code.ts";

test("exit codes", () => {
  expect(exitCode(["ok", "ok"])).toBe(0);
  expect(exitCode(["ok", "update"])).toBe(1);
  expect(exitCode(["update", "drift"])).toBe(2);
  expect(exitCode(["drift", "tamper"])).toBe(3);
});
