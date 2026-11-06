'use client';

import { AudioService } from '@/audio/AudioService';
import { fertilizerById, FERTILIZERS, potById } from '@/data/catalog';
import { fertItemId, seedItemId } from '@/data/items';
import { PLANTS, plantById } from '@/data/plants';
import { useGame } from '@/stores/gameStore';
import { openPanel, selectTool, uiStore, useUi } from '@/stores/uiStore';
import { AssetImg, Button } from '../ui/primitives';
import styles from './ToolHint.module.css';

/** Says what the active tool does, and offers the choice it needs. */
export function ToolHint() {
  const tool = useUi((s) => s.tool);
  const seedId = useUi((s) => s.seedId);
  const fertilizerId = useUi((s) => s.fertilizerId);
  const potId = useUi((s) => s.potId);
  const hasPlacement = useUi((s) => !!s.placement);
  const inventory = useGame((s) => s.save?.inventory);

  if (tool === 'hand' || !inventory || hasPlacement) return null;

  const seeds = PLANTS.filter((p) => (inventory[seedItemId(p.id)] ?? 0) > 0);
  const ferts = FERTILIZERS.filter((f) => (inventory[fertItemId(f.id)] ?? 0) > 0);

  let text = '';
  let tray = null;
  switch (tool) {
    case 'water':
      text = 'Нажмите на растение, чтобы полить его.';
      break;
    case 'trowel':
      text = 'Нажмите на растение, чтобы выкопать его.';
      break;
    case 'decorate':
      text = 'Нажмите на украшение или перетащите его. Новые берутся из сумки.';
      break;
    case 'repot':
      text = `Нажмите на место для нового горшка: ${potById(potId ?? '')?.name ?? ''}.`;
      break;
    case 'plant':
      text = seedId ? `Нажмите на пустой горшок, чтобы посадить: ${plantById(seedId)?.name ?? ''}.` : seeds.length ? 'Выберите семена.' : 'Семена закончились.';
      tray = seeds.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`${styles.chip} ${seedId === p.id ? styles.chipOn : ''}`}
          onClick={() => {
            AudioService.play('ui');
            uiStore.setState({ seedId: p.id });
          }}
        >
          <AssetImg assetKey={`seeds/${p.id}`} size={30} />
          <span>{p.name}</span>
          <b>×{inventory[seedItemId(p.id)]}</b>
        </button>
      ));
      break;
    case 'feed':
      text = fertilizerId ? `Нажмите на растение, чтобы дать: ${fertilizerById(fertilizerId)?.name ?? ''}.` : ferts.length ? 'Выберите удобрение.' : 'Удобрения закончились.';
      tray = ferts.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`${styles.chip} ${fertilizerId === f.id ? styles.chipOn : ''}`}
          onClick={() => {
            AudioService.play('ui');
            uiStore.setState({ fertilizerId: f.id });
          }}
        >
          <AssetImg assetKey={f.icon} size={30} />
          <span>{f.name}</span>
          <b>×{inventory[fertItemId(f.id)]}</b>
        </button>
      ));
      break;
  }

  const showBuy = (tool === 'plant' && seeds.length === 0) || (tool === 'feed' && ferts.length === 0);

  return (
    <div className={styles.hint} role="status">
      <div className={styles.line}>
        <span>{text}</span>
        {showBuy && (
          <Button small variant="primary" onClick={() => openPanel({ id: 'shop', shopSection: 'seeds' })}>
            В магазин
          </Button>
        )}
        {tool === 'decorate' && (
          <Button small variant="primary" onClick={() => openPanel({ id: 'inventory', inventoryCategory: 'decoration' })}>
            Открыть сумку
          </Button>
        )}
        <Button small variant="ghost" onClick={() => selectTool('hand')}>
          Готово
        </Button>
      </div>
      {tray && tray.length > 0 && <div className={styles.tray}>{tray}</div>}
    </div>
  );
}
