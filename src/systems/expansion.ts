import { expansionByLevel } from '@/data/catalog';
import { getItemInfo } from '@/data/items';
import { coinsText, gemsText } from '@/utils/format';
import { ALL_SLOTS } from '@/data/world';
import { EconomyService } from './economy';
import { settleProgress } from './progression';
import type { ActionResult, ExpansionDef, GameEvent, GreenhouseLevel, SaveData } from '@/types/game';

export interface ExpansionStatus {
  def: ExpansionDef;
  built: boolean;
  isNext: boolean;
  requirements: { label: string; met: boolean }[];
  canBuild: boolean;
}

export function nextLevel(save: SaveData): GreenhouseLevel | null {
  return save.greenhouseLevel < 5 ? ((save.greenhouseLevel + 1) as GreenhouseLevel) : null;
}

export function expansionStatus(save: SaveData, level: GreenhouseLevel): ExpansionStatus {
  const def = expansionByLevel(level);
  const built = level <= save.greenhouseLevel;
  const isNext = level === save.greenhouseLevel + 1;
  const requirements: { label: string; met: boolean }[] = [
    { label: `Уровень садовода: ${def.requiredPlayerLevel}`, met: save.profile.level >= def.requiredPlayerLevel },
    ...def.cost.map((p) => ({
      label: p.currency === 'coins' ? coinsText(p.amount) : gemsText(p.amount),
      met: save.currencies[p.currency] >= p.amount,
    })),
    ...def.requiredItems.map((r) => ({
      label: `${r.quantity} × ${getItemInfo(r.itemId)?.name ?? r.itemId}`,
      met: (save.inventory[r.itemId] ?? 0) >= r.quantity,
    })),
  ];
  return { def, built, isNext, requirements, canBuild: isNext && requirements.every((r) => r.met) };
}

/** Only ever adds: coordinates are absolute, so everything already placed stays exactly where it is. */
export function expandGreenhouse(save: SaveData, now: number): ActionResult {
  const level = nextLevel(save);
  if (!level) return { ok: false, reason: 'Ваша оранжерея уже достроена.' };
  const def = expansionByLevel(level);
  if (save.profile.level < def.requiredPlayerLevel) return { ok: false, reason: `Нужен уровень садовода: ${def.requiredPlayerLevel}.` };

  const next = structuredClone(save);
  const error = EconomyService.transact(next, { spend: def.cost, consume: def.requiredItems });
  if (error) return { ok: false, reason: error };

  next.greenhouseLevel = level;
  for (const slot of ALL_SLOTS) {
    if (slot.level === level) next.slots[slot.id] = { potId: 'terracotta' };
  }
  const events: GameEvent[] = [{ type: 'expanded', level }];
  settleProgress(next, now, events);
  return { ok: true, save: next, events };
}
