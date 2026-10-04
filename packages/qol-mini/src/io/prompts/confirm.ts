import { cancel, confirm, isCancel } from "@clack/prompts";
import { CANCELLED, KitError } from "../../core/errors.ts";

export function cancelled(): never {
  cancel("aborted");
  throw new KitError("aborted", CANCELLED);
}

// Skip prompt with --yes, abort on cancel
export async function confirmOrYes(message: string, yes: boolean): Promise<boolean> {
  if (yes) return true;
  const value = await confirm({ message });
  if (isCancel(value)) cancelled();
  return value;
}
