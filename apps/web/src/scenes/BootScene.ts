import Phaser from 'phaser';
import { TILE_SIZE } from '@life-shift/shared';
import { TextureKeys } from '../game/assets';
import { SceneKeys } from '../game/sceneKeys';

/**
 * Prepares assets, then starts the world. For the prototype all art is generated here as
 * placeholders; replacing it with files means loading them in preload() under the same keys.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.makePlayerTexture();
    this.makeTileTexture(TextureKeys.Ground, 0x5b8c5a, 0x527f51);
    this.makeTileTexture(TextureKeys.Road, 0x8a8577, 0x7d796c);
    this.makeMarkerTexture(TextureKeys.Npc, 0xe58f65, 0xf6c48e);
    this.makeMarkerTexture(TextureKeys.Landmark, 0x6f76d9, 0xb2b7ff);

    this.scene.start(SceneKeys.World);
    this.scene.launch(SceneKeys.UI);
  }

  private makeMarkerTexture(key: string, base: number, detail: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.25).fillEllipse(16, 29, 24, 7);
    g.fillStyle(base).fillCircle(16, 15, 12);
    g.fillStyle(detail).fillCircle(12, 11, 4);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makePlayerTexture(): void {
    const w = 24;
    const h = 32;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 4, 6); // shadow
    g.fillStyle(0x2f6fdd).fillRoundedRect(4, 12, w - 8, h - 16, 4); // body
    g.fillStyle(0xf2c9a0).fillCircle(w / 2, 9, 7); // head
    g.fillStyle(0x1b1b1b).fillCircle(w / 2 + 3, 8, 1.5); // eye: shows facing when flipped
    g.generateTexture(TextureKeys.Player, w, h);
    g.destroy();
  }

  private makeTileTexture(key: string, base: number, detail: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(base).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(detail).fillRect(0, 0, TILE_SIZE, 1).fillRect(0, 0, 1, TILE_SIZE);
    g.fillRect(8, 20, 2, 2).fillRect(22, 9, 2, 2);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }
}
