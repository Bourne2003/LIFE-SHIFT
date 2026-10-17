import type { MoveIntent } from '@life-shift/shared';

/** Discrete button presses, independent of the device that produced them. */
export type InputAction = 'interact' | 'navUp' | 'navDown' | 'cancel' | 'inventory' | 'switchTab';

/** Anything that can express the player's wishes: keyboard, touch joystick, gamepad, AI... */
export interface InputSource {
  getMoveIntent(): MoveIntent;
  /** Actions pressed since the last call. Each press is reported once. */
  consumeActions?(): readonly InputAction[];
}
