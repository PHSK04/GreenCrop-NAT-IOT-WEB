export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function seededNumber(
  base: number,
  seed: number,
  index: number,
  step: number,
  min: number,
  max: number,
  precision = 2,
) {
  const drift = ((seed + index * 11) % 9) - 4;
  const raw = base + drift * step;
  const clamped = clamp(raw, min, max);
  const pow = Math.pow(10, precision);
  return Math.round(clamped * pow) / pow;
}

export function seededInt(
  base: number,
  seed: number,
  index: number,
  step: number,
  min: number,
  max: number,
) {
  const drift = ((seed + index * 7) % 9) - 4;
  const raw = base + drift * step;
  return Math.round(clamp(raw, min, max));
}

export function rotateBy<T>(items: T[], seed: number) {
  if (!items.length) return items;
  const offset = Math.abs(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
