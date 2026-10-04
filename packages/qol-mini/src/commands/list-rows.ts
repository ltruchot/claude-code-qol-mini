import { managedNames, unmanagedDirs } from "../core/lock/managed.ts";
import { listDirs } from "../io/dirs.ts";
import type { Bank } from "./banks.ts";
import type { Ctx } from "./context.ts";
import { bankRows, type Row } from "./list-bank-rows.ts";

export type { Row } from "./list-bank-rows.ts";

// Shipped skills, orphans, hand-written dirs
export async function listRows(ctx: Ctx, bank: Bank): Promise<Row[]> {
  const rows = await bankRows(ctx, bank);
  const seen = new Set(rows.map((r) => r.name));
  for (const name of managedNames(ctx.lock).filter((n) => !seen.has(n))) {
    rows.push({ name, status: "orphan, no longer shipped", description: "" });
  }
  for (const name of unmanagedDirs(ctx.lock, await listDirs(ctx.p.skills))) {
    if (!seen.has(name)) rows.push({ name, status: "unmanaged, hand-written", description: "" });
  }
  return rows;
}
