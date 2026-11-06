import { decorationById } from '@/data/catalog';
import { decoItemId } from '@/data/items';
import { ALL_BLOCKERS, slotRect, slotsForLevel, WORLD, worldWidth } from '@/data/world';
import type { WorldRect } from '@/data/world';
import { EconomyService } from './economy';
import { settleProgress } from './progression';
import type { ActionResult, DecorationDef, GameEvent, GreenhouseLevel, PlacedDecoration, SaveData } from '@/types/game';

export function decorationRect(def: DecorationDef, x: number, y: number): WorldRect {
  switch (def.zone) {
    case 'floor':
      return { x: x - def.width / 2, y: y - def.height, w: def.width, h: def.height };
    case 'wall':
      return { x: x - def.width / 2, y: y - def.height / 2, w: def.width, h: def.height };
    case 'hanging':
      return { x: x - def.width / 2, y, w: def.width, h: def.height };
  }
}

const overlaps = (a: WorldRect, b: WorldRect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Moves a requested point to where that decoration can legally sit: floor items stay on the floor, and so on. */
export function snapToZone(def: DecorationDef, x: number, y: number, level: GreenhouseLevel): { x: number; y: number } {
  const width = worldWidth(level);
  const sx = Math.round(Math.max(def.width / 2, Math.min(width - def.width / 2, x)));
  switch (def.zone) {
    case 'floor':
      return { x: sx, y: WORLD.floorY };
    case 'hanging':
      return { x: sx, y: WORLD.hangingY };
    case 'wall': {
      const top = WORLD.wallBand.top + def.height / 2;
      const bottom = WORLD.wallBand.bottom - def.height / 2;
      return { x: sx, y: Math.round(Math.max(top, Math.min(bottom, y))) };
    }
  }
}

export interface PlacementCheck {
  valid: boolean;
  reason: string | null;
  x: number;
  y: number;
}

/** @param ignoreId the placed decoration being moved, which shouldn't collide with itself. */
export function checkPlacement(
  save: Pick<SaveData, 'greenhouseLevel' | 'decorations'>,
  def: DecorationDef,
  wantX: number,
  wantY: number,
  ignoreId: string | null,
): PlacementCheck {
  const { x, y } = snapToZone(def, wantX, wantY, save.greenhouseLevel);
  const rect = decorationRect(def, x, y);
  const result = (reason: string | null): PlacementCheck => ({ valid: reason === null, reason, x, y });

  for (const b of ALL_BLOCKERS) {
    if (b.level <= save.greenhouseLevel && overlaps(rect, b)) return result('Мешает то, что нельзя сдвинуть.');
  }
  for (const s of slotsForLevel(save.greenhouseLevel)) {
    if (overlaps(rect, slotRect(s))) return result('Так будет тесно растениям.');
  }
  for (const d of save.decorations) {
    if (d.id === ignoreId) continue;
    const other = decorationById(d.defId);
    if (other && overlaps(rect, decorationRect(other, d.x, d.y))) return result('Здесь уже стоит другое украшение.');
  }
  return result(null);
}

function finish(save: SaveData, events: GameEvent[], now: number): ActionResult {
  settleProgress(save, now, events);
  return { ok: true, save, events };
}

export function placeDecoration(save: SaveData, defId: string, x: number, y: number, flipped: boolean, now: number): ActionResult {
  const def = decorationById(defId);
  if (!def) return { ok: false, reason: 'Неизвестное украшение.' };
  const check = checkPlacement(save, def, x, y, null);
  if (!check.valid) return { ok: false, reason: check.reason ?? 'Сюда не поместится.' };
  const next = structuredClone(save);
  const error = EconomyService.transact(next, { consume: [{ itemId: decoItemId(defId), quantity: 1 }] });
  if (error) return { ok: false, reason: `Нет такого украшения: ${def.name}.` };
  const placed: PlacedDecoration = { id: `d${next.nextId++}`, defId, x: check.x, y: check.y, flipped };
  next.decorations.push(placed);
  next.stats.decorationsPlaced += 1;
  return finish(next, [], now);
}

export function moveDecoration(save: SaveData, id: string, x: number, y: number, flipped: boolean, now: number): ActionResult {
  const placed = save.decorations.find((d) => d.id === id);
  const def = placed && decorationById(placed.defId);
  if (!placed || !def) return { ok: false, reason: 'Этого украшения уже нет.' };
  const check = checkPlacement(save, def, x, y, id);
  if (!check.valid) return { ok: false, reason: check.reason ?? 'Сюда не поместится.' };
  const next = structuredClone(save);
  const target = next.decorations.find((d) => d.id === id)!;
  target.x = check.x;
  target.y = check.y;
  target.flipped = flipped;
  return finish(next, [], now);
}

export function removeDecoration(save: SaveData, id: string, now: number): ActionResult {
  const placed = save.decorations.find((d) => d.id === id);
  if (!placed) return { ok: false, reason: 'Этого украшения уже нет.' };
  const next = structuredClone(save);
  next.decorations = next.decorations.filter((d) => d.id !== id);
  EconomyService.transact(next, { grant: [{ itemId: decoItemId(placed.defId), quantity: 1 }] });
  return finish(next, [], now);
}
