/** Shared domain types. This module imports nothing, so anything may depend on it. */

export const GROWTH_STAGES = ['SEED', 'SPROUT', 'SEEDLING', 'GROWING', 'MATURE', 'HARVESTABLE'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export type PlantCategory =
  | 'herb'
  | 'vegetable'
  | 'flower'
  | 'fruit'
  | 'foliage'
  | 'succulent'
  | 'tropical'
  | 'orchid'
  | 'carnivorous'
  | 'mythic';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Currency = 'coins' | 'gems';
export type LightNeed = 'shade' | 'partial' | 'bright';
export type GreenhouseLevel = 1 | 2 | 3 | 4 | 5;

export interface Price {
  currency: Currency;
  amount: number;
}

export interface PlantDef {
  id: string;
  name: string;
  latinName: string;
  category: PlantCategory;
  rarity: Rarity;
  seedPrice: Price;
  /** Coin value of one harvested unit, before mutations and upgrades. */
  sellPrice: number;
  growthDurationSec: number;
  water: {
    /** Moisture points lost per real hour at baseline. */
    drainPerHour: number;
    label: 'Мало' | 'Умеренно' | 'Много';
  };
  light: LightNeed;
  temperature: { min: number; max: number };
  harvest: { min: number; max: number };
  xp: number;
  unlockLevel: number;
  minGreenhouseLevel: GreenhouseLevel;
  description: string;
  /** Manifest key prefix; stage sprites live at `${spriteKey}/${stage}`. */
  spriteKey: string;
}

export interface MutationDef {
  id: string;
  name: string;
  /** Base probability per planting. */
  chance: number;
  sellMultiplier: number;
  description: string;
}

export interface FertilizerDef {
  id: string;
  name: string;
  description: string;
  price: Price;
  unlockLevel: number;
  growthMultiplier: number;
  durationSec: number;
  instantHealth: number;
  instantMoisture: number;
  icon: string;
}

export interface PotDef {
  id: string;
  name: string;
  description: string;
  price: Price;
  unlockLevel: number;
  /** Multiplies moisture drain. Lower is gentler. */
  drainMultiplier: number;
  /** Multiplies the mutation chance rolled when planting here. */
  mutationMultiplier: number;
  sprite: string;
}

export type DecorationZone = 'floor' | 'wall' | 'hanging';
export type DecorationKind = 'shelf' | 'table' | 'lamp' | 'hanging-plant' | 'pot' | 'furniture' | 'ornament';

export interface DecorationDef {
  id: string;
  name: string;
  kind: DecorationKind;
  zone: DecorationZone;
  description: string;
  price: Price;
  unlockLevel: number;
  minGreenhouseLevel: GreenhouseLevel;
  width: number;
  height: number;
  coziness: number;
  /** Radius of warm night glow, if the piece gives off light. */
  glow?: number;
  sprite: string;
}

export type EquipmentEffect = 'lamp' | 'heater' | 'fan' | 'mister' | 'hose' | 'rainBarrel';

export interface EquipmentDef {
  id: string;
  name: string;
  description: string;
  effectText: string;
  effect: EquipmentEffect;
  price: Price;
  unlockLevel: number;
  minGreenhouseLevel: GreenhouseLevel;
  sprite: string;
}

export type UpgradeId =
  | 'water_tank'
  | 'watering_can'
  | 'potting_mix'
  | 'harvest_basket'
  | 'market_stall'
  | 'seed_satchel'
  | 'botanist_lens';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  effectPerLevel: string;
  maxLevel: number;
  /** One entry per level: index 0 buys level 1. */
  costs: Price[];
  unlockLevels: number[];
  icon: string;
}

export interface ItemRequirement {
  itemId: string;
  quantity: number;
}

export interface ExpansionDef {
  level: GreenhouseLevel;
  name: string;
  tagline: string;
  description: string;
  cost: Price[];
  requiredPlayerLevel: number;
  requiredItems: ItemRequirement[];
  baseTemperature: number;
  /** How much of the sunlight the glass lets through at this level. */
  glassClarity: number;
  unlocksText: string[];
}

export type StatId =
  | 'plantsPlanted'
  | 'plantsHarvested'
  | 'unitsHarvested'
  | 'timesWatered'
  | 'timesFertilized'
  | 'coinsEarned'
  | 'itemsSold'
  | 'decorationsPlaced'
  | 'mutationsFound'
  | 'plantsRecovered';

export type Stats = Record<StatId, number>;

export type AchievementCondition =
  | { type: 'stat'; stat: StatId; target: number }
  | { type: 'species'; target: number }
  | { type: 'playerLevel'; target: number }
  | { type: 'greenhouseLevel'; target: GreenhouseLevel };

export interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  items?: ItemRequirement[];
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  condition: AchievementCondition;
  reward: Reward;
}

export interface CollectionMilestone {
  id: string;
  name: string;
  speciesRequired: number;
  reward: Reward;
}

// ---------------------------------------------------------------------------
// Save state
// ---------------------------------------------------------------------------

export interface PlantInstance {
  id: string;
  speciesId: string;
  slotId: string;
  plantedAt: number;
  /** 0..1 — 1 means ready to harvest. */
  growth: number;
  /** 0..100 */
  moisture: number;
  /** 0..100 — floors above zero: plants wilt, they never die. */
  health: number;
  fertilizer: { id: string; remainingSec: number } | null;
  /** Rolled once when planted so it cannot be re-rolled by reloading. */
  mutation: string | null;
  /** Deterministic seed for the harvest roll. */
  seed: number;
  /** Set while the plant has been in poor health, to credit a recovery. */
  neglected: boolean;
}

export interface SlotState {
  potId: string;
}

export interface PlacedDecoration {
  id: string;
  defId: string;
  /** Anchor point: bottom-centre on the floor, centre on a wall, top-centre when hanging. */
  x: number;
  y: number;
  flipped: boolean;
}

export interface EncyclopediaEntry {
  firstDiscoveredAt: number;
  totalHarvested: number;
  mutations: string[];
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  /** All simulation is complete up to this timestamp, on an aligned step boundary. */
  simulatedUntil: number;
  worldSeed: number;
  nextId: number;
  profile: { name: string; xp: number; level: number };
  currencies: Record<Currency, number>;
  inventory: Record<string, number>;
  greenhouseLevel: GreenhouseLevel;
  slots: Record<string, SlotState>;
  plants: Record<string, PlantInstance>;
  decorations: PlacedDecoration[];
  equipment: Record<string, { active: boolean }>;
  upgrades: Partial<Record<UpgradeId, number>>;
  tank: number;
  unlocks: string[];
  achievements: Record<string, { unlockedAt: number }>;
  encyclopedia: Record<string, EncyclopediaEntry>;
  collectionRewards: string[];
  stats: Stats;
  settings: Settings;
}

// ---------------------------------------------------------------------------
// Simulation outputs
// ---------------------------------------------------------------------------

export type WeatherKind = 'clear' | 'sunny' | 'cloudy' | 'rain';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Environment {
  /** 0..1 through the game day; 0 is midnight. */
  dayProgress: number;
  hour: number;
  minute: number;
  phase: DayPhase;
  /** 0..1 of the sun outside, before weather. */
  sun: number;
  weather: WeatherKind;
  /** Effective light inside the greenhouse, 0..~1.4 */
  light: number;
  /** Degrees Celsius inside the greenhouse. */
  temperature: number;
}

export interface GrowthModifier {
  id: string;
  label: string;
  multiplier: number;
  explanation: string;
}

export type GameEvent =
  | { type: 'levelUp'; level: number; coins: number }
  | { type: 'achievement'; id: string }
  | { type: 'discovery'; speciesId: string }
  | { type: 'collection'; id: string }
  | { type: 'harvest'; plantId: string; slotId: string; speciesId: string; quantity: number; bonus: number; mutation: string | null; xp: number }
  | { type: 'planted'; slotId: string; speciesId: string }
  | { type: 'watered'; slotId: string }
  | { type: 'fertilized'; slotId: string }
  | { type: 'recovered'; speciesId: string }
  | { type: 'sold'; coins: number; quantity: number }
  | { type: 'purchased'; name: string }
  | { type: 'expanded'; level: GreenhouseLevel }
  | { type: 'rescued' };

export type ActionResult = { ok: true; save: SaveData; events: GameEvent[] } | { ok: false; reason: string };

export interface OfflineSummary {
  elapsedSec: number;
  simulatedSec: number;
  capped: boolean;
  stagesAdvanced: number;
  newlyReady: { speciesId: string; count: number }[];
  thirsty: number;
  recovered: number;
  tankBefore: number;
  tankAfter: number;
}
