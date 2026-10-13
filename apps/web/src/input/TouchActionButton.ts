import type Phaser from 'phaser';
import { IDLE_INTENT, type MoveIntent } from '@life-shift/shared';
import type { InputAction, InputSource } from './InputSource';

const RADIUS = 40;

/**
 * On-screen "interact" button for touch screens. Lives in the UI scene; the owner positions it and
 * shows it only when there is something to interact with (hidden objects receive no input).
 */
export class TouchActionButton implements InputSource {
  private pending: InputAction[] = [];
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.circle = scene.add
      .circle(0, 0, RADIUS, 0xffffff, 0.25)
      .setStrokeStyle(3, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true });
    this.text = scene.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    this.circle.on('pointerdown', () => this.pending.push('interact'));
    this.setVisible(false);
  }

  getMoveIntent(): MoveIntent {
    return IDLE_INTENT;
  }

  consumeActions(): readonly InputAction[] {
    return this.pending.splice(0);
  }

  get visible(): boolean {
    return this.circle.visible;
  }

  get position(): { x: number; y: number } {
    return { x: this.circle.x, y: this.circle.y };
  }

  /** Places the button's centre `margin` px in from the bottom-right corner. */
  placeBottomRight(width: number, height: number, margin = 32): void {
    this.circle.setPosition(width - margin - RADIUS, height - margin - RADIUS);
    this.text.setPosition(this.circle.x, this.circle.y);
  }

  setLabel(label: string): void {
    this.text.setText(label);
  }

  setVisible(visible: boolean): void {
    this.circle.setVisible(visible);
    this.text.setVisible(visible);
  }
}
