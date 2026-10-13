import Phaser from 'phaser';
import { intentFromDirections, type MoveIntent } from '@life-shift/shared';
import type { InputAction, InputSource } from './InputSource';

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'e' | 'space' | 'enter' | 'esc' | 'i',
  Phaser.Input.Keyboard.Key
>;

/** Arrow keys and WASD to move; E, Space or Enter to interact; Esc to close; I for the bag. */
export class KeyboardInputSource implements InputSource {
  private readonly keys: Keys;
  private pending: InputAction[] = [];

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys(
      {
        up: K.UP,
        down: K.DOWN,
        left: K.LEFT,
        right: K.RIGHT,
        w: K.W,
        a: K.A,
        s: K.S,
        d: K.D,
        e: K.E,
        space: K.SPACE,
        enter: K.ENTER,
        esc: K.ESC,
        i: K.I,
      },
      true,
    ) as Keys;

    // Queue presses from key-down events rather than polling JustDown(): Phaser clears the
    // "just down" flag on key-up, so a quick tap released before the next frame would be lost.
    const k = this.keys;
    const bind = (action: InputAction, ...keys: Phaser.Input.Keyboard.Key[]) => {
      for (const key of keys)
        key.on(Phaser.Input.Keyboard.Events.DOWN, () => this.pending.push(action));
    };
    bind('interact', k.e, k.space, k.enter);
    bind('navUp', k.up, k.w);
    bind('navDown', k.down, k.s);
    bind('cancel', k.esc);
    bind('inventory', k.i);
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

  consumeActions(): readonly InputAction[] {
    return this.pending.splice(0);
  }
}
