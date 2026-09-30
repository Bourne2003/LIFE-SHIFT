import Phaser from 'phaser';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import { TouchJoystick } from '../input/TouchJoystick';

/**
 * Screen-space overlay drawn above the world with an unzoomed camera. Hosts touch controls now,
 * and the HUD, dialogue and menus in later milestones.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    const joystick = new TouchJoystick(this);
    const removeJoystick = getServices(this).input.add(joystick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeJoystick);

    const touch = this.sys.game.device.input.touch;
    const hint = this.add
      .text(16, 16, touch ? 'Drag on the left side to move' : 'WASD / Arrow keys to move', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0);
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 800, onComplete: () => hint.destroy() });
    });
  }
}
