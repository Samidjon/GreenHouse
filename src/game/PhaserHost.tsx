'use client';

import { useEffect, useRef } from 'react';
import styles from './PhaserHost.module.css';

/**
 * Owns the single Phaser instance. React renders this empty div once; the game
 * lives inside it and never goes through React's render cycle.
 *
 * Phaser itself touches `window` on import, so it is only imported inside the
 * effect. In strict mode the effect runs twice, so a cancelled flag and the
 * cleanup together guarantee exactly one live game at a time.
 */
export default function PhaserHost() {
  const parent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;

    void import('./createGame').then(({ createGame }) => {
      if (cancelled || !parent.current) return;
      const game = createGame(parent.current);
      destroy = () => game.destroy(true);
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return <div ref={parent} className={styles.host} aria-label="Мир теплицы" role="application" />;
}
