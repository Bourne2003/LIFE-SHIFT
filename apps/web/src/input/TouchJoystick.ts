import Phaser from 'phaser';
import { IDLE_INTENT, type MoveIntent } from '@life-shift/shared';
import type { InputSource } from './InputSource';
import { readJoystick } from './joystickMath';

const RADIUS = 56;
const DEADZONE = 0.15;

/**
 * Floating virtual joystick: touching anywhere on the left part of the screen places the stick
 * under the finger. Ignores mouse pointers so desktop clicks stay free for future interactions.
 * Must live in a scene whose camera is not zoomed or scrolled (the UI scene).
 */
export class TouchJoystick implements InputSource {
  private pointerId: number | null = null;
  private origin = new Phaser.Math.Vector2();
  private intent: MoveIntent = IDLE_INTENT;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  constructor(private readonly scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, RADIUS, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff, 0.4);
    this.knob = scene.add.circle(0, 0, RADIUS * 0.45, 0xffffff, 0.45);
    this.setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getMoveIntent(): MoveIntent {
    return this.intent;
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || !pointer.wasTouch) return;
    // Right side is reserved for future action buttons (interact, menu).
    if (pointer.x > this.scene.scale.width * 0.6) return;
    this.pointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y);
    this.knob.setPosition(pointer.x, pointer.y);
    this.setVisible(true);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    const reading = readJoystick(
      pointer.x - this.origin.x,
      pointer.y - this.origin.y,
      RADIUS,
      DEADZONE,
    );
    this.intent = reading.intent;
    this.knob.setPosition(this.origin.x + reading.knob.x, this.origin.y + reading.knob.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.intent = IDLE_INTENT;
    this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    this.base.setVisible(visible);
    this.knob.setVisible(visible);
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
