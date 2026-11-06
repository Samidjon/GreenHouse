import { CONFIG } from '@/data/config';
import { isReady, simulate, stageIndexForGrowth } from './growth';
import { settleProgress } from './progression';
import type { GameEvent, OfflineSummary, SaveData } from '@/types/game';

export interface CatchUpResult {
  save: SaveData;
  summary: OfflineSummary | null;
  events: GameEvent[];
}

/**
 * Advances the save to `now`. Any gap long enough to count as "being away"
 * (closed tab, sleeping laptop) comes back with a summary to greet the player.
 */
export function catchUp(input: SaveData, now: number): CatchUpResult {
  const result = simulate(input, now);
  if (result.save === input) return { save: input, summary: null, events: [] };

  let save = result.save;
  const events: GameEvent[] = result.recovered.map((speciesId) => ({ type: 'recovered', speciesId }));
  if (result.recovered.length > 0) {
    save = structuredClone(save);
    settleProgress(save, now, events);
  }

  if (result.elapsedSec < CONFIG.sim.offlineSummaryMinSec) return { save, summary: null, events };

  let stagesAdvanced = 0;
  const ready = new Map<string, number>();
  for (const [id, after] of Object.entries(save.plants)) {
    const before = input.plants[id];
    if (!before) continue;
    stagesAdvanced += stageIndexForGrowth(after.growth) - stageIndexForGrowth(before.growth);
    if (isReady(after) && !isReady(before)) ready.set(after.speciesId, (ready.get(after.speciesId) ?? 0) + 1);
  }

  const summary: OfflineSummary = {
    elapsedSec: result.elapsedSec,
    simulatedSec: result.simulatedSec,
    capped: result.capped,
    stagesAdvanced,
    newlyReady: [...ready].map(([speciesId, count]) => ({ speciesId, count })),
    thirsty: Object.values(save.plants).filter((p) => !isReady(p) && p.moisture < CONFIG.moisture.thirsty).length,
    recovered: result.recovered.length,
    tankBefore: input.tank,
    tankAfter: save.tank,
  };
  return { save, summary, events };
}
