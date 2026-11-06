import { CONFIG } from '@/data/config';
import { fertilizerById } from '@/data/catalog';
import { plantById, LIGHT_LABELS } from '@/data/plants';
import { cozinessBonus, potFor, tankCapacity, upgradeLevel } from './derived';
import { environmentContext, getEnvironment, isEquipmentOn } from './environment';
import { GROWTH_STAGES } from '@/types/game';
import type { Environment, GrowthModifier, GrowthStage, PlantDef, PlantInstance, SaveData } from '@/types/game';

export function stageIndexForGrowth(growth: number): number {
  const t = CONFIG.growth.stageThresholds;
  for (let i = t.length - 1; i >= 0; i--) {
    if (growth >= t[i]!) return i;
  }
  return 0;
}

export function stageForGrowth(growth: number): GrowthStage {
  return GROWTH_STAGES[stageIndexForGrowth(growth)]!;
}

export const isReady = (plant: Pick<PlantInstance, 'growth'>): boolean => plant.growth >= 1;

interface SimContext {
  soilMultiplier: number;
  cozinessMultiplier: number;
}

function simContext(save: SaveData): SimContext {
  return {
    soilMultiplier: 1 + upgradeLevel(save, 'potting_mix') * CONFIG.growth.pottingMixPerLevel,
    cozinessMultiplier: 1 + cozinessBonus(save),
  };
}

const waterFactor = (moisture: number) =>
  moisture >= CONFIG.moisture.thirsty ? 1 : moisture >= CONFIG.moisture.dry ? CONFIG.growth.thirstyMultiplier : CONFIG.growth.dryMultiplier;
const lightFits = (def: PlantDef, env: Environment) => env.light >= CONFIG.light.needs[def.light];
const tempFits = (def: PlantDef, env: Environment) => env.temperature >= def.temperature.min && env.temperature <= def.temperature.max;

function growthMultiplier(plant: PlantInstance, def: PlantDef, env: Environment, ctx: SimContext): number {
  let m = waterFactor(plant.moisture) * ctx.soilMultiplier * ctx.cozinessMultiplier;
  if (!lightFits(def, env)) m *= CONFIG.growth.lightMissMultiplier;
  if (!tempFits(def, env)) m *= CONFIG.growth.temperatureMissMultiplier;
  if (plant.health < CONFIG.health.poorThreshold) m *= CONFIG.growth.poorHealthMultiplier;
  if (env.weather === 'sunny') m *= CONFIG.growth.sunnyBonus;
  if (plant.fertilizer) m *= fertilizerById(plant.fertilizer.id)?.growthMultiplier ?? 1;
  return m;
}

/** The same rules as growthMultiplier, spelled out for the plant details card. */
export function describeModifiers(plant: PlantInstance, def: PlantDef, env: Environment, save: SaveData): GrowthModifier[] {
  const out: GrowthModifier[] = [];
  const add = (id: string, label: string, multiplier: number, explanation: string) => {
    if (multiplier !== 1) out.push({ id, label, multiplier, explanation });
  };
  const w = waterFactor(plant.moisture);
  add('water', w === CONFIG.growth.dryMultiplier ? 'Сухая земля' : 'Хочет пить', w, 'Полейте, и рост снова пойдёт в полную силу.');
  if (!lightFits(def, env)) add('light', 'Мало света', CONFIG.growth.lightMissMultiplier, `Любит: ${LIGHT_LABELS[def.light].toLowerCase()}. Поможет дневной свет или фитолампы.`);
  if (!tempFits(def, env)) add('temp', 'Неподходящая температура', CONFIG.growth.temperatureMissMultiplier, `Уютно от ${def.temperature.min} до ${def.temperature.max}°C.`);
  if (plant.health < CONFIG.health.poorThreshold) add('health', 'Слабое здоровье', CONFIG.growth.poorHealthMultiplier, 'Держите землю влажной или дайте живительный настой.');
  if (env.weather === 'sunny') add('sun', 'Солнечный день', CONFIG.growth.sunnyBonus, 'Солнце всему немного помогает.');
  if (plant.fertilizer) {
    const f = fertilizerById(plant.fertilizer.id);
    if (f) add('fert', f.name, f.growthMultiplier, 'Удобрение действует.');
  }
  const ctx = simContext(save);
  add('soil', 'Богатый грунт', ctx.soilMultiplier, 'Благодаря вашему улучшению.');
  add('cozy', 'Уютная теплица', ctx.cozinessMultiplier, 'С украшениями здесь чувствуется забота. Растения согласны.');
  return out;
}

export function effectiveGrowthRate(plant: PlantInstance, def: PlantDef, env: Environment, save: SaveData): number {
  return growthMultiplier(plant, def, env, simContext(save));
}

/** Estimated seconds left at the plant's present rate, assuming conditions hold. */
export function estimateSecondsLeft(plant: PlantInstance, def: PlantDef, env: Environment, save: SaveData): number {
  if (isReady(plant)) return 0;
  const rate = effectiveGrowthRate(plant, def, env, save);
  return Math.ceil(((1 - plant.growth) * def.growthDurationSec) / rate);
}

/** Advances one plant by one step, mutating it. Ready plants simply wait: no decay, no penalty. */
function stepPlant(plant: PlantInstance, def: PlantDef, env: Environment, dt: number, drainFactor: number, moistureFloor: number, ctx: SimContext): boolean {
  if (plant.growth >= 1) return false;

  const rate = growthMultiplier(plant, def, env, ctx);
  plant.growth = Math.min(1, plant.growth + (dt / def.growthDurationSec) * rate);

  const drain = (def.water.drainPerHour * drainFactor * dt) / 3600;
  plant.moisture = Math.max(moistureFloor, plant.moisture - drain);

  if (plant.moisture < CONFIG.moisture.dry) {
    plant.health = Math.max(CONFIG.health.floor, plant.health - (CONFIG.health.lossPerHourWhenDry * dt) / 3600);
  } else if (plant.moisture >= CONFIG.moisture.thirsty) {
    plant.health = Math.min(100, plant.health + (CONFIG.health.recoveryPerHour * dt) / 3600);
  }

  if (plant.fertilizer) {
    plant.fertilizer.remainingSec -= dt;
    if (plant.fertilizer.remainingSec <= 0) plant.fertilizer = null;
  }

  if (plant.health < CONFIG.health.neglectedBelow) {
    plant.neglected = true;
  } else if (plant.neglected && plant.health >= CONFIG.health.recoveredAt) {
    plant.neglected = false;
    return true;
  }
  return false;
}

export function alignDown(ts: number): number {
  const stepMs = CONFIG.sim.stepSec * 1000;
  return Math.floor(ts / stepMs) * stepMs;
}

export interface SimulationResult {
  save: SaveData;
  elapsedSec: number;
  simulatedSec: number;
  capped: boolean;
  recovered: string[];
}

/**
 * Brings the save up to `now`, one aligned step at a time. Used for both the
 * live tick and offline catch-up, so the two can't drift apart.
 *
 * - A clock that moved backwards grants nothing; the clock is re-anchored.
 * - Time beyond CONFIG.sim.maxOfflineSec is skipped, not simulated.
 */
export function simulate(save: SaveData, now: number): SimulationResult {
  const target = alignDown(now);
  const from = save.simulatedUntil;

  if (!Number.isFinite(now) || now <= 0) {
    return { save, elapsedSec: 0, simulatedSec: 0, capped: false, recovered: [] };
  }
  if (!Number.isFinite(from) || from > now) {
    return { save: { ...save, simulatedUntil: target }, elapsedSec: 0, simulatedSec: 0, capped: false, recovered: [] };
  }
  if (target <= from) {
    return { save, elapsedSec: 0, simulatedSec: 0, capped: false, recovered: [] };
  }

  const stepMs = CONFIG.sim.stepSec * 1000;
  const elapsedSec = (target - from) / 1000;
  const capped = elapsedSec > CONFIG.sim.maxOfflineSec;
  const simulatedSec = capped ? CONFIG.sim.maxOfflineSec : elapsedSec;
  const steps = Math.round((simulatedSec * 1000) / stepMs);

  const plants: Record<string, PlantInstance> = {};
  const live: { plant: PlantInstance; def: PlantDef; potDrain: number }[] = [];
  for (const [id, p] of Object.entries(save.plants)) {
    const copy: PlantInstance = { ...p, fertilizer: p.fertilizer ? { ...p.fertilizer } : null };
    plants[id] = copy;
    const def = plantById(p.speciesId);
    if (def) live.push({ plant: copy, def, potDrain: potFor(save, p.slotId).drainMultiplier });
  }

  const envCtx = environmentContext(save);
  const ctx = simContext(save);
  const moistureFloor = isEquipmentOn(save, 'mister') ? CONFIG.moisture.misterFloor : 0;
  const capacity = tankCapacity(save);
  const hasBarrel = isEquipmentOn(save, 'rain_barrel');
  let tank = save.tank;
  const recovered: string[] = [];

  for (let i = 0; i < steps; i++) {
    const env = getEnvironment(from + i * stepMs, envCtx);
    const weatherDrain = env.weather === 'rain' ? CONFIG.moisture.rainDrain : env.weather === 'sunny' ? CONFIG.moisture.sunnyDrain : 1;

    for (const { plant, def, potDrain } of live) {
      if (stepPlant(plant, def, env, CONFIG.sim.stepSec, potDrain * weatherDrain, moistureFloor, ctx)) {
        recovered.push(plant.speciesId);
      }
    }

    if (tank < capacity) {
      let refill = CONFIG.sim.stepSec / CONFIG.tank.refillSec;
      if (env.weather === 'rain') refill *= hasBarrel ? CONFIG.tank.rainBarrelMultiplier : CONFIG.tank.rainRefillMultiplier;
      tank = Math.min(capacity, tank + refill);
    }
  }

  const stats = recovered.length ? { ...save.stats, plantsRecovered: save.stats.plantsRecovered + recovered.length } : save.stats;

  return {
    save: { ...save, plants, tank, simulatedUntil: target, stats },
    elapsedSec,
    simulatedSec,
    capped,
    recovered,
  };
}
