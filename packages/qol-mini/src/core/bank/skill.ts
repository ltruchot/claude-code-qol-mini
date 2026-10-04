import { hashTree } from "../hash/tree.ts";
import { type Frontmatter, parseFrontmatter } from "../schema/frontmatter.ts";
import { emptyManifest, MANIFEST_FILE, type Manifest, parseManifest } from "../schema/manifest.ts";
import type { FileMap } from "../types.ts";

export const SKILL_FILE = "SKILL.md";

export type Skill = {
  name: string;
  dir: string;
  manifest: Manifest;
  files: FileMap;
  frontmatter: Frontmatter;
  templateHash: string;
};

// Build a Skill from an already-read file map
export function skillFromFiles(name: string, dir: string, files: FileMap): Skill {
  const skillMd = files.get(SKILL_FILE);
  if (skillMd === undefined) throw new Error(`${name}: missing ${SKILL_FILE}`);
  const manifestFile = files.get(MANIFEST_FILE);
  const manifest =
    manifestFile === undefined
      ? emptyManifest()
      : parseManifest(manifestFile.bytes.toString("utf8"));
  return {
    name,
    dir,
    manifest,
    files,
    frontmatter: parseFrontmatter(skillMd.bytes.toString("utf8")),
    templateHash: hashTree(files).tree,
  };
}

export function description(skill: Skill): string {
  const value = skill.frontmatter.data["description"];
  return typeof value === "string" ? value : "";
}
