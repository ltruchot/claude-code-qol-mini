const SNIFF = 8000;
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

// Text = no NUL byte in first 8000 bytes
export function isText(bytes: Buffer): boolean {
  const head = bytes.subarray(0, SNIFF);
  return !head.includes(0);
}

// Strip BOM, CRLF and CR → LF
export function normalizeLf(bytes: Buffer): Buffer {
  const noBom = bytes.subarray(0, 3).equals(BOM) ? bytes.subarray(3) : bytes;
  const text = noBom.toString("utf8").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return Buffer.from(text, "utf8");
}

export function canonical(bytes: Buffer): Buffer {
  return isText(bytes) ? normalizeLf(bytes) : bytes;
}
