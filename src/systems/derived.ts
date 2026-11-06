import { CONFIG } from '@/data/config';
import { decorationById, potById } from '@/data/catalog';
import { getItemInfo } from '@/data/items';
import type { PlantDef, Price, SaveData, UpgradeId } from '@/types/game';

/** Read-only values computed from the save. No mutation happens in this module. */

export const upgradeLevel = (save: Pick<SaveData, 'upgrades'>, id: UpgradeId): number => save.upgrades[id] ?? 0;

export function tankCapacity(save: Pick<SaveData, 'upgrades'>): number {
  return CONFIG.tank.baseCapacity + upgradeLevel(save, 'water_tank') * CONFIG.tank.capacityPerLevel;
}

export function waterAmount(save: Pick<SaveData, 'upgrades'>): number {
  return CONFIG.moisture.baseWaterAmount + upgradeLevel(save, 'watering_can') * 15;
}

export function coziness(save: Pick<SaveData, 'decorations'>): number {
  return save.decorations.reduce((sum, d) => sum + (decorationById(d.defId)?.coziness ?? 0), 0);
}

export function cozinessBonus(save: Pick<SaveData, 'decorations'>): number {
  return Math.min(CONFIG.growth.cozinessMaxBonus, coziness(save) * CONFIG.growth.cozinessPerPoint);
}

export function seedPrice(save: Pick<SaveData, 'upgrades'>, plant: PlantDef): Price {
  if (plant.seedPrice.currency !== 'coins') return plant.seedPrice;
  const discount = upgradeLevel(save, 'seed_satchel') * CONFIG.economy.seedSatchelPerLevel;
  return { currency: 'coins', amount: Math.max(1, Math.floor(plant.seedPrice.amount * (1 - discount))) };
}

/** Coins for one unit of an item, or null if it can't be sold. */
export function unitSellPrice(save: Pick<SaveData, 'upgrades'>, itemId: string): number | null {
  const info = getItemInfo(itemId);
  if (!info || info.baseSellPrice === null) return null;
  const bonus = 1 + upgradeLevel(save, 'market_stall') * CONFIG.economy.marketStallPerLevel;
  return Math.max(1, Math.floor(info.baseSellPrice * bonus));
}

export function potFor(save: Pick<SaveData, 'slots'>, slotId: string) {
  const potId = save.slots[slotId]?.potId ?? CONFIG.start.potId;
  return potById(potId) ?? potById(CONFIG.start.potId)!;
}

export function plantInSlot(save: Pick<SaveData, 'plants'>, slotId: string) {
  return Object.values(save.plants).find((p) => p.slotId === slotId);
}
