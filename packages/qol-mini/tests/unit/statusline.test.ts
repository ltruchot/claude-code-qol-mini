import { expect, test } from "vite-plus/test";
import { human, roundHalfEven, threshold } from "../../src/kit/hooks/statusline-format.ts";
import { statusLine } from "../../src/kit/hooks/statusline-line.ts";

const LIMITS = { warn: 100_000, alert: 200_000 };
const model = { display_name: "Opus" };
const line = (used: number): string =>
  statusLine({ model, context_window: { total_input_tokens: used }, cwd: "/x/my-project" }, LIMITS);

test("the unit sits on the denominator only", () => {
  expect(human(1_000_000)).toBe("1M");
  expect(human(1_200_000)).toBe("1.2M");
  expect(human(214_500)).toBe("214k");
  expect(human(700)).toBe("0.7k");
  expect(human(0, false)).toBe("0");
  expect(roundHalfEven(2.5)).toBe(2);
  expect(line(88_000)).toContain("88\u001B[0m\u001B[2m/200k");
  expect(line(88_000)).toContain("· my-project");
  expect(line(250_000)).toContain("! 250");
  expect(line(1_200_000)).toContain("1.2M");
  expect(statusLine({}, LIMITS)).toContain("?");
  expect(statusLine({ model, cost: { total_cost_usd: 9.99 } }, LIMITS)).not.toContain("9.99");
});

test("arguments win over the environment, garbage falls through", () => {
  expect(threshold(["--warn", "5"], "--warn", "7", 9)).toBe(5);
  expect(threshold(["--warn=6"], "--warn", "7", 9)).toBe(6);
  expect(threshold(["--warn", "x"], "--warn", "7", 9)).toBe(7);
  expect(threshold([], "--warn", "0", 9)).toBe(9);
});
