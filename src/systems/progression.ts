import { CONFIG } from '@/data/config';
import { ACHIEVEMENTS, COLLECTION_MILESTONES } from '@/data/catalog';
import { PLANTS, plantById } from '@/data/plants';
import { getItemInfo, seedItemId } from '@/data/items';
import { EconomyService } from './economy';
import type { AchievementCondition, GameEvent, Price, Reward, SaveData } from '@/types/game';

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.round(CONFIG.progression.xpBase * Math.pow(level, CONFIG.progression.xpExponent));
}

export function xpProgress(profile: SaveData['profile']): { current: number; needed: number; fraction: number; maxed: boolean } {
  if (profile.level >= CONFIG.progression.maxLevel) return { current: 0, needed: 0, fraction: 1, maxed: true };
  const needed = xpForLevel(profile.level);
  return { current: profile.xp, needed, fraction: Math.min(1, profile.xp / needed), maxed: false };
}

export function speciesDiscovered(save: SaveData): number {
  return Object.keys(save.encyclopedia).length;
}

export function conditionProgress(save: SaveData, c: AchievementCondition): { value: number; target: number } {
  switch (c.type) {
    case 'stat':
      return { value: save.stats[c.stat], target: c.target };
    case 'species':
      return { value: speciesDiscovered(save), target: c.target };
    case 'playerLevel':
      return { value: save.profile.level, target: c.target };
    case 'greenhouseLevel':
      return { value: save.greenhouseLevel, target: c.target };
  }
}

function grantReward(save: SaveData, reward: Reward): void {
  const earn: Price[] = [];
  if (reward.coins) earn.push({ currency: 'coins', amount: reward.coins });
  if (reward.gems) earn.push({ currency: 'gems', amount: reward.gems });
  EconomyService.transact(save, { earn, grant: reward.items });
  if (reward.xp) save.profile.xp += reward.xp;
}

function applyLevelUps(save: SaveData, events: GameEvent[]): void {
  while (save.profile.level < CONFIG.progression.maxLevel) {
    const needed = xpForLevel(save.profile.level);
    if (save.profile.xp < needed) return;
    save.profile.xp -= needed;
    save.profile.level += 1;
    const coins = save.profile.level * CONFIG.economy.levelUpCoinsPerLevel;
    grantReward(save, { coins });
    events.push({ type: 'levelUp', level: save.profile.level, coins });
    syncUnlocks(save);
  }
}

/** Records which seeds the player's level has opened up. */
export function syncUnlocks(save: SaveData): void {
  for (const p of PLANTS) {
    const id = seedItemId(p.id);
    if (p.unlockLevel <= save.profile.level && !save.unlocks.includes(id)) save.unlocks.push(id);
  }
}

/**
 * Nobody should be stuck: with nothing growing, nothing to plant or sell, and too
 * few coins for the cheapest seed, a neighbour leaves a few seeds at the door.
 */
function rescueIfStuck(save: SaveData, events: GameEvent[]): void {
  const seedId = CONFIG.economy.rescueSeedId;
  const price = plantById(seedId)?.seedPrice.amount ?? 0;
  if (save.currencies.coins >= price || Object.keys(save.plants).length > 0) return;
  const canRecover = Object.keys(save.inventory).some((id) => {
    const category = getItemInfo(id)?.category;
    return category === 'seed' || category === 'harvest';
  });
  if (canRecover) return;
  grantReward(save, { items: [{ itemId: seedItemId(seedId), quantity: CONFIG.economy.rescueSeeds }] });
  events.push({ type: 'rescued' });
}

/**
 * Settles anything that follows from a state change: level-ups, achievements,
 * collection rewards. Rewards can themselves trigger more, so it runs to a fixed point.
 * Mutates `save`, which the caller must own.
 */
export function settleProgress(save: SaveData, now: number, events: GameEvent[]): void {
  for (let pass = 0; pass < 20; pass++) {
    const before = events.length;
    applyLevelUps(save, events);

    for (const a of ACHIEVEMENTS) {
      if (save.achievements[a.id]) continue;
      const { value, target } = conditionProgress(save, a.condition);
      if (value >= target) {
        save.achievements[a.id] = { unlockedAt: now };
        grantReward(save, a.reward);
        events.push({ type: 'achievement', id: a.id });
      }
    }

    const found = speciesDiscovered(save);
    for (const m of COLLECTION_MILESTONES) {
      if (found >= m.speciesRequired && !save.collectionRewards.includes(m.id)) {
        save.collectionRewards.push(m.id);
        grantReward(save, m.reward);
        events.push({ type: 'collection', id: m.id });
      }
    }

    if (events.length === before) break;
  }
  rescueIfStuck(save, events);
}
