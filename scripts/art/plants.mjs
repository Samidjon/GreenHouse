import { at, circle, darken, doc, ellipse, leaf, lighten, path, rect, rng, seedOf } from './svg.mjs';
import { SPECIES, stageT } from './species.mjs';

export const SPRITE_W = 200;
export const SPRITE_H = 260;
export const BASE_X = 100;
export const BASE_Y = 250;

const STAGES = ['SEED', 'SPROUT', 'SEEDLING', 'GROWING', 'MATURE', 'HARVESTABLE'];

function seedStage(color) {
  // Freshly turned soil with a single seed resting on top.
  return (
    ellipse(0, 1, 30, 9, '#4a3324') +
    ellipse(-7, -2, 15, 6, '#5c4230') +
    ellipse(8, -1, 12, 5, '#553b2a') +
    circle(-16, 0, 2.2, '#6e5038') +
    circle(17, 2, 1.6, '#6e5038') +
    ellipse(1, -6, 6, 4, color) +
    ellipse(-0.8, -7.2, 2.2, 1.3, lighten(color, 0.45), 'opacity="0.8"')
  );
}

function sproutStage(r, color) {
  const H = 26 + r.range(0, 6);
  return (
    ellipse(0, 1, 26, 7, '#4a3324') +
    path(`M-1.5 0 C-1 ${-H * 0.6} -1 ${-H * 0.8} 0 ${-H} L1.8 ${-H} C1.4 ${-H * 0.6} 1.6 ${-H * 0.3} 1.5 0Z`, '#8fb857') +
    leaf(0, -H, 24, 15, -158, lighten(color, 0.14), { shape: 'round', vein: false }) +
    leaf(0, -H, 24, 15, -22, color, { shape: 'round', vein: false })
  );
}

export function paintPlant(id, stage) {
  const spec = SPECIES[id];
  if (!spec) throw new Error(`No painter for species "${id}"`);
  const r = rng(seedOf(`${id}/${stage}`));
  let body;
  if (stage === 'SEED') body = seedStage(spec.seed);
  else if (stage === 'SPROUT') body = sproutStage(r, spec.leaf ?? '#6fae47');
  else body = spec.paint(stageT(stage), r);
  return doc(SPRITE_W, SPRITE_H, at(BASE_X, BASE_Y, body), { scale: 1.8, freq: 0.05 });
}

export function allStages() {
  return STAGES;
}

// --- seed packets ----------------------------------------------------------

const RARITY_TINT = { common: '#e9dcb7', uncommon: '#d6e3b3', rare: '#bfdce0', epic: '#e0c9e4', legendary: '#f4dc95' };

export function paintSeedPacket(id, rarity) {
  const r = rng(seedOf(`packet/${id}`));
  const tint = RARITY_TINT[rarity] ?? RARITY_TINT.common;
  const spec = SPECIES[id];
  const plant = at(48, 104, at(0, 0, spec.paint(1, r), 'scale(0.36)'));
  const body =
    path('M10 12 L86 8 L90 112 L8 116Z', tint) +
    path('M10 12 L86 8 L86.6 24 L10.4 28Z', darken(tint, 0.14)) +
    path('M60 8 L86 8 L90 112 L72 113Z', darken(tint, 0.08), 'opacity="0.35"') +
    rect(14, 32, 68, 74, '#fbf4dd', 'opacity="0.55" rx="3"') +
    plant +
    path('M10 12 L86 8 L90 112 L8 116Z', 'none', `stroke="${darken(tint, 0.42)}" stroke-width="1.4"`) +
    path('M10 26 L86 22', 'none', `stroke="${darken(tint, 0.3)}" stroke-width="1" stroke-dasharray="3 3"`);
  return doc(96, 120, body, { scale: 1.2, freq: 0.05 });
}

