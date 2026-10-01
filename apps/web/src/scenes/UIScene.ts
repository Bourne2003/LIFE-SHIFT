import Phaser from 'phaser';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import { TouchJoystick } from '../input/TouchJoystick';

/**
 * Screen-space Phaser overlay with an unzoomed camera, for controls that need canvas input
 * (the touch joystick). Text, panels and buttons live in the DOM UI instead (see ui/).
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    const removeJoystick = getServices(this).input.add(new TouchJoystick(this));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeJoystick);
  }
}
