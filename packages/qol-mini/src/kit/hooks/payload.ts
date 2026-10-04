import { readFileSync } from "node:fs";

export type Payload = Record<string, unknown>;

const isRecord = (value: unknown): value is Payload =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// The event JSON on stdin, or null when it cannot be read
export function readPayloadOrNull(): Payload | null {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function readPayload(): Payload {
  return readPayloadOrNull() ?? {};
}

export function text(data: Payload, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

export function record(data: Payload, key: string): Payload {
  const value = data[key];
  return isRecord(value) ? value : {};
}

// Stdout that is not strict JSON is injected into the conversation on
// UserPromptSubmit: print JSON or nothing
export function emit(body: Payload): void {
  process.stdout.write(JSON.stringify(body));
}
