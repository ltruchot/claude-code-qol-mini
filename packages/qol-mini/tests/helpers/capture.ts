// Capture stdout and stderr writes while fn runs, scoped env
export async function capture<T>(
  env: Record<string, string>,
  fn: () => Promise<T>,
): Promise<{ value: T; out: string }> {
  const chunks: string[] = [];
  const grab = (chunk: string | Uint8Array): boolean => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  };
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  process.stdout.write = grab;
  process.stderr.write = grab;
  const previous = new Map(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    return { value: await fn(), out: chunks.join("") };
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
    for (const [k, v] of previous)
      if (v === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = v;
  }
}
