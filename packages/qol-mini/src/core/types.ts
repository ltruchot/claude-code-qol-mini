// Shared domain types

export type FileEntry = { bytes: Buffer; mode: number };

// Relative POSIX path → file
export type FileMap = Map<string, FileEntry>;

export type Answers = Record<string, string>;

export type Level = "error" | "warn";

export type Finding = { rule: string; level: Level; file?: string; msg: string };

export const MODE_EXEC = 0o755;
export const MODE_FILE = 0o644;
