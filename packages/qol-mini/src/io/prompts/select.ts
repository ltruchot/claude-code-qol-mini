import { isCancel, multiselect } from "@clack/prompts";
import { cancelled } from "./confirm.ts";

export async function selectSkills(names: string[], initial: string[] = []): Promise<string[]> {
  const value = await multiselect({
    message: "Pick skills",
    options: names.map((n) => ({ value: n, label: n })),
    initialValues: initial.filter((n) => names.includes(n)),
    required: true,
  });
  if (isCancel(value)) cancelled();
  return value;
}
