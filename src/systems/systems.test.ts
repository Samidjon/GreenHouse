import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/data/config';
import { ACHIEVEMENTS, COLLECTION_MILESTONES, DECORATIONS } from '@/data/catalog';
import { PLANTS, plantById } from '@/data/plants';
import { harvestItemId, seedItemId } from '@/data/items';
import { ALL_SLOTS, WORLD, slotsForLevel } from '@/data/world';
import { checkPlacement, moveDecoration, placeDecoration, removeDecoration } from './decorations';
import { EconomyService } from './economy';
import { environmentContext, getEnvironment, weatherAt } from './environment';
import { expandGreenhouse } from './expansion';
import { alignDown, describeModifiers, effectiveGrowthRate, simulate, stageForGrowth, stageIndexForGrowth } from './growth';
import { createNewSave } from './newGame';
import { currentGoal } from './goals';
import { sellItem } from './market';
import { catchUp } from './offline';
import { changePot, fertilizePlant, harvestPlant, plantSeed, uprootPlant, waterAll, waterPlant } from './plantActions';
import { settleProgress, xpForLevel } from './progression';
import { buy, SHOP_SECTIONS, shopEntries } from './shop';
import type { ActionResult, GameEvent, SaveData } from '@/types/game';

const T0 = 1_800_000_000_000; // Aligned to no particular step, on purpose.
const fixedRandom = () => 0.999; // Never mutates.

function unwrap(r: ActionResult): Extract<ActionResult, { ok: true }> {
  if (!r.ok) throw new Error(`Expected success, got: ${r.reason}`);
  return r;
}

const fresh = (patch: Partial<SaveData> = {}): SaveData => ({ ...createNewSave(T0, 42), ...patch });

function planted(species = 'basil', slot = 'a1', patch: Partial<SaveData> = {}): { save: SaveData; id: string } {
  const base = fresh(patch);
  base.greenhouseLevel = Math.max(base.greenhouseLevel, plantById(species)!.minGreenhouseLevel) as SaveData['greenhouseLevel'];
  base.inventory[seedItemId(species)] = 5;
  const save = unwrap(plantSeed(base, slot, species, T0, fixedRandom)).save;
  const id = Object.keys(save.plants)[0]!;
  return { save, id };
}

function ready(species = 'basil'): { save: SaveData; id: string } {
  const { save, id } = planted(species);
  save.plants[id]!.growth = 1;
  return { save, id };
}

describe('catalog integrity', () => {
  it('meets the content minimums', () => {
    expect(PLANTS.length).toBeGreaterThanOrEqual(10);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(3);
    expect(slotsForLevel(1).length).toBe(6);
    expect(COLLECTION_MILESTONES.at(-1)!.speciesRequired).toBe(PLANTS.length);
  });

  it('has unique ids', () => {
    expect(new Set(PLANTS.map((p) => p.id)).size).toBe(PLANTS.length);
    expect(new Set(ALL_SLOTS.map((s) => s.id)).size).toBe(ALL_SLOTS.length);
  });

  it('can start with the seeds it gives you', () => {
    expect(plantById('basil')!.unlockLevel).toBe(1);
  });

  it('every species is unlockable before the level cap', () => {
    for (const p of PLANTS) expect(p.unlockLevel).toBeLessThanOrEqual(CONFIG.progression.maxLevel);
  });
});

describe('growth stages', () => {
  it('maps growth to all six stages', () => {
    expect([0, 0.1, 0.25, 0.5, 0.8, 1].map(stageForGrowth)).toEqual(['SEED', 'SPROUT', 'SEEDLING', 'GROWING', 'MATURE', 'HARVESTABLE']);
    expect(stageForGrowth(0.999)).toBe('MATURE');
  });
});

describe('simulation', () => {
  it('reaches full growth from timestamps alone', () => {
    const { save, id } = planted();
    const later = simulate(save, T0 + 10 * 60 * 1000).save;
    expect(later.plants[id]!.growth).toBe(1);
  });

  it('gives identical results for one long jump and many small ticks', () => {
    const { save } = planted('mint');
    const end = T0 + 47 * 60 * 1000 + 3000;

    const jumped = simulate(save, end).save;

    let stepped = save;
    for (let t = T0; t < end; t += 1370) stepped = simulate(stepped, t).save;
    stepped = simulate(stepped, end).save;

    expect(stepped.plants).toEqual(jumped.plants);
    expect(stepped.tank).toBe(jumped.tank);
    expect(stepped.simulatedUntil).toBe(jumped.simulatedUntil);
  });

  it('advances only on aligned step boundaries', () => {
    const { save } = planted();
    const later = simulate(save, T0 + 12_345).save;
    expect(later.simulatedUntil % (CONFIG.sim.stepSec * 1000)).toBe(0);
  });

  it('does not mutate its input', () => {
    const { save, id } = planted();
    const snapshot = structuredClone(save);
    simulate(save, T0 + 3_600_000);
    expect(save).toEqual(snapshot);
    expect(save.plants[id]!.growth).toBe(0);
  });

  it('dries the soil and slows, but never stops, a neglected plant', () => {
    const { save, id } = planted('moth_orchid', 'a1');
    const after = simulate(save, T0 + 20 * 3_600_000).save.plants[id]!;
    expect(after.moisture).toBeLessThan(CONFIG.moisture.onPlanting);
    expect(after.growth).toBeGreaterThan(0);
  });

  it('never kills a plant: health stops at the floor', () => {
    const { save, id } = planted('ghost_orchid');
    save.plants[id]!.moisture = 0;
    const after = simulate(save, T0 + 23 * 3_600_000).save.plants[id]!;
    expect(after).toBeDefined();
    expect(after.health).toBe(CONFIG.health.floor);
  });

  it('recovers neglected plants and credits the stat exactly once', () => {
    const { save, id } = planted('ghost_orchid');
    save.plants[id]!.health = 20;
    save.plants[id]!.neglected = true;
    save.plants[id]!.moisture = 100;
    const after = simulate(save, T0 + 2 * 3_600_000).save;
    expect(after.plants[id]!.health).toBeGreaterThanOrEqual(CONFIG.health.recoveredAt);
    expect(after.stats.plantsRecovered).toBe(1);
    expect(after.plants[id]!.neglected).toBe(false);
  });

  it('leaves ready plants alone while they wait', () => {
    const { save, id } = ready();
    const before = { ...save.plants[id]! };
    const after = simulate(save, T0 + 20 * 3_600_000).save.plants[id]!;
    expect(after.moisture).toBe(before.moisture);
    expect(after.health).toBe(before.health);
  });

  it('fertilizer speeds growth and runs out', () => {
    const { save, id } = planted('fern');
    save.inventory['fert:compost'] = 1;
    save.plants[id]!.moisture = 100;
    const fed = unwrap(fertilizePlant(save, id, 'compost', T0)).save;
    const window = T0 + 5 * 60 * 1000;
    expect(simulate(fed, window).save.plants[id]!.growth).toBeGreaterThan(simulate(save, window).save.plants[id]!.growth);
    expect(simulate(fed, T0 + 11 * 60 * 1000).save.plants[id]!.fertilizer).toBeNull();
  });

  it('the details card and the simulation agree on the growth rate', () => {
    const { save, id } = planted('basil');
    const plant = save.plants[id]!;
    const def = plantById('basil')!;
    const env = getEnvironment(T0, environmentContext(save));
    const product = describeModifiers(plant, def, env, save).reduce((m, x) => m * x.multiplier, 1);
    expect(product).toBeCloseTo(effectiveGrowthRate(plant, def, env, save), 10);
  });
});

describe('environment', () => {
  it('is deterministic for a given time and seed', () => {
    const ctx = environmentContext(fresh());
    expect(getEnvironment(T0, ctx)).toEqual(getEnvironment(T0, ctx));
  });

  it('cycles day and night', () => {
    const ctx = environmentContext(fresh());
    const noon = new Date(2027, 0, 15, 12, 0).getTime();
    const lateNight = new Date(2027, 0, 15, 0, 30).getTime();
    expect(getEnvironment(noon, ctx).phase).toBe('day');
    expect(getEnvironment(lateNight, ctx).phase).toBe('night');
    expect(getEnvironment(lateNight, ctx).sun).toBe(0);
  });

  it('shows the same time as the real clock', () => {
    const ctx = environmentContext(fresh());
    for (const [hour, minute] of [[0, 0], [7, 5], [14, 37], [23, 59]] as const) {
      const env = getEnvironment(new Date(2027, 5, 15, hour, minute, 30).getTime(), ctx);
      expect([env.hour, env.minute]).toEqual([hour, minute]);
    }
  });

  it('never calls it sunny at night', () => {
    const base = new Date(2027, 0, 15, 1, 0).getTime();
    for (let seed = 0; seed < 200; seed++) {
      expect(getEnvironment(base, { ...environmentContext(fresh()), seed }).weather).not.toBe('sunny');
    }
  });

  it('every weather state occurs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(weatherAt(T0 + i * CONFIG.time.weatherSlotSec * 1000, 42));
    expect(seen).toEqual(new Set(['clear', 'sunny', 'cloudy', 'rain']));
  });
});

describe('offline progress', () => {
  it('summarises a real absence and says what is ready', () => {
    const { save } = planted();
    const r = catchUp(save, T0 + 30 * 60 * 1000);
    expect(r.summary?.newlyReady).toEqual([{ speciesId: 'basil', count: 1 }]);
    expect(r.summary?.capped).toBe(false);
  });

  it('caps credited time at the configured maximum', () => {
    const { save, id } = planted('ghost_orchid', 'a1');
    const away = (CONFIG.sim.maxOfflineSec + 5 * 24 * 3600) * 1000;
    const capped = catchUp(save, T0 + away);
    expect(capped.summary?.capped).toBe(true);
    expect(capped.summary?.simulatedSec).toBe(CONFIG.sim.maxOfflineSec);
    const exactlyCap = simulate(save, T0 + CONFIG.sim.maxOfflineSec * 1000).save;
    expect(capped.save.plants[id]!.growth).toBeCloseTo(exactlyCap.plants[id]!.growth, 6);
    expect(capped.save.simulatedUntil).toBe(alignDown(T0 + away));
  });

  it('grants nothing when the clock went backwards', () => {
    const { save, id } = planted();
    const r = catchUp(save, T0 - 3_600_000);
    expect(r.save.plants[id]!.growth).toBe(0);
    expect(r.summary).toBeNull();
    expect(r.save.simulatedUntil).toBeLessThanOrEqual(T0 - 3_600_000);
  });

  it('rejects NaN time without change', () => {
    const { save } = planted();
    expect(simulate(save, Number.NaN).save).toBe(save);
  });

  it('does not nag about short gaps', () => {
    const { save } = planted();
    expect(catchUp(save, T0 + 30_000).summary).toBeNull();
  });
});

describe('planting', () => {
  it('consumes a seed and fills the slot', () => {
    const { save, id } = planted();
    expect(save.inventory['seed:basil']).toBe(4);
    expect(save.plants[id]!.slotId).toBe('a1');
    expect(save.stats.plantsPlanted).toBe(1);
  });

  it('refuses occupied, locked and unaffordable cases', () => {
    const { save } = planted();
    expect(plantSeed(save, 'a1', 'basil', T0, fixedRandom).ok).toBe(false);
    expect(plantSeed(save, 'b1', 'basil', T0, fixedRandom).ok).toBe(false);
    expect(plantSeed(fresh(), 'a2', 'mint', T0, fixedRandom).ok).toBe(false);
    const big = fresh();
    big.inventory['seed:monstera'] = 1;
    expect(plantSeed(big, 'a1', 'monstera', T0, fixedRandom).ok).toBe(false);
  });

  it('rolls mutation once, boosted by lens and brass pot, and never for high rolls', () => {
    const { save, id } = planted();
    expect(save.plants[id]!.mutation).toBeNull();
    const base = fresh();
    base.inventory['seed:basil'] = 1;
    const lucky = unwrap(plantSeed(base, 'a1', 'basil', T0, () => 0)).save;
    expect(Object.values(lucky.plants)[0]!.mutation).toBe('moonlit');
  });
});

describe('watering and feeding', () => {
  it('uses tank water and raises moisture up to 100', () => {
    const { save, id } = planted();
    const tank = save.tank;
    const after = unwrap(waterPlant(save, id, T0)).save;
    expect(after.tank).toBe(tank - 1);
    expect(after.plants[id]!.moisture).toBe(100);
    expect(waterPlant(after, id, T0).ok).toBe(false);
    save.plants[id]!.moisture = 10;
    expect(unwrap(waterPlant(save, id, T0)).save.plants[id]!.moisture).toBe(10 + CONFIG.moisture.baseWaterAmount);
  });

  it('refuses when the tank is empty', () => {
    const { save, id } = planted();
    save.tank = 0.5;
    expect(waterPlant(save, id, T0).ok).toBe(false);
  });

  it('water all needs the hose and stops when the tank runs dry', () => {
    const { save } = planted();
    expect(waterAll(save, T0).ok).toBe(false);
    save.equipment['hose'] = { active: true };
    save.inventory['seed:basil'] = 3;
    let s = save;
    for (const slot of ['a2', 'a3', 'a4']) s = unwrap(plantSeed(s, slot, 'basil', T0, fixedRandom)).save;
    s.tank = 2;
    const after = unwrap(waterAll(s, T0));
    expect(after.save.tank).toBe(0);
    expect(after.events.filter((e) => e.type === 'watered')).toHaveLength(2);
  });

  it('won’t stack fertilizer but tonic always works', () => {
    const { save, id } = planted();
    save.inventory['fert:compost'] = 2;
    save.inventory['fert:tonic'] = 1;
    save.plants[id]!.health = 20;
    const fed = unwrap(fertilizePlant(save, id, 'compost', T0)).save;
    expect(fed.plants[id]!.fertilizer?.id).toBe('compost');
    expect(fertilizePlant(fed, id, 'compost', T0).ok).toBe(false);
    const tonic = unwrap(fertilizePlant(fed, id, 'tonic', T0)).save;
    expect(tonic.plants[id]!.health).toBe(90);
    expect(tonic.plants[id]!.fertilizer?.id).toBe('compost');
  });

  it('fertilizer needs inventory', () => {
    const { save, id } = planted();
    delete save.inventory['fert:compost'];
    expect(fertilizePlant(save, id, 'compost', T0).ok).toBe(false);
  });
});

describe('harvesting', () => {
  it('pays out once and only once', () => {
    const { save, id } = ready();
    const first = unwrap(harvestPlant(save, id, T0));
    expect(first.save.plants[id]).toBeUndefined();
    const units = first.save.inventory['harvest:basil']!;
    expect(units).toBeGreaterThanOrEqual(2);
    const second = harvestPlant(first.save, id, T0);
    expect(second.ok).toBe(false);
    // Replaying against the stale state yields the same result rather than a double payout.
    const replay = unwrap(harvestPlant(save, id, T0));
    expect(replay.save.inventory['harvest:basil']).toBe(units);
  });

  it('refuses unripe plants', () => {
    const { save, id } = planted();
    expect(harvestPlant(save, id, T0).ok).toBe(false);
  });

  it('records discovery, totals, XP and rewards', () => {
    const { save, id } = ready();
    const r = unwrap(harvestPlant(save, id, T0));
    const entry = r.save.encyclopedia['basil']!;
    expect(entry.firstDiscoveredAt).toBe(T0);
    expect(entry.totalHarvested).toBe(r.save.inventory['harvest:basil']);
    expect(r.events.some((e) => e.type === 'discovery')).toBe(true);
    expect(r.save.achievements['first_harvest']).toBeDefined();
  });

  it('files mutated harvests separately and worth more', () => {
    const { save, id } = ready();
    save.plants[id]!.mutation = 'golden';
    const r = unwrap(harvestPlant(save, id, T0));
    expect(r.save.inventory[harvestItemId('basil', 'golden')]).toBeGreaterThan(0);
    expect(r.save.inventory['harvest:basil']).toBeUndefined();
    expect(r.save.encyclopedia['basil']!.mutations).toEqual(['golden']);
    expect(r.save.stats.mutationsFound).toBe(1);
  });

  it('poor health costs one unit but never all of it', () => {
    const { save, id } = ready();
    save.plants[id]!.health = 15;
    const r = unwrap(harvestPlant(save, id, T0));
    expect(r.save.inventory['harvest:basil']).toBeGreaterThanOrEqual(1);
  });
});

describe('uproot and pots', () => {
  it('returns an unsprouted seed', () => {
    const { save, id } = planted();
    const after = unwrap(uprootPlant(save, id, T0)).save;
    expect(after.inventory['seed:basil']).toBe(5);
    expect(after.plants[id]).toBeUndefined();
  });

  it('does not refund a grown plant', () => {
    const { save, id } = planted();
    save.plants[id]!.growth = 0.5;
    expect(stageIndexForGrowth(0.5)).toBe(3);
    expect(unwrap(uprootPlant(save, id, T0)).save.inventory['seed:basil']).toBe(4);
  });

  it('swaps pots, returning the old one', () => {
    const save = fresh();
    save.inventory['pot:glazed'] = 1;
    const after = unwrap(changePot(save, 'a1', 'glazed', T0)).save;
    expect(after.slots['a1']!.potId).toBe('glazed');
    expect(after.inventory['pot:glazed']).toBeUndefined();
    expect(after.inventory['pot:old_clay']).toBe(1);
    expect(changePot(after, 'a2', 'glazed', T0).ok).toBe(false);
  });
});

describe('economy', () => {
  it('sells and pays out, never overselling', () => {
    const save = fresh();
    save.inventory['harvest:basil'] = 3;
    const coins = save.currencies.coins;
    const after = unwrap(EconomyService.sell(save, 'harvest:basil', 2)).save;
    expect(after.currencies.coins).toBe(coins + 12);
    expect(after.inventory['harvest:basil']).toBe(1);
    expect(EconomyService.sell(after, 'harvest:basil', 2).ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects a bad sell quantity: %s', (q) => {
    const save = fresh();
    save.inventory['harvest:basil'] = 3;
    expect(EconomyService.sell(save, 'harvest:basil', q).ok).toBe(false);
  });

  it('refuses to sell seeds or tools', () => {
    expect(EconomyService.sell(fresh(), 'seed:basil', 1).ok).toBe(false);
    expect(EconomyService.sell(fresh(), 'tool:trowel', 1).ok).toBe(false);
  });

  it('is atomic: failed transactions change nothing', () => {
    const save = fresh();
    const snapshot = structuredClone(save);
    const error = EconomyService.transact(save, {
      spend: [{ currency: 'coins', amount: 10 }],
      consume: [{ itemId: 'seed:ghost_orchid', quantity: 1 }],
    });
    expect(error).not.toBeNull();
    expect(save).toEqual(snapshot);
  });

  it('adds up several charges in the same currency before approving', () => {
    const save = fresh();
    save.currencies.coins = 10;
    expect(EconomyService.check(save, { spend: [{ currency: 'coins', amount: 6 }, { currency: 'coins', amount: 6 }] })).not.toBeNull();
  });

  it('adds up several consumes of the same item', () => {
    const save = fresh();
    save.inventory['seed:basil'] = 3;
    expect(EconomyService.check(save, { consume: [{ itemId: 'seed:basil', quantity: 2 }, { itemId: 'seed:basil', quantity: 2 }] })).not.toBeNull();
  });

  it('refuses a negative price rather than paying the buyer', () => {
    const save = fresh();
    expect(EconomyService.check(save, { spend: [{ currency: 'coins', amount: -500 }] })).not.toBeNull();
  });
});

describe('shop', () => {
  it('lists five sections of priced, described items', () => {
    const save = fresh();
    expect(SHOP_SECTIONS).toHaveLength(5);
    for (const s of SHOP_SECTIONS) {
      const entries = shopEntries(save, s.id);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(e.description.length).toBeGreaterThan(0);
        expect(e.price).not.toBeNull();
      }
    }
  });

  it('offers at least five upgrades', () => {
    expect(shopEntries(fresh(), 'upgrades').length).toBeGreaterThanOrEqual(5);
  });

  it('buys, charges and delivers', () => {
    const save = fresh({ currencies: { coins: 100, gems: 0 } });
    const after = unwrap(buy(save, 'seed:basil', 2, T0)).save;
    expect(after.currencies.coins).toBe(84);
    expect(after.inventory['seed:basil']).toBe(5);
  });

  it('refuses when locked or too expensive, charging nothing', () => {
    const save = fresh({ currencies: { coins: 5, gems: 0 } });
    expect(buy(save, 'seed:basil', 1, T0).ok).toBe(false);
    expect(buy({ ...save, currencies: { coins: 100000, gems: 0 } }, 'seed:lavender', 1, T0).ok).toBe(false);
    expect(buy(save, 'seed:nonexistent', 1, T0).ok).toBe(false);
  });

  it('won’t let quantity tricks produce a credit', () => {
    const save = fresh({ currencies: { coins: 100, gems: 0 } });
    for (const q of [0, -5, 1.5, Number.NaN]) expect(buy(save, 'seed:basil', q, T0).ok).toBe(false);
  });

  it('applies upgrades level by level to the cap', () => {
    let save = fresh({ currencies: { coins: 1_000_000, gems: 0 } });
    save.profile.level = 40;
    for (let i = 0; i < 4; i++) save = unwrap(buy(save, 'upgrade:water_tank', 1, T0)).save;
    expect(save.upgrades.water_tank).toBe(4);
    expect(buy(save, 'upgrade:water_tank', 1, T0).ok).toBe(false);
  });

  it('won’t sell the same equipment twice', () => {
    let save = fresh({ currencies: { coins: 100_000, gems: 0 } });
    save.profile.level = 40;
    save = unwrap(buy(save, 'equip:grow_lamps', 1, T0)).save;
    expect(save.equipment['grow_lamps']?.active).toBe(true);
    expect(buy(save, 'equip:grow_lamps', 1, T0).ok).toBe(false);
  });

  it('equipment changes the environment', () => {
    const save = fresh();
    const plain = getEnvironment(T0, environmentContext(save));
    save.equipment['grow_lamps'] = { active: true };
    expect(getEnvironment(T0, environmentContext(save)).light).toBeCloseTo(plain.light + CONFIG.light.lampBonus, 6);
  });
});

describe('progression', () => {
  it('levels up, carrying XP over and paying a coin reward', () => {
    const save = fresh();
    const coins = save.currencies.coins;
    save.profile.xp = xpForLevel(1) + 3;
    const events: GameEvent[] = [];
    settleProgress(save, T0, events);
    expect(save.profile.level).toBe(2);
    expect(save.profile.xp).toBe(3);
    expect(save.currencies.coins).toBeGreaterThan(coins);
  });

  it('grants each achievement exactly once', () => {
    const save = fresh();
    save.stats.plantsPlanted = 1;
    const first: GameEvent[] = [];
    settleProgress(save, T0, first);
    const coins = save.currencies.coins;
    const second: GameEvent[] = [];
    settleProgress(save, T0, second);
    expect(first.filter((e) => e.type === 'achievement')).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(save.currencies.coins).toBe(coins);
  });

  it('rewards collection milestones', () => {
    const save = fresh();
    for (const p of PLANTS.slice(0, 3)) save.encyclopedia[p.id] = { firstDiscoveredAt: T0, totalHarvested: 1, mutations: [] };
    const events: GameEvent[] = [];
    settleProgress(save, T0, events);
    expect(save.collectionRewards).toContain('col_3');
    expect(save.inventory['fert:compost']).toBe(1 + 3);
  });

  it('stops at the level cap', () => {
    const save = fresh();
    save.profile.level = CONFIG.progression.maxLevel;
    save.profile.xp = 1e9;
    settleProgress(save, T0, []);
    expect(save.profile.level).toBe(CONFIG.progression.maxLevel);
  });
});

describe('selling', () => {
  it('settles level-ups and achievements straight away', () => {
    const save = fresh();
    save.inventory['harvest:ghost_orchid'] = 1;
    save.stats.coinsEarned = 999;
    save.profile.xp = xpForLevel(1) - 1;
    const r = unwrap(sellItem(save, 'harvest:ghost_orchid', 1, T0));
    expect(r.save.profile.level).toBeGreaterThan(1);
    expect(r.save.achievements['market_day']).toBeDefined();
    expect(r.events.some((e) => e.type === 'levelUp')).toBe(true);
    expect(r.events.some((e) => e.type === 'achievement')).toBe(true);
  });

  it('passes refusals through', () => {
    expect(sellItem(fresh(), 'harvest:basil', 1, T0).ok).toBe(false);
  });
});

describe('never stuck', () => {
  const broke = (): SaveData => {
    const save = fresh({ currencies: { coins: 3, gems: 0 } });
    delete save.inventory['seed:basil'];
    return save;
  };

  it('leaves seeds when there is no way to continue', () => {
    const save = broke();
    const events: GameEvent[] = [];
    settleProgress(save, T0, events);
    expect(save.inventory['seed:basil']).toBe(CONFIG.economy.rescueSeeds);
    expect(events.some((e) => e.type === 'rescued')).toBe(true);
  });

  it.each([
    ['coins for a seed', (s: SaveData) => void (s.currencies.coins = 8)],
    ['something to sell', (s: SaveData) => void (s.inventory['harvest:mint'] = 1)],
    ['a seed to plant', (s: SaveData) => void (s.inventory['seed:mint'] = 1)],
  ])('stays out of the way when the player has %s', (_label, give) => {
    const save = broke();
    give(save);
    const events: GameEvent[] = [];
    settleProgress(save, T0, events);
    expect(events.some((e) => e.type === 'rescued')).toBe(false);
  });

  it('stays out of the way while something is growing', () => {
    const { save } = planted();
    save.currencies.coins = 0;
    delete save.inventory['seed:basil'];
    const events: GameEvent[] = [];
    settleProgress(save, T0, events);
    expect(events.some((e) => e.type === 'rescued')).toBe(false);
  });
});

describe('decorations', () => {
  const free = () => {
    const save = fresh();
    save.inventory['deco:stool'] = 2;
    save.inventory['deco:lantern'] = 1;
    return save;
  };

  it('every decoration fits somewhere in the starting room or its required stage', () => {
    for (const def of DECORATIONS) {
      const save = { ...fresh(), greenhouseLevel: def.minGreenhouseLevel };
      let fits = false;
      for (let x = 0; x < 3600 && !fits; x += 20) fits = checkPlacement(save, def, x, 300, null).valid;
      expect(fits, def.id).toBe(true);
    }
  });

  it('places on the floor line, consuming the item', () => {
    const after = unwrap(placeDecoration(free(), 'stool', 1200, 300, false, T0)).save;
    expect(after.decorations[0]).toMatchObject({ defId: 'stool', x: 1200, y: WORLD.floorY });
    expect(after.inventory['deco:stool']).toBe(1);
    expect(after.stats.decorationsPlaced).toBe(1);
  });

  it('refuses without the item, or on top of something', () => {
    const save = free();
    expect(placeDecoration(fresh(), 'stool', 1200, 0, false, T0).ok).toBe(false);
    const first = unwrap(placeDecoration(save, 'stool', 1200, 0, false, T0)).save;
    expect(placeDecoration(first, 'stool', 1210, 0, false, T0).ok).toBe(false);
    expect(placeDecoration(save, 'stool', 110, 0, false, T0).ok).toBe(false); // the door
  });

  it('refuses to crowd a planting spot', () => {
    const check = checkPlacement(free(), { ...DECORATIONS.find((d) => d.id === 'hanging_ivy')! }, 390, 100, null);
    expect(check.valid).toBe(false);
  });

  it('clamps inside the world', () => {
    const check = checkPlacement(free(), DECORATIONS.find((d) => d.id === 'stool')!, 99_999, 0, null);
    expect(check.x).toBeLessThanOrEqual(1280);
  });

  it('moves without colliding with itself, and returns on removal', () => {
    const placed = unwrap(placeDecoration(free(), 'stool', 1200, 0, false, T0)).save;
    const id = placed.decorations[0]!.id;
    const moved = unwrap(moveDecoration(placed, id, 1215, 0, true, T0)).save;
    expect(moved.decorations[0]).toMatchObject({ id, x: 1215, flipped: true });
    const removed = unwrap(removeDecoration(moved, id, T0)).save;
    expect(removed.decorations).toHaveLength(0);
    expect(removed.inventory['deco:stool']).toBe(2);
  });

  it('coziness raises growth', () => {
    const { save, id } = planted();
    const def = plantById('basil')!;
    const env = getEnvironment(T0, environmentContext(save));
    const before = effectiveGrowthRate(save.plants[id]!, def, env, save);
    save.decorations.push({ id: 'd1', defId: 'stool', x: 1200, y: WORLD.floorY, flipped: false });
    expect(effectiveGrowthRate(save.plants[id]!, def, env, save)).toBeGreaterThan(before);
  });
});

describe('expansion', () => {
  const rich = (): SaveData => {
    const save = fresh({ currencies: { coins: 1_000_000, gems: 100 } });
    save.profile.level = 40;
    Object.assign(save.inventory, { 'harvest:lavender': 3, 'harvest:fern': 4, 'harvest:aloe': 2, 'harvest:moth_orchid': 3 });
    return save;
  };

  it('requires level, coins and special items', () => {
    const save = fresh({ currencies: { coins: 1_000_000, gems: 0 } });
    expect(expandGreenhouse(save, T0).ok).toBe(false);
    save.profile.level = 40;
    const l2 = unwrap(expandGreenhouse(save, T0)).save;
    expect(expandGreenhouse(l2, T0).ok).toBe(false); // needs lavender
  });

  it('adds slots at every stage while keeping everything in place', () => {
    let save = rich();
    save.inventory['seed:basil'] = 1;
    save = unwrap(plantSeed(save, 'a3', 'basil', T0, fixedRandom)).save;
    save.inventory['deco:stool'] = 1;
    save = unwrap(placeDecoration(save, 'stool', 1200, 0, false, T0)).save;
    const plants = structuredClone(save.plants);
    const deco = structuredClone(save.decorations);
    const counts = [Object.keys(save.slots).length];
    for (let i = 0; i < 4; i++) {
      save = unwrap(expandGreenhouse(save, T0)).save;
      counts.push(Object.keys(save.slots).length);
      expect(save.plants).toEqual(plants);
      expect(save.decorations).toEqual(deco);
    }
    expect(counts).toEqual([6, 10, 16, 24, 32]);
    expect(save.greenhouseLevel).toBe(5);
    expect(expandGreenhouse(save, T0).ok).toBe(false);
  });

  it('spends the special items', () => {
    let save = rich();
    save = unwrap(expandGreenhouse(save, T0)).save;
    save = unwrap(expandGreenhouse(save, T0)).save;
    expect(save.inventory['harvest:lavender']).toBeUndefined();
  });
});

describe('full loop', () => {
  it('goes from a new game through plant, water, harvest, sell, reinvest', () => {
    let save = createNewSave(T0, 7);
    const startCoins = save.currencies.coins;
    save = unwrap(plantSeed(save, 'a1', 'basil', T0, fixedRandom)).save;
    const id = Object.keys(save.plants)[0]!;
    save = unwrap(waterPlant(save, id, T0)).save;
    const t = T0 + 5 * 60 * 1000;
    save = catchUp(save, t).save;
    expect(stageForGrowth(save.plants[id]!.growth)).toBe('HARVESTABLE');
    save = unwrap(harvestPlant(save, id, t)).save;
    const units = save.inventory['harvest:basil']!;
    save = unwrap(EconomyService.sell(save, 'harvest:basil', units)).save;
    expect(save.currencies.coins).toBeGreaterThan(startCoins);
    save = unwrap(buy(save, 'seed:basil', 1, t)).save;
    expect(save.inventory['seed:basil']).toBe(3);
  });
});

describe('gardener\'s note', () => {
  it('leads a new player through the loop', () => {
    expect(currentGoal(fresh())?.id).toBe('plant');
    const { save, id } = planted();
    expect(currentGoal(save)?.id).toBe('wait');
    save.plants[id]!.moisture = 5;
    expect(currentGoal(save)?.id).toBe('water');
    save.plants[id]!.growth = 1;
    expect(currentGoal(save)?.id).toBe('harvest');
    const harvested = unwrap(harvestPlant(save, id, T0)).save;
    expect(currentGoal(harvested)?.id).toBe('sell');
  });
});
