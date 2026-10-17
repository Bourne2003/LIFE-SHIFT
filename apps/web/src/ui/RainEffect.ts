import type Phaser from 'phaser';

const DROPS = 140;
const SPEED = 900; // px per second
const SLANT = 0.25; // horizontal drift per vertical px

/**
 * Screen-space rain: thin slanted streaks redrawn every frame, plus a faint grey wash. Cheap
 * enough for phones (one Graphics object, no textures).
 */
export class RainEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly wash: Phaser.GameObjects.Rectangle;
  private readonly drops: { x: number; y: number; len: number }[] = [];
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
  ) {
    this.wash = scene.add
      .rectangle(0, 0, 10, 10, 0x50607a, 0.18)
      .setOrigin(0)
      .setDepth(depth)
      .setVisible(false);
    this.graphics = scene.add.graphics().setDepth(depth);
    for (let i = 0; i < DROPS; i++) this.drops.push(this.spawn(true));
  }

  get isRaining(): boolean {
    return this.active;
  }

  setActive(active: boolean): void {
    this.active = active;
    this.wash.setVisible(active);
    if (!active) this.graphics.clear();
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const { width, height } = this.scene.scale;
    this.wash.setSize(width, height);
    const dy = (SPEED * Math.min(deltaMs, 100)) / 1000;
    const g = this.graphics.clear().lineStyle(1.5, 0xc8d8ff, 0.55);
    for (const d of this.drops) {
      d.y += dy;
      d.x += dy * SLANT;
      if (d.y > height || d.x > width) Object.assign(d, this.spawn(false));
      g.lineBetween(d.x, d.y, d.x - d.len * SLANT, d.y - d.len);
    }
  }

  private spawn(anywhere: boolean): { x: number; y: number; len: number } {
    const { width, height } = this.scene.scale;
    return {
      x: Math.random() * (width + height * SLANT) - height * SLANT,
      y: anywhere ? Math.random() * height : -20 - Math.random() * height * 0.3,
      len: 10 + Math.random() * 10,
    };
  }
}
