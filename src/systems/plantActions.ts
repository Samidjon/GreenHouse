import { CONFIG } from '@/data/config';
import { fertilizerById, mutationById, MUTATIONS, potById } from '@/data/catalog';
import { plantById } from '@/data/plants';
import { fertItemId, harvestItemId, potItemId, seedItemId } from '@/data/items';
import { slotById } from '@/data/world';
import { EconomyService } from './economy';
import { plantInSlot, potFor, upgradeLevel, waterAmount } from './derived';
import { isEquipmentOn } from './environment';
import { isReady, stageIndexForGrowth } from './growth';
import { settleProgress } from './progression';
import { mulberry32 } from './rng';
import type { Random } from './rng';
import type { ActionResult, GameEvent, PlantDef, PlantInstance, SaveData } from '@/types/game';

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function done(save: SaveData, events: GameEvent[], now: number): ActionResult {
  settleProgress(save, now, events);
  return { ok: true, save, events };
}

function rollMutation(save: SaveData, slotId: string, random: Random): string | null {
  const lens = 1 + upgradeLevel(save, 'botanist_lens') * CONFIG.economy.botanistLensPerLevel;
  const pot = potFor(save, slotId).mutationMultiplier;
  const roll = random();
  let edge = 0;
  // Rarest first, so raising the multiplier never turns a rare hit into a common one.
  for (const m of [...MUTATIONS].sort((a, b) => a.chance - b.chance)) {
    edge += m.chance * lens * pot;
    if (roll < edge) return m.id;
  }
  return null;
}

export function plantSeed(save: SaveData, slotId: string, speciesId: string, now: number, random: Random): ActionResult {
  const slot = slotById(slotId);
  const def = plantById(speciesId);
  if (!slot || slot.level > save.greenhouseLevel) return fail('Это место ещё не построено.');
  if (!def) return fail('Неизвестные семена.');
  if (plantInSlot(save, slotId)) return fail('Здесь уже что-то растёт.');
  if (def.minGreenhouseLevel > save.greenhouseLevel) return fail('Этому растению нужна теплица побольше.');

  const next = structuredClone(save);
  const error = EconomyService.transact(next, { consume: [{ itemId: seedItemId(speciesId), quantity: 1 }] });
  if (error) return fail(`Нет семян: ${def.name}.`);

  const id = `p${next.nextId++}`;
  const plant: PlantInstance = {
    id,
    speciesId,
    slotId,
    plantedAt: now,
    growth: 0,
    moisture: CONFIG.moisture.onPlanting,
    health: CONFIG.health.start,
    fertilizer: null,
    mutation: rollMutation(next, slotId, random),
    seed: Math.floor(random() * 0xffffffff),
    neglected: false,
  };
  next.plants[id] = plant;
  next.stats.plantsPlanted += 1;
  next.profile.xp += 1;
  return done(next, [{ type: 'planted', slotId, speciesId }], now);
}

function pour(save: SaveData, plant: PlantInstance): string | null {
  if (save.tank < 1) return 'Бак ещё наполняется.';
  save.tank -= 1;
  plant.moisture = Math.min(CONFIG.moisture.wateredAtCapacity, plant.moisture + waterAmount(save));
  save.stats.timesWatered += 1;
  return null;
}

export function waterPlant(save: SaveData, plantId: string, now: number): ActionResult {
  const existing = save.plants[plantId];
  if (!existing) return fail('Здесь нечего поливать.');
  if (isReady(existing)) return fail('Этот урожай уже можно собирать.');
  if (existing.moisture >= 95) return fail('Земля и так мокрая.');
  const next = structuredClone(save);
  const plant = next.plants[plantId]!;
  const error = pour(next, plant);
  if (error) return fail(error);
  return done(next, [{ type: 'watered', slotId: plant.slotId }], now);
}

/** The hose: waters everything that wants it, driest first, while the tank lasts. */
export function waterAll(save: SaveData, now: number): ActionResult {
  if (!isEquipmentOn(save, 'hose')) return fail('Для этого нужен садовый шланг.');
  const next = structuredClone(save);
  const targets = Object.values(next.plants)
    .filter((p) => !isReady(p) && p.moisture < 85)
    .sort((a, b) => a.moisture - b.moisture);
  if (targets.length === 0) return fail('Всё и так хорошо полито.');
  if (next.tank < 1) return fail('Бак ещё наполняется.');
  const events: GameEvent[] = [];
  for (const plant of targets) {
    if (pour(next, plant)) break;
    events.push({ type: 'watered', slotId: plant.slotId });
  }
  return done(next, events, now);
}

export function fertilizePlant(save: SaveData, plantId: string, fertilizerId: string, now: number): ActionResult {
  const existing = save.plants[plantId];
  const fert = fertilizerById(fertilizerId);
  if (!existing) return fail('Здесь нечего удобрять.');
  if (!fert) return fail('Неизвестное удобрение.');
  if (isReady(existing)) return fail('Этот урожай уже можно собирать.');
  if (fert.durationSec > 0 && existing.fertilizer) return fail('Это растение уже удобрено.');

  const next = structuredClone(save);
  const error = EconomyService.transact(next, { consume: [{ itemId: fertItemId(fertilizerId), quantity: 1 }] });
  if (error) return fail(`Нет удобрения: ${fert.name}.`);
  const plant = next.plants[plantId]!;
  plant.health = Math.min(100, plant.health + fert.instantHealth);
  plant.moisture = Math.min(100, plant.moisture + fert.instantMoisture);
  if (fert.durationSec > 0) plant.fertilizer = { id: fert.id, remainingSec: fert.durationSec };
  next.stats.timesFertilized += 1;
  if (plant.neglected && plant.health >= CONFIG.health.recoveredAt) {
    plant.neglected = false;
    next.stats.plantsRecovered += 1;
  }
  return done(next, [{ type: 'fertilized', slotId: plant.slotId }], now);
}

export function harvestQuantity(plant: PlantInstance, def: PlantDef): number {
  const rng = mulberry32(plant.seed);
  const span = def.harvest.max - def.harvest.min + 1;
  const base = def.harvest.min + Math.floor(rng() * span);
  return plant.health < CONFIG.health.poorThreshold ? Math.max(1, base - 1) : base;
}

function harvestBonus(save: SaveData, plant: PlantInstance): number {
  const rng = mulberry32(plant.seed ^ 0x5bd1e995);
  const chance = upgradeLevel(save, 'harvest_basket') * CONFIG.economy.harvestBasketChancePerLevel;
  return rng() < chance ? 1 : 0;
}

/** The plant is removed in the same state change that pays out, so it can only ever pay once. */
export function harvestPlant(save: SaveData, plantId: string, now: number): ActionResult {
  const existing = save.plants[plantId];
  if (!existing) return fail('С этого растения урожай уже собран.');
  const def = plantById(existing.speciesId);
  if (!def) return fail('Неизвестное растение.');
  if (!isReady(existing)) return fail('Ещё не созрело.');

  const next = structuredClone(save);
  const plant = next.plants[plantId]!;
  delete next.plants[plantId];

  const quantity = harvestQuantity(plant, def);
  const bonus = harvestBonus(next, plant);
  const total = quantity + bonus;
  EconomyService.transact(next, { grant: [{ itemId: harvestItemId(plant.speciesId, plant.mutation), quantity: total }] });

  next.profile.xp += def.xp;
  next.stats.plantsHarvested += 1;
  next.stats.unitsHarvested += total;

  const events: GameEvent[] = [
    { type: 'harvest', plantId, slotId: plant.slotId, speciesId: plant.speciesId, quantity, bonus, mutation: plant.mutation, xp: def.xp },
  ];

  let entry = next.encyclopedia[plant.speciesId];
  if (!entry) {
    entry = { firstDiscoveredAt: now, totalHarvested: 0, mutations: [] };
    next.encyclopedia[plant.speciesId] = entry;
    events.push({ type: 'discovery', speciesId: plant.speciesId });
  }
  entry.totalHarvested += total;
  if (plant.mutation && mutationById(plant.mutation)) {
    next.stats.mutationsFound += 1;
    if (!entry.mutations.includes(plant.mutation)) entry.mutations.push(plant.mutation);
  }
  return done(next, events, now);
}

/** Lifts a plant out. A seed that hasn't sprouted yet goes back in the packet. */
export function uprootPlant(save: SaveData, plantId: string, now: number): ActionResult {
  const existing = save.plants[plantId];
  if (!existing) return fail('Здесь нечего выкапывать.');
  const next = structuredClone(save);
  delete next.plants[plantId];
  if (stageIndexForGrowth(existing.growth) === 0) {
    EconomyService.transact(next, { grant: [{ itemId: seedItemId(existing.speciesId), quantity: 1 }] });
  }
  return done(next, [], now);
}

/** Swaps the pot at a slot, returning the old pot to the inventory. */
export function changePot(save: SaveData, slotId: string, potId: string, now: number): ActionResult {
  const slot = save.slots[slotId];
  const pot = potById(potId);
  if (!slot) return fail('Это место ещё не построено.');
  if (!pot) return fail('Неизвестный горшок.');
  if (slot.potId === potId) return fail('Этот горшок уже здесь.');
  const next = structuredClone(save);
  const error = EconomyService.transact(next, {
    consume: [{ itemId: potItemId(potId), quantity: 1 }],
    grant: [{ itemId: potItemId(slot.potId), quantity: 1 }],
  });
  if (error) return fail(`Нет такого горшка: ${pot.name}.`);
  next.slots[slotId] = { potId };
  return done(next, [], now);
}
