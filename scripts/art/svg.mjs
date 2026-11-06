// Small drawing vocabulary shared by every painter. Output is plain SVG strings.

export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  return next;
}

export function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const n = (v) => (Math.round(v * 10) / 10).toString();
export const f = n;

function toRgb(hex) {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
const toHex = (r) =>
  '#' + r.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

export function mix(a, b, t) {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
export const darken = (c, t = 0.25) => mix(c, '#1d2a1c', t);
export const lighten = (c, t = 0.25) => mix(c, '#fff4cf', t);

export function doc(w, h, body, { scale = 2.2, freq = 0.04, defs = '', paint = true } = {}) {
  const filter = paint
    ? `<filter id="paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    : '';
  const group = paint ? `<g filter="url(#paint)">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${filter}${defs}</defs>${group}</svg>\n`;
}

export const g = (attrs, body) => `<g ${attrs}>${body}</g>`;
export const at = (x, y, body, extra = '') => `<g transform="translate(${n(x)} ${n(y)})${extra ? ' ' + extra : ''}">${body}</g>`;
export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const line = (d, stroke, width, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export const circle = (x, y, r, fill, extra = '') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" ${extra}/>`;
export const ellipse = (x, y, rx, ry, fill, extra = '') =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
export const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" ${extra}/>`;

export function polar(x, y, len, deg) {
  const r = (deg * Math.PI) / 180;
  return [x + Math.cos(r) * len, y + Math.sin(r) * len];
}

/**
 * A painted leaf: base shape, a shadowed half, a lit edge, a midrib.
 * angle: degrees, -90 is straight up. Light comes from the upper left.
 */
export function leaf(x, y, len, width, angle, color, opts = {}) {
  const { shape = 'ovate', vein = true, shade = 0.32, tip = 1 } = opts;
  const dark = darken(color, 0.34);
  const pale = lighten(color, 0.34);
  const w = width / 2;
  const bellies = { ovate: [0.32, 0.72], narrow: [0.4, 0.8], round: [0.25, 0.68], blade: [0.2, 0.92], heart: [0.12, 0.62] };
  const [b1, b2] = bellies[shape] ?? bellies.ovate;
  const L = len * tip;
  const top = `M0 0 C${n(L * b1)} ${n(-w * 1.25)} ${n(L * b2)} ${n(-w * 1.05)} ${n(L)} 0`;
  const bot = `C${n(L * b2)} ${n(w * 1.05)} ${n(L * b1)} ${n(w * 1.25)} 0 0Z`;
  const under = `M0 0 C${n(L * b1)} ${n(w * 0.12)} ${n(L * b2)} ${n(w * 0.1)} ${n(L)} 0 ${bot}`;
  let body = path(`${top} ${bot}`, color) + path(under, dark, `opacity="${shade + 0.28}"`);
  body += line(`M${n(L * 0.12)} ${n(-w * 0.55)} C${n(L * 0.4)} ${n(-w * 0.95)} ${n(L * 0.7)} ${n(-w * 0.72)} ${n(L * 0.88)} ${n(-w * 0.18)}`, pale, Math.max(0.8, width * 0.05), 'opacity="0.55"');
  if (vein) {
    body += line(`M0 0 L${n(L * 0.94)} 0`, pale, Math.max(0.7, width * 0.035), 'opacity="0.7"');
    if (width > 16) {
      for (const t of [0.28, 0.46, 0.64]) {
        const px = L * t;
        const sp = w * 0.58 * (1 - Math.abs(t - 0.45));
        body += line(`M${n(px)} 0 L${n(px + L * 0.12)} ${n(-sp)} M${n(px)} 0 L${n(px + L * 0.12)} ${n(sp)}`, dark, 0.7, 'opacity="0.35"');
      }
    }
  }
  return at(x, y, body, `rotate(${n(angle)})`);
}

export const shadowEllipse = (x, y, rx, ry, opacity = 0.18) => ellipse(x, y, rx, ry, '#2a2118', `opacity="${opacity}"`);

/** A smooth tapered stem through points, drawn as two strokes for a lit side. */
export function stem(points, width, color) {
  let d = `M${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const my = (py + y) / 2;
    d += ` C${n(px)} ${n(my)} ${n(x)} ${n(my)} ${n(x)} ${n(y)}`;
  }
  return line(d, darken(color, 0.15), width) + line(d, lighten(color, 0.22), Math.max(0.6, width * 0.35), 'opacity="0.6" transform="translate(-0.4 0)"');
}

export function grad(id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`)
    .join('')}</linearGradient>`;
}
export function radial(id, stops) {
  return `<radialGradient id="${id}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`)
    .join('')}</radialGradient>`;
}
