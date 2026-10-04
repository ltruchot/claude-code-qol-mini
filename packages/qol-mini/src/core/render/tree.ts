import { isText } from "../hash/text.ts";
import { declaredNames, MANIFEST_FILE, type Manifest } from "../schema/manifest.ts";
import type { Answers, FileMap } from "../types.ts";
import { renderText } from "./text.ts";

// Template files → rendered files, manifest dropped, binaries untouched
export function renderTree(template: FileMap, manifest: Manifest, answers: Answers): FileMap {
  const declared = declaredNames(manifest);
  const out: FileMap = new Map();
  for (const [rel, entry] of template) {
    if (rel === MANIFEST_FILE) continue;
    if (!isText(entry.bytes)) {
      out.set(rel, entry);
      continue;
    }
    const text = renderText(entry.bytes.toString("utf8"), answers, declared);
    out.set(rel, { bytes: Buffer.from(text, "utf8"), mode: entry.mode });
  }
  return out;
}
