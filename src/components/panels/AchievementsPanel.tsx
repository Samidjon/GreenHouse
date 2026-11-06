'use client';

import { ACHIEVEMENTS } from '@/data/catalog';
import { useGame } from '@/stores/gameStore';
import { conditionProgress } from '@/systems/progression';
import { formatDate, formatNumber } from '@/utils/format';
import { AssetImg, Meter } from '../ui/primitives';
import { rewardLabel } from './EncyclopediaPanel';
import styles from './panels.module.css';

export function AchievementsContent() {
  const save = useGame((s) => s.save);
  if (!save) return null;
  const earned = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;

  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!save.achievements[a.id]) - Number(!!save.achievements[b.id]));

  return (
    <div className={styles.column}>
      <Meter label="Получено" value={earned / ACHIEVEMENTS.length} detail={`${earned} из ${ACHIEVEMENTS.length}`} tone="sun" />
      <ul className={styles.rows}>
        {sorted.map((a) => {
          const unlocked = save.achievements[a.id];
          const { value, target } = conditionProgress(save, a.condition);
          return (
            <li key={a.id} className={`${styles.row} ${unlocked ? styles.rowDone : ''}`}>
              <AssetImg assetKey="ui/trophy" size={38} className={unlocked ? undefined : styles.dimIcon} />
              <div className={styles.grow}>
                <b>{a.name}</b>
                <small>{a.description}</small>
                {!unlocked && (
                  <Meter
                    label={rewardLabel(a.reward)}
                    value={Math.min(1, value / target)}
                    detail={`${formatNumber(Math.min(value, target))} / ${formatNumber(target)}`}
                    tone="sun"
                  />
                )}
                {unlocked && <small>Получено {formatDate(unlocked.unlockedAt)}</small>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
