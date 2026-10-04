import { parse } from "yaml";

export type Frontmatter = { data: Record<string, unknown>; body: string };

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Split SKILL.md into YAML frontmatter and markdown body
export function parseFrontmatter(md: string): Frontmatter {
  const match = FENCE.exec(md);
  if (!match) return { data: {}, body: md };
  const raw: unknown = parse(match[1] ?? "");
  const data = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { data, body: md.slice(match[0].length) };
}
