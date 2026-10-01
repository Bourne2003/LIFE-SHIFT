import type Phaser from 'phaser';
import {
  tileCenter,
  type Interactable,
  type NpcDef,
  type TilePos,
  type Vec2,
} from '@life-shift/shared';
import { CHARACTER_SIZE } from '../art/placeholderArt';
import { TextureKeys } from '../game/assets';

/** A townsperson standing at their default position. Behaviour comes from their NpcDef. */
export class Npc implements Interactable {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

  private _tile: TilePos;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: NpcDef,
    tile: TilePos,
  ) {
    this._tile = tile;
    const { x, y } = tileCenter(tile);
    this.sprite = scene.physics.add.staticSprite(x, y, TextureKeys.npc(def.id));
    // Same feet-only body as the player, so characters can stand close without overlapping.
    const { width: w, height: h } = CHARACTER_SIZE;
    this.sprite.body.setSize(w * 0.6, h * 0.4);
    this.sprite.body.setOffset(w * 0.2, h * 0.6);
    this.sprite.setDepth(y);
  }

  get id(): string {
    return this.def.id;
  }

  /** Where the NPC's feet are, for interaction range checks. */
  get position(): Vec2 {
    return this.sprite.body.center;
  }

  get tile(): TilePos {
    return this._tile;
  }

  /**
   * Moves to a new tile (schedule change). Fades out and back in rather than walking, since
   * there is no pathfinding yet. `reset` keeps the custom feet body (updateFromGameObject would
   * resize it to the whole sprite).
   */
  moveTo(tile: TilePos, animate = true): void {
    if (tile.x === this._tile.x && tile.y === this._tile.y) return;
    this._tile = tile;
    const { x, y } = tileCenter(tile);
    const place = () => {
      this.sprite.body.reset(x, y);
      this.sprite.setDepth(y);
    };
    if (!animate) return place();
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.chain({
      targets: this.sprite,
      tweens: [
        { alpha: 0, duration: 250, onComplete: place },
        { alpha: 1, duration: 250 },
      ],
    });
  }

  /** Turns to look at a point (placeholder art only supports left/right). */
  face(point: Vec2): void {
    this.sprite.setFlipX(point.x < this.sprite.x);
  }
}
