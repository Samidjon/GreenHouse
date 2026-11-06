'use client';

import { potById, POTS } from '@/data/catalog';
import { potItemId, seedItemId } from '@/data/items';
import { CATEGORY_LABELS, PLANTS } from '@/data/plants';
import { plantHere } from '@/stores/commands';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { openPanel, uiStore, useUi } from '@/stores/uiStore';
import { potFor } from '@/systems/derived';
import { changePot } from '@/systems/plantActions';
import { formatDuration } from '@/utils/format';
import { AssetImg, Button, EmptyState } from '../ui/primitives';
import styles from './SheetContent.module.css';

/** The sheet for an empty pot: choose a seed, or change the pot. */
export function SeedPicker() {
  const slotId = useUi((s) => s.pickingSeedFor);
  const save = useGame((s) => s.save);
  if (!slotId || !save) return null;

  const seeds = PLANTS.filter((p) => (save.inventory[seedItemId(p.id)] ?? 0) > 0);
  const pots = POTS.filter((p) => (save.inventory[potItemId(p.id)] ?? 0) > 0);
  const pot = potFor(save, slotId);
  const close = () => uiStore.setState({ pickingSeedFor: null });

  return (
    <aside className={styles.sheet} aria-label="Посадка">
      <header className={styles.sheetHead}>
        <AssetImg assetKey={pot.sprite} size={38} />
        <div className={styles.grow}>
          <h3>Что посадим?</h3>
          <small>{pot.name}</small>
        </div>
        <button type="button" className={styles.x} onClick={close} aria-label="Закрыть">
          <AssetImg assetKey="ui/close" size={18} />
        </button>
      </header>

      {seeds.length === 0 ? (
        <EmptyState icon="ui/shop" title="В сумке нет семян">
          На рабочем столе их много.
        </EmptyState>
      ) : (
        <ul className={styles.seedList}>
          {seeds.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.seedRow} onClick={() => plantHere(slotId, p.id)}>
                <AssetImg assetKey={`seeds/${p.id}`} size={44} />
                <span className={styles.grow}>
                  <b>{p.name}</b>
                  <small>
                    {CATEGORY_LABELS[p.category]} · растёт {formatDuration(p.growthDurationSec)}
                  </small>
                </span>
                <span className={styles.count}>×{save.inventory[seedItemId(p.id)]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.sheetFoot}>
        <Button small variant="primary" onClick={() => openPanel({ id: 'shop', shopSection: 'seeds' })}>
          Купить семена
        </Button>
        {pots.map((p) => (
          <Button
            key={p.id}
            small
            onClick={() => {
              if (applyResult(changePot(currentSave(), slotId, p.id, Date.now()))) close();
            }}
          >
            Поставить: {potById(p.id)?.name}
          </Button>
        ))}
      </div>
    </aside>
  );
}
