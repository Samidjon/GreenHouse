'use client';

import { useGame } from '@/stores/gameStore';
import { useUi } from '@/stores/uiStore';
import { currentGoal } from '@/systems/goals';
import { AssetImg } from '../ui/primitives';
import styles from './GoalNote.module.css';

/** A gardener's note pinned under the HUD with one gentle suggestion. */
export function GoalNote() {
  // Select the string, not the goal object: a fresh object on every read would re-render forever.
  const text = useGame((s) => (s.save ? (currentGoal(s.save)?.text ?? null) : null));
  const tool = useUi((s) => s.tool);
  if (!text || tool !== 'hand') return null;
  return (
    <aside className={styles.note} key={text} aria-live="polite">
      <AssetImg assetKey="ui/sprout" size={22} />
      <span>{text}</span>
    </aside>
  );
}
