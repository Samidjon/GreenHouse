import { AudioService } from '@/audio/AudioService';
import { CONFIG } from '@/data/config';
import { SaveService } from '@/persistence/saveService';
import { environmentContext, getEnvironment } from '@/systems/environment';
import { currentSave, gameStore, markSuspended, persist, persistEmergency, tick } from '@/stores/gameStore';

const ROTATE_BACKUP_MS = 5 * 60 * 1000;

let stopCurrent: (() => void) | null = null;

/**
 * Runs while the gameplay screen is up: the catch-up tick, autosave, backup
 * rotation, tab-lifecycle saves, and the guard against two tabs overwriting one game.
 */
export function startRuntime(): () => void {
  stopCurrent?.();

  tick();

  const ticker = setInterval(() => {
    tick();
    const { save } = gameStore.getState();
    if (save) {
      const env = getEnvironment(Date.now(), environmentContext(save));
      AudioService.setEnvironment(env.weather, env.phase);
    }
  }, CONFIG.sim.uiTickMs);

  const autosave = setInterval(() => void persist(), CONFIG.save.autosaveIntervalMs);

  const rotate = setInterval(() => {
    if (!gameStore.getState().suspended && gameStore.getState().save) {
      void SaveService.rotateBackup(currentSave(), Date.now());
    }
  }, ROTATE_BACKUP_MS);

  const onVisibility = () => {
    const hidden = document.visibilityState === 'hidden';
    AudioService.setBackgrounded(hidden);
    if (hidden) {
      persistEmergency();
      void persist();
    } else {
      tick();
    }
  };
  const onPageHide = () => persistEmergency();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('greenhouse-session');
    // Whichever tab opened the game most recently owns the save.
    channel.postMessage('claim');
    channel.onmessage = () => {
      void persist().then(markSuspended);
    };
  }

  AudioService.start();

  const stop = () => {
    clearInterval(ticker);
    clearInterval(autosave);
    clearInterval(rotate);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    channel?.close();
    AudioService.stop();
    stopCurrent = null;
  };
  stopCurrent = stop;
  return stop;
}
