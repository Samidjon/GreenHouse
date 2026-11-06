'use client';

import { useEffect, useRef } from 'react';
import { assetUrl } from '@/assets/manifest';
import { AudioService } from '@/audio/AudioService';
import styles from './Menu.module.css';

/** Shown first, every time the game opens. */
export function DedicationScreen({ onContinue }: { onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => button.current?.focus(), []);

  return (
    <main className={styles.dedication} role="alertdialog" aria-modal="true" aria-labelledby="dedication-text">
      <div className={styles.dedicationCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl('ui/heart')} width={64} height={64} alt="" />
        <p id="dedication-text" className={styles.dedicationText}>
          Эта игра специально создавалась для моей бабушки
        </p>
        <button
          ref={button}
          type="button"
          className={styles.dedicationButton}
          onClick={() => {
            AudioService.unlock();
            onContinue();
          }}
        >
          Начать
        </button>
      </div>
    </main>
  );
}
