import manifestJson from '../../public/assets/manifest.json';

export interface AssetEntry {
  path: string;
  width: number;
  height: number;
  /** Sprite anchor as a 0..1 fraction, where the art isn't centred. */
  originX?: number;
  originY?: number;
  /** Set both to load the file as a spritesheet of frames this size. */
  frameWidth?: number;
  frameHeight?: number;
}

const ENTRIES = (manifestJson as { entries: Record<string, AssetEntry> }).entries;

export const assetKeys = (): string[] => Object.keys(ENTRIES);
export const assetKeyExists = (key: string): boolean => key in ENTRIES;

export function assetEntry(key: string): AssetEntry {
  const entry = ENTRIES[key];
  if (!entry) throw new Error(`Unknown asset key "${key}". Check public/assets/manifest.json.`);
  return entry;
}

export const assetUrl = (key: string): string => assetEntry(key).path;
