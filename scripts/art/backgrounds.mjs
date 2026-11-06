// Paints the full greenhouse interior for each expansion level.
// Panes are translucent so the live sky, hills and weather in Phaser show through.
import { at, circle, darken, doc, ellipse, f, grad, leaf, lighten, line, mix, path, polar, rect, rng, seedOf } from './svg.mjs';

const H = 720;
const FLOOR = 650;
const WALL_TOP = 470;
const ROOF = 96;
const BAY = 160;

const STYLE = {
  1: { name: 'old', frame: '#6a5540', frameW: 9, glass: '#c9d3ae', glassOp: 0.26, wall: '#7f5442', wood: '#6d5136', metal: '#5f5a4e', arch: false },
  2: { name: 'garden', frame: '#ebe2ca', frameW: 8, glass: '#e4f1e6', glassOp: 0.09, wall: '#a5614a', wood: '#a0784a', metal: '#7a7468', arch: false },
  3: { name: 'botanical', frame: '#38594b', frameW: 7, glass: '#e4f3ea', glassOp: 0.08, wall: '#e0d5b6', wood: '#8a6238', metal: '#38594b', arch: true },
  4: { name: 'tropical', frame: '#23473f', frameW: 7, glass: '#d9f3df', glassOp: 0.1, wall: '#7c8473', wood: '#6d4d2e', metal: '#23473f', arch: true },
  5: { name: 'grand', frame: '#f2ecd9', frameW: 7, glass: '#eaf4f1', glassOp: 0.07, wall: '#e9e3d3', wood: '#7b5230', metal: '#b89443', arch: true, gold: '#c9a24c' },
};

// ---------------------------------------------------------------------------

function glassBay(x, st, r, level) {
  const w = BAY;
  const top = ROOF;
  const bottom = WALL_TOP;
  let s = '';
  const clear = st.glassOp;
  s += rect(x, top, w, bottom - top, st.glass, `opacity="${clear}"`);
  if (level === 1) {
    // Grime collects low and at the corners; a neglected house.
    for (let i = 0; i < 7; i++) {
      s += ellipse(x + r.range(0, w), r.range(top, bottom), r.range(16, 46), r.range(10, 32), r.pick(['#7f8660', '#6d6f4f', '#8c8a6a']), `opacity="${f(r.range(0.05, 0.13))}"`);
    }
    s += rect(x, bottom - 70, w, 70, '#5e5a3e', 'opacity="0.22"');
  }
  // A soft diagonal glint on each pane.
  s += path(`M${x + 24} ${top + 40} L${x + 70} ${top + 10} L${x + 60} ${top + 150} L${x + 18} ${top + 190}Z`, '#ffffff', `opacity="${level === 1 ? 0.06 : 0.1}"`);
  return s;
}

function framing(W, st, level, r) {
  const c = st.frame;
  const d = darken(c, 0.25);
  const lit = lighten(c, 0.2);
  let s = '';
  for (let x = 0; x <= W; x += BAY) {
    s += rect(x - st.frameW / 2, ROOF, st.frameW, WALL_TOP - ROOF, c) + rect(x + st.frameW * 0.1, ROOF, st.frameW * 0.4, WALL_TOP - ROOF, d, 'opacity="0.65"') + rect(x - st.frameW * 0.45, ROOF, 1.6, WALL_TOP - ROOF, lit, 'opacity="0.7"');
    if (x < W) {
      const mid = x + BAY / 2;
      s += rect(mid - 2, ROOF, 4, WALL_TOP - ROOF, c);
      for (const y of [190, 290, 380]) s += rect(x, y - 2, BAY, 4, c, 'opacity="0.95"');
      if (st.arch) {
        const arcTop = ROOF + 4;
        const spring = ROOF + 80;
        s += `<path d="M${x + 4} ${spring} A${BAY / 2 - 4} ${spring - arcTop} 0 0 1 ${x + BAY - 4} ${spring}" fill="none" stroke="${c}" stroke-width="${st.frameW}"/>`;
        s += `<path d="M${mid - 40} ${spring} A40 44 0 0 1 ${mid + 40} ${spring}" fill="none" stroke="${c}" stroke-width="3"/>`;
        if (st.gold) s += circle(mid, ROOF + 26, 5, st.gold);
      }
    }
  }
  return s;
}

function roof(W, st, level) {
  const c = st.frame;
  let s = rect(0, 0, W, ROOF, st.glass, `opacity="${st.glassOp + 0.05}"`);
  for (let x = 0; x <= W; x += BAY / 2) {
    const lean = (x - W / 2) * 0.02;
    s += line(`M${x} ${ROOF} L${f(x - lean)} 0`, c, x % BAY === 0 ? st.frameW : 3);
  }
  s += rect(0, 0, W, 14, darken(c, 0.15)) + rect(0, 12, W, 3, darken(c, 0.4), 'opacity="0.6"');
  s += rect(0, 42, W, 4, c);
  s += rect(0, ROOF - 9, W, 15, c) + rect(0, ROOF + 4, W, 3, darken(c, 0.4), 'opacity="0.55"') + rect(0, ROOF - 9, W, 2, lighten(c, 0.3), 'opacity="0.6"');
  if (st.gold) s += rect(0, ROOF - 2, W, 3, st.gold);
  return s;
}

function brickWall(W, st, r, weathered) {
  const c = st.wall;
  let s = rect(0, WALL_TOP, W, FLOOR - WALL_TOP, darken(c, 0.38));
  const bh = 18;
  const bw = 44;
  for (let row = 0; row * bh < FLOOR - WALL_TOP; row++) {
    const y = WALL_TOP + row * bh;
    for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
      const shade = mix(c, r.pick([lighten(c, 0.14), darken(c, 0.15), c, c, '#9c6a4c']), r.range(0.1, 0.6));
      s += rect(x + 1, y + 1, bw - 2, bh - 2, shade, 'rx="1.5"');
      if (weathered && r() < 0.05) s += rect(x + 1, y + 1, bw - 2, bh - 2, '#40382a', 'opacity="0.55"');
    }
    if (weathered && row > 4) s += rect(0, y, W, bh, '#2f3a22', `opacity="${f((row - 4) * 0.03)}"`);
  }
  if (weathered) {
    for (let i = 0; i < W / 80; i++) {
      const x = r.range(0, W);
      s += ellipse(x, FLOOR - r.range(2, 30), r.range(14, 42), r.range(5, 14), '#55763c', `opacity="${f(r.range(0.25, 0.55))}"`);
    }
    s += line(`M${W * 0.72} ${WALL_TOP + 5} L${W * 0.73} 520 L${W * 0.71} 560 L${W * 0.73} 610`, '#2e241c', 2, 'opacity="0.65"');
  }
  return s;
}

function panelWall(W, st, r, gold) {
  const c = st.wall;
  let s = rect(0, WALL_TOP, W, FLOOR - WALL_TOP, c);
  for (let x = 0; x < W; x += BAY) {
    s += rect(x + 12, WALL_TOP + 22, BAY - 24, FLOOR - WALL_TOP - 44, darken(c, 0.05)) + `<rect x="${x + 12}" y="${WALL_TOP + 22}" width="${BAY - 24}" height="${FLOOR - WALL_TOP - 44}" fill="none" stroke="${gold ?? darken(c, 0.28)}" stroke-width="2.4"/>`;
    s += rect(x - 2, WALL_TOP, 4, FLOOR - WALL_TOP, darken(c, 0.28), 'opacity="0.55"');
    if (st.name === 'grand') {
      for (let i = 0; i < 3; i++) s += line(`M${x + r.range(20, 80)} ${r.range(WALL_TOP + 30, FLOOR - 40)} q${r.range(10, 34)} ${r.range(5, 24)} ${r.range(30, 60)} ${r.range(-8, 14)}`, '#b9b0a0', 1.3, 'opacity="0.55"');
    }
  }
  return s;
}

function stoneWall(W, st, r) {
  const c = st.wall;
  let s = rect(0, WALL_TOP, W, FLOOR - WALL_TOP, darken(c, 0.4));
  for (let row = 0; row < 5; row++) {
    const y = WALL_TOP + row * 37;
    let x = -r.range(0, 40);
    while (x < W) {
      const w = r.range(52, 104);
      s += rect(x + 2, y + 2, w - 4, 33, mix(c, r.pick(['#94a086', '#696f60', '#8a8f7a']), r.range(0.1, 0.6)), 'rx="9"');
      if (r() < 0.2) s += ellipse(x + w / 2, y + 30, w * 0.4, 7, '#5d8347', 'opacity="0.6"');
      x += w;
    }
  }
  return s;
}

function wallCap(W, st) {
  const c = st.gold ? '#f2ecd9' : st.name === 'old' ? '#69543c' : st.frame;
  return rect(0, WALL_TOP - 8, W, 15, c) + rect(0, WALL_TOP - 8, W, 2.5, lighten(c, 0.35), 'opacity="0.7"') + rect(0, WALL_TOP + 7, W, 4, '#1c1610', 'opacity="0.28"');
}

// --- floors ---------------------------------------------------------------

function floorBand(W, st, r, level) {
  const h = H - FLOOR;
  let s = '';
  if (level === 1) {
    s += rect(0, FLOOR, W, h, '#5c5242');
    for (let row = 0; row < 3; row++) {
      let x = -r.range(0, 80);
      while (x < W) {
        const w = r.range(90, 170);
        s += rect(x + 2, FLOOR + 2 + row * 24, w - 4, 21, mix('#7b6b52', r.pick(['#8c7b60', '#5f543f', '#6e5f47']), r()), 'rx="4"');
        if (r() < 0.25) s += ellipse(x + w, FLOOR + 22 + row * 24, 16, 5, '#5a7a3e', 'opacity="0.65"');
        x += w;
      }
    }
  } else if (level === 2) {
    s += rect(0, FLOOR, W, h, '#6e4a36');
    for (let row = 0; row < 4; row++) {
      for (let x = row % 2 ? -20 : 0; x < W; x += 40) {
        s += rect(x + 1, FLOOR + 1 + row * 18, 38, 16, mix('#b0694b', r.pick(['#c37d5b', '#9c5a40', '#ad6c4f']), r()), 'rx="1.5"');
      }
    }
  } else if (level === 3) {
    s += rect(0, FLOOR, W, h, '#4a3a2a');
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i * 36 < W; i++) {
        const dark = (i + row) % 2 === 0;
        s += rect(i * 36 + 1, FLOOR + 1 + row * 35, 34, 33, dark ? mix('#b4603e', '#a2583a', r()) : mix('#e6d8b4', '#d8c9a2', r()));
      }
    }
  } else if (level === 4) {
    s += rect(0, FLOOR, W, h, '#3f4a3a');
    for (let i = 0; i < W / 24; i++) {
      const x = r.range(0, W);
      s += ellipse(x, r.range(FLOOR + 8, H - 6), r.range(30, 64), r.range(9, 17), mix('#7f8a72', r.pick(['#94a086', '#6a7560']), r()));
      if (r() < 0.3) s += ellipse(x + 20, r.range(FLOOR + 10, H - 8), 22, 6, '#5d8a45', 'opacity="0.7"');
    }
  } else {
    s += rect(0, FLOOR, W, h, '#8f8a7c');
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i * 44 < W; i++) {
        const dark = (i + row) % 2 === 0;
        s += rect(i * 44 + 1, FLOOR + 1 + row * 35, 42, 33, dark ? '#3f4a4a' : '#ece6d6');
        if (r() < 0.3) s += line(`M${i * 44 + r.range(3, 20)} ${FLOOR + row * 35 + 6} q${r.range(5, 16)} ${r.range(4, 16)} ${r.range(14, 30)} ${r.range(10, 22)}`, dark ? '#73807e' : '#b9b09a', 1, 'opacity="0.7"');
      }
    }
    s += rect(0, FLOOR, W, 5, '#c9a24c');
  }
  s += rect(0, FLOOR, W, 10, '#120e08', 'opacity="0.25"');
  return s;
}

// --- furniture ------------------------------------------------------------

function shelf(x0, x1, y, st) {
  const c = st.wood;
  let s = rect(x0, y, x1 - x0, 13, c, 'rx="2"') + rect(x0, y + 10, x1 - x0, 5, darken(c, 0.4)) + rect(x0, y, x1 - x0, 2, lighten(c, 0.35), 'opacity="0.7"');
  for (const x of [x0 + 24, (x0 + x1) / 2, x1 - 24]) {
    s += rect(x - 4, y + 13, 8, 28, darken(c, 0.25)) + path(`M${x} ${y + 15} L${x + 26} ${y + 15} L${x} ${y + 42}Z`, 'none', `stroke="${st.metal}" stroke-width="3"`);
  }
  s += ellipse((x0 + x1) / 2, y + 22, (x1 - x0) / 2, 10, '#1c1610', 'opacity="0.13"');
  return s;
}

function bench(x0, x1, y, st, r) {
  const c = st.wood;
  let s = '';
  for (const x of [x0 + 18, (x0 + x1) / 2, x1 - 18]) s += rect(x - 8, y + 16, 16, FLOOR - y - 14, darken(c, 0.28)) + rect(x + 1, y + 16, 7, FLOOR - y - 14, darken(c, 0.48), 'opacity="0.7"');
  s += rect(x0 + 14, FLOOR - 34, x1 - x0 - 28, 9, darken(c, 0.3));
  s += rect(x0, y, x1 - x0, 20, c, 'rx="2"') + rect(x0, y + 16, x1 - x0, 7, darken(c, 0.42)) + rect(x0, y, x1 - x0, 2.5, lighten(c, 0.35), 'opacity="0.7"');
  for (let x = x0 + 40; x < x1; x += 70) s += line(`M${x} ${y + 3} L${x + r.range(-3, 3)} ${y + 16}`, darken(c, 0.35), 1, 'opacity="0.5"');
  // Crates and clutter under the bench make the space feel used.
  if (st.name === 'old' || st.name === 'garden') {
    s += crate(x0 + 60, FLOOR, 70, 46, st) + crate(x0 + 170, FLOOR, 54, 38, st);
  }
  return s;
}

const crate = (x, floor, w, h, st) => {
  const c = lighten(st.wood, 0.12);
  return rect(x, floor - h, w, h, c) + line(`M${x} ${floor - h * 0.66} L${x + w} ${floor - h * 0.66} M${x} ${floor - h * 0.33} L${x + w} ${floor - h * 0.33}`, darken(c, 0.4), 1.6) + rect(x + w - 8, floor - h, 8, h, darken(c, 0.35), 'opacity="0.55"');
};

function planter(x0, x1, y, st, r) {
  const c = st.wood;
  let s = rect(x0, y - 2, x1 - x0, FLOOR - y + 2, c);
  for (let i = 1; i < 3; i++) s += rect(x0, y + (i * (FLOOR - y)) / 3, x1 - x0, 2, darken(c, 0.4));
  s += rect(x0 - 5, y - 6, x1 - x0 + 10, 10, lighten(c, 0.12), 'rx="2"');
  for (const x of [x0 + 2, x1 - 10]) s += rect(x, y, 8, FLOOR - y, darken(c, 0.3));
  return s;
}

function terrace(x0, x1, y, st, r, bottom) {
  let s = rect(x0, y, x1 - x0, bottom - y, '#5b6152');
  let row = 0;
  for (let yy = y; yy < bottom; yy += 26) {
    let x = x0 - (row++ % 2 ? 18 : 0);
    while (x < x1) {
      const w = r.range(42, 72);
      const clipped = Math.min(w, x1 - x);
      s += rect(Math.max(x, x0) + 1, yy + 1, clipped - 2, 24, mix('#8a8f79', r.pick(['#a1a58e', '#6f7461', '#92977f']), r()), 'rx="7"');
      x += w;
    }
  }
  s += rect(x0 - 4, y - 7, x1 - x0 + 8, 11, '#6e5a3e', 'rx="4"');
  for (let i = 0; i < (x1 - x0) / 18; i++) s += leaf(r.range(x0, x1), y + 3, r.range(16, 36), 10, r.range(40, 140), mix('#2f7d4a', '#67ab5a', r()), { vein: false });
  return s;
}

function stand(x0, x1, y, st, r) {
  const gold = st.gold;
  let s = rect(x0, y, x1 - x0, 11, '#f2ecd9', 'rx="3"') + rect(x0, y + 9, x1 - x0, 4, gold) + rect(x0, y, x1 - x0, 2, '#ffffff', 'opacity="0.8"');
  return s;
}

function column(x, top, st) {
  const c = '#f2ecd9';
  return rect(x - 9, top, 18, FLOOR - top, c) + rect(x + 2, top, 7, FLOOR - top, '#a59d88', 'opacity="0.6"') + rect(x - 14, top - 8, 28, 9, st.gold) + rect(x - 14, FLOOR - 13, 28, 13, st.gold);
}

// --- door, window, table --------------------------------------------------

function door(st, level) {
  const x = 40;
  const y = 300;
  const w = 130;
  const h = 350;
  const c = level === 1 ? '#6f6250' : level === 2 ? '#7f9e7e' : level === 3 ? '#3f6a58' : level === 4 ? '#3c6152' : '#d6c691';
  const trim = level >= 5 ? st.gold : darken(st.frame, 0.1);
  let s = rect(x - 12, y - 14, w + 24, h + 14, trim) + rect(x - 12, y - 14, w + 24, 3, lighten(trim, 0.3));
  s += rect(x, y, w, h, c);
  // Upper glazed panel showing the outside.
  s += rect(x + 14, y + 14, w - 28, 148, '#cfe3d6', 'opacity="0.5"') + rect(x + 14 + (w - 28) / 2 - 2, y + 14, 4, 148, trim) + rect(x + 14, y + 86, w - 28, 4, trim);
  s += rect(x + 14, y + 180, w - 28, 66, darken(c, 0.14)) + rect(x + 14, y + 262, w - 28, 72, darken(c, 0.14));
  s += circle(x + w - 16, y + 174, 6.5, '#c9a24c') + circle(x + w - 17.5, y + 172.5, 2, '#fff3c4');
  if (level === 1) {
    s += line(`M${x + 8} ${y + 30} L${x + 40} ${y + 60} L${x + 30} ${y + 110}`, '#3e3a2c', 1.6, 'opacity="0.65"');
    s += rect(x, y + 168, w, 3, '#3e3a2c', 'opacity="0.4"');
  }
  s += rect(x + w - 34, y, 34, h, '#000', 'opacity="0.1"');
  return s;
}

function casement(st, level) {
  // The old sash window on the far wall, cleaned up at later stages.
  const x = 1110;
  const y = 170;
  const w = 130;
  const h = 210;
  const wood = level === 1 ? '#7a6248' : level === 2 ? '#ebe2ca' : level >= 5 ? '#f2ecd9' : st.frame;
  // Four strips, so the sky stays visible through the panes.
  let s = rect(x - 12, y - 12, w + 24, 12, wood) + rect(x - 12, y + h, w + 24, 12, wood) + rect(x - 12, y, 12, h, wood) + rect(x + w, y, 12, h, wood) + rect(x - 22, y + h + 8, w + 44, 12, lighten(wood, 0.1));
  s += rect(x, y, w, h, '#dcebd4', `opacity="${level === 1 ? 0.2 : 0.06}"`);
  s += rect(x + w / 2 - 3, y, 6, h, wood) + rect(x, y + h / 2 - 3, w, 6, wood);
  if (level === 1) {
    // One pane broken, one boarded over.
    s += path(`M${x + 8} ${y + 8} L${x + 50} ${y + 8} L${x + 26} ${y + 34} L${x + 44} ${y + 60} L${x + 8} ${y + 84}Z`, '#000', 'opacity="0.1"');
    s += rect(x + w / 2 + 6, y + h / 2 + 10, w / 2 - 10, 18, '#6e5a42') + rect(x + w / 2 + 4, y + h / 2 + 44, w / 2 - 6, 18, '#755f46');
  }
  return s;
}

function workTable(st, r) {
  const x = 860;
  const w = 230;
  const y = 500;
  const c = st.wood;
  let s = '';
  for (const lx of [x + 14, x + w - 26]) s += rect(lx, y + 12, 12, FLOOR - y - 10, darken(c, 0.3));
  s += rect(x + 14, y + 90, w - 30, 8, darken(c, 0.32));
  s += rect(x, y, w, 15, lighten(c, 0.06), 'rx="2"') + rect(x, y + 12, w, 5, darken(c, 0.4));
  // Bags, a seed tray, jars: the shop opens from here.
  s += path(`M${x + 16} ${y} L${x + 22} ${y - 56} L${x + 62} ${y - 56} L${x + 68} ${y}Z`, '#b09468') + rect(x + 22, y - 62, 40, 8, '#8d7550', 'rx="2"');
  s += ellipse(x + 42, y - 28, 11, 11, '#6a4f2f');
  s += rect(x + 84, y - 22, 78, 22, '#8d6339', 'rx="2"');
  for (let i = 0; i < 5; i++) s += rect(x + 90 + i * 14, y - 26, 11, 8, r.pick(['#d9b07a', '#c98c5a', '#e8cf9c', '#a9c98a']));
  s += rect(x + 172, y - 44, 22, 44, '#b9d4c7', 'opacity="0.75" rx="4"') + rect(x + 176, y - 50, 14, 7, '#7d5f3a') + rect(x + 172, y - 22, 22, 22, '#6d8f55', 'opacity="0.55"');
  s += rect(x + 202, y - 30, 15, 30, '#d9cda9', 'opacity="0.9" rx="3"');
  s += crate(x + 60, FLOOR, 100, 50, st);
  return s;
}

// --- atmosphere per level ----------------------------------------------------

function cobwebs(x, y, flip) {
  const sx = flip ? -1 : 1;
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI) / 8;
    s += line(`M0 0 L${f(Math.cos(a) * 70)} ${f(Math.sin(a) * 70)}`, '#f0efe6', 0.8, 'opacity="0.5"');
  }
  for (const R of [24, 44, 62]) {
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI) / 8;
      d += `${i ? 'L' : 'M'}${f(Math.cos(a) * R)} ${f(Math.sin(a) * R)}`;
    }
    s += line(d, '#f0efe6', 0.7, 'opacity="0.42"');
  }
  return at(x, y, s, `scale(${sx} 1)`);
}

function weeds(x, y, r, count, col = '#5b8440') {
  let s = '';
  for (let i = 0; i < count; i++) s += leaf(x + r.range(-16, 16), y, r.range(16, 36), r.range(5, 8), r.range(-140, -40), mix(col, lighten(col, 0.3), r()), { vein: false, shape: 'narrow' });
  return s;
}

function climbing(x, y0, y1, r, col, flower) {
  let s = '';
  let d = `M${x} ${y0}`;
  const pts = [];
  for (let y = y0; y > y1; y -= 26) {
    const px = x + Math.sin(y * 0.07) * 15;
    d += ` L${f(px)} ${y}`;
    pts.push([px, y]);
  }
  s += line(d, '#4d6a3a', 2.4);
  for (const [px, y] of pts) {
    s += leaf(px, y, r.range(16, 28), r.range(11, 16), r.pick([-160, -20, -130, -50]), mix(col, lighten(col, 0.3), r()), { shape: 'heart', vein: false });
    if (flower && r() < 0.4) s += circle(px + r.range(-12, 12), y + r.range(-8, 8), 5, flower) + circle(px + r.range(-3, 3), y, 2, '#f5d76a');
  }
  return s;
}

function palm(x, base, height, r) {
  let s = stemTrunk(x, base, height);
  const top = base - height;
  for (let i = 0; i < 11; i++) {
    const a = -180 + i * 18;
    const L = r.range(94, 142);
    const [ex, ey] = polar(x, top, L, a);
    const endY = ey + L * 0.32;
    const col = mix('#1f6a45', '#3f9457', r());
    s += line(`M${x} ${top} Q${f((x + ex) / 2)} ${f(top + (ey - top) * 0.75 - 18)} ${f(ex)} ${f(endY)}`, darken(col, 0.3), 2.4);
    for (let k = 1; k < 13; k++) {
      const u = k / 13;
      const cx = (x + ex) / 2;
      const cy = top + (ey - top) * 0.75 - 18;
      const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * top + 2 * (1 - u) * u * cy + u * u * endY;
      s += leaf(px, py, 28 * (1 - u * 0.55), 7, 72, col, { shape: 'narrow', vein: false }) + leaf(px, py, 28 * (1 - u * 0.55), 7, a < -90 ? 120 : 40, lighten(col, 0.1), { shape: 'narrow', vein: false });
    }
  }
  return s;
}

function stemTrunk(x, base, height) {
  let s = path(`M${x - 13} ${base} C${x - 9} ${base - height * 0.5} ${x - 5} ${base - height * 0.8} ${x - 4} ${base - height} L${x + 4} ${base - height} C${x + 6} ${base - height * 0.8} ${x + 11} ${base - height * 0.5} ${x + 15} ${base}Z`, '#6f5a3e');
  for (let y = base - 12; y > base - height; y -= 15) s += line(`M${x - 10} ${y} Q${x} ${y + 6} ${x + 12} ${y}`, '#4a3a26', 1.4, 'opacity="0.7"');
  return s;
}

function bigLeaves(x, y, r, n, spread) {
  let s = '';
  for (let i = 0; i < n; i++) s += leaf(x + r.range(-spread, spread), y + r.range(-14, 14), r.range(50, 96), r.range(26, 44), r.range(-160, -20), mix('#1f6e45', '#4c9e5c', r()), { shape: 'heart' });
  return s;
}

// --- level compositions --------------------------------------------------------

function structures(level, W, st, r) {
  let s = '';
  // Greenhouse section L1
  s += shelf(300, 800, 345, st) + bench(300, 800, 560, st, r);
  s += workTable(st, r);
  s += casement(st, level);
  if (level >= 2) s += shelf(1310, 1490, 345, st) + planter(1270, 1710, 590, st, r);
  if (level >= 3) s += shelf(1775, 2225, 345, st) + bench(1775, 2225, 560, st, r);
  if (level >= 4) {
    // Waterfall behind the terrace; Phaser animates foam on top of it.
    s += path('M2535 98 L2565 98 L2582 400 L2518 400Z', '#7cc4cd', 'opacity="0.8"') + path('M2545 98 L2556 98 L2566 400 L2536 400Z', '#d6f2f2', 'opacity="0.75"');
    s += path('M2478 98 L2512 96 L2526 260 L2506 400 L2470 400 L2490 240Z', '#6f7461') + path('M2622 98 L2588 96 L2574 260 L2594 400 L2630 400 L2610 240Z', '#7a7f6b');
    s += palm(2290, 390, 250, r) + palm(2810, 390, 270, r);
    s += bigLeaves(2400, 370, r, 7, 40) + bigLeaves(2700, 365, r, 7, 40);
    s += terrace(2245, 2845, 390, st, r, 512) + terrace(2245, 2845, 600, st, r, 650);
    // Pond along the front of the tropical wing.
    s += rect(2245, FLOOR + 6, W - 2245 > 640 ? 640 : W - 2245, H - FLOOR - 6, '#2f7f85', 'opacity="0.92"');
    for (let i = 0; i < 16; i++) s += ellipse(r.range(2260, 2870), r.range(FLOOR + 12, H - 6), r.range(14, 40), r.range(2, 4), '#a8e0e0', 'opacity="0.45"');
    for (const x of [2300, 2480, 2700, 2840]) s += ellipse(x, FLOOR + r.range(30, 48), r.range(20, 34), 7, '#4f9d58') + path(`M${x} ${FLOOR + 40} l10 -7 l-16 1Z`, '#2f7f85');
  }
  if (level >= 5) {
    // The great dome rises over the centre of the last wing.
    const cx = 3200;
    const spring = 446;
    const R = 232;
    s += `<path d="M${cx - R} ${spring} A${R} ${spring - 4} 0 0 1 ${cx + R} ${spring}Z" fill="#eaf4f1" opacity="0.16"/>`;
    for (const k of [0.25, 0.5, 0.75]) s += `<path d="M${cx - R} ${spring} A${R * k} ${spring - 4} 0 0 1 ${cx + R} ${spring}" fill="none" stroke="#c9a24c" stroke-width="3"/>`;
    s += `<path d="M${cx - R} ${spring} A${R} ${spring - 4} 0 0 1 ${cx + R} ${spring}" fill="none" stroke="#f2ecd9" stroke-width="11"/>`;
    for (const y of [150, 270]) {
      const dy = (spring - y) / (spring - 4);
      const half = R * Math.sqrt(Math.max(0, 1 - dy * dy));
      s += `<path d="M${f(cx - half)} ${y} Q${cx} ${y + 22} ${f(cx + half)} ${y}" fill="none" stroke="#c9a24c" stroke-width="2.6"/>`;
    }
    s += line(`M${cx} 6 L${cx} 446`, '#f2ecd9', 7);
    for (const x of [2896, 3504]) s += column(x, 96, st);
    for (const x of [cx - R, cx + R]) s += column(x, 446, st);
    // Tiered stands either side.
    s += stand(2890, 3160, 345, st, r) + stand(2890, 3160, 560, st, r) + stand(3240, 3510, 345, st, r) + stand(3240, 3510, 560, st, r);
    for (const x of [2900, 3150, 3250, 3500]) s += rect(x - 4, 345, 8, FLOOR - 345, st.gold);
    // Fountain.
    s += ellipse(cx, FLOOR - 4, 92, 18, '#d6cfbd') + ellipse(cx, FLOOR - 8, 82, 13, '#62b3bd');
    s += rect(cx - 10, 520, 20, 124, '#e9e3d3') + rect(cx + 2, 520, 8, 124, '#a59d88', 'opacity="0.6"');
    s += ellipse(cx, 520, 50, 11, '#d6cfbd') + ellipse(cx, 517, 43, 8, '#62b3bd');
    s += rect(cx - 6, 450, 12, 66, '#e9e3d3') + ellipse(cx, 450, 24, 7, '#d6cfbd') + ellipse(cx, 448, 19, 5, '#62b3bd');
    s += circle(cx, 438, 9, st.gold);
    s += climbing(2920, 96, 96, r, '#4d9a5a');
  }
  return s;
}

function lushness(level, W, r) {
  let s = '';
  if (level === 1) {
    s += cobwebs(BAY - 2, ROOF + 6, true) + cobwebs(BAY * 5 + 2, ROOF + 6, false) + cobwebs(W - 4, ROOF + 6, true) + cobwebs(BAY * 3 + 2, ROOF + 6, false);
    // Planks nailed over a broken pane.
    for (const [x, y, w, a] of [[190, 208, 136, -7], [188, 252, 140, 5], [832, 142, 136, 6]]) s += at(x, y, rect(0, 0, w, 20, '#79604a') + rect(0, 16, w, 4, '#44362a') + circle(10, 10, 2, '#2a2520') + circle(w - 10, 10, 2, '#2a2520'), `rotate(${a})`);
    s += weeds(250, FLOOR + 4, r, 8) + weeds(830, FLOOR + 3, r, 7) + weeds(1180, FLOOR + 3, r, 11) + weeds(1240, 468, r, 8) + weeds(310, 464, r, 5, '#6d8f4c');
    s += climbing(1266, 464, 150, r, '#577a3c');
    s += climbing(20, 300, 120, r, '#577a3c');
  } else if (level === 2) {
    s += climbing(1266, 464, 120, r, '#55944e', '#e86a7a') + climbing(1738, 464, 110, r, '#55944e', '#f0a24d');
    s += weeds(1250, FLOOR + 2, r, 6, '#66a24e') + weeds(842, FLOOR + 2, r, 6, '#66a24e');
    for (let x = 1290; x < 1700; x += 34) s += leaf(x, 590, r.range(12, 22), 9, r.range(-130, -50), '#74ad55', { vein: false });
  } else {
    // Later stages are deliberately green: climbers on every other mullion.
    for (let x = BAY; x < W; x += BAY * 2) {
      s += climbing(x, 464, 110 + r.range(0, 60), r, level >= 4 ? '#2f8050' : '#4d9a5a', level === 3 ? '#e6a5c2' : level === 4 ? '#f28a4e' : '#f3e6a0');
    }
    if (level === 3 || level >= 4) s += weeds(1240, FLOOR + 2, r, 8, '#4d9a5a');
  }
  return s;
}

function lightPools(W, level) {
  // Warm sun patches on the floor; dimmed at night by Phaser's overlay.
  let s = '';
  const op = level === 1 ? 0.05 : 0.1;
  for (let x = 80; x < W; x += BAY * 2) s += path(`M${x} ${FLOOR + 4} L${x + 90} ${FLOOR + 4} L${x + 170} ${H} L${x + 40} ${H}Z`, '#fff2c6', `opacity="${op}"`);
  return s;
}

export function paintBackground(level, W) {
  const st = STYLE[level];
  const r = rng(seedOf(`bg/${level}`));
  let s = '';
  for (let x = 0; x < W; x += BAY) s += glassBay(x, st, r, level);
  s += framing(W, st, level, r);
  s += roof(W, st, level);
  if (level <= 2) s += brickWall(W, st, r, level === 1);
  else if (level === 3) s += panelWall(W, st, r);
  else if (level === 4) s += stoneWall(W, st, r);
  else s += panelWall(W, st, r, st.gold);
  s += wallCap(W, st);
  s += floorBand(W, st, r, level);
  s += lightPools(W, level);
  s += door(st, level);
  s += structures(level, W, st, r);
  s += lushness(level, W, r);
  return doc(W, H, s, { scale: 3, freq: 0.022 });
}

// --- distant landscape behind the glass -------------------------------------------

export function paintHills() {
  const W = 1600;
  const h = 420;
  const r = rng(seedOf('hills'));
  const ridge = (base, amp, col, phase) => {
    let d = `M0 ${h}`;
    for (let x = 0; x <= W; x += 40) d += ` L${x} ${f(base + Math.sin(x * 0.006 + phase) * amp + Math.sin(x * 0.019 + phase * 2) * amp * 0.35)}`;
    return path(`${d} L${W} ${h}Z`, col);
  };
  let s = ridge(190, 34, '#a9c9bb', 0.4) + ridge(240, 30, '#8fb596', 2.1) + ridge(290, 24, '#749f70', 4);
  for (let i = 0; i < 48; i++) {
    const x = r.range(0, W);
    const y = 300 + r.range(-20, 40);
    const size = r.range(14, 36);
    s += ellipse(x, y, size, size * 1.2, mix('#55874f', '#7bae66', r()));
  }
  s += ridge(350, 12, '#5f8a4c', 1);
  return doc(W, h, s, { scale: 5, freq: 0.012 });
}

export const paintCloud = (seed) => {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 9; i++) s += ellipse(r.range(70, 250), r.range(58, 76), r.range(30, 64), r.range(16, 30), '#ffffff', `opacity="${f(r.range(0.55, 0.9))}"`);
  return doc(320, 110, s, { scale: 7, freq: 0.03 });
};
