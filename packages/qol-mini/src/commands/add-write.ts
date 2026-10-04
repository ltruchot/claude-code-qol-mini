import { splitAnswers } from "../core/answers/split.ts";
import type { Answers, FileMap } from "../core/types.ts";
import { swapDir } from "../io/atomic.ts";
import { snapshot } from "../io/backup.ts";
import { rmDir, writeTree } from "../io/fs.ts";
import { ensureLines } from "../io/gitignore.ts";
import { withSecrets } from "../io/local.ts";
import { LOCAL_FILE } from "../core/schema/local.ts";
import { skillDir } from "../io/paths.ts";
import { putTemplate } from "../io/template-cache.ts";
import { entryFor } from "./add-entry.ts";
import type { Found } from "./banks.ts";
import type { Ctx } from "./context.ts";

// Backup, atomic write, lock entry, secrets, gitignore for secret skills
export async function installFiles(
  ctx: Ctx,
  found: Found,
  rendered: FileMap,
  answers: Answers,
): Promise<void> {
  const { skill } = found;
  await snapshot(ctx.p, skill.name);
  await swapDir(skillDir(ctx.p, skill.name), async (work) => {
    await rmDir(work);
    await writeTree(work, rendered);
  });
  await putTemplate(skill.templateHash, skill.files);
  ctx.lock.skills[skill.name] = entryFor(found, rendered, answers);
  const secret = splitAnswers(skill.manifest, answers).secret;
  ctx.local = withSecrets(ctx.local, skill.name, secret);
  if (Object.keys(secret).length > 0)
    await ensureLines(ctx.p.claudeGitignore, [LOCAL_FILE, `skills/${skill.name}/`]);
}
