'use client';

import { useState } from 'react';
import { COLLECTION_MILESTONES, mutationById, MUTATIONS } from '@/data/catalog';
import { CATEGORY_LABELS, LIGHT_LABELS, PLANTS, plantById } from '@/data/plants';
import { useGame } from '@/stores/gameStore';
import { speciesDiscovered } from '@/systems/progression';
import { coinsText, formatDate, formatDuration, formatNumber, gemsText, plural } from '@/utils/format';
import { AssetImg, Meter, RarityTag } from '../ui/primitives';
import type { Reward } from '@/types/game';
import styles from './panels.module.css';

export function rewardLabel(r: Reward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(coinsText(r.coins));
  if (r.gems) parts.push(gemsText(r.gems));
  if (r.items?.length) {
    const count = r.items.reduce((n, i) => n + i.quantity, 0);
    parts.push(`${count} ${plural(count, 'предмет', 'предмета', 'предметов')}`);
  }
  return parts.join(', ');
}

export function EncyclopediaContent() {
  const save = useGame((s) => s.save);
  const [selected, setSelected] = useState<string>(PLANTS[0]!.id);
  if (!save) return null;

  const found = speciesDiscovered(save);
  const plant = plantById(selected)!;
  const entry = save.encyclopedia[selected];

  return (
    <div className={styles.column}>
      <Meter label="Открыто видов" value={found / PLANTS.length} detail={`${found} из ${PLANTS.length}`} tone="leaf" />
      <ul className={styles.milestones}>
        {COLLECTION_MILESTONES.map((m) => {
          const done = save.collectionRewards.includes(m.id);
          return (
            <li key={m.id} className={done ? styles.milestoneDone : undefined}>
              <b>
                {m.speciesRequired}: {m.name}
              </b>
              <small>{done ? 'Получено' : rewardLabel(m.reward)}</small>
            </li>
          );
        })}
      </ul>

      <div className={styles.split}>
        <ul className={styles.itemGrid}>
          {PLANTS.map((p) => {
            const known = !!save.encyclopedia[p.id];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`${styles.itemTile} ${selected === p.id ? styles.itemOn : ''}`}
                  aria-pressed={selected === p.id}
                  aria-label={known ? p.name : 'Неоткрытый вид'}
                  onClick={() => setSelected(p.id)}
                >
                  <AssetImg assetKey={`${p.spriteKey}/HARVESTABLE`} size={54} className={known ? undefined : styles.silhouette} />
                  {!known && <b className={styles.unknownMark}>?</b>}
                </button>
              </li>
            );
          })}
        </ul>

        <aside className={styles.detail}>
          <AssetImg assetKey={`${plant.spriteKey}/HARVESTABLE`} size={108} className={entry ? undefined : styles.silhouette} />
          {entry ? (
            <>
              <h3>{plant.name}</h3>
              <em className={styles.latin}>{plant.latinName}</em>
              <div className={styles.detailTags}>
                <RarityTag rarity={plant.rarity} />
                <span className={styles.chip}>{CATEGORY_LABELS[plant.category]}</span>
              </div>
              <p className={styles.cardText}>{plant.description}</p>
              <dl className={styles.facts}>
                <div>
                  <dt>Впервые выращено</dt>
                  <dd>{formatDate(entry.firstDiscoveredAt)}</dd>
                </div>
                <div>
                  <dt>Всего собрано</dt>
                  <dd>{formatNumber(entry.totalHarvested)}</dd>
                </div>
                <div>
                  <dt>Растёт</dt>
                  <dd>{formatDuration(plant.growthDurationSec)}</dd>
                </div>
                <div>
                  <dt>Вода</dt>
                  <dd>{plant.water.label}</dd>
                </div>
                <div>
                  <dt>Свет</dt>
                  <dd>{LIGHT_LABELS[plant.light]}</dd>
                </div>
                <div>
                  <dt>Температура</dt>
                  <dd>
                    {plant.temperature.min}–{plant.temperature.max}°C
                  </dd>
                </div>
              </dl>
              <div className={styles.mutations}>
                <b>Найденные сорта:</b>{' '}
                {entry.mutations.length ? entry.mutations.map((m) => mutationById(m)?.name).join(', ') : `пока нет (всего ${MUTATIONS.length})`}
              </div>
            </>
          ) : (
            <>
              <h3>Не открыто</h3>
              <div className={styles.detailTags}>
                <RarityTag rarity={plant.rarity} />
              </div>
              <p className={styles.cardText}>
                Соберите урожай, чтобы узнать об этом растении больше. Семена появятся в магазине на уровне {plant.unlockLevel}
                {plant.minGreenhouseLevel > 1 ? `, когда теплица дойдёт до этапа ${plant.minGreenhouseLevel}` : ''}.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
