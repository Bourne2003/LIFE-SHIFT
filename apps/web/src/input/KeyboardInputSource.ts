import Phaser from 'phaser';
import { intentFromDirections, type MoveIntent } from '@life-shift/shared';
import type { InputSource } from './InputSource';

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
  Phaser.Input.Keyboard.Key
>;

/** Arrow keys and WASD. */
export class KeyboardInputSource implements InputSource {
  private readonly keys: Keys;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys(
      { up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D },
      true,
    ) as Keys;
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
