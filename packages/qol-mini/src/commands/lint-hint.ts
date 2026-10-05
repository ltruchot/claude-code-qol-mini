import { managedNames } from "../core/lock/managed.ts";
import { lintTools } from "../io/lint-configs.ts";
import { info, note } from "../io/ui.ts";
import type { Ctx } from "./context.ts";

export const LINT_DOC =
  "https://github.com/ltruchot/claude-code-qol-mini#linters-and-managed-skills";
const TITLE = "Keep formatters and linters off managed skills";

// A skill rewritten by a formatter reads as modified, and its next update conflicts
export async function lintHint(ctx: Ctx, names: string[]): Promise<void> {
  if (ctx.p.global || ctx.json || ctx.dryRun || names.length === 0) return;
  const tools = await lintTools(ctx.p.root);
  const found = tools.map(({ tool, file, where }) =>
    file === where ? `  ${tool}: ${file}` : `  ${tool}: ${file}, ${where}`,
  );
  note(
    [
      "A rewritten skill reads as modified on disk, and its next update conflicts.",
      "Ignore, in every formatter and linter of this project:",
      ...names.map((name) => `  .claude/skills/${name}/`),
      ...(found.length > 0 ? ["Configured here:", ...found] : []),
    ],
    TITLE,
  );
  info(`Prompt for an agent: ${LINT_DOC}`);
}

// Skills that entered the lock during this run
export function addedSince(ctx: Ctx, before: string[]): string[] {
  return managedNames(ctx.lock).filter((name) => !before.includes(name));
}
