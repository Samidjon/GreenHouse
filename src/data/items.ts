import { plantById, RARITY_LABELS, RARITY_ORDER } from './plants';
import { decorationById, equipmentById, fertilizerById, mutationById, mutationLabel, potById, TOOLS } from './catalog';
import type { Rarity } from '@/types/game';

export type ItemCategory = 'seed' | 'harvest' | 'fertilizer' | 'tool' | 'decoration' | 'equipment' | 'pot';

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  seed: 'Семена',
  harvest: 'Урожай',
  fertilizer: 'Удобрения',
  pot: 'Горшки',
  tool: 'Инструменты',
  decoration: 'Украшения',
  equipment: 'Оборудование',
};

export interface ItemInfo {
  id: string;
  category: ItemCategory;
  /** The catalog id, e.g. `basil` for `seed:basil`. */
  refId: string;
  name: string;
  description: string;
  /** Manifest key for the icon. */
  icon: string;
  rarity: Rarity | null;
  /** Base value per unit before upgrades, if sellable. */
  baseSellPrice: number | null;
  mutation: string | null;
}

export const seedItemId = (speciesId: string) => `seed:${speciesId}`;
export const harvestItemId = (speciesId: string, mutation: string | null) =>
  mutation ? `harvest:${speciesId}:${mutation}` : `harvest:${speciesId}`;
export const fertItemId = (id: string) => `fert:${id}`;
export const potItemId = (id: string) => `pot:${id}`;
export const decoItemId = (id: string) => `deco:${id}`;

/** Resolves any item id to display data. Returns null for ids this build doesn't know. */
export function getItemInfo(itemId: string): ItemInfo | null {
  const [prefix, ref, extra] = itemId.split(':');
  if (!prefix || !ref) return null;
  switch (prefix) {
    case 'seed': {
      const p = plantById(ref);
      if (!p) return null;
      return { id: itemId, category: 'seed', refId: ref, name: `Семена: ${p.name}`, description: p.description, icon: `seeds/${ref}`, rarity: p.rarity, baseSellPrice: null, mutation: null };
    }
    case 'harvest': {
      const p = plantById(ref);
      if (!p) return null;
      const m = extra ? mutationById(extra) : undefined;
      if (extra && !m) return null;
      return {
        id: itemId,
        category: 'harvest',
        refId: ref,
        name: m ? `${p.name}, ${mutationLabel(m.name)}` : p.name,
        description: m ? m.description : `Свежий урожай: ${p.name}. Можно нести на рынок.`,
        icon: `${p.spriteKey}/HARVESTABLE`,
        rarity: p.rarity,
        baseSellPrice: p.sellPrice * (m ? m.sellMultiplier : 1),
        mutation: m ? m.id : null,
      };
    }
    case 'fert': {
      const f = fertilizerById(ref);
      if (!f) return null;
      return { id: itemId, category: 'fertilizer', refId: ref, name: f.name, description: f.description, icon: f.icon, rarity: null, baseSellPrice: null, mutation: null };
    }
    case 'pot': {
      const d = potById(ref);
      if (!d) return null;
      return { id: itemId, category: 'pot', refId: ref, name: d.name, description: d.description, icon: d.sprite, rarity: null, baseSellPrice: null, mutation: null };
    }
    case 'deco': {
      const d = decorationById(ref);
      if (!d) return null;
      return { id: itemId, category: 'decoration', refId: ref, name: d.name, description: d.description, icon: d.sprite, rarity: null, baseSellPrice: null, mutation: null };
    }
    case 'equip': {
      const d = equipmentById(ref);
      if (!d) return null;
      return { id: itemId, category: 'equipment', refId: ref, name: d.name, description: `${d.description} ${d.effectText}`, icon: d.sprite, rarity: null, baseSellPrice: null, mutation: null };
    }
    case 'tool': {
      const t = TOOLS.find((x) => x.id === ref);
      if (!t) return null;
      return { id: itemId, category: 'tool', refId: ref, name: t.name, description: t.description, icon: t.icon, rarity: null, baseSellPrice: null, mutation: null };
    }
    default:
      return null;
  }
}

export type ItemSort = 'category' | 'name' | 'quantity' | 'value' | 'rarity';

export function compareItems(
  a: { info: ItemInfo; quantity: number },
  b: { info: ItemInfo; quantity: number },
  sort: ItemSort,
): number {
  const byName = a.info.name.localeCompare(b.info.name);
  switch (sort) {
    case 'name':
      return byName;
    case 'quantity':
      return b.quantity - a.quantity || byName;
    case 'value':
      return (b.info.baseSellPrice ?? -1) - (a.info.baseSellPrice ?? -1) || byName;
    case 'rarity': {
      const rank = (r: Rarity | null) => (r ? RARITY_ORDER.indexOf(r) : -1);
      return rank(b.info.rarity) - rank(a.info.rarity) || byName;
    }
    default:
      return a.info.category.localeCompare(b.info.category) || byName;
  }
}

export { RARITY_LABELS };
