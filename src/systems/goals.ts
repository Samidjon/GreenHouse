import { CONFIG } from '@/data/config';
import { expansionByLevel } from '@/data/catalog';
import { getItemInfo } from '@/data/items';
import { isReady } from './growth';
import { nextLevel } from './expansion';
import type { SaveData } from '@/types/game';

export interface Goal {
  id: string;
  text: string;
}

/** A gentle next step, worked out from the save. It suggests; it never gates anything. */
export function currentGoal(save: SaveData): Goal | null {
  const plants = Object.values(save.plants);
  const hasHarvest = Object.keys(save.inventory).some((id) => getItemInfo(id)?.category === 'harvest');
  const hasSeeds = Object.keys(save.inventory).some((id) => getItemInfo(id)?.category === 'seed');
  const beginner = save.stats.itemsSold === 0;

  if (plants.some(isReady)) return { id: 'harvest', text: 'Что-то созрело! Нажмите на сверкающее растение, чтобы собрать урожай.' };
  if (plants.length === 0 && hasSeeds && save.stats.plantsPlanted === 0) return { id: 'plant', text: 'Нажмите на пустой горшок и посадите первое семя базилика.' };
  if (plants.some((p) => p.moisture < CONFIG.moisture.thirsty)) return { id: 'water', text: 'Растение хочет пить. Возьмите лейку и нажмите на него.' };
  if (hasHarvest && beginner) return { id: 'sell', text: 'Откройте сумку или нажмите на дверь и продайте урожай на рынке.' };
  if (!beginner && plants.length === 0 && !hasSeeds) return { id: 'buy', text: 'Нажмите на рабочий стол, чтобы купить ещё семян.' };
  if (plants.length > 0 && beginner) return { id: 'wait', text: 'Растения растут, даже когда игра закрыта. А пока можно засадить другие горшки.' };

  const level = nextLevel(save);
  if (level) {
    const def = expansionByLevel(level);
    if (save.profile.level >= def.requiredPlayerLevel) return { id: 'expand', text: `Можно готовиться к новому этапу: ${def.name}. Загляните в меню «Стройка».` };
  }
  return null;
}
