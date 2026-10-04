export const KEY = "terminal.integrated.tabs.title";
export const VALUE = "${sequence}";

const ESCAPED = KEY.replaceAll(".", String.raw`\.`);
const PAIR = new RegExp(String.raw`"${ESCAPED}"\s*:\s*"(?:[^"\\]|\\.)*"`);
const LINE = new RegExp(String.raw`^[ \t]*${PAIR.source}\s*,?[ \t]*\r?\n`, "m");

// Best-effort JSONC -> JSON, for validation only, never for writing
export function stripJsonc(text: string): string {
  return text
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/(^|\s)\/\/[^\n]*/g, "$1")
    .replaceAll(/,(\s*[}\]])/g, "$1");
}

export function parses(text: string): boolean {
  try {
    JSON.parse(stripJsonc(text));
    return true;
  } catch {
    return false;
  }
}

export const present = (text: string): boolean => text.includes(`"${KEY}"`);

// An editor settings.json is JSONC: the key is inserted textually and the
// rest of the file stays byte for byte. Null when there is no object to patch.
export function patched(original: string): string | null {
  const pair = `"${KEY}": "${VALUE}"`;
  if (original.trim() === "") return `{\n  ${pair}\n}\n`;
  if (present(original)) return original.replace(PAIR, () => pair);
  const brace = original.indexOf("{");
  if (brace === -1) return null;
  return `${original.slice(0, brace + 1)}\n  ${pair},${original.slice(brace + 1)}`;
}

export function reverted(original: string): string {
  return original.replace(LINE, "");
}
