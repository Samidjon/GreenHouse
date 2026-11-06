'use client';

import { equipmentById, EQUIPMENT } from '@/data/catalog';
import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { coziness, cozinessBonus } from '@/systems/derived';
import { setEquipmentActive, shopEntries } from '@/systems/shop';
import { AssetImg, Button } from '../ui/primitives';
import { ShopCard } from './ShopCard';
import styles from './panels.module.css';

export function UpgradesContent() {
  const save = useGame((s) => s.save);
  if (!save) return null;
  const owned = EQUIPMENT.filter((e) => save.equipment[e.id]);

  return (
    <div className={styles.column}>
      <section>
        <h3 className={styles.heading}>Улучшения мастерской</h3>
        <div className={styles.cardGrid}>
          {shopEntries(save, 'upgrades').map((e) => (
            <ShopCard key={e.id} entry={e} />
          ))}
        </div>
      </section>

      <section>
        <h3 className={styles.heading}>Установленное оборудование</h3>
        {owned.length === 0 ? (
          <p className={styles.muted}>Пока ничего. В магазине, в разделе «Оборудование», есть лампы, печка и многое другое.</p>
        ) : (
          <ul className={styles.rows}>
            {owned.map((e) => {
              const active = save.equipment[e.id]!.active;
              return (
                <li key={e.id} className={styles.row}>
                  <AssetImg assetKey={e.sprite} size={44} />
                  <div className={styles.grow}>
                    <b>{equipmentById(e.id)!.name}</b>
                    <small>{e.effectText}</small>
                  </div>
                  <Button small variant={active ? 'primary' : 'wood'} aria-pressed={active} onClick={() => applyResult(setEquipmentActive(currentSave(), e.id, !active))}>
                    {active ? 'Вкл.' : 'Выкл.'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className={styles.muted}>
        Уют: {coziness(save)}. Украшения ускоряют рост на {Math.round(cozinessBonus(save) * 100)}% (максимум на 15%).
      </p>
    </div>
  );
}
