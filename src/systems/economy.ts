import { CONFIG } from '@/data/config';
import { getItemInfo } from '@/data/items';
import { unitSellPrice } from './derived';
import type { ActionResult, Currency, ItemRequirement, Price, SaveData } from '@/types/game';

export interface Transaction {
  spend?: Price[];
  earn?: Price[];
  consume?: ItemRequirement[];
  grant?: ItemRequirement[];
}

const isCount = (n: number) => Number.isSafeInteger(n) && n > 0;
const isAmount = (n: number) => Number.isSafeInteger(n) && n >= 0;

export const CURRENCY_LABEL: Record<Currency, string> = { coins: 'монет', gems: 'самоцветов' };

function validateTransaction(save: SaveData, tx: Transaction): string | null {
  const totals: Record<Currency, number> = { coins: 0, gems: 0 };
  for (const p of tx.spend ?? []) {
    if (!isAmount(p.amount)) return 'С этой ценой что-то не так.';
    totals[p.currency] += p.amount;
  }
  for (const key of Object.keys(totals) as Currency[]) {
    if (save.currencies[key] < totals[key]) return `Не хватает ${CURRENCY_LABEL[key]}.`;
  }
  for (const p of tx.earn ?? []) {
    if (!isAmount(p.amount)) return 'С этой наградой что-то не так.';
  }
  const needed = new Map<string, number>();
  for (const r of tx.consume ?? []) {
    if (!isCount(r.quantity)) return 'С этим количеством что-то не так.';
    needed.set(r.itemId, (needed.get(r.itemId) ?? 0) + r.quantity);
  }
  for (const [itemId, qty] of needed) {
    if ((save.inventory[itemId] ?? 0) < qty) {
      return `Нужно: ${qty} × ${getItemInfo(itemId)?.name ?? itemId}.`;
    }
  }
  for (const r of tx.grant ?? []) {
    if (!isCount(r.quantity)) return 'С этим количеством что-то не так.';
  }
  return null;
}

function applyValidated(save: SaveData, tx: Transaction): void {
  for (const p of tx.spend ?? []) save.currencies[p.currency] -= p.amount;
  for (const p of tx.earn ?? []) save.currencies[p.currency] += p.amount;
  for (const r of tx.consume ?? []) {
    const left = (save.inventory[r.itemId] ?? 0) - r.quantity;
    if (left > 0) save.inventory[r.itemId] = left;
    else delete save.inventory[r.itemId];
  }
  for (const r of tx.grant ?? []) save.inventory[r.itemId] = (save.inventory[r.itemId] ?? 0) + r.quantity;
}

/**
 * The single gateway for currency and item changes.
 *
 * `transact` either applies everything or nothing, so a purchase can't take the
 * money and fail to deliver, and no balance can go negative.
 */
export const EconomyService = {
  canAfford(save: SaveData, prices: Price[]): boolean {
    return validateTransaction(save, { spend: prices }) === null;
  },

  check(save: SaveData, tx: Transaction): string | null {
    return validateTransaction(save, tx);
  },

  /** Mutates `save`, which the caller must own. Returns an error message, or null on success. */
  transact(save: SaveData, tx: Transaction): string | null {
    const error = validateTransaction(save, tx);
    if (error) return error;
    applyValidated(save, tx);
    return null;
  },

  sell(save: SaveData, itemId: string, quantity: number): ActionResult {
    if (!isCount(quantity)) return { ok: false, reason: 'Выберите, сколько продать.' };
    const unit = unitSellPrice(save, itemId);
    if (unit === null) return { ok: false, reason: 'Это нельзя продать.' };
    const next = structuredClone(save);
    const coins = unit * quantity;
    const error = EconomyService.transact(next, {
      consume: [{ itemId, quantity }],
      earn: [{ currency: 'coins', amount: coins }],
    });
    if (error) return { ok: false, reason: error };
    next.stats.coinsEarned += coins;
    next.stats.itemsSold += quantity;
    next.profile.xp += Math.floor(coins * CONFIG.economy.sellXpPerCoins);
    return { ok: true, save: next, events: [{ type: 'sold', coins, quantity }] };
  },
};
