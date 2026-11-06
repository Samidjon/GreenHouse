'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { AudioService } from '@/audio/AudioService';
import { startRuntime } from '@/services/gameRuntime';
import { gameStore, useGame } from '@/stores/gameStore';
import { resetUiForNewSession, uiStore, useUi } from '@/stores/uiStore';
import { Splash } from '../menu/Splash';
import { PanelHost } from '../panels/PanelHost';
import { Button } from '../ui/primitives';
import { GoalNote } from './GoalNote';
import { Hud } from './Hud';
import { Notifications } from './Notifications';
import { OfflineSummaryDialog } from './OfflineSummaryDialog';
import { PlacementBar } from './PlacementBar';
import { PlantCard } from './PlantCard';
import { SeedPicker } from './SeedPicker';
import { Toolbar } from './Toolbar';
import { ToolHint } from './ToolHint';
import { useShortcuts } from './useShortcuts';
import styles from './GameScreen.module.css';

const PhaserHost = dynamic(() => import('@/game/PhaserHost'), { ssr: false });

export function GameScreen() {
  const worldReady = useUi((s) => s.worldReady);
  const progress = useUi((s) => s.worldProgress);
  const suspended = useGame((s) => s.suspended);

  useEffect(() => {
    resetUiForNewSession();
    const stop = startRuntime();
    // Any first touch of the page is the gesture browsers require before audio.
    const unlock = () => AudioService.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__greenhouse = { gameStore, uiStore, AudioService };
    }
    return () => {
      stop();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useShortcuts();

  return (
    <div className={styles.screen}>
      <PhaserHost />
      <Hud />
      <GoalNote />
      <ToolHint />
      <PlacementBar />
      <Toolbar />
      <PlantCard />
      <SeedPicker />
      <Notifications />
      <PanelHost />
      <OfflineSummaryDialog />
      {!worldReady && (
        <div className={styles.veil}>
          <Splash label="Прогреваем теплицу…" progress={progress} />
        </div>
      )}
      {suspended && (
        <div className={styles.veil}>
          <div className={styles.suspended} role="alertdialog" aria-label="Игра открыта в другой вкладке">
            <h2>Теплица открыта в другой вкладке</h2>
            <p>Чтобы не потерять прогресс, играть можно только в одной вкладке. Эта вкладка больше не сохраняет игру.</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Играть здесь
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
