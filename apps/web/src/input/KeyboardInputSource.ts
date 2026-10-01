import Phaser from 'phaser';
import { intentFromDirections, type MoveIntent } from '@life-shift/shared';
import type { GameAction } from './InputManager';
import type { InputSource } from './InputSource';

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
  Phaser.Input.Keyboard.Key
>;

const ACTION_KEYS: Readonly<Record<string, GameAction>> = {
  E: 'interact',
  SPACE: 'interact',
  ESC: 'cancel',
};

/** Arrow keys and WASD to move; E / Space to interact; Esc to cancel. */
export class KeyboardInputSource implements InputSource {
  private readonly keys: Keys;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, onAction: (a: GameAction) => void) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys(
      { up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D },
      true,
    ) as Keys;
    for (const [key, action] of Object.entries(ACTION_KEYS)) {
      keyboard.addKey(key, true).on(Phaser.Input.Keyboard.Events.DOWN, () => onAction(action));
    }
  }

  getMoveIntent(): MoveIntent {
    const k = this.keys;
    return intentFromDirections({
      up: k.up.isDown || k.w.isDown,
      down: k.down.isDown || k.s.isDown,
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
    });
  }
}
