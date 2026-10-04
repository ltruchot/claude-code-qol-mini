// Python-compatible rounding: a tie goes to the even neighbor
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff !== 0.5) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

const tenths = (value: number): string => (roundHalfEven(value * 10) / 10).toFixed(1);

// 1_000_000 -> '1M', 214_500 -> '214k', 700 -> '0.7k'. Without the unit for
// the left side of a fraction: '0k/200k' reads as the word "Ok".
export function human(tokens: number, unit = true): string {
  let out: string;
  if (tokens >= 1_000_000) {
    const value = tokens / 1_000_000;
    out = Number.isInteger(value) ? `${value}M` : `${tenths(value)}M`;
  } else if (tokens === 0) out = "0k";
  else if (tokens < 1000) out = `${tenths(tokens / 1000)}k`;
  else out = `${roundHalfEven(tokens / 1000)}k`;
  return unit ? out : out.slice(0, -1);
}

const positive = (raw: string | undefined): number | undefined =>
  raw !== undefined && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : undefined;

// Command-line value, else environment, else the default. Arguments win:
// settings.json reloads hot, its `env` block only at startup.
export function threshold(
  argv: string[],
  flag: string,
  env: string | undefined,
  fallback: number,
): number {
  let found: number | undefined;
  for (const [index, arg] of argv.entries()) {
    const raw = arg === flag ? argv[index + 1] : arg.split(`${flag}=`)[1];
    if (arg === flag || arg.startsWith(`${flag}=`)) found = positive(raw) ?? found;
  }
  return found ?? positive(env) ?? fallback;
}
