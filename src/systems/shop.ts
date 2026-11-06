import { DECORATIONS, EQUIPMENT, FERTILIZERS, POTS, UPGRADES, upgradeById } from '@/data/catalog';
import { PLANTS } from '@/data/plants';
import { decoItemId, fertItemId, potItemId, seedItemId } from '@/data/items';
import { EconomyService } from './economy';
import { seedPrice, upgradeLevel } from './derived';
import { settleProgress } from './progression';
import type { ActionResult, GameEvent, GreenhouseLevel, Price, Rarity, SaveData, UpgradeId } from '@/types/game';

export type ShopSection = 'seeds' | 'pots' | 'equipment' | 'decorations' | 'upgrades';

export const SHOP_SECTIONS: { id: ShopSection; label: string }[] = [
  { id: 'seeds', label: 'Семена и удобрения' },
  { id: 'pots', label: 'Горшки' },
  { id: 'equipment', label: 'Оборудование' },
  { id: 'decorations', label: 'Украшения' },
  { id: 'upgrades', label: 'Улучшения' },
];

export interface ShopEntry {
  id: string;
  section: ShopSection;
  name: string;
  description: string;
  icon: string;
  price: Price | null;
  rarity: Rarity | null;
  /** Null when purchasable; otherwise why not, in plain words. */
  blockedReason: string | null;
  owned: number;
  /** One-off purchases show as installed once owned; stackable ones allow bulk buying. */
  stackable: boolean;
  detail?: string;
}

function gate(save: SaveData, level: number, house: GreenhouseLevel = 1): string | null {
  if (save.profile.level < level) return `Откроется на уровне ${level}`;
  if (save.greenhouseLevel < house) return `Нужна теплица побольше (этап ${house})`;
  return null;
}

export function shopEntries(save: SaveData, section: ShopSection): ShopEntry[] {
  const owned = (id: string) => save.inventory[id] ?? 0;
  switch (section) {
    case 'seeds':
      return [
        ...PLANTS.map((p): ShopEntry => ({
          id: seedItemId(p.id),
          section,
          name: `Семена: ${p.name}`,
          description: p.description,
          icon: `seeds/${p.id}`,
          price: seedPrice(save, p),
          rarity: p.rarity,
          blockedReason: gate(save, p.unlockLevel, p.minGreenhouseLevel),
          owned: owned(seedItemId(p.id)),
          stackable: true,
        })),
        ...FERTILIZERS.map((f): ShopEntry => ({
          id: fertItemId(f.id),
          section,
          name: f.name,
          description: f.description,
          icon: f.icon,
          price: f.price,
          rarity: null,
          blockedReason: gate(save, f.unlockLevel),
          owned: owned(fertItemId(f.id)),
          stackable: true,
        })),
      ];
    case 'pots':
      return POTS.map((d) => ({
        id: potItemId(d.id),
        section,
        name: d.name,
        description: d.description,
        icon: d.sprite,
        price: d.price,
        rarity: null,
        blockedReason: gate(save, d.unlockLevel),
        owned: owned(potItemId(d.id)),
        stackable: true,
      }));
    case 'decorations':
      return DECORATIONS.map((d) => ({
        id: decoItemId(d.id),
        section,
        name: d.name,
        description: d.description,
        icon: d.sprite,
        price: d.price,
        rarity: null,
        blockedReason: gate(save, d.unlockLevel, d.minGreenhouseLevel),
        owned: owned(decoItemId(d.id)) + save.decorations.filter((x) => x.defId === d.id).length,
        stackable: true,
        detail: `+${d.coziness} к уюту`,
      }));
    case 'equipment':
      return EQUIPMENT.map((d) => ({
        id: `equip:${d.id}`,
        section,
        name: d.name,
        description: d.description,
        icon: d.sprite,
        price: d.price,
        rarity: null,
        blockedReason: gate(save, d.unlockLevel, d.minGreenhouseLevel),
        owned: save.equipment[d.id] ? 1 : 0,
        stackable: false,
        detail: d.effectText,
      }));
    case 'upgrades':
      return UPGRADES.map((u) => {
        const level = upgradeLevel(save, u.id);
        const maxed = level >= u.maxLevel;
        const required = u.unlockLevels[level] ?? 0;
        return {
          id: `upgrade:${u.id}`,
          section,
          name: u.name,
          description: u.description,
          icon: u.icon,
          price: maxed ? null : (u.costs[level] ?? null),
          rarity: null,
          blockedReason: maxed ? 'Улучшено полностью' : gate(save, required),
          owned: level,
          stackable: false,
          detail: `${u.effectPerLevel} · Уровень ${level} из ${u.maxLevel}`,
        };
      });
  }
}

export function buy(save: SaveData, entryId: string, quantity: number, now: number): ActionResult {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { ok: false, reason: 'Выберите, сколько купить.' };
  const entry = SHOP_SECTIONS.flatMap((s) => shopEntries(save, s.id)).find((e) => e.id === entryId);
  if (!entry) return { ok: false, reason: 'Это не продаётся.' };
  if (entry.blockedReason) return { ok: false, reason: entry.blockedReason };
  if (!entry.price) return { ok: false, reason: 'Это не продаётся.' };
  if (!entry.stackable && entry.section === 'equipment' && entry.owned > 0) return { ok: false, reason: 'Уже установлено.' };
  if (!entry.stackable && quantity !== 1) return { ok: false, reason: 'Такое можно купить только одно.' };

  const next = structuredClone(save);
  const spend: Price = { currency: entry.price.currency, amount: entry.price.amount * quantity };
  const events: GameEvent[] = [{ type: 'purchased', name: entry.name }];

  if (entry.section === 'equipment') {
    const error = EconomyService.transact(next, { spend: [spend] });
    if (error) return { ok: false, reason: error };
    next.equipment[entryId.slice('equip:'.length)] = { active: true };
  } else if (entry.section === 'upgrades') {
    const id = entryId.slice('upgrade:'.length) as UpgradeId;
    if (!upgradeById(id)) return { ok: false, reason: 'Это не продаётся.' };
    const error = EconomyService.transact(next, { spend: [spend] });
    if (error) return { ok: false, reason: error };
    next.upgrades[id] = upgradeLevel(next, id) + 1;
  } else {
    const error = EconomyService.transact(next, { spend: [spend], grant: [{ itemId: entryId, quantity }] });
    if (error) return { ok: false, reason: error };
  }
  settleProgress(next, now, events);
  return { ok: true, save: next, events };
}

export function setEquipmentActive(save: SaveData, id: string, active: boolean): ActionResult {
  if (!save.equipment[id]) return { ok: false, reason: 'У вас этого нет.' };
  const next = structuredClone(save);
  next.equipment[id] = { active };
  return { ok: true, save: next, events: [] };
}
