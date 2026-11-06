import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GreenhouseScene } from './scenes/GreenhouseScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#9fc3c7',
    banner: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
      autoRound: true,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: {
      activePointers: 2,
      // Keys are handled by React's shortcut layer, so Phaser must not swallow them.
      keyboard: { capture: [] },
    },
    audio: { noAudio: true },
    scene: [BootScene, GreenhouseScene],
  });
}
