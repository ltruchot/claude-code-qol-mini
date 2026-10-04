import { expect, test } from "vite-plus/test";
import { hookOutput, markers } from "../../src/kit/hooks/marker.ts";
import { parseState, resolveState } from "../../src/kit/hooks/tab-rules.ts";
import { endsOnQuestion } from "../../src/kit/hooks/turn.ts";
import { GREEN, RED, YELLOW } from "../helpers/kit.ts";

test("terminalSequence is a root field holding one OSC 0 title", () => {
  const body = hookOutput("blocked", "/tmp/demo/");
  expect(Object.keys(body)).toStrictEqual(["terminalSequence"]);
  expect(body.terminalSequence).toBe(`\u001B]0;${RED} demo\u0007`);
  expect(hookOutput("working", "/tmp/de\u0007mo\u001B").terminalSequence).toContain(" demo\u0007");
  expect(new Set(Object.values(markers({}))).size).toBe(3);
  expect(markers({ CC_TAB_IDLE: "[zz]", CC_TAB_WORKING: "" })).toMatchObject({
    idle: "[zz]",
    working: "",
    blocked: RED,
  });
  expect([markers({}).working, markers({}).idle]).toStrictEqual([GREEN, YELLOW]);
});

test("background work stays green, a question turns red", () => {
  expect(parseState("nope")).toBe("idle");
  expect(resolveState("idle", { background_tasks: [], session_crons: [] })).toBe("idle");
  expect(resolveState("idle", { background_tasks: [{ type: "shell" }] })).toBe("working");
  expect(resolveState("idle", { session_crons: [{ id: 1 }] })).toBe("working");
  expect(resolveState("idle", { last_assistant_message: "Yes or no?" })).toBe("blocked");
  expect(resolveState("idle", { last_assistant_message: "Done, pushed." })).toBe("idle");
  const both = { last_assistant_message: "Ok?", background_tasks: [{ type: "subagent" }] };
  expect(resolveState("idle", both)).toBe("working");
});

test("only the main thread paints green, red from a subagent stays", () => {
  expect(resolveState("working", { agent_id: "a1" })).toBeNull();
  expect(resolveState("working", { agent_type: "Explore" })).toBeNull();
  expect(resolveState("blocked", { agent_id: "a1" })).toBe("blocked");
  expect(resolveState("working", {})).toBe("working");
});

test("only the last non-empty line counts, dressing stripped", () => {
  const ends = (text: string): boolean => endsOnQuestion({ last_assistant_message: text });
  expect(ends("Why?\n\nBecause.")).toBe(false);
  expect(ends("Fine.\n**Shall I push?**\n\n")).toBe(true);
  expect(ends("Use `a ? b : c`.")).toBe(false);
  expect(ends("(really?)\r\n")).toBe(true);
  expect(ends("")).toBe(false);
});
