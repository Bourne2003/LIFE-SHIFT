import type { MoveIntent } from '@life-shift/shared';

/** Anything that can express the player's wish to move: keyboard, touch joystick, gamepad, AI... */
export interface InputSource {
  getMoveIntent(): MoveIntent;
}
