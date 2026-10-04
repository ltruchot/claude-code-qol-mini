import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { parses, patched, reverted } from "../../src/kit/vscode-patch.ts";
import { candidates } from "../../src/kit/vscode-paths.ts";

const JSONC = '// mine\n{\n  "editor.fontSize": 14, // big\n}\n';
const PAIR = '"terminal.integrated.tabs.title": "${sequence}"';

test("the key is inserted textually, comments and trailing commas survive", () => {
  const out = patched(JSONC) ?? "";
  expect(out).toBe(`// mine\n{\n  ${PAIR},\n  "editor.fontSize": 14, // big\n}\n`);
  expect(parses(out)).toBe(true);
  expect(reverted(out)).toBe(JSONC);
  expect(patched("")).toBe(`{\n  ${PAIR}\n}\n`);
  expect(patched("nothing here")).toBeNull();
  expect(patched('{ "terminal.integrated.tabs.title": "x" }')).toBe(`{ ${PAIR} }`);
});

test("every flavor, the remote servers, the platform's own root", () => {
  const linux = candidates({ platform: "linux", home: "/h", env: {} }, []);
  expect(linux).toContain(join("/h", ".config", "Cursor", "User", "settings.json"));
  expect(linux).toContain(join("/h", ".cursor-server", "data", "Machine", "settings.json"));
  expect(linux).toHaveLength(7);
  const mac = candidates({ platform: "darwin", home: "/h", env: {} }, []);
  expect(mac[0]).toBe(
    join("/h", "Library", "Application Support", "Code", "User", "settings.json"),
  );
  expect(candidates({ platform: "win32", home: "/h", env: { APPDATA: "/a" } }, ["/w"])).toContain(
    "/w",
  );
});
