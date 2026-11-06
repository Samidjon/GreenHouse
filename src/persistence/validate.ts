import { CONFIG, DEFAULT_SETTINGS } from '@/data/config';
import { decorationById, equipmentById, fertilizerById, mutationById, potById, UPGRADES } from '@/data/catalog';
import { getItemInfo } from '@/data/items';
import { plantById } from '@/data/plants';
import { slotById, slotsForLevel } from '@/data/world';
import { alignDown } from '@/systems/growth';
import { tankCapacity } from '@/systems/derived';
import { syncUnlocks } from '@/systems/progression';
import { EMPTY_STATS } from '@/systems/newGame';
import type { GreenhouseLevel, PlacedDecoration, PlantInstance, SaveData, Settings, Stats, StatId, UpgradeId } from '@/types/game';

export type ValidationResult = { ok: true; save: SaveData; repairs: string[] } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Turns unknown input into a safe SaveData.
 *
 * Structural damage is rejected outright so a broken file can't replace a good
 * save. Small value-level problems (a negative balance, a future timestamp) are
 * repaired and reported. Nothing is trusted because it came from "our" file:
 * this also guards imports, which anyone can edit.
 */
export function validateSave(raw: unknown, now: number): ValidationResult {
  if (!isObj(raw)) return { ok: false, error: 'Данные сохранения повреждены.' };
  const repairs: string[] = [];

  for (const key of ['profile', 'currencies', 'inventory', 'plants', 'slots', 'encyclopedia'] as const) {
    if (!isObj(raw[key])) return { ok: false, error: `В сохранении не хватает данных (${key}).` };
  }
  if (!Array.isArray(raw.decorations)) return { ok: false, error: 'В сохранении не хватает данных об украшениях.' };

  const level = num(raw.greenhouseLevel);
  if (level === null || !Number.isInteger(level) || level < 1 || level > 5) {
    return { ok: false, error: 'В сохранении указан невозможный этап теплицы.' };
  }
  const greenhouseLevel = level as GreenhouseLevel;

  const timestamp = (value: unknown, label: string, fallback: number): number => {
    const t = num(value);
    if (t === null || t <= 0) {
      repairs.push(`Исправлена неверная дата (${label}).`);
      return fallback;
    }
    if (t > now) {
      repairs.push(`Дата из будущего исправлена (${label}).`);
      return now;
    }
    return t;
  };

  const profileRaw = raw.profile as Obj;
  const playerLevel = clamp(Math.floor(num(profileRaw.level) ?? 1), 1, CONFIG.progression.maxLevel);
  const profile = {
    name: typeof profileRaw.name === 'string' ? profileRaw.name.slice(0, 40) : 'Gardener',
    level: playerLevel,
    xp: Math.max(0, Math.floor(num(profileRaw.xp) ?? 0)),
  };

  const currenciesRaw = raw.currencies as Obj;
  const currency = (key: string): number => {
    const v = num(currenciesRaw[key]);
    if (v === null || v < 0 || !Number.isSafeInteger(Math.floor(v))) {
      repairs.push(`Исправлен неверный баланс (${key}).`);
      return 0;
    }
    return Math.floor(v);
  };
  const currencies = { coins: currency('coins'), gems: currency('gems') };

  const inventory: Record<string, number> = {};
  for (const [id, q] of Object.entries(raw.inventory as Obj)) {
    const qty = num(q);
    if (qty === null || qty < 1 || !Number.isSafeInteger(Math.floor(qty))) continue;
    // Items from a future content update are kept, not destroyed.
    if (!getItemInfo(id)) repairs.push(`Сохранён неизвестный предмет (${id}).`);
    inventory[id] = Math.floor(qty);
  }

  const slots: SaveData['slots'] = {};
  for (const def of slotsForLevel(greenhouseLevel)) {
    const s = (raw.slots as Obj)[def.id];
    const potId = isObj(s) && typeof s.potId === 'string' && potById(s.potId) ? s.potId : CONFIG.start.potId;
    slots[def.id] = { potId };
  }

  const plants: Record<string, PlantInstance> = {};
  const usedSlots = new Set<string>();
  for (const [id, value] of Object.entries(raw.plants as Obj)) {
    if (!isObj(value)) continue;
    const speciesId = typeof value.speciesId === 'string' ? value.speciesId : '';
    const slotId = typeof value.slotId === 'string' ? value.slotId : '';
    const slot = slotById(slotId);
    if (!plantById(speciesId) || !slot || slot.level > greenhouseLevel || usedSlots.has(slotId)) {
      repairs.push(`Убрано растение, которому не нашлось места (${id}).`);
      continue;
    }
    usedSlots.add(slotId);
    const fertRaw = value.fertilizer;
    const fertilizer =
      isObj(fertRaw) && typeof fertRaw.id === 'string' && fertilizerById(fertRaw.id) && (num(fertRaw.remainingSec) ?? 0) > 0
        ? { id: fertRaw.id, remainingSec: num(fertRaw.remainingSec) as number }
        : null;
    plants[id] = {
      id,
      speciesId,
      slotId,
      plantedAt: timestamp(value.plantedAt, `plantedAt of ${id}`, now),
      growth: clamp(num(value.growth) ?? 0, 0, 1),
      moisture: clamp(num(value.moisture) ?? CONFIG.moisture.onPlanting, 0, 100),
      health: clamp(num(value.health) ?? CONFIG.health.start, CONFIG.health.floor, 100),
      fertilizer,
      mutation: typeof value.mutation === 'string' && mutationById(value.mutation) ? value.mutation : null,
      seed: (num(value.seed) ?? 1) >>> 0,
      neglected: value.neglected === true,
    };
  }

  const decorations: PlacedDecoration[] = [];
  const decoIds = new Set<string>();
  for (const d of raw.decorations as unknown[]) {
    if (!isObj(d) || typeof d.defId !== 'string' || !decorationById(d.defId)) continue;
    const id = typeof d.id === 'string' ? d.id : '';
    const x = num(d.x);
    const y = num(d.y);
    if (!id || decoIds.has(id) || x === null || y === null) continue;
    decoIds.add(id);
    decorations.push({ id, defId: d.defId, x, y, flipped: d.flipped === true });
  }

  const equipment: SaveData['equipment'] = {};
  if (isObj(raw.equipment)) {
    for (const [id, e] of Object.entries(raw.equipment)) {
      if (equipmentById(id)) equipment[id] = { active: isObj(e) ? e.active !== false : true };
    }
  }

  const upgrades: SaveData['upgrades'] = {};
  if (isObj(raw.upgrades)) {
    for (const u of UPGRADES) {
      const v = num((raw.upgrades as Obj)[u.id]);
      if (v !== null && v > 0) upgrades[u.id as UpgradeId] = clamp(Math.floor(v), 0, u.maxLevel);
    }
  }

  const statsRaw = isObj(raw.stats) ? raw.stats : {};
  const stats: Stats = { ...EMPTY_STATS };
  for (const key of Object.keys(EMPTY_STATS) as StatId[]) {
    stats[key] = Math.max(0, Math.floor(num(statsRaw[key]) ?? 0));
  }

  const achievements: SaveData['achievements'] = {};
  if (isObj(raw.achievements)) {
    for (const [id, a] of Object.entries(raw.achievements)) {
      if (isObj(a) && num(a.unlockedAt) !== null) achievements[id] = { unlockedAt: a.unlockedAt as number };
    }
  }

  const encyclopedia: SaveData['encyclopedia'] = {};
  for (const [id, e] of Object.entries(raw.encyclopedia as Obj)) {
    if (!isObj(e) || !plantById(id)) continue;
    encyclopedia[id] = {
      firstDiscoveredAt: timestamp(e.firstDiscoveredAt, `discovery date of ${id}`, now),
      totalHarvested: Math.max(0, Math.floor(num(e.totalHarvested) ?? 0)),
      mutations: Array.isArray(e.mutations) ? e.mutations.filter((m): m is string => typeof m === 'string' && !!mutationById(m)) : [],
    };
  }

  const settingsRaw = isObj(raw.settings) ? raw.settings : {};
  const vol = (key: keyof Settings) => clamp(num(settingsRaw[key]) ?? (DEFAULT_SETTINGS[key] as number), 0, 1);
  const settings: Settings = {
    masterVolume: vol('masterVolume'),
    musicVolume: vol('musicVolume'),
    ambienceVolume: vol('ambienceVolume'),
    sfxVolume: vol('sfxVolume'),
    muted: settingsRaw.muted === true,
    reducedMotion: settingsRaw.reducedMotion === true,
  };

  const simulatedRaw = num(raw.simulatedUntil);
  let simulatedUntil: number;
  if (simulatedRaw === null || simulatedRaw <= 0) {
    repairs.push('Часы игры настроены заново.');
    simulatedUntil = alignDown(now);
  } else if (simulatedRaw > now) {
    repairs.push('Часы на устройстве были переведены назад, поэтому время не засчитано.');
    simulatedUntil = alignDown(now);
  } else {
    simulatedUntil = alignDown(simulatedRaw);
  }

  const highestId = Math.max(
    0,
    ...Object.keys(plants).map((k) => parseInt(k.slice(1), 10) || 0),
    ...decorations.map((d) => parseInt(d.id.slice(1), 10) || 0),
  );

  const save: SaveData = {
    version: CONFIG.save.version,
    createdAt: timestamp(raw.createdAt, 'createdAt', now),
    lastSavedAt: timestamp(raw.lastSavedAt, 'lastSavedAt', now),
    simulatedUntil,
    worldSeed: (num(raw.worldSeed) ?? 1) >>> 0,
    nextId: Math.max(highestId + 1, Math.floor(num(raw.nextId) ?? 1)),
    profile,
    currencies,
    inventory,
    greenhouseLevel,
    slots,
    plants,
    decorations,
    equipment,
    upgrades,
    tank: 0,
    unlocks: Array.isArray(raw.unlocks) ? raw.unlocks.filter((u): u is string => typeof u === 'string') : [],
    achievements,
    encyclopedia,
    collectionRewards: Array.isArray(raw.collectionRewards) ? raw.collectionRewards.filter((u): u is string => typeof u === 'string') : [],
    stats,
    settings,
  };
  save.tank = clamp(num(raw.tank) ?? 0, 0, tankCapacity(save));
  syncUnlocks(save);
  return { ok: true, save, repairs };
}
