import Dexie, { type EntityTable } from 'dexie';

/** A stored save. The payload stays a string so its checksum covers exactly the bytes on disk. */
export interface SaveEnvelope {
  id: string;
  version: number;
  savedAt: number;
  checksum: string;
  payload: string;
}

export interface BackupRecord {
  key?: number;
  reason: 'rotation' | 'pre-migration' | 'pre-import' | 'pre-new-game' | 'unreadable';
  createdAt: number;
  envelope: SaveEnvelope;
}

export class GreenhouseDB extends Dexie {
  saves!: EntityTable<SaveEnvelope, 'id'>;
  backups!: EntityTable<BackupRecord, 'key'>;

  constructor() {
    super('greenhouse');
    this.version(1).stores({
      saves: 'id',
      backups: '++key, createdAt, reason',
    });
  }
}

let instance: GreenhouseDB | null = null;

export function getDb(): GreenhouseDB {
  instance ??= new GreenhouseDB();
  return instance;
}

/** For tests. */
export async function resetDbForTests(): Promise<void> {
  if (instance) {
    await instance.delete();
    instance = null;
  }
}
