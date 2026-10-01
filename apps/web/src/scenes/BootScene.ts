import Phaser from 'phaser';
import { makeCharacter, makeTileset } from '../art/placeholderArt';
import { TextureKeys } from '../game/assets';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';

/**
 * Prepares assets, then starts the world. For the prototype all art is generated here as
 * placeholders; replacing it with files means loading them in preload() under the same keys.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    makeTileset(this, TextureKeys.Tiles);
    makeCharacter(this, TextureKeys.Player, 0x2f6fdd);
    for (const npc of getServices(this).content.npcs) {
      makeCharacter(
        this,
        TextureKeys.npc(npc.id),
        Phaser.Display.Color.HexStringToColor(npc.color).color,
      );
    }

    this.scene.start(SceneKeys.World);
    this.scene.launch(SceneKeys.UI);
  }
}
