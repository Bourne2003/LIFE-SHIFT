import Phaser from 'phaser';
import type { ActionInputSource } from './ActionInputSource';

export class KeyboardActionInputSource implements ActionInputSource {
  private readonly key: Phaser.Input.Keyboard.Key;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.key = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  wasInteractPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.key);
  }
}
