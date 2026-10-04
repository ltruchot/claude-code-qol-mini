// Deep sort object keys for deterministic JSON
export function sortDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v: unknown) => sortDeep(v)) as T;
  if (value === null || typeof value !== "object") return value;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src).toSorted()) out[key] = sortDeep(src[key]);
  return out as T;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}
