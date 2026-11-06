'use client';

import { decorationById } from '@/data/catalog';
import { cancelPlacement, confirmPlacement, flipPlacement, storePlacedDecoration } from '@/stores/commands';
import { useUi } from '@/stores/uiStore';
import { AssetImg, Button } from '../ui/primitives';
import styles from './ToolHint.module.css';

/** Touch-friendly controls for the decoration being placed or moved. */
export function PlacementBar() {
  const p = useUi((s) => s.placement);
  if (!p) return null;
  const def = decorationById(p.defId);
  if (!def) return null;
  return (
    <div className={styles.hint} role="status">
      <div className={styles.line}>
        <AssetImg assetKey={def.sprite} size={32} />
        <span>{p.valid ? `${def.name}: перетащите или нажмите, куда поставить.` : p.reason}</span>
      </div>
      <div className={styles.line}>
        <Button small variant="primary" disabled={!p.valid} onClick={() => confirmPlacement()} silent>
          {p.mode === 'new' ? 'Поставить сюда' : 'Переставить сюда'}
        </Button>
        <Button small onClick={flipPlacement}>
          Отразить
        </Button>
        {p.mode === 'move' && (
          <Button small onClick={storePlacedDecoration}>
            Убрать в сумку
          </Button>
        )}
        <Button small variant="ghost" onClick={cancelPlacement}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
