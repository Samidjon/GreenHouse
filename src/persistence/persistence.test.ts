import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG } from '@/data/config';
import { createNewSave } from '@/systems/newGame';
import { getDb, resetDbForTests } from './db';
import { migrateSave } from './migrations';
import { checksum, makeEnvelope, SaveService } from './saveService';
import { validateSave } from './validate';
import type { SaveData } from '@/types/game';

const T0 = 1_800_000_000_000;
const fresh = (): SaveData => createNewSave(T0, 42);

function assertOk<T extends { kind: string }>(s: T): asserts s is T & { kind: 'ok' | 'recovered'; save: SaveData } {
  if (s.kind !== 'ok' && s.kind !== 'recovered') throw new Error(`Unexpected load status: ${s.kind}`);
}

beforeEach(async () => {
  await resetDbForTests();
  await SaveService.archiveCurrent('rotation', T0).catch(() => undefined);
  await resetDbForTests();
});

describe('validation', () => {
  it('accepts a good save unchanged in meaning', () => {
    const r = validateSave(fresh(), T0);
    expect(r.ok && r.repairs).toEqual([]);
    expect(r.ok && r.save.currencies.coins).toBe(CONFIG.start.coins);
  });

  it.each([null, 7, 'x', [], {}, { profile: {} }])('rejects junk: %j', (junk) => {
    expect(validateSave(junk, T0).ok).toBe(false);
  });

  it('rejects an impossible greenhouse level', () => {
    expect(validateSave({ ...fresh(), greenhouseLevel: 99 }, T0).ok).toBe(false);
  });

  it('repairs negative and non-numeric currency', () => {
    const r = validateSave({ ...fresh(), currencies: { coins: -500, gems: 'lots' } }, T0);
    expect(r.ok && r.save.currencies).toEqual({ coins: 0, gems: 0 });
  });

  it('clamps out-of-range plant values and refuses plants in unbuilt slots', () => {
    const save = fresh();
    const plant = { id: 'p1', speciesId: 'basil', slotId: 'a1', plantedAt: T0, growth: 7, moisture: -9, health: 500, fertilizer: null, mutation: 'nope', seed: 1, neglected: false };
    save.plants = { p1: plant, p2: { ...plant, id: 'p2', slotId: 'e1' }, p3: { ...plant, id: 'p3', slotId: 'a1' } };
    const r = validateSave(save, T0);
    if (!r.ok) throw new Error(r.error);
    expect(Object.keys(r.save.plants)).toEqual(['p1']);
    expect(r.save.plants['p1']).toMatchObject({ growth: 1, moisture: 0, health: 100, mutation: null });
  });

  it('treats a future clock as no credit, not free growth', () => {
    const r = validateSave({ ...fresh(), simulatedUntil: T0 + 1e12 }, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.simulatedUntil).toBeLessThanOrEqual(T0);
    expect(r.repairs.length).toBeGreaterThan(0);
  });

  it('handles NaN-like timestamps', () => {
    const r = validateSave({ ...fresh(), simulatedUntil: null, createdAt: 'yesterday' }, T0);
    expect(r.ok).toBe(true);
  });

  it('drops corrupt inventory quantities', () => {
    const r = validateSave({ ...fresh(), inventory: { 'seed:basil': -3, 'seed:mint': 2.5, 'fert:compost': 'x' } }, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.inventory).toEqual({ 'seed:mint': 2 });
  });

  it('keeps items from future content updates', () => {
    const r = validateSave({ ...fresh(), inventory: { 'seed:from_the_future': 4 } }, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.inventory['seed:from_the_future']).toBe(4);
  });

  it('survives an extra round trip through JSON', () => {
    const r = validateSave(JSON.parse(JSON.stringify(fresh())), T0);
    if (!r.ok) throw new Error(r.error);
    const again = validateSave(JSON.parse(JSON.stringify(r.save)), T0);
    expect(again.ok && again.save).toEqual(r.save);
  });
});

describe('migrations', () => {
  const v1 = () => {
    const { currencies, version: _v, ...rest } = fresh();
    const { plantsRecovered: _p, ...stats } = rest.stats;
    return { ...rest, stats, coins: currencies.coins, gems: currencies.gems, version: 1 };
  };

  it('upgrades v1 to the current shape', () => {
    const out = migrateSave(v1());
    if (!out.ok) throw new Error(out.message);
    expect(out.migrated).toBe(true);
    expect(out.save.version).toBe(CONFIG.save.version);
    const valid = validateSave(out.save, T0);
    expect(valid.ok && valid.save.currencies.coins).toBe(CONFIG.start.coins);
    expect(valid.ok && valid.save.stats.plantsRecovered).toBe(0);
  });

  it('leaves the current version alone', () => {
    const out = migrateSave(fresh());
    expect(out.ok && out.migrated).toBe(false);
  });

  it('refuses saves from the future and unversioned data', () => {
    expect(migrateSave({ version: CONFIG.save.version + 1 })).toMatchObject({ ok: false, reason: 'newer' });
    expect(migrateSave({ version: 'one' })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(migrateSave(null)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('keeps the v1 original as a backup when upgrading on load', async () => {
    const payload = JSON.stringify(v1());
    await getDb().saves.put({ id: 'main', version: 1, savedAt: T0, checksum: checksum(payload), payload });
    const status = await SaveService.load(T0 + 1000);
    assertOk(status);
    expect(status.save.version).toBe(CONFIG.save.version);
    const backups = await SaveService.listBackups();
    expect(backups.map((b) => b.reason)).toContain('pre-migration');
    const stored = await getDb().saves.get('main');
    expect(stored?.version).toBe(CONFIG.save.version);
  });
});

describe('save service', () => {
  it('reports no save on a clean install, and writes nothing', async () => {
    expect((await SaveService.load(T0)).kind).toBe('none');
    expect(await getDb().saves.count()).toBe(0);
  });

  it('round-trips a save', async () => {
    const save = fresh();
    save.currencies.coins = 1234;
    await SaveService.write(save, T0 + 5);
    const status = await SaveService.load(T0 + 10);
    assertOk(status);
    expect(status.save.currencies.coins).toBe(1234);
    expect(status.save.lastSavedAt).toBe(T0 + 5);
  });

  it('applies writes in order even when issued together', async () => {
    const a = fresh();
    a.currencies.coins = 1;
    const b = fresh();
    b.currencies.coins = 2;
    await Promise.all([SaveService.write(a, T0), SaveService.write(b, T0 + 1)]);
    const status = await SaveService.load(T0 + 2);
    assertOk(status);
    expect(status.save.currencies.coins).toBe(2);
  });

  it('falls back to a backup when the main save is corrupted, and keeps the damaged copy', async () => {
    const good = fresh();
    good.currencies.coins = 777;
    await SaveService.write(good, T0);
    await SaveService.rotateBackup(good, T0);
    const env = makeEnvelope(good, T0 + 10);
    await getDb().saves.put({ ...env, payload: env.payload.slice(0, 50) });

    const status = await SaveService.load(T0 + 20);
    expect(status.kind).toBe('recovered');
    assertOk(status);
    expect(status.save.currencies.coins).toBe(777);
    expect((await SaveService.listBackups()).map((b) => b.reason)).toContain('unreadable');
  });

  it('never wipes unreadable data', async () => {
    await getDb().saves.put({ id: 'main', version: 2, savedAt: T0, checksum: 'nope', payload: '{"broken"' });
    const status = await SaveService.load(T0);
    expect(status.kind).toBe('corrupt');
    expect((await getDb().saves.get('main'))?.payload).toBe('{"broken"');
  });

  it('won’t touch a save from a newer version', async () => {
    const payload = JSON.stringify({ ...fresh(), version: CONFIG.save.version + 5 });
    await getDb().saves.put({ id: 'main', version: CONFIG.save.version + 5, savedAt: T0, checksum: checksum(payload), payload });
    const status = await SaveService.load(T0);
    expect(status.kind).toBe('newer');
    expect((await getDb().saves.get('main'))?.payload).toBe(payload);
  });

  it('prunes only routine backups', async () => {
    const save = fresh();
    await SaveService.write(save, T0);
    await SaveService.archiveCurrent('pre-import', T0);
    for (let i = 0; i < CONFIG.save.backupsKept + 3; i++) await SaveService.rotateBackup(save, T0 + i);
    const rows = await SaveService.listBackups();
    expect(rows.filter((r) => r.reason === 'rotation')).toHaveLength(CONFIG.save.backupsKept);
    expect(rows.filter((r) => r.reason === 'pre-import')).toHaveLength(1);
  });

  it('restores a chosen backup, archiving the present state first', async () => {
    const old = fresh();
    old.currencies.coins = 11;
    await SaveService.rotateBackup(old, T0);
    const key = (await SaveService.listBackups())[0]!.key;
    const present = fresh();
    present.currencies.coins = 22;
    await SaveService.write(present, T0 + 1);
    const r = await SaveService.restoreBackup(key, T0 + 2);
    expect(r.ok && r.save.currencies.coins).toBe(11);
    const status = await SaveService.load(T0 + 3);
    assertOk(status);
    expect(status.save.currencies.coins).toBe(11);
    expect((await SaveService.listBackups()).map((b) => b.reason)).toContain('pre-import');
  });
});

describe('export and import', () => {
  it('round-trips through text', () => {
    const save = fresh();
    save.currencies.coins = 4321;
    const r = SaveService.parseImport(SaveService.exportText(save, T0), T0 + 1);
    expect(r.ok && r.save.currencies.coins).toBe(4321);
  });

  it.each(['', 'not json', '{}', '{"format":"other"}', '{"format":"greenhouse-save"}', '{"format":"greenhouse-save","save":{"version":2}}'])(
    'rejects bad import: %s',
    (text) => {
      expect(SaveService.parseImport(text, T0).ok).toBe(false);
    },
  );

  it('sanitises a hand-edited file: no infinite money', () => {
    const save = fresh();
    const text = SaveService.exportText(save, T0).replace(`"coins": ${CONFIG.start.coins}`, '"coins": -99');
    const r = SaveService.parseImport(text, T0);
    expect(r.ok && r.save.currencies.coins).toBe(0);
  });

  it('commit keeps the previous game as a backup', async () => {
    const current = fresh();
    current.currencies.coins = 9;
    await SaveService.write(current, T0);
    const incoming = fresh();
    incoming.currencies.coins = 10;
    await SaveService.commitImport(incoming, T0 + 1);
    const status = await SaveService.load(T0 + 2);
    assertOk(status);
    expect(status.save.currencies.coins).toBe(10);
    expect((await SaveService.listBackups())[0]?.reason).toBe('pre-import');
  });
});
