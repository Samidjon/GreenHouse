import { CONFIG, DEFAULT_SETTINGS } from '@/data/config';
import { slotsForLevel } from '@/data/world';
import { alignDown } from './growth';
import { syncUnlocks } from './progression';
import type { SaveData, Settings, Stats } from '@/types/game';

export const EMPTY_STATS: Stats = {
  plantsPlanted: 0,
  plantsHarvested: 0,
  unitsHarvested: 0,
  timesWatered: 0,
  timesFertilized: 0,
  coinsEarned: 0,
  itemsSold: 0,
  decorationsPlaced: 0,
  mutationsFound: 0,
  plantsRecovered: 0,
};

export function createNewSave(now: number, worldSeed: number, settings: Settings = DEFAULT_SETTINGS): SaveData {
  const slots: SaveData['slots'] = {};
  for (const s of slotsForLevel(1)) slots[s.id] = { potId: CONFIG.start.potId };

  const save: SaveData = {
    version: CONFIG.save.version,
    createdAt: now,
    lastSavedAt: now,
    simulatedUntil: alignDown(now),
    worldSeed: worldSeed >>> 0,
    nextId: 1,
    profile: { name: 'Gardener', xp: 0, level: 1 },
    currencies: { coins: CONFIG.start.coins, gems: CONFIG.start.gems },
    inventory: { ...CONFIG.start.inventory },
    greenhouseLevel: 1,
    slots,
    plants: {},
    decorations: [],
    equipment: {},
    upgrades: {},
    tank: CONFIG.tank.baseCapacity,
    unlocks: [],
    achievements: {},
    encyclopedia: {},
    collectionRewards: [],
    stats: { ...EMPTY_STATS },
    settings: { ...settings },
  };
  syncUnlocks(save);
  return save;
}
