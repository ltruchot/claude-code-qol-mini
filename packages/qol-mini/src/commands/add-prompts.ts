import { applyDefaults, missingPlaceholders } from "../core/answers/missing.ts";
import { validateAnswer } from "../core/answers/validate.ts";
import type { Manifest } from "../core/schema/manifest.ts";
import type { Answers } from "../core/types.ts";
import { askPlaceholder } from "../io/prompts/placeholder.ts";
import { fail } from "../io/ui.ts";
import { builtinAnswers } from "./builtins.ts";

export const ENV_PREFIX = "QOL_MINI_ANSWER_";

// Builtin → lock → env → default → prompt, one placeholder at a time
export async function collectAnswers(
  manifest: Manifest,
  known: Answers,
  yes: boolean,
  env: Record<string, string | undefined> = process.env,
): Promise<Answers> {
  const answers: Answers = { ...known, ...builtinAnswers(manifest) };
  for (const decl of missingPlaceholders(manifest, answers)) {
    const fromEnv = env[`${ENV_PREFIX}${decl.name}`];
    if (fromEnv === undefined) continue;
    const error = validateAnswer(decl, fromEnv);
    if (error !== null) fail(`${decl.name}: ${error}`);
    answers[decl.name] = fromEnv;
  }
  const filled = applyDefaults(manifest, answers);
  for (const decl of missingPlaceholders(manifest, filled)) {
    if (yes) fail(`missing answer for ${decl.name}, set ${ENV_PREFIX}${decl.name}`);
    filled[decl.name] = await askPlaceholder(decl);
  }
  return filled;
}
