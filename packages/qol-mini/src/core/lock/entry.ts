import { secretNames, splitAnswers } from "../answers/split.ts";
import { hashTree } from "../hash/tree.ts";
import type { LockEntry } from "../schema/lock.ts";
import type { Manifest } from "../schema/manifest.ts";
import type { Answers, FileMap } from "../types.ts";

export type EntryInput = {
  source: string;
  sourceType: "github" | "local";
  ref: string;
  sha: string;
  skillPath: string;
  path: string;
  template: FileMap;
  rendered: FileMap;
  manifest: Manifest;
  answers: Answers;
};

// Lock entry from an install or update result
export function buildEntry(input: EntryInput): LockEntry {
  const rendered = hashTree(input.rendered);
  return {
    source: input.source,
    sourceType: input.sourceType,
    ref: input.ref,
    sha: input.sha,
    skillPath: input.skillPath,
    path: input.path,
    templateHash: hashTree(input.template).tree,
    renderedHash: rendered.tree,
    files: rendered.files,
    answers: splitAnswers(input.manifest, input.answers).public,
    secrets: secretNames(input.manifest),
  };
}
