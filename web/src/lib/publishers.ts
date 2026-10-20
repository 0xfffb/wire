export type Market = "us" | "hk";
export type Copy = { zh: string; en: string };

export function avatarHue(handle: string) {
  let n = 0;
  for (const ch of handle) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
  return n % 360;
}

export function formatSubscribers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
