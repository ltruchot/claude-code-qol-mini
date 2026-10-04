import type { Placeholder } from "../schema/placeholder.ts";

export const MAX_VALUE = 1024;

// Bank-authored regex on a bounded input, no catastrophic backtracking on long values
function matchPattern(decl: Placeholder, value: string): string | null {
  if (decl.pattern === undefined) return null;
  if (value.length > MAX_VALUE) return `over ${MAX_VALUE} chars`;
  return new RegExp(decl.pattern).test(value) ? null : `must match ${decl.pattern}`;
}

// Null = valid, string = error message
export function validateAnswer(decl: Placeholder, value: string): string | null {
  if (value.length === 0) return "value required";
  if (value.includes("${CLAUDE_")) return "reserved Claude Code syntax";
  switch (decl.type) {
    case "url":
      return URL.canParse(value) ? null : "invalid url";
    case "boolean":
      return value === "true" || value === "false" ? null : "true or false";
    case "enum":
      return decl.options?.includes(value) === true ? null : `one of ${decl.options?.join(", ")}`;
    case "path":
      return value.includes("\0") ? "invalid path" : matchPattern(decl, value);
    case "string":
      return matchPattern(decl, value);
    default:
      return null;
  }
}
