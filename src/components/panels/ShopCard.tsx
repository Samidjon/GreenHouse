'use client';

import { applyResult, currentSave, useGame } from '@/stores/gameStore';
import { EconomyService } from '@/systems/economy';
import { buy } from '@/systems/shop';
import type { ShopEntry } from '@/systems/shop';
import { AssetImg, Button, PriceTag, RarityTag } from '../ui/primitives';
import styles from './panels.module.css';

export function ShopCard({ entry }: { entry: ShopEntry }) {
  // Re-render when balances change, so buttons reflect what's affordable.
  const save = useGame((s) => s.save);
  if (!save) return null;

  const locked = !!entry.blockedReason;
  const installed = entry.section === 'equipment' && entry.owned > 0;
  const canBuy = (n: number) => !locked && !!entry.price && EconomyService.canAfford(save, [{ currency: entry.price.currency, amount: entry.price.amount * n }]);

  const purchase = (n: number) => applyResult(buy(currentSave(), entry.id, n, Date.now()));

  return (
    <article className={`${styles.card} ${locked && !installed ? styles.locked : ''}`}>
      <AssetImg assetKey={entry.icon} size={64} className={locked && !installed && entry.section === 'seeds' ? styles.dimArt : undefined} />
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <h4>{entry.name}</h4>
          {entry.rarity && <RarityTag rarity={entry.rarity} />}
        </div>
        <p className={styles.cardText}>{entry.description}</p>
        {entry.detail && <p className={styles.cardDetail}>{entry.detail}</p>}
        <div className={styles.cardFoot}>
          {entry.price && <PriceTag price={entry.price} unaffordable={!locked && !canBuy(1)} />}
          {entry.stackable && entry.owned > 0 && <span className={styles.owned}>У вас: {entry.owned}</span>}
          <span className={styles.flexGap} />
          {installed ? (
            <span className={styles.installed}>Установлено</span>
          ) : locked ? (
            <span className={styles.lockText}>{entry.blockedReason}</span>
          ) : (
            <>
              {entry.stackable && entry.section === 'seeds' && (
                <Button small disabled={!canBuy(5)} silent onClick={() => purchase(5)}>
                  Купить 5
                </Button>
              )}
              <Button small variant="primary" disabled={!canBuy(1)} silent onClick={() => purchase(1)} aria-label={`Купить: ${entry.name}`}>
                Купить
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
