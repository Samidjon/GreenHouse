import { CONFIG } from '@/data/config';
import { getDb } from './db';
import type { BackupRecord, SaveEnvelope } from './db';
import { migrateSave } from './migrations';
import { validateSave } from './validate';
import type { SaveData } from '@/types/game';

const MAIN_ID = 'main';
const EMERGENCY_KEY = 'greenhouse.emergency-save';
const EXPORT_FORMAT = 'greenhouse-save';

export function checksum(text: string): string {
  // FNV-1a. Catches truncation and bit-rot; not meant to stop deliberate edits.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function makeEnvelope(save: SaveData, now: number): SaveEnvelope {
  const stamped: SaveData = { ...save, lastSavedAt: now };
  const payload = JSON.stringify(stamped);
  return { id: MAIN_ID, version: stamped.version, savedAt: now, checksum: checksum(payload), payload };
}

export type LoadStatus =
  | { kind: 'none' }
  | { kind: 'ok'; save: SaveData; notes: string[] }
  /** The main save was damaged; this came from a backup. The damaged copy is kept. */
  | { kind: 'recovered'; save: SaveData; notes: string[] }
  /** Saved by a newer build. It is left untouched and must not be overwritten. */
  | { kind: 'newer'; message: string }
  /** Nothing readable, but the damaged data stays on disk. */
  | { kind: 'corrupt'; message: string };

type Decoded =
  | { ok: true; save: SaveData; migrated: boolean; repairs: string[] }
  | { ok: false; reason: 'newer' | 'invalid'; message: string };

export function decodeEnvelope(env: Pick<SaveEnvelope, 'payload' | 'checksum'>, now: number): Decoded {
  if (checksum(env.payload) !== env.checksum) return { ok: false, reason: 'invalid', message: 'Файл сохранения повреждён.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(env.payload);
  } catch {
    return { ok: false, reason: 'invalid', message: 'Файл сохранения не читается.' };
  }
  return decodeRaw(parsed, now);
}

function decodeRaw(parsed: unknown, now: number): Decoded {
  const migrated = migrateSave(parsed);
  if (!migrated.ok) return { ok: false, reason: migrated.reason, message: migrated.message };
  const valid = validateSave(migrated.save, now);
  if (!valid.ok) return { ok: false, reason: 'invalid', message: valid.error };
  return { ok: true, save: valid.save, migrated: migrated.migrated, repairs: valid.repairs };
}

function readEmergency(): SaveEnvelope | null {
  try {
    const text = globalThis.localStorage?.getItem(EMERGENCY_KEY);
    return text ? (JSON.parse(text) as SaveEnvelope) : null;
  } catch {
    return null;
  }
}

function clearEmergency(): void {
  try {
    globalThis.localStorage?.removeItem(EMERGENCY_KEY);
  } catch {
    // Storage can be unavailable in private modes. The main save is unaffected.
  }
}

// Writes run strictly in order, so a slow older write can't land on top of a newer one.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function addBackup(envelope: SaveEnvelope, reason: BackupRecord['reason'], now: number): Promise<void> {
  const db = getDb();
  await db.backups.add({ envelope, reason, createdAt: now });
  // Only routine rotations are pruned. A pre-migration or pre-import copy is the
  // one thing that could rescue someone from a bad upgrade, so those stay.
  const rotation = await db.backups.where('reason').equals('rotation').sortBy('createdAt');
  const excess = rotation.length - CONFIG.save.backupsKept;
  if (excess > 0) {
    await db.backups.bulkDelete(rotation.slice(0, excess).map((b) => b.key!));
  }
}

export const SaveService = {
  /**
   * Finds the best save without ever deleting anything: the newest valid copy
   * wins, damaged copies are preserved, and a save from a newer build blocks
   * the game from writing over it.
   */
  async load(now: number): Promise<LoadStatus> {
    await queue; // Let pending writes land first, so we read the newest state.
    const db = getDb();
    const main = await db.saves.get(MAIN_ID);
    const emergency = readEmergency();

    const mainDecoded = main ? decodeEnvelope(main, now) : null;
    if (mainDecoded && !mainDecoded.ok && mainDecoded.reason === 'newer') {
      return { kind: 'newer', message: mainDecoded.message };
    }

    // The emergency copy is written synchronously on tab close, so it can be newer than IndexedDB.
    if (emergency && (!main || emergency.savedAt > main.savedAt)) {
      const decoded = decodeEnvelope(emergency, now);
      if (decoded.ok) {
        await this.write(decoded.save, now);
        clearEmergency();
        return { kind: 'ok', save: decoded.save, notes: decoded.repairs };
      }
    }

    if (main && mainDecoded?.ok) {
      if (mainDecoded.migrated) {
        await addBackup(main, 'pre-migration', now);
        await this.write(mainDecoded.save, now);
      }
      clearEmergency();
      return { kind: 'ok', save: mainDecoded.save, notes: mainDecoded.repairs };
    }

    if (!main) {
      const hasBackups = (await db.backups.count()) > 0;
      if (!hasBackups) return { kind: 'none' };
    }

    // Main is missing or damaged: walk the backups, newest first.
    const backups = await db.backups.orderBy('createdAt').reverse().toArray();
    for (const b of backups) {
      const decoded = decodeEnvelope(b.envelope, now);
      if (decoded.ok) {
        if (main) await addBackup(main, 'unreadable', now);
        await this.write(decoded.save, now);
        return {
          kind: 'recovered',
          save: decoded.save,
          notes: ['Последнее сохранение оказалось повреждено, поэтому игра восстановила самую свежую резервную копию.'],
        };
      }
    }
    return { kind: 'corrupt', message: 'Не удалось прочитать сохранение. Оно не удалено.' };
  },

  write(save: SaveData, now: number): Promise<SaveEnvelope> {
    return enqueue(async () => {
      const envelope = makeEnvelope(save, now);
      await getDb().saves.put(envelope);
      return envelope;
    });
  },

  /** A periodic copy of the save, for recovery from later corruption. */
  rotateBackup(save: SaveData, now: number): Promise<void> {
    return enqueue(() => addBackup(makeEnvelope(save, now), 'rotation', now));
  },

  /** Keeps whatever is currently stored before a new game or import replaces it. */
  archiveCurrent(reason: BackupRecord['reason'], now: number): Promise<void> {
    return enqueue(async () => {
      const main = await getDb().saves.get(MAIN_ID);
      if (main) await addBackup(main, reason, now);
      clearEmergency();
    });
  },

  /** Synchronous last-chance copy for tab close, when an IndexedDB write may not finish. */
  writeEmergency(save: SaveData, now: number): void {
    try {
      globalThis.localStorage?.setItem(EMERGENCY_KEY, JSON.stringify(makeEnvelope(save, now)));
    } catch {
      // Quota or private mode: the regular autosave still protects all but the final moments.
    }
  },

  async listBackups(): Promise<{ key: number; reason: BackupRecord['reason']; createdAt: number; valid: boolean }[]> {
    const now = Date.now();
    const rows = await getDb().backups.orderBy('createdAt').reverse().toArray();
    return rows.map((b) => ({
      key: b.key!,
      reason: b.reason,
      createdAt: b.createdAt,
      valid: decodeEnvelope(b.envelope, now).ok,
    }));
  },

  async restoreBackup(key: number, now: number): Promise<{ ok: true; save: SaveData } | { ok: false; error: string }> {
    const record = await getDb().backups.get(key);
    if (!record) return { ok: false, error: 'Этой резервной копии больше нет.' };
    const decoded = decodeEnvelope(record.envelope, now);
    if (!decoded.ok) return { ok: false, error: decoded.message };
    await this.archiveCurrent('pre-import', now);
    await this.write(decoded.save, now);
    return { ok: true, save: decoded.save };
  },

  exportText(save: SaveData, now: number): string {
    const stamped: SaveData = { ...save, lastSavedAt: now };
    return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: now, save: stamped }, null, 1);
  },

  /** Parses and fully validates an exported file without touching stored data. */
  parseImport(text: string, now: number): { ok: true; save: SaveData; repairs: string[] } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'Это не файл сохранения игры.' };
    }
    if (typeof parsed !== 'object' || parsed === null || (parsed as { format?: unknown }).format !== EXPORT_FORMAT) {
      return { ok: false, error: 'Это не файл сохранения игры.' };
    }
    const decoded = decodeRaw((parsed as { save?: unknown }).save, now);
    if (!decoded.ok) return { ok: false, error: decoded.message };
    return { ok: true, save: decoded.save, repairs: decoded.repairs };
  },

  /** Replaces the current game with a validated import, keeping the old one as a backup. */
  async commitImport(save: SaveData, now: number): Promise<void> {
    await this.archiveCurrent('pre-import', now);
    await this.write(save, now);
  },
};
