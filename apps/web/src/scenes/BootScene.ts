import Phaser from 'phaser';
import { makeCharacter, makeObjectTexture, makeTileset } from '../art/placeholderArt';
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
    const { content } = getServices(this);
    const objectTextures = new Set(
      content.objects.flatMap((o) => o.appearances.map((a) => a.texture)),
    );
    objectTextures.forEach((key) => makeObjectTexture(this, key));
    for (const npc of content.npcs) {
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
