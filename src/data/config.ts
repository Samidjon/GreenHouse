/** Every tunable number that isn't per-item catalog data lives here. */
export const CONFIG = {
  save: {
    version: 2,
    autosaveIntervalMs: 20_000,
    actionSaveDebounceMs: 500,
    backupsKept: 5,
  },
  sim: {
    /**
     * Simulation only ever advances in whole steps aligned to absolute time.
     * That makes one long catch-up identical to many short ticks, so offline
     * and online growth cannot disagree.
     */
    stepSec: 5,
    maxOfflineSec: 24 * 60 * 60,
    offlineSummaryMinSec: 60,
    uiTickMs: 1000,
  },
  time: {
    weatherSlotSec: 8 * 60,
  },
  start: {
    coins: 40,
    gems: 0,
    inventory: {
      'seed:basil': 3,
      'fert:compost': 1,
      'tool:watering_can': 1,
      'tool:trowel': 1,
    } as Record<string, number>,
    potId: 'old_clay',
  },
  moisture: {
    onPlanting: 45,
    thirsty: 30,
    dry: 12,
    baseWaterAmount: 60,
    wateredAtCapacity: 100,
    misterFloor: 28,
    rainDrain: 0.6,
    sunnyDrain: 1.1,
  },
  health: {
    start: 100,
    /** Plants never go below this: neglected plants wilt and always recover. */
    floor: 10,
    lossPerHourWhenDry: 22,
    recoveryPerHour: 40,
    poorThreshold: 50,
    neglectedBelow: 40,
    recoveredAt: 70,
  },
  growth: {
    /** Inclusive lower bound of growth for each stage, SEED..HARVESTABLE. */
    stageThresholds: [0, 0.1, 0.25, 0.5, 0.8, 1] as const,
    thirstyMultiplier: 0.7,
    dryMultiplier: 0.35,
    lightMissMultiplier: 0.85,
    temperatureMissMultiplier: 0.85,
    poorHealthMultiplier: 0.75,
    sunnyBonus: 1.05,
    pottingMixPerLevel: 0.05,
    cozinessPerPoint: 0.005,
    cozinessMaxBonus: 0.15,
  },
  light: {
    needs: { shade: 0.2, partial: 0.4, bright: 0.6 },
    weather: { clear: 1, sunny: 1.15, cloudy: 0.75, rain: 0.6 },
    lampBonus: 0.45,
  },
  temperature: {
    dayNightSwing: 3,
    weather: { clear: 0, sunny: 2, cloudy: -1, rain: -2 },
    heaterBonus: 6,
    heaterBelow: 20,
    fanCooling: 5,
    fanAbove: 25,
  },
  tank: {
    baseCapacity: 12,
    capacityPerLevel: 8,
    refillSec: 15,
    rainRefillMultiplier: 1.5,
    rainBarrelMultiplier: 2,
  },
  economy: {
    sellXpPerCoins: 0.05,
    marketStallPerLevel: 0.05,
    seedSatchelPerLevel: 0.05,
    harvestBasketChancePerLevel: 0.15,
    botanistLensPerLevel: 0.25,
    levelUpCoinsPerLevel: 10,
    /** Seeds a neighbour leaves if the player could otherwise never plant again. */
    rescueSeedId: 'basil',
    rescueSeeds: 2,
  },
  progression: {
    maxLevel: 40,
    xpBase: 25,
    xpExponent: 1.5,
  },
} as const;

export const DEFAULT_SETTINGS = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  ambienceVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  reducedMotion: false,
};
