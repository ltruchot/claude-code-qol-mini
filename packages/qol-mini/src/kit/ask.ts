import { createInterface, type Interface } from "node:readline/promises";

// Enter, EOF and Ctrl-C take the default
async function line(rl: Interface, prompt: string): Promise<string | null> {
  try {
    return (await rl.question(`  ${prompt} `)).trim().toLowerCase();
  } catch {
    process.stdout.write("\n");
    return null;
  }
}

export async function ask(rl: Interface, question: string, fallback: boolean): Promise<boolean> {
  for (;;) {
    const answer = await line(rl, `${question} ${fallback ? "[Y/n]" : "[y/N]"}`);
    if (answer === null || answer === "") return fallback;
    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
  }
}

export async function askNumber(
  rl: Interface,
  question: string,
  fallback: number,
): Promise<number> {
  for (;;) {
    const answer = (await line(rl, `${question} [${fallback}]`))?.replaceAll("_", "");
    if (answer === undefined || answer === "") return fallback;
    if (/^\d+$/.test(answer) && Number(answer) > 0) return Number(answer);
    process.stdout.write(`    a positive number of tokens, or Enter for ${fallback}\n`);
  }
}

export function openConsole(): Interface {
  return createInterface({ input: process.stdin, output: process.stdout });
}
