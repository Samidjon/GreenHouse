import type { Environment } from '@/types/game';

type Rgb = [number, number, number];

interface SkyKey {
  hour: number;
  top: Rgb;
  bottom: Rgb;
}

// Keyframes over the game day. Interpolated, so dawn and dusk blend smoothly.
const KEYS: SkyKey[] = [
  { hour: 0, top: [14, 22, 52], bottom: [34, 46, 86] },
  { hour: 4.5, top: [18, 26, 60], bottom: [46, 52, 96] },
  { hour: 6, top: [84, 110, 160], bottom: [244, 178, 138] },
  { hour: 8, top: [122, 178, 216], bottom: [236, 226, 196] },
  { hour: 13, top: [108, 176, 224], bottom: [216, 236, 232] },
  { hour: 18, top: [112, 150, 200], bottom: [246, 214, 164] },
  { hour: 20, top: [72, 72, 132], bottom: [238, 142, 110] },
  { hour: 21.5, top: [26, 32, 72], bottom: [66, 62, 110] },
  { hour: 24, top: [14, 22, 52], bottom: [34, 46, 86] },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c: Rgb) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

const OVERCAST: Rgb = [156, 166, 172];
const RAIN: Rgb = [116, 128, 138];

export function skyColors(env: Environment): { top: string; bottom: string } {
  const hours = env.dayProgress * 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1]!.hour <= hours) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = (hours - a.hour) / (b.hour - a.hour);
  let top = mix(a.top, b.top, t);
  let bottom = mix(a.bottom, b.bottom, t);
  if (env.weather === 'cloudy' || env.weather === 'rain') {
    const grey = env.weather === 'rain' ? RAIN : OVERCAST;
    const amount = (env.weather === 'rain' ? 0.72 : 0.5) * Math.max(0.15, env.sun);
    top = mix(top, grey, amount);
    bottom = mix(bottom, grey, amount);
  }
  return { top: css(top), bottom: css(bottom) };
}

/** How dark the interior should be: 0 at noon, about 0.62 at midnight. */
export function interiorDarkness(env: Environment): number {
  const weather = env.weather === 'rain' ? 0.12 : env.weather === 'cloudy' ? 0.07 : 0;
  return Math.min(0.66, (1 - Math.min(1, env.sun * 1.7)) * 0.6 + weather);
}

/** Warm tint strength in the low-sun hours. */
export function goldenHour(env: Environment): number {
  if (env.sun <= 0) return 0;
  return Math.max(0, 1 - env.sun * 2.2) * 0.22;
}
