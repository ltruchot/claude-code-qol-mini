import type { Answers } from "../types.ts";
import { TOKEN } from "./tokens.ts";

// Replace declared tokens only, leave others verbatim
export function renderText(text: string, answers: Answers, declared: Set<string>): string {
  return text.replace(TOKEN, (whole: string, name: string) => {
    if (!declared.has(name)) return whole;
    return answers[name] ?? whole;
  });
}
