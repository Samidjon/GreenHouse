'use client';

import { AudioService } from '@/audio/AudioService';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { selectTool, togglePanel, useUi } from '@/stores/uiStore';
import type { PanelId, Tool } from '@/stores/uiStore';
import { isEquipmentOn } from '@/systems/environment';
import { waterAll } from '@/systems/plantActions';
import { AssetImg } from '../ui/primitives';
import styles from './Toolbar.module.css';

const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'hand', label: 'Рука', icon: 'ui/hand', key: '1' },
  { id: 'water', label: 'Полив', icon: 'items/tool_watering_can', key: '2' },
  { id: 'plant', label: 'Посадка', icon: 'ui/sprout', key: '3' },
  { id: 'feed', label: 'Подкорм', icon: 'items/fert_compost', key: '4' },
  { id: 'trowel', label: 'Совок', icon: 'items/tool_trowel', key: '5' },
  { id: 'decorate', label: 'Декор', icon: 'ui/brush', key: 'D' },
];

const MENUS: { id: PanelId; label: string; icon: string; key: string }[] = [
  { id: 'shop', label: 'Магазин', icon: 'ui/shop', key: 'S' },
  { id: 'inventory', label: 'Сумка', icon: 'ui/bag', key: 'I' },
  { id: 'encyclopedia', label: 'Растения', icon: 'ui/book', key: 'E' },
  { id: 'achievements', label: 'Награды', icon: 'ui/trophy', key: 'A' },
  { id: 'upgrades', label: 'Улучшить', icon: 'ui/up', key: 'U' },
  { id: 'expansion', label: 'Стройка', icon: 'ui/hammer', key: 'X' },
  { id: 'settings', label: 'Опции', icon: 'ui/gear', key: 'O' },
];

export function Toolbar() {
  const tool = useUi((s) => s.tool);
  const panel = useUi((s) => s.panel?.id);
  const hasHose = useGame((s) => (s.save ? isEquipmentOn(s.save, 'hose') : false));

  return (
    <nav className={styles.bar} aria-label="Инструменты и меню">
      <div className={styles.group} role="toolbar" aria-label="Инструменты">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.btn} ${tool === t.id ? styles.on : ''}`}
            aria-pressed={tool === t.id}
            onClick={() => {
              AudioService.play('ui');
              selectTool(tool === t.id ? 'hand' : t.id);
            }}
          >
            <AssetImg assetKey={t.icon} size={30} />
            <span className={styles.label}>{t.label}</span>
            <kbd className={styles.key}>{t.key}</kbd>
          </button>
        ))}
        {hasHose && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              applyResult(waterAll(currentSave(), Date.now()));
            }}
          >
            <AssetImg assetKey="equipment/hose" size={30} />
            <span className={styles.label}>Всё полить</span>
          </button>
        )}
      </div>
      <div className={styles.group} aria-label="Меню">
        {MENUS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${styles.btn} ${panel === m.id ? styles.on : ''}`}
            onClick={() => {
              AudioService.play('ui');
              togglePanel(m.id);
            }}
          >
            <AssetImg assetKey={m.icon} size={30} />
            <span className={styles.label}>{m.label}</span>
            <kbd className={styles.key}>{m.key}</kbd>
          </button>
        ))}
      </div>
    </nav>
  );
}
