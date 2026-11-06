// Every species paints itself from a growth value t in (0, 1], where t reaches 1 at HARVESTABLE.
// Coordinates: (0, 0) is the soil line, negative y is up. Available area: x -95..95, y -240..8.
import { at, circle, darken, ellipse, f, leaf, lighten, line, mix, path, polar, stem } from './svg.mjs';

const STAGE_T = { SPROUT: 0.12, SEEDLING: 0.3, GROWING: 0.58, MATURE: 0.82, HARVESTABLE: 1 };
export const stageT = (stage) => STAGE_T[stage];

// --- reusable forms --------------------------------------------------------

function bush(t, r, { color, height = 120, leafLen = 44, leafW = 26, shape = 'ovate', count = 12, spread = 50 }) {
  const H = height * t;
  let s = stem([[0, 0], [r.range(-4, 4), -H * 0.5], [r.range(-3, 3), -H]], 2 + t * 3, darken(color, 0.15));
  const n = Math.round(2 + count * t);
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const v = (i + 1) / n;
    const y = -H * (0.12 + v * 0.88);
    const side = i % 2 === 0 ? -1 : 1;
    const sizeF = (0.65 + 0.35 * Math.sin(v * Math.PI)) * (0.55 + 0.45 * t);
    const x = side * r.range(0, spread * t * 0.3);
    const a = side < 0 ? 180 + r.range(5, 48) : -r.range(5, 48);
    leaves.push(leaf(x, y, leafLen * sizeF, leafW * sizeF, a, mix(color, side < 0 ? lighten(color, 0.35) : darken(color, 0.2), r.range(0.1, 0.65)), { shape }));
  }
  s += leaves.join('');
  // Crown leaves pointing up.
  for (let i = 0; i < 3; i++) {
    s += leaf(r.range(-2, 2), -H, leafLen * 0.55 * (0.5 + t * 0.5), leafW * 0.55, -90 + (i - 1) * 32, lighten(color, 0.18), { shape });
  }
  return s;
}

function rosette(t, r, { color, count = 12, len = 80, width = 22, shape = 'blade', arch = 0.5, tipColor = null, thick = false }) {
  let s = '';
  const n = Math.round(4 + count * t);
  const items = [];
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1 || 1);
    const a = -170 + v * 160 + r.range(-5, 5);
    const nearVertical = 1 - Math.abs(a + 90) / 90;
    items.push({ a, order: nearVertical, size: 0.68 + 0.32 * (1 - nearVertical * arch) + r.range(-0.06, 0.06) });
  }
  items.sort((a, b) => b.order - a.order);
  for (const it of items) {
    const c = mix(color, it.order > 0.5 ? darken(color, 0.15) : lighten(color, 0.14), r.range(0.2, 0.8));
    const L = len * it.size * (0.45 + 0.55 * t);
    s += leaf(0, -1, L, width * (0.5 + 0.5 * t), it.a, c, { shape, vein: !thick });
    if (tipColor) {
      const [tx, ty] = polar(0, -1, L, it.a);
      s += circle(tx, ty, 2 + t * 1.5, tipColor);
    }
  }
  return s;
}

const petals = (cx, cy, count, len, width, color, startDeg = 0, shape = 'ovate') => {
  let s = '';
  for (let i = 0; i < count; i++) s += leaf(cx, cy, len, width, startDeg + (i * 360) / count, color, { shape, vein: false, shade: 0.12 });
  return s;
};

const daisy = (x, y, size, petal, eye) =>
  petals(x, y, 12, size, size * 0.42, petal) + circle(x, y, size * 0.34, darken(eye, 0.12)) + circle(x - size * 0.06, y - size * 0.07, size * 0.22, eye);

function pompom(x, y, size, color) {
  let s = circle(x, y, size, darken(color, 0.22));
  for (let ring = 0; ring < 3; ring++) {
    const rr = size * (1 - ring * 0.3);
    const c = ring === 2 ? lighten(color, 0.4) : ring === 1 ? lighten(color, 0.15) : color;
    for (let i = 0; i < 10; i++) {
      const [px, py] = polar(x, y, rr * 0.72, i * 36 + ring * 12);
      s += circle(px, py, size * 0.27, c);
    }
  }
  return s;
}

const bud = (x, y, size, color, sepal = '#4f8a3a') =>
  ellipse(x, y - size * 0.6, size * 0.55, size, color) + path(`M${f(x - size * 0.6)} ${f(y - size * 0.1)} Q${f(x)} ${f(y + size * 0.6)} ${f(x + size * 0.6)} ${f(y - size * 0.1)} Q${f(x)} ${f(y - size * 0.6)} ${f(x - size * 0.6)} ${f(y - size * 0.1)}Z`, sepal);

// --- species ---------------------------------------------------------------

export const SPECIES = {
  basil: { seed: '#6b4a2b', paint: (t, r) => {
    let s = bush(t, r, { color: '#5c9a3a', height: 118, leafLen: 50, leafW: 34, shape: 'round', count: 13 });
    if (t >= 1) for (let i = 0; i < 2; i++) { const x = (i ? 14 : -16); const y = -118 - i * 9; s += stem([[x * 0.4, y + 22], [x, y]], 2, '#6d9a43'); for (let k = 0; k < 4; k++) s += circle(x + (k % 2 ? 3 : -3), y + k * 5, 2.4, '#f3ecd6'); }
    return s;
  } },
  mint: { seed: '#3c2c1c', paint: (t, r) => {
    let s = '';
    for (const off of [-30, 26, 0]) s += at(off * t, 0, bush(t * (off === 0 ? 1 : 0.8), r, { color: off === 0 ? '#3f9c6c' : '#4aa87a', height: 118, leafLen: 34, leafW: 19, shape: 'narrow', count: 11, spread: 26 }));
    return s;
  } },
  radish: { seed: '#8e5a3a', paint: (t, r) => {
    let s = '';
    if (t > 0.5) {
      const R = 26 * (t - 0.4);
      s += ellipse(0, -R * 0.5, R, R * 0.95, '#c8355a') + ellipse(-R * 0.3, -R * 0.75, R * 0.35, R * 0.28, '#f08fa6', 'opacity="0.8"');
    }
    return s + at(0, t > 0.5 ? -18 * (t - 0.4) : 0, rosette(t, r, { color: '#5d9c3f', count: 8, len: 92, width: 30, shape: 'ovate', arch: 0.2 }));
  } },
  marigold: { seed: '#2a241c', paint: (t, r) => {
    let s = bush(t, r, { color: '#3f7f38', height: 112, leafLen: 34, leafW: 13, shape: 'narrow', count: 16, spread: 60 });
    if (t >= 0.82 && t < 1) { s += stem([[0, -60], [-22, -112]], 2, '#4a7f3a') + bud(-22, -112, 10, '#e7942a'); s += bud(0, -116, 11, '#ee9f2d'); s += stem([[0, -60], [24, -102]], 2, '#4a7f3a') + bud(24, -102, 9, '#e7942a'); }
    if (t >= 1) { s += stem([[0, -60], [-28, -120]], 2.4, '#4a7f3a') + stem([[0, -60], [28, -108]], 2.4, '#4a7f3a'); s += pompom(0, -130, 25, '#f09a24') + pompom(-38, -118, 20, '#e8761e') + pompom(36, -104, 19, '#f4b52e'); }
    return s;
  } },
  lettuce: { seed: '#e2d4b1', paint: (t, r) => {
    let s = '';
    const rings = Math.round(2 + t * 3);
    for (let k = 0; k < rings; k++) {
      const v = k / (rings - 1 || 1);
      const c = mix('#7fb24a', '#c9e27f', v);
      s += at(0, -6 * t * k, rosette(t, r, { color: c, count: 7, len: (86 - v * 40), width: 46 - v * 16, shape: 'round', arch: 0.1 }));
    }
    return s;
  } },
  chamomile: { seed: '#a68b5b', paint: (t, r) => {
    let s = '';
    const flowers = t >= 0.82 ? [[-34, -122], [-8, -146], [24, -130], [46, -98], [-50, -92]] : [];
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 13 * t;
      const y = -(82 + r.range(0, 42)) * t;
      s += stem([[x * 0.2, 0], [x * 0.7, y * 0.5], [x, y]], 1.6, '#6e9a48');
      for (let k = 0; k < 4; k++) s += leaf(x * 0.5, y * (0.25 + k * 0.17), 22 * t + 6, 6, k % 2 ? -25 : -155, '#7ba851', { shape: 'narrow', vein: false });
    }
    flowers.forEach(([x, y], i) => {
      s += stem([[x * 0.3, -40], [x, y]], 1.6, '#6e9a48');
      s += t >= 1 ? daisy(x, y, 15, '#fbf6e6', '#f0bd33') : (i % 2 ? circle(x, y, 7, '#e8cf4f') : bud(x, y, 6, '#efe8c8', '#6e9a48'));
    });
    return s;
  } },
  lavender: { seed: '#3a3026', paint: (t, r) => {
    let s = rosette(t, r, { color: '#7fa08a', count: 15, len: 62, width: 8, shape: 'narrow', arch: 0 });
    if (t >= 0.58) {
      const spikes = t >= 1 ? 7 : t >= 0.82 ? 5 : 3;
      for (let i = 0; i < spikes; i++) {
        const a = -90 + (i - (spikes - 1) / 2) * 11;
        const L = (118 + r.range(-14, 24)) * t;
        const [x, y] = polar(0, 0, L, a);
        s += line(`M0 -6 Q${f(x * 0.2)} ${f(y * 0.6)} ${f(x)} ${f(y)}`, '#6f8f76', 1.8);
        const col = t >= 0.82 ? (t >= 1 ? '#8b62c9' : '#a58bc8') : '#90a58d';
        for (let k = 0; k < 9; k++) {
          const v = k / 8;
          const px = x + (x / L) * v * 36;
          const py = y + (y / L) * v * 36;
          s += ellipse(px - 3, py, 4.6 - v * 2, 3.8, mix(col, '#5d3fa0', r.range(0, 0.4))) + ellipse(px + 3, py, 4.6 - v * 2, 3.8, mix(col, '#c7aef0', r.range(0, 0.5)));
        }
      }
    }
    return s;
  } },
  tomato: { seed: '#c2a877', paint: (t, r) => {
    let s = line(`M6 0 L6 ${f(-175 * Math.min(1, t * 1.2))}`, '#a98657', 4);
    s += bush(t, r, { color: '#4d8a3d', height: 165, leafLen: 44, leafW: 21, shape: 'ovate', count: 15, spread: 40 });
    if (t >= 0.58) {
      const trusses = [[-32, -72], [30, -102], [-26, -130], [28, -48]];
      trusses.slice(0, t >= 0.82 ? 4 : 2).forEach(([x, y]) => {
        for (let k = 0; k < 5; k++) {
          const ripe = t >= 1;
          const c = ripe ? mix('#d73e28', '#ee6a2c', r.range(0, 0.5)) : t >= 0.82 ? mix('#a8c24a', '#e39a32', r.range(0, 0.7)) : '#9fc15a';
          const px = x + (k % 2 ? 8 : -8) + r.range(-2, 2);
          const py = y + k * 8;
          s += circle(px, py, 8.5, c) + circle(px - 2.6, py - 2.8, 2.4, '#fff3d8', 'opacity="0.65"') + circle(px, py - 7.5, 1.6, '#3f7a35');
        }
      });
    }
    return s;
  } },
  strawberry: { seed: '#d9b35a', paint: (t, r) => {
    let s = '';
    const n = Math.round(3 + t * 7);
    for (let i = 0; i < n; i++) {
      const a = -160 + (i * 140) / (n - 1 || 1);
      const L = 62 * t + 16 + r.range(-6, 6);
      const [x, y] = polar(0, 0, L, a);
      s += line(`M0 0 Q${f(x * 0.3)} ${f(y * 0.8)} ${f(x)} ${f(y)}`, '#6d9440', 1.8);
      for (const off of [-38, 0, 38]) s += leaf(x, y, 28 * t + 8, 21 * t + 6, a + off, mix('#4f9140', '#79b24f', r()), { shape: 'round' });
    }
    if (t >= 0.82) {
      const spots = [[-58, -8], [-34, 6], [38, 4], [62, -12], [4, 10]];
      spots.forEach(([x, y], i) => {
        s += line(`M0 -24 Q${x * 0.7} -34 ${x} ${y - 16}`, '#6d9440', 1.4);
        if (t < 1 && i % 2) { s += petals(x, y - 8, 5, 8, 7, '#fff8e8') + circle(x, y - 8, 3, '#e7c43c'); return; }
        const c = t >= 1 ? '#d8283c' : '#f3c9a0';
        s += path(`M${x - 11} ${y - 13} Q${x} ${y - 19} ${x + 11} ${y - 13} Q${x + 9} ${y + 6} ${x} ${y + 13} Q${x - 9} ${y + 6} ${x - 11} ${y - 13}Z`, c);
        s += leaf(x, y - 14, 9, 5, -160, '#4f9140', { vein: false }) + leaf(x, y - 14, 9, 5, -20, '#4f9140', { vein: false });
        for (let k = 0; k < 6; k++) s += circle(x + r.range(-7, 7), y + r.range(-9, 7), 0.9, '#fbe39a');
      });
    }
    return s;
  } },
  tulip: { seed: '#8f6a3a', paint: (t, r) => {
    let s = '';
    const n = t >= 0.58 ? 3 : 1;
    const xs = n === 3 ? [-24, 0, 26] : [0];
    s += rosette(t, r, { color: '#4f9d78', count: 4, len: 118, width: 25, shape: 'blade', arch: 0 });
    xs.forEach((x, i) => {
      const y = -(i === 1 ? 165 : 138) * t;
      s += stem([[x * 0.3, 0], [x, y]], 3.2, '#5c9a62');
      if (t >= 1) {
        for (const [a, c] of [[-125, '#d9283a'], [-55, '#e0403a'], [-90, '#f06a3a'], [-108, '#f9c343'], [-72, '#eb4f35']]) s += leaf(x, y + 5, 44, 29, a, c, { shape: 'ovate', vein: false, shade: 0.1 });
      } else if (t >= 0.82) s += bud(x, y + 2, 18, '#9fbd6a', '#5c9a62');
    });
    return s;
  } },
  fern: { seed: '#6c5536', paint: (t, r) => {
    let s = '';
    const n = Math.round(4 + t * 12);
    const fronds = [];
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1 || 1);
      fronds.push({ a: -170 + v * 160, o: Math.abs(v - 0.5) });
    }
    fronds.sort((a, b) => a.o - b.o);
    for (const { a, o } of fronds) {
      const L = (118 - o * 22) * t + 12;
      const col = mix('#3f8c3f', '#74b24b', r());
      const [ex, ey] = polar(0, -6, L, a);
      const droop = Math.abs(a + 90) / 90;
      const endX = ex;
      const endY = ey + L * 0.34 * droop;
      const cx = polar(0, -6, L * 0.55, a)[0];
      const cy = polar(0, -6, L * 0.55, a)[1] - 8;
      s += line(`M0 -6 Q${f(cx)} ${f(cy)} ${f(endX)} ${f(endY)}`, darken(col, 0.2), 1.8);
      const leaflets = Math.round(L / 6.5);
      for (let k = 1; k < leaflets; k++) {
        const u = k / leaflets;
        const px = 2 * (1 - u) * u * cx + u * u * endX;
        const py = -6 * (1 - u) * (1 - u) + 2 * (1 - u) * u * cy + u * u * endY;
        const tan = (Math.atan2(2 * (1 - u) * (cy + 6) + 2 * u * (endY - cy), 2 * (1 - u) * cx + 2 * u * (endX - cx)) * 180) / Math.PI;
        const size = 17 * (1 - u * 0.75) * (0.6 + 0.4 * t);
        s += leaf(px, py, size, 5, tan - 62, col, { shape: 'narrow', vein: false }) + leaf(px, py, size, 5, tan + 62, darken(col, 0.1), { shape: 'narrow', vein: false });
      }
    }
    return s;
  } },
  aloe: { seed: '#54442d', paint: (t, r) => {
    let s = rosette(t, r, { color: '#6ca67a', count: 12, len: 128, width: 29, shape: 'blade', arch: 0.05, thick: true });
    for (let i = 0; i < 26 * t; i++) {
      const a = -160 + r() * 140;
      const [x, y] = polar(0, -2, r.range(28, 92) * t, a);
      s += ellipse(x, y, 2.6, 1.3, '#d9efd1', `opacity="0.7" transform="rotate(${f(a)} ${f(x)} ${f(y)})"`);
    }
    if (t >= 1) {
      s += stem([[4, -20], [8, -190]], 3.5, '#7c9d59');
      for (let k = 0; k < 11; k++) s += ellipse(8 + (k % 2 ? 6 : -6), -192 + k * 6, 2.8, 7, mix('#f4a23a', '#ec6e2d', k / 11));
    }
    return s;
  } },
  echeveria: { seed: '#7d6f5a', paint: (t, r) => {
    let s = '';
    const size = 28 + t * 46;
    for (let ring = 0; ring < 5; ring++) {
      const rr = size * (1 - ring * 0.17);
      const count = 11 - ring;
      for (let i = 0; i < count; i++) {
        const a = (i * 360) / count + ring * 17;
        const py = Math.sin((a * Math.PI) / 180);
        const c = mix('#7fb7a5', '#a6d6c4', ring / 5 + r.range(0, 0.12));
        s += at(0, -26 * t, leaf(0, 0, rr, 26 - ring * 2.4, a, c, { shape: 'round', vein: false, shade: 0.1 }), `scale(1 ${f(0.62 + py * 0.02)})`);
        const [tx, ty] = polar(0, 0, rr, a);
        s += circle(tx, ty * 0.62 - 26 * t, 2.2, '#d9587a', 'opacity="0.85"');
      }
    }
    if (t >= 1) {
      s += stem([[0, -36], [38, -128]], 2.6, '#c3647a');
      for (let k = 0; k < 7; k++) s += ellipse(38 + k * 2.8, -128 + k * 2, 3.4, 5, mix('#f28a4e', '#e6556b', k / 6));
    }
    return s;
  } },
  foxglove: { seed: '#4e3c26', paint: (t, r) => {
    let s = rosette(t, r, { color: '#528f4d', count: 8, len: 70, width: 30, shape: 'ovate', arch: 0.25 });
    if (t >= 0.5) {
      const H = 225 * t;
      s += stem([[0, 0], [2, -H]], 4, '#5f8f4f');
      const start = 0.32;
      const bells = 17;
      for (let k = 0; k < bells; k++) {
        const v = k / bells;
        const y = -H * (start + (1 - start) * v);
        const side = k % 2 ? 1 : -1;
        const size = 20 * (1 - v * 0.72);
        if (t < 0.8 || v > (t >= 1 ? 0.82 : 0.48)) { s += ellipse(side * size * 0.5, y, size * 0.35, size * 0.45, '#9bb76a'); continue; }
        const c = mix('#a7458f', '#cf6db3', r());
        const x = side * 3;
        s += at(x, y, path(`M0 -5 C${side * size * 0.5} -9 ${side * size} -7 ${side * size * 1.15} 3 C${side * size} 10 ${side * size * 0.4} 9 0 5Z`, c) + ellipse(side * size * 1.02, 3, 3, size * 0.32, '#f3d9e9') + circle(side * size * 1, 2, 1.1, '#6e2a5f') + circle(side * size * 1.05, 6, 0.9, '#6e2a5f'));
      }
    }
    return s;
  } },
  monstera: { seed: '#44351f', paint: (t, r) => {
    let s = '';
    const n = Math.round(2 + t * 5);
    const spots = [[-48, -86, -135], [46, -96, -48], [-4, -152, -92], [-74, -46, -168], [76, -48, -14], [30, -40, -36], [-26, -62, -152]];
    for (let i = 0; i < Math.min(n, spots.length); i++) {
      const [x0, y0, a] = spots[i];
      const x = x0 * (0.5 + t * 0.5);
      const y = y0 * (0.5 + t * 0.5);
      const size = (38 + 44 * t) * (i === 2 ? 1.08 : 1);
      const col = i % 2 ? '#2f7f4a' : '#3b9356';
      s += stem([[0, 0], [x * 0.35, y * 0.8], [x, y]], 3.2, '#5b9a50');
      let leafBody = leaf(0, 0, size, size * 0.86, 0, col, { shape: 'heart', vein: true });
      if (t >= 0.45) {
        // Fenestration: notches cut with the leaf-behind colour.
        for (const u of [0.28, 0.46, 0.64]) {
          for (const side of [-1, 1]) {
            const px = size * u;
            const wid = size * 0.43 * Math.sin((u + 0.08) * Math.PI);
            leafBody += path(`M${f(px)} ${f(side * wid * 0.32)} L${f(px + size * 0.17)} ${f(side * wid * 1.15)} L${f(px + size * 0.05)} ${f(side * wid * 1.15)}Z`, '#1d4f35');
          }
        }
      }
      s += at(x, y, leafBody, `rotate(${a})`);
    }
    return s;
  } },
  pineapple: { seed: '#6a5228', paint: (t, r) => {
    let s = rosette(t, r, { color: '#4e8f5a', count: 13, len: 104, width: 15, shape: 'narrow', arch: 0.1 });
    if (t >= 0.58) {
      const scale = t >= 1 ? 1 : t >= 0.82 ? 0.72 : 0.38;
      const base = t >= 1 ? '#e7a52c' : t >= 0.82 ? '#c6b13c' : '#8fae48';
      const h = 74 * scale;
      const w = 30 * scale;
      const cy = -30 - h * 0.5;
      s += ellipse(0, cy, w, h / 2, base);
      for (let y = -h / 2 + 5; y < h / 2; y += 9 * scale + 2) {
        for (let x = -w; x <= w; x += 11 * scale + 2) {
          if ((x * x) / (w * w) + (y * y) / ((h / 2) * (h / 2)) < 0.9) s += path(`M${f(x)} ${f(cy + y - 4)} L${f(x + 4)} ${f(cy + y)} L${f(x)} ${f(cy + y + 4)} L${f(x - 4)} ${f(cy + y)}Z`, darken(base, 0.18), 'opacity="0.55"');
        }
      }
      s += ellipse(-w * 0.36, cy - h * 0.15, w * 0.22, h * 0.24, '#fff0b0', 'opacity="0.4"');
      for (let i = 0; i < 9; i++) s += leaf(0, cy - h / 2 + 3, 40 * scale, 8, -90 + (i - 4) * 19, '#4f9a5e', { shape: 'narrow', vein: false });
    }
    return s;
  } },
  paradise: { seed: '#2f2413', paint: (t, r) => {
    let s = '';
    const blades = [[-34, 0.86], [34, 0.9], [-16, 1], [14, 1.02], [-54, 0.72], [52, 0.7]];
    const n = Math.round(2 + t * 4);
    blades.slice(0, n).forEach(([ang, k]) => {
      const a = -90 + ang;
      const H = 148 * t * k + 24;
      const [x, y] = polar(0, 0, H * 0.52, a);
      s += line(`M0 0 L${f(x)} ${f(y)}`, '#5d8f58', 3.5);
      s += leaf(x, y, H * 0.72, 40 * (0.5 + t * 0.5), a, mix('#3b7f5f', '#5a9e6e', r()), { shape: 'blade' });
    });
    const flower = (x, y, scale) => {
      let b = path(`M-36 5 C-12 -6 18 -7 42 -5 C20 4 -10 12 -36 5Z`, '#517a8c');
      if (scale >= 1) {
        for (const [a, c, L] of [[-130, '#f39a21', 54], [-104, '#f3b221', 66], [-78, '#f18a1d', 58], [-54, '#f6c02c', 52]]) b += leaf(-8, -3, L, 13, a, c, { shape: 'narrow', vein: false });
        b += leaf(-4, -3, 42, 8, -68, '#2d5fbb', { shape: 'narrow', vein: false }) + leaf(-2, -3, 34, 7, -36, '#2d4faa', { shape: 'narrow', vein: false });
      } else b += leaf(-8, -3, 28, 12, -35, '#d9a13a', { shape: 'narrow', vein: false });
      return at(x, y, b, `scale(${scale === 1 ? 1 : 0.86})`);
    };
    if (t >= 0.82) { s += stem([[0, 0], [14, -118]], 4, '#5d8f58'); s += flower(14, -130, t >= 1 ? 1 : 0.5); }
    if (t >= 1) { s += stem([[0, 0], [-32, -88]], 3.4, '#5d8f58'); s += at(-34, -96, flower(0, 0, 1), 'scale(-0.8 0.8)'); }
    return s;
  } },
  moth_orchid: { seed: '#a18c5d', paint: (t, r) => {
    let s = '';
    for (const [a, c] of [[-162, '#3f8c5d'], [-18, '#4b9a66'], [-140, '#4b9a66'], [-40, '#3f8c5d']]) s += leaf(0, -3, 64 * Math.min(1, t + 0.25), 26, a, c, { shape: 'blade' });
    if (t >= 0.5) {
      const P = [[0, 0], [6, -74 * t], [18, -150 * t], [58, -192 * t], [86, -176 * t]];
      s += stem(P, 2.4, '#7c8a4f');
      const blooms = t >= 1 ? [[24, -152], [46, -180], [70, -184], [90, -164], [4, -118]] : t >= 0.82 ? [[24, -148], [52, -165]] : [];
      for (const [x, y] of blooms) {
        const by = y * (t >= 1 ? 1 : 1);
        if (t >= 1) {
          const col = '#f3cfe2';
          let m = petals(0, 0, 3, 19, 19, mix(col, '#fff7fa', 0.5), -90);
          m += leaf(0, 0, 25, 25, -30, col, { shape: 'round', vein: false, shade: 0.08 }) + leaf(0, 0, 25, 25, -150, col, { shape: 'round', vein: false, shade: 0.08 });
          m += circle(0, 2, 5.5, '#c23f75') + circle(0, -1, 2.6, '#f7d44a');
          s += at(x, by, m);
        } else s += ellipse(x, by + 2, 7, 9, '#c9d49a');
      }
    }
    return s;
  } },
  flytrap: { seed: '#27211a', paint: (t, r) => {
    let s = '';
    const n = Math.round(3 + t * 6);
    for (let i = 0; i < n; i++) {
      const a = -168 + (i * 156) / (n - 1 || 1);
      const L = (40 + 40 * t) * (i % 2 ? 0.82 : 1);
      const [x, y] = polar(0, -2, L, a);
      s += leaf(0, -2, L + 2, 15, a, mix('#5f9a3c', '#7cb546', r()), { shape: 'blade', vein: false });
      const big = 15 + t * 13;
      const open = t >= 0.82 ? 30 : 12;
      const inner = t >= 0.58 ? '#cf3c3a' : '#a9c25a';
      let trap = '';
      for (const side of [-1, 1]) {
        const dir = a + side * open;
        trap += leaf(0, 0, big, big * 0.72, dir, '#7cb546', { shape: 'round', vein: false, shade: 0.05 });
        trap += leaf(1, 0, big * 0.86, big * 0.5, dir, inner, { shape: 'round', vein: false, shade: 0.05 });
        for (let k = 1; k <= 6; k++) {
          const u = 0.3 + (k / 6) * 0.65;
          const [cx, cy] = polar(0, 0, big * u, dir);
          const [ex, ey] = polar(cx, cy, big * 0.42 * Math.sin(u * Math.PI * 0.9 + 0.2) + 3, dir + side * 90);
          trap += line(`M${f(cx)} ${f(cy)} L${f(ex)} ${f(ey)}`, '#a8cf62', 1);
        }
      }
      s += at(x, y, trap);
    }
    return s;
  } },
  moonflower: { seed: '#f0e9d6', paint: (t, r) => {
    let s = '';
    if (t > 0.3) s += `<path d="M0 0 C-58 -40 -58 -140 0 -176 C58 -140 58 -40 0 0" fill="none" stroke="#9a8560" stroke-width="3"/>`;
    const H = 176 * t;
    let d = 'M0 0';
    const pts = [];
    for (let v = 0.05; v <= 1.001; v += 0.05) {
      const y = -H * v;
      const x = Math.sin(v * 15) * 42 * Math.min(1, v * 2.6) * Math.sin(v * Math.PI * 0.95 + 0.25);
      d += ` L${f(x)} ${f(y)}`;
      pts.push([x, y, v]);
    }
    s += line(d, '#4f8a56', 2.6);
    pts.forEach(([x, y], i) => {
      if (i % 2) s += leaf(x, y, 34 * Math.min(1, t + 0.25), 28, i % 4 === 1 ? -20 : -160, mix('#3e8256', '#5ca36c', r()), { shape: 'heart' });
    });
    const trumpet = (x, y, sc) => {
      let b = `<circle r="34" fill="#d9e8ff" opacity="0.22"/>` + `<circle r="23" fill="#eef5ff" opacity="0.32"/>`;
      b += petals(0, 0, 5, 22, 28, '#f6f8ff', -90, 'round') + circle(0, 0, 8, '#dfe7c8') + circle(0, 0, 3.4, '#e8d36a');
      return at(x, y, b, `scale(${sc})`);
    };
    if (t >= 1) s += trumpet(-32, -136, 1.05) + trumpet(36, -96, 0.95) + trumpet(4, -180, 1) + trumpet(-30, -60, 0.8);
    else if (t >= 0.82) s += at(-30, -130, bud(0, 0, 12, '#e9eddc', '#5ca36c')) + at(32, -90, bud(0, 0, 11, '#e9eddc', '#5ca36c'));
    return s;
  } },
  ghost_orchid: { seed: '#cfd2b8', paint: (t, r) => {
    let s = '';
    // A pale root-cage on bark: the plant has no leaves at all.
    s += path('M-14 4 L-11 -96 C-10 -112 12 -112 13 -96 L15 4Z', '#6f5a43') + line('M-6 -6 L-5 -92 M6 -4 L4 -88', '#4f3e2c', 1.4, 'opacity="0.7"');
    const roots = Math.round(5 + t * 11);
    for (let i = 0; i < roots; i++) {
      const y = -90 * r() - 4;
      const side = i % 2 ? 1 : -1;
      const L = (30 + 54 * t) * r.range(0.55, 1);
      s += line(`M${side * 6} ${f(y)} C${f(side * L * 0.4)} ${f(y - 14)} ${f(side * L * 0.8)} ${f(y + 10)} ${f(side * L)} ${f(y + r.range(-8, 24))}`, mix('#c7d6b3', '#8fae8b', r()), 2.2);
    }
    if (t >= 0.5) {
      s += stem([[2, -92], [14, -118 - 50 * t]], 1.6, '#c7d6b3');
      if (t >= 0.82) {
        const x = 14; const y = -118 - 50 * t;
        const open = t >= 1 ? 1 : 0.55;
        let m = `<circle r="${f(42 * open)}" fill="#f4fff4" opacity="0.2"/>`;
        m += leaf(0, 0, 40 * open, 11, -150, '#f7fbef', { shape: 'narrow', vein: false, shade: 0.06 }) + leaf(0, 0, 40 * open, 11, -30, '#f7fbef', { shape: 'narrow', vein: false, shade: 0.06 }) + leaf(0, 0, 36 * open, 11, -90, '#f2f7e5', { shape: 'narrow', vein: false, shade: 0.06 });
        m += path(`M-12 2 C-14 16 -5 22 0 22 C5 22 14 16 12 2Z`, '#fbfdf4');
        if (t >= 1) m += line('M-6 18 C-12 40 -30 44 -34 76', '#f3f8e8', 3.2) + line('M6 18 C14 42 30 42 36 74', '#f3f8e8', 3.2);
        m += circle(0, 2, 3, '#d3e39a');
        s += at(x, y, m);
      }
    }
    return s;
  } },
};
