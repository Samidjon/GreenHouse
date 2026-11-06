#!/usr/bin/env node
// Paints every temporary game asset into public/assets and writes the manifest.
// Output is deterministic and checked in. Needs Node 23.6+ (reads the TypeScript catalog directly).
//
// To replace an asset with final art: drop the file into public/assets and point
// its entry at it in public/assets/manifest.overrides.json. See docs/ASSETS.md.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLANTS } from '../src/data/plants.ts';
import { DECORATIONS, EQUIPMENT, OLD_POT_VARIANTS, POTS } from '../src/data/catalog.ts';
import { allStages, BASE_X, BASE_Y, paintPlant, paintSeedPacket, SPRITE_H, SPRITE_W } from './art/plants.mjs';
import { ITEM_ICONS, UI_ICONS, EQUIP_ART, paintBeam, paintButterfly, paintDecoration, paintEquipment, paintGlow, paintItemIcon, paintLeafParticle, paintOldPotVariant, paintParticle, paintPot, paintTank, paintUiIcon } from './art/props.mjs';
import { paintBackground, paintCloud, paintHills } from './art/backgrounds.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets');
const layout = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'worldLayout.json'), 'utf8'));

const entries = {};

function emit(key, relPath, svg, width, height, extra = {}) {
  const file = join(OUT, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  entries[key] = { path: `/assets/${relPath}`, width, height, ...extra };
}

// Stale generated output must not linger, but keep any hand-made art folder intact.
for (const dir of ['plants', 'seeds', 'pots', 'decor', 'equipment', 'items', 'ui', 'world', 'fx']) {
  rmSync(join(OUT, dir), { recursive: true, force: true });
}

for (const plant of PLANTS) {
  for (const stage of allStages()) {
    emit(`plants/${plant.id}/${stage}`, `plants/${plant.id}/${stage.toLowerCase()}.svg`, paintPlant(plant.id, stage), SPRITE_W, SPRITE_H, { originX: BASE_X / SPRITE_W, originY: BASE_Y / SPRITE_H });
  }
  emit(`seeds/${plant.id}`, `seeds/${plant.id}.svg`, paintSeedPacket(plant.id, plant.rarity), 96, 120);
}

for (const pot of POTS) emit(pot.sprite, `pots/${pot.id}.svg`, paintPot(pot.id), 120, 96);
for (let n = 1; n <= OLD_POT_VARIANTS; n++) emit(`pots/old_clay_${n}`, `pots/old_clay_${n}.svg`, paintOldPotVariant(n), 120, 96);
for (const d of DECORATIONS) emit(d.sprite, `decor/${d.id}.svg`, paintDecoration(d.id, d.width, d.height), d.width, d.height);
for (const e of EQUIPMENT) emit(e.sprite, `equipment/${e.id}.svg`, paintEquipment(e.id), EQUIP_ART[e.id].w, EQUIP_ART[e.id].h);
emit('world/tank', 'world/tank.svg', paintTank(), 110, 180);

for (const id of ITEM_ICONS) emit(`items/${id}`, `items/${id}.svg`, paintItemIcon(id), 64, 64);
for (const id of UI_ICONS) emit(`ui/${id}`, `ui/${id}.svg`, paintUiIcon(id), 64, 64);

for (const level of [1, 2, 3, 4, 5]) {
  const w = layout.widths[String(level)];
  emit(`world/bg${level}`, `world/background_${level}.svg`, paintBackground(level, w), w, layout.height);
}
emit('world/hills', 'world/hills.svg', paintHills(), 1600, 420);
emit('world/cloud1', 'world/cloud1.svg', paintCloud(11), 320, 110);
emit('world/cloud2', 'world/cloud2.svg', paintCloud(29), 320, 110);

emit('fx/glow', 'fx/glow.svg', paintGlow(), 256, 256);
emit('fx/beam', 'fx/beam.svg', paintBeam(), 256, 720);
emit('fx/mote', 'fx/mote.svg', paintParticle('#fff5d0', 6), 32, 32);
emit('fx/drop', 'fx/drop.svg', paintParticle('#8fd0ee', 7), 32, 32);
emit('fx/spark', 'fx/spark.svg', paintParticle('#ffe28a', 8), 32, 32);
emit('fx/leaf', 'fx/leaf.svg', paintLeafParticle(), 32, 32);
emit('fx/butterfly1', 'fx/butterfly1.svg', paintButterfly('#f0a24d'), 48, 40);
emit('fx/butterfly2', 'fx/butterfly2.svg', paintButterfly('#a98bd9'), 48, 40);

const overridesPath = join(OUT, 'manifest.overrides.json');
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};
for (const [key, value] of Object.entries(overrides)) {
  if (!entries[key]) throw new Error(`Override for unknown asset key: ${key}`);
  entries[key] = { ...entries[key], ...value };
}

const manifest = { version: 1, generated: true, entries };
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`Wrote ${Object.keys(entries).length} assets.`);
