import { CONFIG } from '@/data/config';

type RawSave = Record<string, unknown>;

/**
 * Each entry upgrades from version N to N + 1.
 *
 * To change the save shape: bump CONFIG.save.version, add a step here, and add
 * a fixture in persistence.test.ts. Steps must not throw on missing fields.
 */
const MIGRATIONS: Record<number, (save: RawSave) => RawSave> = {
  // v1 (pre-release) kept currencies flat and had no recovery statistic.
  1: (save) => {
    const { coins, gems, ...rest } = save;
    const stats = (rest.stats ?? {}) as Record<string, unknown>;
    return {
      ...rest,
      version: 2,
      currencies: { coins: coins ?? 0, gems: gems ?? 0 },
      stats: { plantsRecovered: 0, ...stats },
    };
  },
};

export type MigrationOutcome =
  | { ok: true; save: RawSave; fromVersion: number; migrated: boolean }
  | { ok: false; reason: 'newer' | 'invalid'; message: string; fromVersion: number | null };

export function migrateSave(raw: unknown): MigrationOutcome {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'invalid', message: 'Это не файл сохранения.', fromVersion: null };
  }
  const version = (raw as RawSave).version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'invalid', message: 'Не удаётся прочитать версию сохранения.', fromVersion: null };
  }
  if (version > CONFIG.save.version) {
    return {
      ok: false,
      reason: 'newer',
      message: `Это сохранение сделано в более новой версии игры (v${version}).`,
      fromVersion: version,
    };
  }
  let current = raw as RawSave;
  for (let v = version; v < CONFIG.save.version; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, reason: 'invalid', message: `Сохранение версии ${v} не удаётся обновить.`, fromVersion: version };
    current = step(current);
  }
  return { ok: true, save: current, fromVersion: version, migrated: version !== CONFIG.save.version };
}
