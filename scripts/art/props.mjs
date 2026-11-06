// Pots, equipment, decorations, inventory items and UI icons.
import { at, circle, darken, doc, ellipse, f, grad, leaf, lighten, line, mix, path, radial, rect, rng, seedOf, shadowEllipse } from './svg.mjs';

// --- pots: 120 x 96, base centred at (60, 92), soil line at y = 92 - 62 = 30 ----------

const POT_OUTLINE = 'stroke="#24170d" stroke-width="3.5" stroke-linejoin="round"';

function potShape(color, { rim = true, chip = false, band = null, gauge = false, flare = 7 } = {}) {
  const dark = darken(color, 0.35);
  const pale = lighten(color, 0.3);
  const bx = 34;
  const tx = 44;
  let s = shadowEllipse(60, 92, 42, 5, 0.22);
  s += path(`M${60 - tx} 34 L${60 - bx} 88 Q60 96 ${60 + bx} 88 L${60 + tx} 34Z`, color, POT_OUTLINE);
  s += path(`M${60 + 12} 34 L${60 + tx} 34 L${60 + bx} 88 Q${60 + 22} 93 ${60 + 8} 93Z`, dark, 'opacity="0.42"');
  s += path(`M${60 - tx + 5} 38 L${60 - bx + 3} 82 L${60 - bx + 11} 84 L${60 - tx + 15} 38Z`, pale, 'opacity="0.35"');
  if (band) s += path(`M${60 - tx + 3} 56 L${60 + tx - 3} 56 L${60 + tx - 6} 66 L${60 - tx + 6} 66Z`, band);
  if (gauge) s += rect(66, 48, 9, 26, '#e6f2f6', 'rx="4"') + rect(68, 58, 5, 14, '#5fb4d6', 'rx="2"');
  if (rim) {
    s += path(`M${60 - tx - flare} 26 L${60 + tx + flare} 26 L${60 + tx + 3} 42 L${60 - tx - 3} 42Z`, lighten(color, 0.08), POT_OUTLINE);
    s += path(`M${60 + 14} 26 L${60 + tx + flare} 26 L${60 + tx + 3} 42 L${60 + 12} 42Z`, dark, 'opacity="0.36"');
    s += path(`M${60 - tx - 3} 42 L${60 + tx + 3} 42 L${60 + tx + 1} 45 L${60 - tx - 1} 45Z`, dark, 'opacity="0.5"');
  }
  s += ellipse(60, 27, tx + flare - 2, 6, '#3f2a1c') + ellipse(60, 28, tx + flare - 7, 4.2, '#54392a');
  if (chip) {
    s += path(`M${60 + tx + 4} 26 L${60 + tx - 8} 25 L${60 + tx - 5} 34 L${60 + tx + 1} 37Z`, '#54392a');
    s += line(`M${60 - 18} 45 L${60 - 12} 58 L${60 - 20} 70 L${60 - 14} 82`, darken(color, 0.55), 1.3, 'opacity="0.7"');
  }
  return s;
}

function brassUrn() {
  const c = '#e0b02c';
  let s = shadowEllipse(60, 92, 40, 5, 0.25);
  s += path('M42 92 L78 92 L72 80 L48 80Z', darken(c, 0.2));
  s += path('M20 30 C14 56 34 80 48 80 L72 80 C86 80 106 56 100 30Z', c, POT_OUTLINE);
  s += path('M66 30 L100 30 C106 56 86 80 72 80 L62 80Z', darken(c, 0.34), 'opacity="0.42"');
  s += path('M30 34 C26 52 36 68 46 74 C40 60 38 46 40 34Z', '#fff0b4', 'opacity="0.45"');
  s += path('M12 26 L108 26 L102 38 L18 38Z', lighten(c, 0.12), POT_OUTLINE) + path('M18 38 L102 38 L100 41 L20 41Z', darken(c, 0.4), 'opacity="0.6"');
  s += line('M22 54 Q60 66 98 54', darken(c, 0.4), 1.4, 'opacity="0.55"');
  s += ellipse(60, 27, 46, 6, '#3f2a1c') + ellipse(60, 28, 41, 4.2, '#54392a');
  return s;
}

export const POT_ART = {
  old_clay: () => potShape('#f4c430', { chip: true }),
  terracotta: () => potShape('#2f86d1'),
  glazed: () => potShape('#17b3a3', { band: '#fff4d6' }),
  self_watering: () => potShape('#f7f4ea', { gauge: true, flare: 4 }),
  brass: brassUrn,
};

export const paintPot = (id) => doc(120, 96, POT_ART[id](), { scale: 1.2, freq: 0.05 });

// --- water tank: 110 x 180, base at bottom ---------------------------------------

export function paintTank() {
  const c = '#7f8d80';
  let s = shadowEllipse(55, 174, 50, 6, 0.28);
  s += rect(16, 150, 8, 26, '#54473a') + rect(86, 150, 8, 26, '#54473a');
  s += path('M12 26 L98 26 L98 156 Q55 168 12 156Z', c);
  s += path('M64 26 L98 26 L98 156 Q84 161 64 163Z', darken(c, 0.4), 'opacity="0.42"');
  s += path('M20 34 L34 34 L34 150 L20 148Z', '#f5ecd4', 'opacity="0.18"');
  for (const y of [52, 92, 132]) s += path(`M10 ${y} L100 ${y} L100 ${y + 7} L10 ${y + 7}Z`, '#5b4a38');
  s += ellipse(55, 26, 43, 11, '#6c7a6d') + ellipse(55, 26, 36, 8, '#32474a') + ellipse(50, 25, 22, 4, '#6ba3b4', 'opacity="0.6"');
  // Spigot.
  s += rect(96, 136, 14, 6, '#8a6f3f') + rect(105, 130, 4, 14, '#a88a4f');
  return doc(110, 180, s, { scale: 1.6 });
}

// --- equipment ----------------------------------------------------------------

export const EQUIP_ART = {
  // A rafter-mounted row of warm lamps; the scene tiles this along the roof.
  grow_lamps: { w: 200, h: 90, paint: () => {
    let s = line('M0 8 L200 8', '#4c3d2c', 4);
    for (const x of [40, 160]) {
      s += line(`M${x} 8 L${x} 40`, '#3a3026', 2);
      s += path(`M${x - 22} 62 L${x + 22} 62 L${x + 10} 38 L${x - 10} 38Z`, '#2f5f4d') + path(`M${x + 2} 38 L${x + 10} 38 L${x + 22} 62 L${x + 6} 62Z`, '#1f4438', 'opacity="0.8"');
      s += ellipse(x, 63, 15, 7, '#ffe6a0');
    }
    return s;
  } },
  heater: { w: 110, h: 150, paint: () => {
    const c = '#3c3a38';
    let s = shadowEllipse(55, 146, 44, 5, 0.3);
    for (const x of [24, 86]) s += rect(x - 3, 128, 6, 18, darken(c, 0.2));
    s += rect(20, 48, 70, 84, c, 'rx="8"') + rect(60, 48, 30, 84, '#000', 'opacity="0.25" rx="8"');
    s += rect(30, 66, 50, 40, '#231f1c', 'rx="3"') + rect(35, 72, 40, 28, '#e8762a', 'rx="2"') + ellipse(55, 94, 15, 8, '#f9c94e');
    for (const x of [42, 55, 68]) s += line(`M${x} 66 L${x} 106`, c, 3);
    s += rect(14, 40, 82, 10, '#514e4a', 'rx="3"') + rect(46, 4, 16, 38, '#46433f') + rect(40, 0, 28, 7, '#514e4a', 'rx="2"');
    s += rect(30, 112, 50, 5, '#6d6861', 'rx="2"');
    return s;
  } },
  rain_barrel: { w: 90, h: 120, paint: () => {
    const c = '#8c6239';
    let s = shadowEllipse(45, 116, 38, 5, 0.3);
    s += path('M14 22 C8 56 8 82 14 112 L76 112 C82 82 82 56 76 22Z', c);
    s += path('M52 22 L76 22 C82 56 82 82 76 112 L54 112Z', darken(c, 0.4), 'opacity="0.42"');
    for (const x of [24, 36, 48, 60]) s += line(`M${x} 24 L${x} 110`, darken(c, 0.3), 1, 'opacity="0.5"');
    for (const y of [38, 94]) s += path(`M9 ${y} L81 ${y} L81 ${y + 6} L9 ${y + 6}Z`, '#5f5a52');
    s += ellipse(45, 22, 31, 8, darken(c, 0.2)) + ellipse(45, 22, 25, 6, '#4f7f92');
    return s;
  } },
  hose: { w: 110, h: 90, paint: () => {
    let s = shadowEllipse(55, 84, 44, 5, 0.25);
    for (let i = 0; i < 4; i++) s += `<ellipse cx="55" cy="${60 - i * 7}" rx="${42 - i * 2}" ry="17" fill="none" stroke="${i % 2 ? '#3f8350' : '#4b995e'}" stroke-width="7"/>`;
    s += line('M92 56 C110 60 104 80 88 80', '#3f8350', 6) + rect(78, 76, 14, 9, '#b08d3e', 'rx="2"');
    return s;
  } },
  fan: { w: 160, h: 70, paint: () => {
    let s = rect(76, 0, 8, 28, '#3f3a33');
    s += ellipse(80, 34, 15, 9, '#6f5a3c');
    for (const [a, l] of [[0, 72], [180, 72]]) s += leaf(80, 34, l, 18, a, '#9b7a4d', { shape: 'blade', vein: false });
    return s;
  } },
  mister: { w: 240, h: 40, paint: () => {
    let s = rect(0, 8, 240, 7, '#8c8f88', 'rx="3"') + rect(0, 8, 240, 2.5, '#d6d8d2', 'rx="1"');
    for (const x of [30, 90, 150, 210]) s += rect(x - 3, 15, 6, 8, '#b08d3e') + circle(x, 25, 2.5, '#d8d4c8');
    return s;
  } },
};

export const paintEquipment = (id) => {
  const a = EQUIP_ART[id];
  return doc(a.w, a.h, a.paint(), { scale: 1.2, freq: 0.05 });
};

// --- decorations ---------------------------------------------------------------

const miniPotPlant = (x, y, r, col = '#3f8a4a', pot = '#c47749', size = 1) => {
  let s = '';
  for (let i = 0; i < 9; i++) s += leaf(x, y - 12 * size, r.range(24, 42) * size, 13 * size, -170 + i * 20, mix(col, lighten(col, 0.3), r()), { shape: 'ovate', vein: false });
  s += path(`M${x - 13 * size} ${y - 14 * size} L${x + 13 * size} ${y - 14 * size} L${x + 9 * size} ${y} L${x - 9 * size} ${y}Z`, pot);
  return s;
};

const droopingVine = (x, y, r, len, col) => {
  let s = line(`M${x} ${y} Q${x + r.range(-8, 8)} ${y + len / 2} ${x + r.range(-6, 6)} ${y + len}`, darken(col, 0.3), 1.5);
  for (let v = 0.16; v < 1; v += 0.15) s += leaf(x + r.range(-2, 2), y + len * v, 16, 11, v * 400 % 2 > 1 ? 30 : 150, mix(col, lighten(col, 0.3), r()), { shape: 'heart', vein: false });
  return s;
};

export const DECOR_ART = {
  wicker_basket: (w, h) => {
    const c = '#b88e54';
    let s = shadowEllipse(w / 2, h - 3, w * 0.42, 4, 0.26);
    s += path(`M${w * 0.12} ${h * 0.38} L${w * 0.88} ${h * 0.38} L${w * 0.78} ${h - 4} L${w * 0.22} ${h - 4}Z`, c);
    for (let y = h * 0.44; y < h - 6; y += 6) s += line(`M${w * 0.14} ${y} Q${w / 2} ${y + 3} ${w * 0.86} ${y}`, darken(c, 0.25), 1, 'opacity="0.65"');
    s += ellipse(w / 2, h * 0.38, w * 0.39, 6, '#6a4f2e');
    s += leaf(w * 0.4, h * 0.36, 26, 12, -140, '#5f9a48', { vein: false }) + leaf(w * 0.56, h * 0.36, 30, 12, -60, '#6fae52', { vein: false });
    return s;
  },
  stool: (w, h) => {
    const c = '#a0713f';
    let s = shadowEllipse(w / 2, h - 3, w * 0.42, 4, 0.26);
    s += line(`M${w * 0.28} ${h * 0.3} L${w * 0.14} ${h - 3}`, darken(c, 0.2), 6) + line(`M${w * 0.72} ${h * 0.3} L${w * 0.86} ${h - 3}`, darken(c, 0.32), 6) + line(`M${w / 2} ${h * 0.3} L${w / 2} ${h - 8}`, darken(c, 0.12), 6);
    s += ellipse(w / 2, h * 0.28, w * 0.45, 10, darken(c, 0.25)) + ellipse(w / 2, h * 0.24, w * 0.45, 10, c) + ellipse(w * 0.42, h * 0.22, w * 0.2, 4, lighten(c, 0.35), 'opacity="0.5"');
    return s;
  },
  floor_pot: (w, h, r) => {
    let s = shadowEllipse(w / 2, h - 3, w * 0.42, 5, 0.26);
    for (let i = 0; i < 16; i++) s += leaf(w / 2, h * 0.5, r.range(22, 42), 9, -170 + i * 10.5, mix('#2f7d4f', '#59a665', r()), { shape: 'narrow', vein: false });
    s += path(`M${w * 0.18} ${h * 0.5} L${w * 0.82} ${h * 0.5} L${w * 0.7} ${h - 3} L${w * 0.3} ${h - 3}Z`, '#c5703f') + path(`M${w * 0.54} ${h * 0.5} L${w * 0.82} ${h * 0.5} L${w * 0.7} ${h - 3} L${w * 0.54} ${h - 3}Z`, '#7c3e24', 'opacity="0.45"');
    s += rect(w * 0.13, h * 0.46, w * 0.74, h * 0.09, '#d78252', 'rx="2"');
    return s;
  },
  wall_shelf: (w, h, r) => {
    const c = '#8b6238';
    let s = rect(2, h - 16, w - 4, 9, c, 'rx="2"') + rect(2, h - 9, w - 4, 3, darken(c, 0.4));
    for (const x of [20, w - 24]) s += path(`M${x} ${h - 8} L${x + 4} ${h - 8} L${x + 4} ${h} L${x} ${h - 4}Z`, darken(c, 0.3));
    s += rect(18, h - 42, 18, 26, '#b7d4c6', 'opacity="0.8" rx="3"') + rect(21, h - 48, 12, 6, '#a88c5d') + rect(21, h - 32, 12, 12, '#8d5a2b', 'opacity="0.7"');
    s += rect(44, h - 36, 15, 20, '#e6d7a8', 'opacity="0.9" rx="3"') + rect(47, h - 41, 9, 5, '#8c6b3e');
    s += miniPotPlant(w - 44, h - 16, r, '#3f8f58', '#c47749', 0.85) + droopingVine(w - 36, h - 14, r, 22, '#4c9a5e');
    return s;
  },
  botanical_print: (w, h) => {
    let s = rect(3, 3, w - 6, h - 6, '#6a4a2a', 'rx="2"') + rect(8, 8, w - 16, h - 16, '#f1e7c9');
    s += line(`M${w / 2} ${h - 18} Q${w / 2 + 4} ${h / 2} ${w / 2 - 4} 18`, '#50683f', 1.6);
    for (let i = 0; i < 7; i++) {
      const y = h - 26 - i * 10;
      s += leaf(w / 2, y, 22 - i * 2, 8, -30 - i * 3, '#6d8a56', { vein: false }) + leaf(w / 2, y, 22 - i * 2, 8, -150 + i * 3, '#6d8a56', { vein: false });
    }
    return s;
  },
  lantern: (w, h) => {
    let s = line(`M${w / 2} 0 L${w / 2} ${h * 0.34}`, '#3e362c', 2);
    s += path(`M${w * 0.24} ${h * 0.42} L${w * 0.76} ${h * 0.42} L${w * 0.62} ${h * 0.33} L${w * 0.38} ${h * 0.33}Z`, '#2f3f3a');
    s += rect(w * 0.27, h * 0.42, w * 0.46, h * 0.42, '#fff0b0', 'opacity="0.85"') + ellipse(w / 2, h * 0.64, 9, 13, '#ffbe4d');
    for (const x of [0.27, 0.5, 0.73]) s += line(`M${w * x} ${h * 0.42} L${w * x} ${h * 0.84}`, '#2f3f3a', 2.4);
    s += rect(w * 0.22, h * 0.84, w * 0.56, 7, '#2f3f3a', 'rx="2"');
    return s;
  },
  hanging_ivy: (w, h, r) => {
    let s = line(`M${w * 0.28} ${h * 0.34} L${w / 2} 0 L${w * 0.72} ${h * 0.34}`, '#a2895c', 1.6);
    s += path(`M${w * 0.18} ${h * 0.32} L${w * 0.82} ${h * 0.32} Q${w * 0.76} ${h * 0.56} ${w / 2} ${h * 0.56} Q${w * 0.24} ${h * 0.56} ${w * 0.18} ${h * 0.32}Z`, '#b56c43');
    for (const x of [0.16, 0.3, 0.5, 0.68, 0.86]) s += droopingVine(w * x, h * 0.34, r, h * r.range(0.32, 0.6), '#3f8c52');
    return s;
  },
  side_table: (w, h, r) => {
    const c = '#96683a';
    let s = shadowEllipse(w / 2, h - 3, w * 0.45, 5, 0.26);
    for (const x of [0.14, 0.86]) s += rect(w * x - 4, h * 0.38, 8, h * 0.62 - 3, darken(c, 0.25));
    s += rect(w * 0.1, h * 0.72, w * 0.8, 5, darken(c, 0.3));
    s += rect(0, h * 0.3, w, 11, c, 'rx="2"') + rect(0, h * 0.3 + 8, w, 3, darken(c, 0.4));
    s += miniPotPlant(w * 0.3, h * 0.3, r, '#4b9a5e', '#d9d0b8', 0.7);
    s += rect(w * 0.54, h * 0.3 - 9, 26, 9, '#7f8f5a', 'rx="1"') + rect(w * 0.56, h * 0.3 - 16, 24, 7, '#c96f42', 'rx="1"');
    return s;
  },
  garden_bench: (w, h) => {
    const c = '#9d7346';
    let s = shadowEllipse(w / 2, h - 3, w * 0.46, 5, 0.26);
    for (const x of [0.1, 0.9]) s += rect(w * x - 5, 18, 10, h - 21, darken(c, 0.3));
    for (let i = 0; i < 3; i++) s += rect(w * 0.06, 16 + i * 12, w * 0.88, 8, mix(c, lighten(c, 0.2), i / 3), 'rx="2"');
    s += rect(w * 0.03, h * 0.58, w * 0.94, 10, lighten(c, 0.1), 'rx="2"') + rect(w * 0.03, h * 0.58 + 8, w * 0.94, 4, darken(c, 0.4));
    return s;
  },
  hanging_fern: (w, h, r) => {
    let s = line(`M${w * 0.3} ${h * 0.28} L${w / 2} 0 L${w * 0.7} ${h * 0.28}`, '#6e5a3c', 1.5);
    for (let i = 0; i < 15; i++) {
      const a = -175 + i * 12.5;
      const L = r.range(34, 56);
      for (let k = 0; k < 5; k++) s += leaf(w / 2, h * 0.36, L - k * 3, 8, a + k * (a < -90 ? -7 : 7), mix('#3d8a48', '#73b252', r()), { shape: 'narrow', vein: false });
    }
    s += path(`M${w * 0.24} ${h * 0.34} L${w * 0.76} ${h * 0.34} Q${w * 0.7} ${h * 0.58} ${w / 2} ${h * 0.58} Q${w * 0.3} ${h * 0.58} ${w * 0.24} ${h * 0.34}Z`, '#a8623d');
    return s;
  },
  floor_lamp: (w, h) => {
    let s = shadowEllipse(w / 2, h - 3, w * 0.4, 4, 0.26);
    s += ellipse(w / 2, h - 5, w * 0.35, 5, '#a6843d');
    s += line(`M${w / 2} ${h - 6} L${w / 2} 44`, '#b08d44', 3.4);
    s += path(`M${w * 0.14} 44 L${w * 0.86} 44 L${w * 0.68} 6 L${w * 0.32} 6Z`, '#e7c77d') + path(`M${w * 0.5} 6 L${w * 0.68} 6 L${w * 0.86} 44 L${w * 0.54} 44Z`, '#b78c44', 'opacity="0.45"') + ellipse(w / 2, 44, w * 0.32, 4, '#fff4c4');
    return s;
  },
  wall_clock: (w, h) => {
    const cx = w / 2; const cy = h / 2; const R = Math.min(w, h) / 2 - 3;
    let s = circle(cx, cy, R, '#5b4a35') + circle(cx, cy, R - 6, '#f3ead0');
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      s += line(`M${f(cx + Math.cos(a) * (R - 10))} ${f(cy + Math.sin(a) * (R - 10))} L${f(cx + Math.cos(a) * (R - 15))} ${f(cy + Math.sin(a) * (R - 15))}`, '#3e362c', 2);
    }
    s += line(`M${cx} ${cy} L${cx} ${cy - R * 0.58}`, '#2c261f', 3) + line(`M${cx} ${cy} L${cx + R * 0.42} ${cy + R * 0.18}`, '#2c261f', 3.4) + circle(cx, cy, 3, '#a33');
    return s;
  },
  armchair: (w, h) => {
    const c = '#6f8f6a';
    let s = shadowEllipse(w / 2, h - 3, w * 0.45, 5, 0.26);
    for (const x of [0.16, 0.84]) s += rect(w * x - 4, h - 18, 8, 15, '#4f3a22');
    s += path(`M${w * 0.18} ${h * 0.74} L${w * 0.2} 14 Q${w / 2} 2 ${w * 0.8} 14 L${w * 0.82} ${h * 0.74}Z`, c);
    s += path(`M${w * 0.54} 8 Q${w * 0.68} 8 ${w * 0.8} 14 L${w * 0.82} ${h * 0.74} L${w * 0.54} ${h * 0.74}Z`, darken(c, 0.36), 'opacity="0.35"');
    s += rect(w * 0.1, h * 0.62, w * 0.8, h * 0.24, lighten(c, 0.08), 'rx="10"');
    for (const x of [0, 0.82]) s += rect(w * x, h * 0.42, w * 0.18, h * 0.44, darken(c, 0.12), 'rx="12"');
    s += rect(w * 0.42, h * 0.32, w * 0.2, h * 0.2, '#d9b878', 'rx="6"');
    return s;
  },
  string_lights: (w, h) => {
    let s = '';
    const y = (x) => 8 + Math.sin((x / w) * Math.PI) * (h - 28);
    let d = `M0 ${y(0)}`;
    for (let x = 10; x <= w; x += 10) d += ` L${x} ${f(y(x))}`;
    s += line(d, '#3f362a', 1.8);
    for (let x = 22; x < w; x += 36) s += line(`M${x} ${f(y(x))} L${x} ${f(y(x) + 7)}`, '#3f362a', 2) + ellipse(x, y(x) + 13, 6, 8, '#ffd88a') + ellipse(x - 1, y(x) + 11, 2, 3, '#fff8df');
    return s;
  },
  stone_frog: (w, h) => {
    const c = '#8d9383';
    let s = shadowEllipse(w / 2, h - 3, w * 0.42, 4, 0.26);
    s += ellipse(w / 2, h * 0.64, w * 0.42, h * 0.32, c) + ellipse(w / 2, h * 0.38, w * 0.3, h * 0.26, lighten(c, 0.08));
    for (const x of [0.36, 0.64]) s += circle(w * x, h * 0.2, 8, lighten(c, 0.12)) + circle(w * x, h * 0.2, 3.5, '#2e2a24');
    s += line(`M${w * 0.34} ${h * 0.46} Q${w / 2} ${h * 0.56} ${w * 0.66} ${h * 0.46}`, '#4f5247', 2);
    s += ellipse(w * 0.2, h * 0.86, 14, 6, darken(c, 0.15)) + ellipse(w * 0.8, h * 0.86, 14, 6, darken(c, 0.15));
    s += ellipse(w * 0.28, h * 0.74, 8, 5, '#6f9a4e', 'opacity="0.7"');
    return s;
  },
  urn: (w, h, r) => {
    const c = '#b9b2a0';
    let s = shadowEllipse(w / 2, h - 3, w * 0.42, 5, 0.26);
    for (let i = 0; i < 18; i++) s += leaf(w / 2, h * 0.36, r.range(30, 50), 10, -170 + i * 9.5, mix('#2f7d4f', '#5fa96a', r()), { shape: 'narrow', vein: false });
    s += path(`M${w * 0.36} ${h - 4} L${w * 0.64} ${h - 4} L${w * 0.58} ${h * 0.8} L${w * 0.42} ${h * 0.8}Z`, darken(c, 0.15));
    s += path(`M${w * 0.14} ${h * 0.34} C${w * 0.1} ${h * 0.6} ${w * 0.32} ${h * 0.8} ${w * 0.42} ${h * 0.8} L${w * 0.58} ${h * 0.8} C${w * 0.68} ${h * 0.8} ${w * 0.9} ${h * 0.6} ${w * 0.86} ${h * 0.34}Z`, c);
    s += path(`M${w * 0.56} ${h * 0.34} L${w * 0.86} ${h * 0.34} C${w * 0.9} ${h * 0.6} ${w * 0.68} ${h * 0.8} ${w * 0.58} ${h * 0.8} L${w * 0.54} ${h * 0.8}Z`, darken(c, 0.34), 'opacity="0.38"');
    s += rect(w * 0.08, h * 0.31, w * 0.84, 9, lighten(c, 0.2), 'rx="3"');
    return s;
  },
  bird_cage: (w, h, r) => {
    const c = '#b08d3e';
    const top = h * 0.16;
    const bot = h * 0.88;
    let s = line(`M${w / 2} 0 L${w / 2} ${top}`, '#3f362a', 2);
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * w * 0.84 + w * 0.08;
      const curve = (x - w / 2) * 0.1;
      s += line(`M${w / 2 + curve} ${top} Q${x} ${top + 16} ${x} ${top + 44} L${x} ${bot}`, c, 1.5);
    }
    s += rect(w * 0.04, bot, w * 0.92, 7, c, 'rx="3"') + rect(w * 0.08, h * 0.55, w * 0.84, 2, c);
    s += droopingVine(w * 0.3, top + 22, r, h * 0.58, '#4b9a5e') + droopingVine(w * 0.7, top + 30, r, h * 0.48, '#4b9a5e');
    return s;
  },
  statue: (w, h) => {
    const c = '#e6e1d2';
    const d = '#a7a292';
    let s = shadowEllipse(w / 2, h - 3, w * 0.46, 5, 0.26);
    s += rect(w * 0.14, h - 34, w * 0.72, 31, d, 'rx="2"') + rect(w * 0.08, h - 40, w * 0.84, 9, c, 'rx="2"');
    s += path(`M${w * 0.32} ${h - 40} C${w * 0.28} ${h * 0.65} ${w * 0.38} ${h * 0.5} ${w * 0.42} ${h * 0.34} L${w * 0.58} ${h * 0.34} C${w * 0.62} ${h * 0.5} ${w * 0.72} ${h * 0.65} ${w * 0.68} ${h - 40}Z`, c);
    s += path(`M${w * 0.53} ${h * 0.34} L${w * 0.58} ${h * 0.34} C${w * 0.62} ${h * 0.5} ${w * 0.72} ${h * 0.65} ${w * 0.68} ${h - 40} L${w * 0.54} ${h - 40}Z`, d, 'opacity="0.5"');
    s += circle(w / 2, h * 0.27, w * 0.11, c) + path(`M${w * 0.39} ${h * 0.26} Q${w / 2} ${h * 0.15} ${w * 0.61} ${h * 0.26} Q${w * 0.55} ${h * 0.21} ${w * 0.39} ${h * 0.26}Z`, d);
    s += line(`M${w * 0.42} ${h * 0.37} C${w * 0.3} ${h * 0.4} ${w * 0.26} ${h * 0.28} ${w * 0.32} ${h * 0.16}`, c, 7) + line(`M${w * 0.58} ${h * 0.37} C${w * 0.68} ${h * 0.45} ${w * 0.66} ${h * 0.54} ${w * 0.56} ${h * 0.58}`, d, 6);
    s += ellipse(w * 0.3, h - 8, 14, 5, '#7da25a', 'opacity="0.6"') + line(`M${w * 0.36} ${h - 40} Q${w * 0.3} ${h * 0.7} ${w * 0.4} ${h * 0.6}`, '#7da25a', 2, 'opacity="0.5"');
    return s;
  },
};

export function paintDecoration(id, w, h) {
  const r = rng(seedOf(`deco/${id}`));
  return doc(w, h, DECOR_ART[id](w, h, r), { scale: 1.4, freq: 0.05 });
}

// --- 64 x 64 item and UI icons ----------------------------------------------------

const bag = (c, label) =>
  path('M16 14 L48 14 L54 56 L10 56Z', c) +
  path('M38 14 L48 14 L54 56 L40 56Z', darken(c, 0.35), 'opacity="0.4"') +
  path('M15 8 L49 8 L48 16 L16 16Z', darken(c, 0.2)) +
  label;

const IC = {
  fert_compost: () => bag('#8d6a3f', circle(32, 36, 11, '#4a3323') + leaf(30, 34, 14, 8, -50, '#79b25a', { vein: false })),
  fert_bone_meal: () => bag('#d9c9a2', path('M22 38 L42 30 M20 34 a3 3 0 1 1 3 5 M42 26 a3 3 0 1 1 3 5', 'none', 'stroke="#7c6a4c" stroke-width="4" stroke-linecap="round"')),
  fert_tonic: () => rect(26, 6, 12, 10, '#7c5c3a', 'rx="2"') + path('M26 16 L38 16 L38 22 L48 34 L48 56 Q32 60 16 56 L16 34 L26 22Z', '#93cfa4') + path('M16 38 L48 38 L48 56 Q32 60 16 56Z', '#3f9e70') + path('M22 30 L22 52', 'none', 'stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"'),
  fert_moon_feed: () => bag('#47507c', path('M38 26 A12 12 0 1 0 38 46 A9 9 0 1 1 38 26Z', '#f3e6b4') + circle(44, 30, 1.6, '#f3e6b4') + circle(24, 26, 1.4, '#f3e6b4')),
  tool_watering_can: () => path('M18 26 L44 26 L46 54 L16 54Z', '#6f9aa1') + path('M34 26 L44 26 L46 54 L34 54Z', '#3f6b73', 'opacity="0.5"') + line('M18 42 L4 22', '#6f9aa1', 6) + path('M0 18 L9 16 L8 26Z', '#517d85') + line('M44 32 C60 30 60 50 45 48', '#517d85', 4) + line('M22 26 C24 12 38 12 40 26', '#517d85', 3.5),
  tool_trowel: () => line('M48 8 L34 26', '#8c6239', 7) + path('M36 22 L42 28 L24 56 Q12 56 12 44Z', '#a9b2ad') + path('M36 24 L41 29 L24 54 L22 50Z', '#6c7773', 'opacity="0.6"'),
  upgrade_tank: () => path('M14 12 L50 12 L50 54 Q32 60 14 54Z', '#7f8d80') + path('M12 22 L52 22 L52 27 L12 27Z M12 42 L52 42 L52 47 L12 47Z', '#5b4a38') + ellipse(32, 12, 18, 5, '#4f8ea0') + path('M36 12 L50 12 L50 54 L38 57Z', '#000', 'opacity="0.18"'),
  upgrade_mix: () => path('M10 42 Q32 8 54 42 L54 46 Q32 58 10 46Z', '#4d3525') + ellipse(26, 30, 7, 3, '#6b4b35') + leaf(32, 26, 18, 10, -110, '#74b159', { vein: false }) + leaf(32, 26, 16, 9, -40, '#5f9a48', { vein: false }),
  upgrade_basket: () => path('M8 28 L56 28 L48 56 L16 56Z', '#b88e54') + line('M10 36 L54 36 M12 44 L52 44 M14 51 L50 51', '#7f5e30', 1.6) + line('M14 28 C14 2 50 2 50 28', '#8d6a3a', 4) + circle(24, 26, 6, '#d73e28') + circle(36, 25, 7, '#e8762a') + circle(44, 27, 5, '#d73e28'),
  upgrade_stall: () => rect(10, 26, 5, 30, '#6a4a2a') + rect(49, 26, 5, 30, '#6a4a2a') + rect(8, 42, 48, 14, '#a07a4a') + path('M4 26 L12 8 L52 8 L60 26Z', '#d9593d') + path('M20 8 L12 26 M32 8 L32 26 M44 8 L52 26', 'none', 'stroke="#f7e6c4" stroke-width="5"') + circle(24, 40, 4, '#f09a24') + circle(38, 40, 4, '#7ab84a'),
  upgrade_satchel: () => path('M10 24 L54 24 L50 56 L14 56Z', '#9b6b3c') + path('M10 24 L54 24 L50 40 Q32 46 14 40Z', '#b5824b') + rect(28, 36, 8, 8, '#d9b34a', 'rx="2"') + line('M18 24 C18 6 46 6 46 24', '#7c5430', 4),
  upgrade_lens: () => line('M40 40 L56 58', '#7c5430', 7) + circle(26, 26, 18, '#b08d3e') + circle(26, 26, 13.5, '#bfe3ea') + path('M16 22 Q22 14 32 16', 'none', 'stroke="#fff" stroke-width="3" stroke-linecap="round"'),
};

export const paintItemIcon = (id) => doc(64, 64, IC[id](), { scale: 0.8, freq: 0.07 });
export const ITEM_ICONS = Object.keys(IC);

const UI = {
  coin: () => circle(32, 33, 25, '#a97a1f') + circle(31, 31, 25, '#e7b23a') + circle(31, 31, 18, '#f2c858') + path('M31 18 C22 22 22 36 31 44 C40 36 40 22 31 18Z', '#c7912a') + line('M31 21 L31 42', '#f7dd8c', 1.6) + path('M15 22 Q24 11 38 12', 'none', 'stroke="#fff3c4" stroke-width="3" stroke-linecap="round" opacity="0.8"'),
  gem: () => path('M32 6 L54 24 L32 58 L10 24Z', '#3aa77c') + path('M32 6 L54 24 L32 26Z', '#6fd0a3') + path('M32 6 L10 24 L32 26Z', '#8ee3bb') + path('M10 24 L32 26 L32 58Z', '#2f946c') + path('M54 24 L32 26 L32 58Z', '#21785a') + path('M20 21 L30 12', 'none', 'stroke="#eafff3" stroke-width="2.4" stroke-linecap="round"'),
  xp: () => leaf(14, 50, 46, 34, -45, '#6aa84f'),
  water: () => path('M32 6 C46 26 52 34 52 42 A20 20 0 0 1 12 42 C12 34 18 26 32 6Z', '#5aa9d1') + path('M32 6 C46 26 52 34 52 42 A20 20 0 0 1 38 60 C46 44 42 24 32 6Z', '#3679a1', 'opacity="0.55"') + path('M22 40 Q22 32 27 26', 'none', 'stroke="#e5f6ff" stroke-width="3.6" stroke-linecap="round"'),
  heart: () => path('M32 56 C10 40 6 26 12 17 C19 8 29 12 32 20 C35 12 45 8 52 17 C58 26 54 40 32 56Z', '#d9605a') + path('M18 20 Q14 26 18 32', 'none', 'stroke="#ffdcd2" stroke-width="3.4" stroke-linecap="round"'),
  sun: () => { let s = ''; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; s += line(`M${f(32 + Math.cos(a) * 21)} ${f(32 + Math.sin(a) * 21)} L${f(32 + Math.cos(a) * 28)} ${f(32 + Math.sin(a) * 28)}`, '#eea727', 4.5); } return s + circle(32, 32, 15, '#f7c33e') + circle(28, 28, 6, '#ffe89c'); },
  clear: () => { let s = ''; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; s += line(`M${f(26 + Math.cos(a) * 16)} ${f(26 + Math.sin(a) * 16)} L${f(26 + Math.cos(a) * 21)} ${f(26 + Math.sin(a) * 21)}`, '#eea727', 3.5); } return s + circle(26, 26, 11, '#f7c33e') + ellipse(38, 46, 18, 9, '#f6f2e6') + circle(30, 42, 8, '#f6f2e6') + circle(42, 39, 10, '#ffffff'); },
  moon: () => path('M42 8 A25 25 0 1 0 56 42 A20 20 0 1 1 42 8Z', '#ecd894') + circle(47, 18, 2, '#ecd894') + circle(54, 28, 1.4, '#ecd894'),
  cloudy: () => ellipse(32, 42, 24, 12, '#b9c0c0') + circle(22, 34, 11, '#c6cdcc') + circle(38, 28, 15, '#d8dddb') + ellipse(30, 42, 22, 9, '#d8dddb'),
  rain: () => ellipse(32, 28, 24, 11, '#a4afb2') + circle(22, 22, 10, '#b4bec0') + circle(38, 18, 13, '#c6cfd0') + line('M20 44 L16 56 M33 44 L29 58 M46 44 L42 56', '#5aa9d1', 3.4),
  thermometer: () => rect(26, 6, 12, 38, '#f3ead0', 'rx="6"') + circle(32, 48, 11, '#f3ead0') + rect(29, 20, 6, 28, '#d9605a', 'rx="3"') + circle(32, 48, 7.5, '#d9605a'),
  bulb: () => path('M32 6 A18 18 0 0 1 42 39 L42 46 L22 46 L22 39 A18 18 0 0 1 32 6Z', '#f4d264') + rect(23, 47, 18, 8, '#8a8f88', 'rx="2"') + path('M20 22 Q22 14 30 12', 'none', 'stroke="#fff6c9" stroke-width="3" stroke-linecap="round"'),
  hand: () => path('M18 34 L18 18 a4 4 0 0 1 8 0 L26 28 L26 12 a4 4 0 0 1 8 0 L34 28 L34 15 a4 4 0 0 1 8 0 L42 30 L42 22 a4 4 0 0 1 8 0 L50 40 C50 54 42 60 32 60 C22 60 16 52 10 40 C8 34 14 30 18 34Z', '#e6b78d') + path('M36 58 C44 56 50 50 50 40 L50 30 Z', '#a97a55', 'opacity="0.4"'),
  shop: () => rect(12, 28, 40, 28, '#c79a5a') + rect(26, 36, 12, 20, '#7a5a33') + path('M6 28 L14 8 L50 8 L58 28Z', '#6f9a59') + path('M24 8 L20 28 M40 8 L44 28', 'none', 'stroke="#f4ecd3" stroke-width="4"'),
  bag: () => path('M14 22 L50 22 L56 58 L8 58Z', '#a9743f') + path('M38 22 L50 22 L56 58 L40 58Z', '#6d4522', 'opacity="0.4"') + line('M22 26 C22 4 42 4 42 26', '#7a5430', 4) + rect(26, 34, 12, 8, '#e0bb58', 'rx="2"'),
  book: () => path('M8 12 L32 18 L32 58 L8 52Z', '#4f7f58') + path('M56 12 L32 18 L32 58 L56 52Z', '#3c6a47') + path('M12 16 L30 21 L30 52 L12 47Z', '#f3ead0') + leaf(16, 42, 14, 7, -60, '#6aa84f', { vein: false }),
  trophy: () => path('M20 8 L44 8 L42 30 Q32 40 22 30Z', '#e7b23a') + path('M34 8 L44 8 L42 30 Q38 34 34 36Z', '#a97a1f', 'opacity="0.55"') + line('M20 12 C6 12 8 28 22 28 M44 12 C58 12 56 28 42 28', '#c7912a', 4) + rect(29, 36, 6, 10, '#c7912a') + rect(20, 46, 24, 8, '#7a5430', 'rx="2"'),
  gear: () => { let s = ''; for (let i = 0; i < 8; i++) s += `<rect x="28" y="4" width="8" height="12" fill="#8a8574" transform="rotate(${i * 45} 32 32)"/>`; return s + circle(32, 32, 19, '#a39d8a') + circle(32, 32, 8, '#5b5545'); },
  hammer: () => line('M20 56 L40 24', '#8c6239', 7) + path('M26 8 L54 22 L46 36 L18 20Z', '#7f868a') + path('M26 8 L54 22 L51 27 L23 13Z', '#b6bdc0'),
  sparkle: () => path('M32 4 L37 27 L60 32 L37 37 L32 60 L27 37 L4 32 L27 27Z', '#f4d264') + path('M50 6 L52 14 L60 16 L52 18 L50 26 L48 18 L40 16 L48 14Z', '#fff0ae'),
  brush: () => line('M50 8 L26 36', '#8c6239', 6) + path('M28 32 L34 38 C30 52 18 58 8 56 C14 50 14 40 28 32Z', '#6aa84f'),
  save: () => path('M10 8 L46 8 L56 18 L56 56 L10 56Z', '#5f7f90') + rect(20, 8, 22, 15, '#d9d2bd') + rect(19, 34, 28, 22, '#f3ead0') + line('M23 41 L43 41 M23 48 L38 48', '#a0957c', 2),
  sprout: () => line('M32 56 L32 28', '#5f8f4a', 5) + leaf(32, 32, 24, 16, -150, '#79b25a') + leaf(32, 28, 26, 17, -32, '#6aa84f') + path('M12 54 Q32 44 52 54 L52 60 L12 60Z', '#6b4a33'),
  close: () => line('M16 16 L48 48 M48 16 L16 48', '#6d5a40', 7),
  up: () => path('M32 10 L54 36 L40 36 L40 54 L24 54 L24 36 L10 36Z', '#6aa84f'),
};

export const paintUiIcon = (id) => doc(64, 64, UI[id](), { scale: 0.7, freq: 0.08 });
export const UI_ICONS = Object.keys(UI);

export const glowDefs = () => radial('glow', [[0, '#fff0b8', 1], [0.5, '#ffd97a', 0.35], [1, '#ffd97a', 0]]);
export const paintGlow = () => doc(256, 256, `<circle cx="128" cy="128" r="128" fill="url(#glow)"/>`, { paint: false, defs: glowDefs() });

export const paintBeam = () =>
  doc(256, 720, `<path d="M90 0 L190 0 L256 720 L0 720Z" fill="url(#b)"/>`, {
    paint: false,
    defs: grad('b', [[0, '#fff2c6', 0.5], [0.7, '#ffe9a8', 0.12], [1, '#ffe9a8', 0]]),
  });

export const paintParticle = (color, r) => doc(32, 32, circle(16, 16, r, color), { paint: false });

export const paintLeafParticle = () => doc(32, 32, leaf(6, 20, 22, 13, -30, '#7db55a', { vein: false }), { paint: false });

export const paintButterfly = (c) =>
  doc(48, 40, path('M24 20 C14 2 2 6 6 18 C2 26 12 34 24 22Z', c) + path('M24 20 C34 2 46 6 42 18 C46 26 36 34 24 22Z', darken(c, 0.14)) + line('M24 10 L24 30', '#3a2f24', 2.4), { paint: false });
