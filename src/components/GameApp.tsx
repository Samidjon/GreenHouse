'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { bootGame, useGame } from '@/stores/gameStore';
import { DedicationScreen } from './menu/DedicationScreen';
import { MainMenu } from './menu/MainMenu';
import { Splash } from './menu/Splash';

// The gameplay screen pulls in Phaser, which can only run in a browser.
const GameScreen = dynamic(() => import('./hud/GameScreen').then((m) => m.GameScreen), {
  ssr: false,
  loading: () => <Splash label="Открываем теплицу…" />,
});

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const [dedicationSeen, setDedicationSeen] = useState(false);

  useEffect(() => {
    void bootGame();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  if (!dedicationSeen) return <DedicationScreen onContinue={() => setDedicationSeen(true)} />;
  if (phase === 'loading') return <Splash label="Проверяем ваши растения…" />;
  if (phase === 'menu') return <MainMenu />;
  return <GameScreen />;
}
