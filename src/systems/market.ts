import { EconomyService } from './economy';
import { settleProgress } from './progression';
import type { ActionResult, SaveData } from '@/types/game';

/** A sale at market, including anything it leads to: a level-up, or an earnings achievement. */
export function sellItem(save: SaveData, itemId: string, quantity: number, now: number): ActionResult {
  const result = EconomyService.sell(save, itemId, quantity);
  if (!result.ok) return result;
  settleProgress(result.save, now, result.events);
  return result;
}
