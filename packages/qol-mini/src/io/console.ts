// A prompt that blocks a script or CI is a bug: ask only on a real console
export function stdinIsConsole(): boolean {
  return process.stdin.isTTY;
}
