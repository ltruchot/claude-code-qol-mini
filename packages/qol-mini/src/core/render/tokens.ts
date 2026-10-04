export const TOKEN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

// All {{NAME}} tokens present in text
export function scanTokens(text: string): Set<string> {
  const names = new Set<string>();
  for (const match of text.matchAll(TOKEN)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return names;
}
