import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { UIScene } from '../scenes/UIScene';
import { WorldScene } from '../scenes/WorldScene';
import { keepCanvasSizedToParent } from './resize';
import { createServices, installServices } from './services';

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1d2b26',
    pixelArt: true,
    scale: {
      // Canvas always fills the container; the world camera zoom adapts instead (see viewport.ts).
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: {
      activePointers: 3, // joystick + two future action buttons
    },
    scene: [BootScene, WorldScene, UIScene],
  });
  installServices(game, createServices());
  game.events.once(Phaser.Core.Events.READY, () => {
    const stop = keepCanvasSizedToParent(game, parent);
    game.events.once(Phaser.Core.Events.DESTROY, stop);
  });
  return game;
}
