import { confirm, isCancel, password, select, text } from "@clack/prompts";
import { validateAnswer } from "../../core/answers/validate.ts";
import type { Placeholder } from "../../core/schema/placeholder.ts";
import { cancelled } from "./confirm.ts";

type Validate = (v: string | undefined) => string | undefined;

const validate =
  (decl: Placeholder): Validate =>
  (v) =>
    validateAnswer(decl, v ?? "") ?? undefined;

// One prompt per placeholder, typed by declaration
export async function askPlaceholder(decl: Placeholder, current?: string): Promise<string> {
  const message = `${decl.name} — ${decl.prompt}`;
  const initial = current ?? decl.default;
  const seed = initial === undefined ? {} : { initialValue: initial };
  let value: string | boolean | symbol | undefined;
  if (decl.type === "enum") {
    const options = (decl.options ?? []).map((o) => ({ value: o, label: o }));
    value = await select({ message, options, ...seed });
  } else if (decl.type === "boolean") {
    value = await confirm({ message, initialValue: initial === "true" });
  } else if (decl.secret) {
    value = await password({ message, validate: validate(decl) });
  } else {
    value = await text({ message, validate: validate(decl), ...seed, placeholder: initial ?? "" });
  }
  if (value === undefined || isCancel(value)) cancelled();
  return String(value);
}
