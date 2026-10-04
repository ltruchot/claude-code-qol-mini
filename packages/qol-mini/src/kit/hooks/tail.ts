import { closeSync, fstatSync, openSync, readSync } from "node:fs";

// The last 400 lines or so, read backwards in 64k steps
export function tail(path: string): string {
  const fd = openSync(path, "r");
  try {
    let end = fstatSync(fd).size;
    let data = Buffer.alloc(0);
    while (end > 0 && data.filter((byte) => byte === 10).length <= 400) {
      const step = Math.min(65_536, end);
      end -= step;
      const chunk = Buffer.alloc(step);
      readSync(fd, chunk, 0, step, end);
      data = Buffer.concat([chunk, data]);
    }
    return data.toString("utf8");
  } finally {
    closeSync(fd);
  }
}
