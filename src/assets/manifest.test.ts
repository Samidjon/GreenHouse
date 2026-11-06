import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetEntry, assetKeyExists, assetKeys } from './manifest';
import { DECORATIONS, EQUIPMENT, FERTILIZERS, POTS, TOOLS, UPGRADES } from '@/data/catalog';
import { PLANTS } from '@/data/plants';
import { GROWTH_STAGES } from '@/types/game';
import { getItemInfo } from '@/data/items';

describe('asset manifest', () => {
  it('points only at files that exist', () => {
    for (const key of assetKeys()) {
      const file = join(process.cwd(), 'public', assetEntry(key).path);
      expect(existsSync(file), key).toBe(true);
    }
  });

  it('has all six stage sprites and a seed packet for every species', () => {
    for (const p of PLANTS) {
      for (const stage of GROWTH_STAGES) expect(assetKeyExists(`${p.spriteKey}/${stage}`), `${p.id}/${stage}`).toBe(true);
      expect(assetKeyExists(`seeds/${p.id}`), p.id).toBe(true);
    }
  });

  it('uses one sprite size for every plant stage', () => {
    for (const p of PLANTS) {
      for (const stage of GROWTH_STAGES) {
        const e = assetEntry(`${p.spriteKey}/${stage}`);
        expect([e.width, e.height]).toEqual([200, 260]);
      }
    }
  });

  it('has art for every catalog item', () => {
    const keys = [
      ...POTS.map((x) => x.sprite),
      ...DECORATIONS.map((x) => x.sprite),
      ...EQUIPMENT.map((x) => x.sprite),
      ...FERTILIZERS.map((x) => x.icon),
      ...UPGRADES.map((x) => x.icon),
      ...TOOLS.map((x) => x.icon),
    ];
    for (const key of keys) expect(assetKeyExists(key), key).toBe(true);
  });

  it('resolves item icons through the registry', () => {
    for (const id of ['seed:basil', 'harvest:basil', 'harvest:basil:golden', 'fert:compost', 'pot:glazed', 'deco:stool', 'equip:heater', 'tool:trowel']) {
      const info = getItemInfo(id);
      expect(info, id).not.toBeNull();
      expect(assetKeyExists(info!.icon), id).toBe(true);
    }
    expect(getItemInfo('harvest:basil:nonsense')).toBeNull();
    expect(getItemInfo('nonsense')).toBeNull();
  });
});
