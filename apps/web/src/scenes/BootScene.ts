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
    this.makeNpcTexture();
    this.makeTileTexture(TextureKeys.Ground, 0x5b8c5a, 0x527f51);
    this.makeTileTexture(TextureKeys.Road, 0x8a8577, 0x7d796c);
    this.makeTileTexture(TextureKeys.Building, 0x6a4d39, 0x5b422f);
    this.makeNoodleStallTexture();
    this.makeLanternTextures();
    this.makeCatTexture();
    this.makeClockFaceTexture();
    this.makeTileTexture(TextureKeys.ParkGround, 0x4c8a4a, 0x6aa85e); // lawn with flowers
    this.makeTileTexture(TextureKeys.MarketGround, 0xa39a86, 0x8f8774); // paving
    this.makeTileTexture(TextureKeys.AlleyGround, 0x5f5a55, 0x4f4a46); // cobbles

    this.scene.start(SceneKeys.World);
    this.scene.launch(SceneKeys.UI);
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

  private makeNpcTexture(): void {
    const w = 24;
    const h = 32;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.22).fillEllipse(w / 2, h - 3, w - 4, 6); // shadow
    g.fillStyle(0xd38f2d).fillRoundedRect(4, 12, w - 8, h - 16, 4); // body
    g.fillStyle(0xf2c9a0).fillCircle(w / 2, 9, 7); // head
    g.fillStyle(0x2d2d2d).fillRect(7, 14, w - 14, 3); // belt
    g.generateTexture(TextureKeys.Npc, w, h);
    g.destroy();
  }

  /** 2×2-tile street stall: striped awning, counter and a steaming pot. */
  private makeNoodleStallTexture(): void {
    const s = TILE_SIZE * 2;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.22).fillEllipse(s / 2, s - 4, s - 6, 8); // shadow
    g.fillStyle(0x7a5230)
      .fillRect(6, 22, 4, s - 26)
      .fillRect(s - 10, 22, 4, s - 26); // posts
    g.fillStyle(0x9c6b3c).fillRect(4, s - 26, s - 8, 18); // counter
    g.fillStyle(0xb88452).fillRect(4, s - 26, s - 8, 3);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xd8413a).fillRect(2 + i * 10, 6, 10, 16); // awning stripes
    }
    g.fillStyle(0xb8322c).fillRect(2, 20, s - 4, 3);
    g.fillStyle(0x3c3c3c).fillRect(s / 2 - 8, s - 34, 16, 9); // pot
    g.fillStyle(0xffffff, 0.6)
      .fillCircle(s / 2 - 3, s - 39, 3)
      .fillCircle(s / 2 + 3, s - 44, 3); // steam
    g.generateTexture(TextureKeys.NoodleStall, s, s);
    g.destroy();
  }

  /** Park lantern on a post, plus a soft radial glow drawn over the night overlay. */
  private makeLanternTextures(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.2).fillEllipse(16, 30, 14, 4);
    g.fillStyle(0x3b3b3b).fillRect(14, 10, 4, 20); // post
    g.fillStyle(0x8c2f1f).fillRoundedRect(9, 2, 14, 12, 4); // paper lantern
    g.fillStyle(0xffc35c).fillRoundedRect(11, 4, 10, 8, 3);
    g.generateTexture(TextureKeys.Lantern, TILE_SIZE, TILE_SIZE);
    g.destroy();

    const size = 128;
    const canvas = this.textures.createCanvas(TextureKeys.LightGlow, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 214, 140, 0.9)');
    grad.addColorStop(0.4, 'rgba(255, 180, 90, 0.35)');
    grad.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  /** Small orange cat, sitting. */
  private makeCatTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.2).fillEllipse(16, 29, 16, 4);
    g.fillStyle(0xe08a2e).fillEllipse(16, 23, 14, 12); // body
    g.fillStyle(0xe08a2e).fillCircle(16, 14, 6); // head
    g.fillTriangle(11, 11, 12, 5, 15, 9).fillTriangle(21, 11, 20, 5, 17, 9); // ears
    g.fillStyle(0xb8691c).fillRect(12, 21, 8, 2).fillRect(13, 25, 6, 2); // stripes
    g.fillStyle(0x1b1b1b).fillCircle(14, 14, 1).fillCircle(18, 14, 1); // eyes
    g.lineStyle(3, 0xe08a2e).beginPath().arc(24, 22, 5, -1.2, 1.4).strokePath(); // tail
    g.generateTexture(TextureKeys.Cat, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  /** Clock face shown on the tower once it runs again. */
  private makeClockFaceTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2e2a24).fillCircle(16, 16, 14);
    g.fillStyle(0xfff4d6).fillCircle(16, 16, 12);
    g.lineStyle(2, 0x2e2a24).lineBetween(16, 16, 16, 7).lineBetween(16, 16, 22, 19);
    g.fillStyle(0xc0392b).fillCircle(16, 16, 2);
    g.generateTexture(TextureKeys.ClockFace, TILE_SIZE, TILE_SIZE);
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
