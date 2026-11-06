import { CONFIG } from '@/data/config';
import { expansionByLevel } from '@/data/catalog';
import { hash01 } from './rng';
import type { DayPhase, Environment, GreenhouseLevel, SaveData, WeatherKind } from '@/types/game';

export interface EnvironmentContext {
  seed: number;
  level: GreenhouseLevel;
  lamps: boolean;
  heater: boolean;
  fan: boolean;
}

export function isEquipmentOn(save: Pick<SaveData, 'equipment'>, id: string): boolean {
  return save.equipment[id]?.active === true;
}

export function environmentContext(save: SaveData): EnvironmentContext {
  return {
    seed: save.worldSeed,
    level: save.greenhouseLevel,
    lamps: isEquipmentOn(save, 'grow_lamps'),
    heater: isEquipmentOn(save, 'heater'),
    fan: isEquipmentOn(save, 'fan'),
  };
}

/** Weather comes purely from the clock and world seed, so catch-up sees exactly what you'd have seen live. */
export function weatherAt(ts: number, seed: number): WeatherKind {
  const slot = Math.floor(ts / 1000 / CONFIG.time.weatherSlotSec);
  const roll = hash01(slot, seed);
  if (roll < 0.42) return 'clear';
  if (roll < 0.66) return 'sunny';
  if (roll < 0.82) return 'cloudy';
  return 'rain';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function phaseFor(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

export function getEnvironment(ts: number, ctx: EnvironmentContext): Environment {
  // The game's day is the real day, on the player's own clock and time zone.
  const localMs = ts - new Date(ts).getTimezoneOffset() * 60_000;
  const dayProgress = (((localMs % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS;
  const hours = dayProgress * 24;
  const hour = Math.floor(hours);
  const minute = Math.floor((hours - hour) * 60);

  // Sun up from 05:30 to 20:30, a simple sine arc.
  const sunT = (hours - 5.5) / 15;
  const sun = sunT > 0 && sunT < 1 ? Math.sin(sunT * Math.PI) : 0;

  // There's no sunny weather in the dark: a sunny slot at night is just a clear one.
  const forecast = weatherAt(ts, ctx.seed);
  const weather = forecast === 'sunny' && sun <= 0 ? 'clear' : forecast;
  const house = expansionByLevel(ctx.level);

  const light = sun * CONFIG.light.weather[weather] * house.glassClarity + 0.05 + (ctx.lamps ? CONFIG.light.lampBonus : 0);

  // Warmest at 14:00, coolest at 02:00.
  let temperature =
    house.baseTemperature +
    CONFIG.temperature.dayNightSwing * Math.cos(((hours - 14) / 24) * 2 * Math.PI) +
    CONFIG.temperature.weather[weather];
  if (ctx.heater && temperature < CONFIG.temperature.heaterBelow) temperature += CONFIG.temperature.heaterBonus;
  if (ctx.fan && temperature > CONFIG.temperature.fanAbove) temperature -= CONFIG.temperature.fanCooling;

  return { dayProgress, hour, minute, phase: phaseFor(hours), sun, weather, light, temperature };
}

export const WEATHER_INFO: Record<WeatherKind, { label: string; rule: string }> = {
  clear: { label: 'Ясно', rule: 'Обычная приятная погода. Ничего особенного.' },
  sunny: { label: 'Солнечно', rule: 'Растения растут на 5% быстрее. Земля сохнет на 10% быстрее.' },
  cloudy: { label: 'Пасмурно', rule: 'В теплице меньше света: светолюбивым растениям может понадобиться лампа.' },
  rain: { label: 'Тихий дождь', rule: 'Земля сохнет на 40% медленнее, а бак наполняется на 50% быстрее.' },
};
