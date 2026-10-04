import { constants } from "node:fs";
import { access, lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { type FileMap, MODE_EXEC, MODE_FILE } from "../core/types.ts";

export function exists(path: string): Promise<boolean> {
  return access(path, constants.F_OK).then(
    () => true,
    () => false,
  );
}

// Read dir recursively, refuse symlinks, keep exec bit
export async function readTree(dir: string): Promise<FileMap> {
  const out: FileMap = new Map();
  await walk(dir, dir, out);
  return out;
}

async function walk(root: string, dir: string, out: FileMap): Promise<void> {
  for (const name of (await readdir(dir)).toSorted()) {
    const full = join(dir, name);
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) throw new Error(`symlink refused: ${full}`);
    if (stat.isDirectory()) await walk(root, full, out);
    else {
      const rel = relative(root, full).split(sep).join("/");
      const mode = stat.mode & 0o111 ? MODE_EXEC : MODE_FILE;
      out.set(rel, { bytes: await readFile(full), mode });
    }
  }
}

export async function writeTree(dir: string, files: FileMap): Promise<void> {
  for (const [rel, entry] of files) {
    const full = join(dir, ...rel.split("/"));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, entry.bytes, { mode: entry.mode });
  }
}

export async function rmDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
